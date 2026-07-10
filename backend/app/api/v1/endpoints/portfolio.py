"""
Portfolio-level endpoints: price freshness status, on-demand refresh, and period analytics.
"""
from datetime import datetime, timezone, date, timedelta
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.deps import get_db, get_current_user
from app.models.user import User

router = APIRouter(prefix="/portfolio", tags=["portfolio"])

# Minimum seconds between user-initiated refreshes (rate limit)
_REFRESH_COOLDOWN_SEC = 60
_last_user_refresh: datetime | None = None

STALE_AFTER_MINUTES = 20


def _get_last_price_update(db: Session) -> datetime | None:
    """Return the most recent price update timestamp across both markets."""
    row = db.execute(text(
        "SELECT MAX(updated_at) FROM stock_prices"
    )).fetchone()
    ts = row[0] if row else None
    if ts is None:
        return None
    # stock_prices stores UTC naive datetimes — attach UTC tzinfo
    if ts.tzinfo is None:
        ts = ts.replace(tzinfo=timezone.utc)
    return ts


@router.get("/status")
def get_portfolio_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Lightweight staleness check. Frontend polls this every few minutes
    instead of re-fetching full holdings on every tick.
    """
    now = datetime.now(timezone.utc)
    last_updated = _get_last_price_update(db)

    if last_updated is None:
        seconds_since = None
        is_stale = True
    else:
        seconds_since = int((now - last_updated).total_seconds())
        is_stale = seconds_since > STALE_AFTER_MINUTES * 60

    return {
        "last_updated": last_updated.isoformat() if last_updated else None,
        "is_stale": is_stale,
        "seconds_since_update": seconds_since,
        "stale_threshold_minutes": STALE_AFTER_MINUTES,
    }


@router.post("/refresh")
def trigger_portfolio_refresh(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    On-demand price refresh triggered by the user. Rate-limited to once
    per minute to avoid hammering yfinance on rapid clicks.
    """
    global _last_user_refresh

    now = datetime.now(timezone.utc)
    if _last_user_refresh is not None:
        elapsed = (now - _last_user_refresh).total_seconds()
        if elapsed < _REFRESH_COOLDOWN_SEC:
            wait = int(_REFRESH_COOLDOWN_SEC - elapsed)
            return {
                "success": False,
                "message": f"Please wait {wait}s before refreshing again.",
                "last_updated": _get_last_price_update(db),
            }

    _last_user_refresh = now

    from app.tasks.fetch_stock_prices import run_active_price_update
    try:
        run_active_price_update()
    except Exception as e:
        return {"success": False, "message": str(e), "last_updated": None}

    last_updated = _get_last_price_update(db)
    return {
        "success": True,
        "message": "Prices refreshed successfully.",
        "last_updated": last_updated.isoformat() if last_updated else None,
    }


# ── Analytics helpers ──────────────────────────────────────────────────────────

def _first_transaction_date(uid: str, market: str, db: Session) -> Optional[date]:
    """Earliest transaction date across the selected market(s)."""
    dates = []
    if market in ("all", "israeli"):
        d = db.execute(text(
            "SELECT MIN(transaction_date) FROM israeli_stock_transactions WHERE user_id = :uid"
        ), {"uid": uid}).scalar()
        if d:
            dates.append(d)
    if market in ("all", "world"):
        d = db.execute(text(
            "SELECT MIN(transaction_date) FROM world_stock_transactions WHERE user_id = :uid"
        ), {"uid": uid}).scalar()
        if d:
            dates.append(d)
    return min(dates) if dates else None


def _get_exchange_rate(target: date, db: Session) -> float:
    """Closest USD→ILS rate on or before target date; fallback to latest available."""
    row = db.execute(text("""
        SELECT rate FROM exchange_rates
        WHERE from_currency = 'USD' AND to_currency = 'ILS' AND date <= :d
        ORDER BY date DESC LIMIT 1
    """), {"d": target}).fetchone()
    if row:
        return float(row[0])
    # Try any rate if none before target
    row = db.execute(text("""
        SELECT rate FROM exchange_rates
        WHERE from_currency = 'USD' AND to_currency = 'ILS'
        ORDER BY date LIMIT 1
    """)).fetchone()
    return float(row[0]) if row else 3.65


def _price_at_or_before(series: dict[date, float], d: date, lookback: int = 7) -> Optional[float]:
    """Last available close on or before d (weekends/holidays)."""
    if d in series:
        return series[d]
    for delta in range(1, lookback + 1):
        candidate = d - timedelta(days=delta)
        if candidate in series:
            return series[candidate]
    return None


def _fx_lookup(fx_series: dict[date, float], d: date, db: Session) -> float:
    """USD→ILS at date d from the price-history cache, falling back to the
    exchange_rates table extracted from broker PDFs."""
    p = _price_at_or_before(fx_series, d)
    return p if p else _get_exchange_rate(d, db)


def _reconstruct_holdings(uid: str, cutoff: date, db: Session):
    """
    Returns (israeli_rows, world_rows) — net quantities held at cutoff date.
    Each row: (symbol/ticker, yfinance_ticker_or_None, net_qty)
    """
    israeli = db.execute(text("""
        SELECT t.symbol,
               COALESCE(s.yfinance_ticker, t.symbol || '.TA') AS yf_ticker,
               SUM(CASE
                   WHEN t.transaction_type = 'BUY'  THEN t.quantity
                   WHEN t.transaction_type = 'SELL' THEN -t.quantity
                   ELSE 0 END) AS net_qty
        FROM israeli_stock_transactions t
        LEFT JOIN israeli_stocks s ON s.symbol = t.symbol
        WHERE t.user_id = :uid
          AND t.transaction_date <= :d
          AND t.transaction_type IN ('BUY', 'SELL')
        GROUP BY t.symbol, yf_ticker
        HAVING SUM(CASE
                   WHEN t.transaction_type = 'BUY'  THEN t.quantity
                   WHEN t.transaction_type = 'SELL' THEN -t.quantity
                   ELSE 0 END) > 0.001
    """), {"uid": uid, "d": cutoff}).fetchall()

    world = db.execute(text("""
        SELECT t.ticker,
               SUM(CASE
                   WHEN t.transaction_type = 'BUY'  THEN t.quantity
                   WHEN t.transaction_type = 'SELL' THEN -t.quantity
                   ELSE 0 END) AS net_qty
        FROM world_stock_transactions t
        WHERE t.user_id = :uid
          AND t.transaction_date <= :d
          AND t.transaction_type IN ('BUY', 'SELL')
        GROUP BY t.ticker
        HAVING SUM(CASE
                   WHEN t.transaction_type = 'BUY'  THEN t.quantity
                   WHEN t.transaction_type = 'SELL' THEN -t.quantity
                   ELSE 0 END) > 0.001
    """), {"uid": uid, "d": cutoff}).fetchall()

    return israeli, world


def _portfolio_value_at(
    uid: str,
    target: date,
    db: Session,
    market: str = "all",
    use_current: bool = False,
) -> Optional[dict]:
    """
    Portfolio ILS value at target date, computed from the local price cache
    (stock_price_history). use_current=True uses the live stock_prices table
    instead (for "today").
    """
    from app.services import price_history_service as phs

    israeli_holdings, world_holdings = _reconstruct_holdings(uid, target, db)
    if market == "israeli":
        world_holdings = []
    elif market == "world":
        israeli_holdings = []

    if use_current:
        # Fetch all current prices in two batched queries
        il_symbols = [r[0] for r in israeli_holdings]
        w_tickers_cur = [r[0] for r in world_holdings]

        il_prices: dict[str, float] = {}
        if il_symbols:
            rows = db.execute(text(
                "SELECT ticker, current_price FROM stock_prices WHERE ticker = ANY(:t)"
            ), {"t": il_symbols}).fetchall()
            il_prices = {r[0]: float(r[1]) for r in rows if r[1] is not None}

        w_prices: dict[str, float] = {}
        if w_tickers_cur:
            rows = db.execute(text(
                "SELECT ticker, current_price FROM stock_prices WHERE ticker = ANY(:t)"
            ), {"t": w_tickers_cur}).fetchall()
            w_prices = {r[0]: float(r[1]) for r in rows if r[1] is not None}

        israeli_value = sum(float(qty) * il_prices[sym] for sym, _yf, qty in israeli_holdings if sym in il_prices)
        fx = _get_exchange_rate(target, db)
        world_value = sum(float(qty) * w_prices[tkr] * fx for tkr, qty in world_holdings if tkr in w_prices)

        return {
            "israeli_ils": round(israeli_value, 2),
            "world_ils": round(world_value, 2),
            "total_ils": round(israeli_value + world_value, 2),
            "source": "live",
        }

    # Historical: read closes from the local cache (fills gaps on first use)
    il_yf_tickers = [yf for _, yf, _ in israeli_holdings]
    w_tickers = [t for t, _ in world_holdings if phs.valid_yf_ticker(t)]
    window_start = target - timedelta(days=7)

    phs.ensure_coverage(db, il_yf_tickers, 'israeli', window_start, target)
    phs.ensure_coverage(db, w_tickers, 'world', window_start, target)
    if w_tickers:
        phs.ensure_fx_coverage(db, window_start, target)

    series = phs.get_price_series(db, il_yf_tickers + w_tickers + [phs.FX_TICKER], window_start, target)
    fx_series = series.get(phs.FX_TICKER, {})

    israeli_value = 0.0
    for symbol, yf_ticker, qty in israeli_holdings:
        p = _price_at_or_before(series.get(yf_ticker, {}), target)
        if p:
            israeli_value += float(qty) * p     # cache stores ILS already

    world_value = 0.0
    fx = _fx_lookup(fx_series, target, db) if world_holdings else 1.0
    for ticker, qty in world_holdings:
        p = _price_at_or_before(series.get(ticker, {}), target)
        if p:
            world_value += float(qty) * p * fx

    if israeli_value == 0.0 and world_value == 0.0 and (israeli_holdings or world_holdings):
        return None

    return {
        "israeli_ils": round(israeli_value, 2),
        "world_ils": round(world_value, 2),
        "total_ils": round(israeli_value + world_value, 2),
        "source": "historical",
    }


def _get_trade_start_date(db, uid: str, symbol: str, market: str, sell_date: str, sell_id: int) -> str:
    """Find the opening date of the position that was closed by this sell transaction"""
    if market == "israeli":
        txs = db.execute(text("""
            SELECT id, transaction_date::text, transaction_type, quantity
            FROM israeli_stock_transactions
            WHERE user_id = :uid AND symbol = :symbol AND transaction_date <= :sell_date
            ORDER BY transaction_date ASC, id ASC
        """), {"uid": uid, "symbol": symbol, "sell_date": sell_date}).fetchall()
    else:
        txs = db.execute(text("""
            SELECT id, transaction_date::text, transaction_type, quantity
            FROM world_stock_transactions
            WHERE user_id = :uid AND ticker = :symbol AND transaction_date <= :sell_date
            ORDER BY transaction_date ASC, id ASC
        """), {"uid": uid, "symbol": symbol, "sell_date": sell_date}).fetchall()

    running_qty = 0.0
    opened_date = None
    
    for row in txs:
        txn_id, date_str, tx_type, qty = row[0], row[1], row[2], float(row[3] or 0)
        if txn_id == sell_id:
            break
        if tx_type == "BUY":
            if running_qty <= 0.001:
                opened_date = date_str
            running_qty += qty
        elif tx_type == "SELL":
            running_qty -= qty
            if running_qty <= 0.001:
                running_qty = 0.0
                opened_date = None
                
    return opened_date or sell_date


@router.get("/analytics")
def get_portfolio_analytics(
    start: str = Query(..., description="Period start date YYYY-MM-DD"),
    end: str = Query(..., description="Period end date YYYY-MM-DD"),
    market: str = Query("all", pattern="^(all|israeli|world)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Period analytics: realized P&L, dividends, commissions, transaction list,
    and portfolio values at period start/end — all from local data
    (stock_price_history cache), no live provider calls in the request path.
    World amounts (USD) are converted to ILS per transaction date.
    """
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    from app.services import price_history_service as phs

    uid = str(current_user.id)
    today = date.today()
    want_il = market in ("all", "israeli")
    want_w = market in ("all", "world")

    # Clamp to first transaction ("All" preset sends a far-past start date)
    first_txn = _first_transaction_date(uid, market, db)
    if first_txn and start_date < first_txn:
        start_date = first_txn
        start = str(start_date)

    # FX series for converting world USD amounts to ILS per date
    fx_series: dict = {}
    if want_w:
        phs.ensure_fx_coverage(db, start_date - timedelta(days=7), end_date)
        fx_series = phs.get_price_series(
            db, [phs.FX_TICKER], start_date - timedelta(days=7), end_date
        ).get(phs.FX_TICKER, {})

    # ── Realized P&L ──────────────────────────────────────────────────────────
    il_pl = 0.0
    if want_il:
        il_pl = db.execute(text("""
            SELECT COALESCE(SUM(realized_pl), 0)
            FROM israeli_stock_transactions
            WHERE user_id = :uid
              AND transaction_type = 'SELL'
              AND transaction_date BETWEEN :s AND :e
              AND realized_pl IS NOT NULL
        """), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0

    w_pl = 0.0
    if want_w:
        # world realized_pl is stored in USD → convert per sale date
        w_pl_rows = db.execute(text("""
            SELECT transaction_date, realized_pl, exchange_rate
            FROM world_stock_transactions
            WHERE user_id = :uid
              AND transaction_type = 'SELL'
              AND transaction_date BETWEEN :s AND :e
              AND realized_pl IS NOT NULL
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for d, pl, ex in w_pl_rows:
            rate = float(ex) if ex else _fx_lookup(fx_series, d, db)
            w_pl += float(pl) * rate

    # ── Dividends ─────────────────────────────────────────────────────────────
    il_div_gross = il_div_tax = 0.0
    if want_il:
        il_div = db.execute(text("""
            SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tax, 0)), 0)
            FROM israeli_dividends
            WHERE user_id = :uid AND payment_date BETWEEN :s AND :e
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchone()
        il_div_gross, il_div_tax = float(il_div[0]), float(il_div[1])

    w_div_gross = w_div_tax = w_div_net = 0.0
    if want_w:
        # world dividends are USD → convert per payment date
        w_div_rows = db.execute(text("""
            SELECT payment_date, amount, COALESCE(tax, 0),
                   COALESCE(net_amount, amount - COALESCE(tax, 0)), exchange_rate
            FROM world_dividends
            WHERE user_id = :uid AND payment_date BETWEEN :s AND :e
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for d, amount, tax, net, ex in w_div_rows:
            rate = float(ex) if ex else _fx_lookup(fx_series, d, db)
            w_div_gross += float(amount or 0) * rate
            w_div_tax += float(tax or 0) * rate
            w_div_net += float(net or 0) * rate

    # ── Commissions ───────────────────────────────────────────────────────────
    il_comm = 0.0
    if want_il:
        il_comm = db.execute(text("""
            SELECT COALESCE(SUM(COALESCE(commission, 0)), 0)
            FROM israeli_stock_transactions
            WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
        """), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0

    w_comm = 0.0
    if want_w:
        w_comm_rows = db.execute(text("""
            SELECT transaction_date, COALESCE(commission, 0), exchange_rate
            FROM world_stock_transactions
            WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
              AND COALESCE(commission, 0) <> 0
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for d, comm, ex in w_comm_rows:
            rate = float(ex) if ex else _fx_lookup(fx_series, d, db)
            w_comm += float(comm) * rate

    # ── Transaction list + period stats (single pass) ─────────────────────────
    transactions = []
    stats = {
        "buys": 0, "sells": 0,
        "buy_volume_ils": 0.0, "sell_volume_ils": 0.0,
        "transaction_tax_ils": 0.0,
    }
    if want_il:
        il_txs = db.execute(text("""
            SELECT id, transaction_date::text, transaction_type, symbol, company_name,
                   COALESCE(quantity, 0)::float, COALESCE(price, 0)::float,
                   COALESCE(total_value, 0)::float, COALESCE(commission, 0)::float,
                   COALESCE(realized_pl, 0)::float, currency,
                   COALESCE(tax, 0)::float
            FROM israeli_stock_transactions
            WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
            ORDER BY transaction_date DESC
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for row in il_txs:
            transactions.append({
                "id": row[0], "date": row[1], "type": row[2], "symbol": row[3],
                "company_name": row[4], "quantity": row[5], "price": row[6],
                "total_value_ils": row[7], "commission": row[8],
                "realized_pl": row[9], "currency": row[10], "market": "israeli",
            })
            if row[2] == 'BUY':
                stats["buys"] += 1
                stats["buy_volume_ils"] += row[7]
            elif row[2] == 'SELL':
                stats["sells"] += 1
                stats["sell_volume_ils"] += row[7]
            stats["transaction_tax_ils"] += row[11]

    if want_w:
        w_txs = db.execute(text("""
            SELECT id, transaction_date::text, transaction_type, ticker AS symbol,
                   COALESCE(company_name, ticker),
                   COALESCE(quantity, 0)::float, COALESCE(price, 0)::float,
                   COALESCE(total_value, 0)::float, COALESCE(commission, 0)::float,
                   COALESCE(realized_pl, 0)::float, 'USD' AS currency,
                   transaction_date AS tx_date, exchange_rate,
                   COALESCE(tax, 0)::float
            FROM world_stock_transactions
            WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
            ORDER BY tx_date DESC
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for row in w_txs:
            rate = float(row[12]) if row[12] else _fx_lookup(fx_series, row[11], db)
            value_ils = round(row[7] * rate, 2)
            transactions.append({
                "id": row[0], "date": row[1], "type": row[2], "symbol": row[3],
                "company_name": row[4], "quantity": row[5], "price": row[6],
                "total_value_ils": value_ils, "commission": row[8],
                "realized_pl": round(row[9] * rate, 2), "currency": row[10], "market": "world",
            })
            if row[2] == 'BUY':
                stats["buys"] += 1
                stats["buy_volume_ils"] += value_ils
            elif row[2] == 'SELL':
                stats["sells"] += 1
                stats["sell_volume_ils"] += value_ils
            stats["transaction_tax_ils"] += row[13] * rate
    transactions.sort(key=lambda t: t["date"], reverse=True)

    # ── Top / worst trades by realized P&L ────────────────────────────────────
    closed = [t for t in transactions if t["type"] == "SELL" and t["realized_pl"] != 0]
    closed_sorted = sorted(closed, key=lambda t: t["realized_pl"], reverse=True)
    top_trades = closed_sorted[:5]
    worst_trades = [t for t in closed_sorted[-5:] if t["realized_pl"] < 0][::-1]

    for t in top_trades:
        t["purchase_date"] = _get_trade_start_date(db, uid, t["symbol"], t["market"], t["date"], t["id"])
    for t in worst_trades:
        t["purchase_date"] = _get_trade_start_date(db, uid, t["symbol"], t["market"], t["date"], t["id"])

    # ── Portfolio values ───────────────────────────────────────────────────────
    value_start = _portfolio_value_at(uid, start_date - timedelta(days=1), db, market=market, use_current=False)
    value_end = _portfolio_value_at(
        uid, end_date, db, market=market,
        use_current=(end_date >= today),
    )

    portfolio_values = None
    if value_start is not None and value_end is not None:
        change = value_end["total_ils"] - value_start["total_ils"]
        base = value_start["total_ils"]
        return_pct = round((change / base * 100), 4) if base else None
        portfolio_values = {
            "start": value_start,
            "end": value_end,
            "change_ils": round(change, 4),
            "return_pct": return_pct,
        }

    return {
        "period_start": start,
        "period_end": end,
        "realized_pl": {
            "israeli_ils": round(float(il_pl), 2),
            "world_ils": round(float(w_pl), 2),
            "total_ils": round(float(il_pl) + float(w_pl), 2),
        },
        "dividends": {
            "israeli_gross_ils": round(il_div_gross, 2),
            "israeli_tax_ils": round(il_div_tax, 2),
            "israeli_net_ils": round(il_div_gross - il_div_tax, 2),
            "world_gross_ils": round(w_div_gross, 2),
            "world_tax_ils": round(w_div_tax, 2),
            "world_net_ils": round(w_div_net, 2),
            "total_net_ils": round((il_div_gross - il_div_tax) + w_div_net, 2),
        },
        "commissions": {
            "israeli_ils": round(float(il_comm), 2),
            "world_ils": round(float(w_comm), 2),
            "total_ils": round(float(il_comm) + float(w_comm), 2),
        },
        "transactions": transactions,
        "portfolio_values": portfolio_values,
        "market": market,
        "stats": {
            "total_trades": stats["buys"] + stats["sells"],
            "buys": stats["buys"],
            "sells": stats["sells"],
            "buy_volume_ils": round(stats["buy_volume_ils"], 2),
            "sell_volume_ils": round(stats["sell_volume_ils"], 2),
            "total_volume_ils": round(stats["buy_volume_ils"] + stats["sell_volume_ils"], 2),
            "dividend_events": (
                (db.execute(text(
                    "SELECT COUNT(*) FROM israeli_dividends WHERE user_id = :uid AND payment_date BETWEEN :s AND :e"
                ), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0 if want_il else 0)
                + (db.execute(text(
                    "SELECT COUNT(*) FROM world_dividends WHERE user_id = :uid AND payment_date BETWEEN :s AND :e"
                ), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0 if want_w else 0)
            ),
            # dividend withholding + transaction-level tax
            "total_tax_ils": round(
                stats["transaction_tax_ils"] + il_div_tax + w_div_tax, 2
            ),
            "total_fees_ils": round(float(il_comm) + float(w_comm), 2),
        },
        "top_trades": top_trades,
        "worst_trades": worst_trades,
    }


BENCHMARK_TICKERS = {
    "ta125": "^TA125.TA",   # TA-125 index (points — no agorot conversion)
    "sp500": "^GSPC",       # S&P 500 index
}


@router.get("/analytics/history")
def get_portfolio_history(
    start: str = Query(...),
    end: str = Query(...),
    market: str = Query("all", pattern="^(all|israeli|world)$"),
    benchmarks: str = Query("", description="Comma-separated: ta125,sp500"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Daily portfolio values for each trading day in [start, end], read from
    the local stock_price_history cache. Missing ranges are bulk-fetched once
    on first request; afterwards this is pure indexed SQL.
    """
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    from app.services import price_history_service as phs

    uid = str(current_user.id)
    want_il = market in ("all", "israeli")
    want_w = market in ("all", "world")

    # Clamp to first transaction ("All" preset sends a far-past start date)
    first_txn = _first_transaction_date(uid, market, db)
    if first_txn and start_date < first_txn:
        start_date = first_txn

    # ── 1D: daily closes can't chart a single day — return previous close
    #        plus the current live value instead
    if start_date >= end_date:
        today = date.today()
        prev = _portfolio_value_at(uid, end_date - timedelta(days=1), db, market=market, use_current=False)
        cur = _portfolio_value_at(uid, end_date, db, market=market, use_current=(end_date >= today))
        points = []
        if prev and prev["total_ils"] > 0:
            points.append({
                "date": str(end_date - timedelta(days=1)),
                "total_ils": prev["total_ils"],
                "israeli_ils": prev["israeli_ils"],
                "world_ils": prev["world_ils"],
            })
        if cur and cur["total_ils"] > 0:
            points.append({
                "date": str(end_date),
                "total_ils": cur["total_ils"],
                "israeli_ils": cur["israeli_ils"],
                "world_ils": cur["world_ils"],
            })
        return {"points": points, "currency": "ILS", "market": market}

    # ── 1. Collect transactions up to end_date (source of truth for quantities)
    il_all = []
    if want_il:
        il_all = db.execute(text("""
            SELECT t.transaction_date, t.symbol,
                   COALESCE(s.yfinance_ticker, t.symbol || '.TA') AS yf_ticker,
                   t.transaction_type,
                   COALESCE(t.quantity, 0) AS qty
            FROM israeli_stock_transactions t
            LEFT JOIN israeli_stocks s ON s.symbol = t.symbol
            WHERE t.user_id = :uid
              AND t.transaction_type IN ('BUY', 'SELL')
              AND t.transaction_date <= :e
            ORDER BY t.transaction_date, t.id
        """), {"uid": uid, "e": end_date}).fetchall()

    w_all = []
    if want_w:
        w_all = db.execute(text("""
            SELECT transaction_date, ticker, transaction_type,
                   COALESCE(quantity, 0) AS qty
            FROM world_stock_transactions
            WHERE user_id = :uid
              AND transaction_type IN ('BUY', 'SELL')
              AND transaction_date <= :e
            ORDER BY transaction_date, id
        """), {"uid": uid, "e": end_date}).fetchall()

    # ── 2. Ticker sets — only what is actually held or traded in the window ───
    il_yf_map: dict[str, str] = {}     # symbol → yfinance ticker
    for row in il_all:
        il_yf_map[row[1]] = row[2]

    from collections import defaultdict as _dd
    il_net_at_start: dict[str, float] = _dd(float)
    il_active: set[str] = set()
    for row in il_all:
        if row[0] >= start_date:
            il_active.add(row[1])
        else:
            il_net_at_start[row[1]] += float(row[4]) if row[3] == 'BUY' else -float(row[4])
    il_active |= {s for s, q in il_net_at_start.items() if q > 1e-9}

    w_net_at_start: dict[str, float] = _dd(float)
    w_active: set[str] = set()
    for row in w_all:
        if row[0] >= start_date:
            w_active.add(row[1])
        else:
            w_net_at_start[row[1]] += float(row[3]) if row[2] == 'BUY' else -float(row[3])
    w_active |= {t for t, q in w_net_at_start.items() if q > 1e-9}

    il_yf_tickers = list({il_yf_map[s] for s in il_active if s in il_yf_map})
    w_tickers_valid = [t for t in w_active if phs.valid_yf_ticker(t)]

    # ── 3. Ensure the cache covers the period, then read it (indexed SQL) ─────
    window_start = start_date - timedelta(days=7)
    phs.ensure_coverage(db, il_yf_tickers, 'israeli', window_start, end_date)
    phs.ensure_coverage(db, w_tickers_valid, 'world', window_start, end_date)
    if w_tickers_valid:
        phs.ensure_fx_coverage(db, window_start, end_date)

    all_series = phs.get_price_series(
        db, il_yf_tickers + w_tickers_valid + ([phs.FX_TICKER] if w_tickers_valid else []),
        window_start, end_date,
    )
    il_prices = {t: all_series.get(t, {}) for t in il_yf_tickers}    # ILS
    w_prices = {t: all_series.get(t, {}) for t in w_tickers_valid}   # USD
    fx_series: dict[date, float] = all_series.get(phs.FX_TICKER, {})

    def _fx_at(d: date) -> float:
        return _fx_lookup(fx_series, d, db)

    _price_at = _price_at_or_before

    # ── 4. Compute running holdings tally ─────────────────────────────────────
    # Index transactions by date for fast forward-scan
    from collections import defaultdict

    il_tx_by_date: dict[date, list] = defaultdict(list)
    for row in il_all:
        il_tx_by_date[row[0]].append(row)   # (date, symbol, yf_ticker, type, qty)

    w_tx_by_date: dict[date, list] = defaultdict(list)
    for row in w_all:
        w_tx_by_date[row[0]].append(row)    # (date, ticker, type, qty)

    # ── 5. Determine trading days: union of dates with price data ─────────────
    all_price_dates: set[date] = set()
    for d_map in il_prices.values():
        all_price_dates.update(d_map.keys())
    for d_map in w_prices.values():
        all_price_dates.update(d_map.keys())
    if not all_price_dates:
        return {"points": [], "currency": "ILS", "market": market}

    trading_days = sorted(d for d in all_price_dates if start_date <= d <= end_date)

    # ── 6. Walk forward through trading days ──────────────────────────────────
    il_holdings: dict[str, float] = defaultdict(float)   # symbol → qty
    w_holdings: dict[str, float] = defaultdict(float)    # ticker → qty

    # Apply all transactions BEFORE start_date (to know what was held at period open)
    pre_start_il = sorted(d for d in il_tx_by_date if d < start_date)
    for d in pre_start_il:
        for row in il_tx_by_date[d]:
            sym, qty, tx_type = row[1], float(row[4]), row[3]
            il_holdings[sym] += qty if tx_type == 'BUY' else -qty

    pre_start_w = sorted(d for d in w_tx_by_date if d < start_date)
    for d in pre_start_w:
        for row in w_tx_by_date[d]:
            ticker, qty, tx_type = row[1], float(row[3]), row[2]
            w_holdings[ticker] += qty if tx_type == 'BUY' else -qty

    points = []
    prev_day: Optional[date] = None

    for day in trading_days:
        # Apply any transactions that happened ON this day (or any gap days since prev)
        from_day = (prev_day + timedelta(days=1)) if prev_day else start_date
        for tx_day in sorted(d for d in il_tx_by_date if from_day <= d <= day):
            for row in il_tx_by_date[tx_day]:
                sym, qty, tx_type = row[1], float(row[4]), row[3]
                il_holdings[sym] += qty if tx_type == 'BUY' else -qty
        for tx_day in sorted(d for d in w_tx_by_date if from_day <= d <= day):
            for row in w_tx_by_date[tx_day]:
                ticker, qty, tx_type = row[1], float(row[3]), row[2]
                w_holdings[ticker] += qty if tx_type == 'BUY' else -qty

        # Value Israeli holdings (cache stores ILS)
        il_value = 0.0
        for sym, qty in il_holdings.items():
            if qty <= 0:
                continue
            yf_ticker = il_yf_map.get(sym)
            if not yf_ticker:
                continue
            p = _price_at(il_prices.get(yf_ticker, {}), day)
            if p:
                il_value += qty * p

        # Value world holdings (USD → ILS)
        w_value = 0.0
        fx = _fx_at(day) if w_holdings else 1.0
        for ticker, qty in w_holdings.items():
            if qty <= 0:
                continue
            p = _price_at(w_prices.get(ticker, {}), day)
            if p:
                w_value += qty * p * fx

        points.append({
            "date": str(day),
            "total_ils": round(il_value + w_value, 2),
            "israeli_ils": round(il_value, 2),
            "world_ils": round(w_value, 2),
        })
        prev_day = day

    # ── 7. Benchmark overlays, scaled to the portfolio's period-start value ──
    requested_bm = [b.strip() for b in benchmarks.split(",") if b.strip() in BENCHMARK_TICKERS]
    if requested_bm and points:
        bm_tickers = [BENCHMARK_TICKERS[b] for b in requested_bm]
        phs.ensure_coverage(db, bm_tickers, 'benchmark', window_start, end_date)
        bm_series = phs.get_price_series(db, bm_tickers, window_start, end_date)
        base_total = points[0]["total_ils"]
        first_day = date.fromisoformat(points[0]["date"])
        for b in requested_bm:
            s = bm_series.get(BENCHMARK_TICKERS[b], {})
            base_bench = _price_at_or_before(s, first_day)
            if not base_bench or base_total <= 0:
                continue
            for pt in points:
                v = _price_at_or_before(s, date.fromisoformat(pt["date"]))
                if v:
                    pt[f"bm_{b}"] = round(base_total * v / base_bench, 2)

    return {"points": points, "currency": "ILS", "market": market}


@router.get("/analytics/stock")
def get_stock_analytics(
    symbol: str = Query(..., description="Stock symbol (israeli) or ticker (world)"),
    market: str = Query(..., pattern="^(israeli|world)$"),
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Single-stock drill-down: daily position value from the price cache,
    trades in the period, and per-stock realized P&L / dividends.
    """
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    from app.services import price_history_service as phs
    from collections import defaultdict

    uid = str(current_user.id)

    # ── All transactions for this stock up to end (for quantity replay) ───────
    if market == "israeli":
        txns = db.execute(text("""
            SELECT t.transaction_date, t.transaction_type,
                   COALESCE(t.quantity, 0)::float, COALESCE(t.price, 0)::float,
                   COALESCE(t.total_value, 0)::float, COALESCE(t.realized_pl, 0)::float,
                   COALESCE(s.yfinance_ticker, t.symbol || '.TA') AS yf_ticker
            FROM israeli_stock_transactions t
            LEFT JOIN israeli_stocks s ON s.symbol = t.symbol
            WHERE t.user_id = :uid AND t.symbol = :sym
              AND t.transaction_type IN ('BUY', 'SELL')
              AND t.transaction_date <= :e
            ORDER BY t.transaction_date, t.id
        """), {"uid": uid, "sym": symbol, "e": end_date}).fetchall()
    else:
        txns = db.execute(text("""
            SELECT transaction_date, transaction_type,
                   COALESCE(quantity, 0)::float, COALESCE(price, 0)::float,
                   COALESCE(total_value, 0)::float, COALESCE(realized_pl, 0)::float,
                   ticker AS yf_ticker
            FROM world_stock_transactions
            WHERE user_id = :uid AND ticker = :sym
              AND transaction_type IN ('BUY', 'SELL')
              AND transaction_date <= :e
            ORDER BY transaction_date, id
        """), {"uid": uid, "sym": symbol, "e": end_date}).fetchall()

    if not txns:
        raise HTTPException(status_code=404, detail=f"No transactions for {symbol}")

    yf_ticker = txns[0][6]
    window_start = start_date - timedelta(days=7)

    phs.ensure_coverage(db, [yf_ticker], market, window_start, end_date)
    fx_series: dict = {}
    if market == "world":
        phs.ensure_fx_coverage(db, window_start, end_date)
        fx_series = phs.get_price_series(
            db, [phs.FX_TICKER], window_start, end_date
        ).get(phs.FX_TICKER, {})
    prices = phs.get_price_series(db, [yf_ticker], window_start, end_date).get(yf_ticker, {})

    # ── Daily value series: replay quantities across trading days ─────────────
    tx_by_date: dict = defaultdict(list)
    for t in txns:
        tx_by_date[t[0]].append(t)

    qty = 0.0
    for t in txns:
        if t[0] < start_date:
            qty += t[2] if t[1] == 'BUY' else -t[2]

    trading_days = sorted(d for d in prices if start_date <= d <= end_date)
    points = []
    prev_day = None
    for day in trading_days:
        from_day = (prev_day + timedelta(days=1)) if prev_day else start_date
        for tx_day in sorted(d for d in tx_by_date if from_day <= d <= day):
            for t in tx_by_date[tx_day]:
                qty += t[2] if t[1] == 'BUY' else -t[2]
        close = prices[day]
        fx = _fx_lookup(fx_series, day, db) if market == "world" else 1.0
        points.append({
            "date": str(day),
            "close": round(close, 4),
            "qty": qty,
            "value_ils": round(qty * close * fx, 2),
        })
        prev_day = day

    # ── Trades within the period (for chart markers + list) ───────────────────
    trades = []
    realized_pl_ils = 0.0
    for t in txns:
        if start_date <= t[0] <= end_date:
            fx = _fx_lookup(fx_series, t[0], db) if market == "world" else 1.0
            pl_ils = round(t[5] * fx, 2)
            trades.append({
                "date": str(t[0]), "type": t[1], "quantity": t[2],
                "price": t[3], "total_value_ils": round(t[4] * fx, 2),
                "realized_pl_ils": pl_ils,
            })
            if t[1] == 'SELL':
                realized_pl_ils += pl_ils

    # ── Dividends for this stock in period ────────────────────────────────────
    dividends_net_ils = 0.0
    if market == "israeli":
        row = db.execute(text("""
            SELECT COALESCE(SUM(amount - COALESCE(tax, 0)), 0)
            FROM israeli_dividends
            WHERE user_id = :uid AND symbol = :sym AND payment_date BETWEEN :s AND :e
        """), {"uid": uid, "sym": symbol, "s": start_date, "e": end_date}).scalar()
        dividends_net_ils = float(row or 0)
    else:
        div_rows = db.execute(text("""
            SELECT payment_date, COALESCE(net_amount, amount - COALESCE(tax, 0))
            FROM world_dividends
            WHERE user_id = :uid AND ticker = :sym AND payment_date BETWEEN :s AND :e
        """), {"uid": uid, "sym": symbol, "s": start_date, "e": end_date}).fetchall()
        for d, net in div_rows:
            dividends_net_ils += float(net or 0) * _fx_lookup(fx_series, d, db)

    first_pt = next((p for p in points if p["value_ils"] > 0), None)
    last_pt = points[-1] if points else None
    return {
        "symbol": symbol,
        "market": market,
        "points": points,
        "trades": trades,
        "summary": {
            "current_qty": qty,
            "start_value_ils": first_pt["value_ils"] if first_pt else 0,
            "end_value_ils": last_pt["value_ils"] if last_pt else 0,
            "realized_pl_ils": round(realized_pl_ils, 2),
            "dividends_net_ils": round(dividends_net_ils, 2),
        },
    }


@router.get("/analytics/dividends")
def get_dividend_history(
    start: str = Query(...),
    end: str = Query(...),
    market: str = Query("all", pattern="^(all|israeli|world)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Dividend payments in the period (world converted to ILS per payment date)."""
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    from app.services import price_history_service as phs

    uid = str(current_user.id)
    first_txn = _first_transaction_date(uid, market, db)
    if first_txn and start_date < first_txn:
        start_date = first_txn

    items = []
    if market in ("all", "israeli"):
        rows = db.execute(text("""
            SELECT payment_date, symbol, amount - COALESCE(tax, 0)
            FROM israeli_dividends
            WHERE user_id = :uid AND payment_date BETWEEN :s AND :e
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for d, sym, net in rows:
            items.append({"date": str(d), "symbol": sym, "market": "israeli",
                          "net_ils": round(float(net or 0), 2)})

    if market in ("all", "world"):
        phs.ensure_fx_coverage(db, start_date - timedelta(days=7), end_date)
        fx_series = phs.get_price_series(
            db, [phs.FX_TICKER], start_date - timedelta(days=7), end_date
        ).get(phs.FX_TICKER, {})
        rows = db.execute(text("""
            SELECT payment_date, ticker,
                   COALESCE(net_amount, amount - COALESCE(tax, 0)), exchange_rate
            FROM world_dividends
            WHERE user_id = :uid AND payment_date BETWEEN :s AND :e
        """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()
        for d, tk, net, ex in rows:
            rate = float(ex) if ex else _fx_lookup(fx_series, d, db)
            items.append({"date": str(d), "symbol": tk, "market": "world",
                          "net_ils": round(float(net or 0) * rate, 2)})

    items.sort(key=lambda x: x["date"])
    running = 0.0
    for it in items:
        running += it["net_ils"]
        it["cumulative_ils"] = round(running, 2)

    return {"items": items, "total_net_ils": round(running, 2), "market": market}


@router.get("/analytics/overview")
def get_portfolio_overview(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    All-time portfolio vitals, independent of any period selection.
    Everything in ILS; world amounts converted per transaction date.
    """
    from app.services import price_history_service as phs
    from scipy.optimize import brentq
    from collections import defaultdict
    import math

    uid = str(current_user.id)
    today = date.today()

    first_txn = _first_transaction_date(uid, "all", db)
    if not first_txn:
        raise HTTPException(status_code=404, detail="No transactions")

    # FX series covering full history (for world ILS conversion fallbacks)
    phs.ensure_fx_coverage(db, first_txn - timedelta(days=7), today)
    fx_series = phs.get_price_series(
        db, [phs.FX_TICKER], first_txn - timedelta(days=7), today
    ).get(phs.FX_TICKER, {})
    fx_now = _fx_lookup(fx_series, today, db)

    # ── Load every BUY/SELL in ILS ─────────────────────────────────────────────
    il_rows = db.execute(text("""
        SELECT transaction_date, symbol, transaction_type,
               COALESCE(quantity, 0)::float, COALESCE(total_value, 0)::float,
               COALESCE(realized_pl, 0)::float, COALESCE(commission, 0)::float,
               COALESCE(tax, 0)::float
        FROM israeli_stock_transactions
        WHERE user_id = :uid AND transaction_type IN ('BUY', 'SELL')
        ORDER BY transaction_date, id
    """), {"uid": uid}).fetchall()

    w_rows = db.execute(text("""
        SELECT transaction_date, ticker, transaction_type,
               COALESCE(quantity, 0)::float, COALESCE(total_value, 0)::float,
               COALESCE(realized_pl, 0)::float, COALESCE(commission, 0)::float,
               COALESCE(tax, 0)::float, exchange_rate
        FROM world_stock_transactions
        WHERE user_id = :uid AND transaction_type IN ('BUY', 'SELL')
        ORDER BY transaction_date, id
    """), {"uid": uid}).fetchall()

    # Normalize: (date, market, symbol, type, qty, value_ils, realized_pl_ils, fees_ils, tax_ils)
    txns = []
    for r in il_rows:
        txns.append((r[0], "israeli", r[1], r[2], r[3], r[4], r[5], r[6], r[7]))
    for r in w_rows:
        rate = float(r[8]) if r[8] else _fx_lookup(fx_series, r[0], db)
        txns.append((r[0], "world", r[1], r[2], r[3], r[4] * rate, r[5] * rate, r[6] * rate, r[7] * rate))
    txns.sort(key=lambda t: t[0])

    total_buys = sum(t[5] for t in txns if t[3] == 'BUY')
    total_sells = sum(t[5] for t in txns if t[3] == 'SELL')
    net_invested = total_buys - total_sells
    total_fees = sum(t[7] for t in txns)
    txn_tax = sum(t[8] for t in txns)

    # ── Current value (live prices) ────────────────────────────────────────────
    holdings = []   # (market, symbol, value_ils, purchase_cost_ils)
    for sym, val, cost in db.execute(text("""
        SELECT h.symbol,
               h.quantity * COALESCE(sp.current_price, h.last_price),
               h.purchase_cost
        FROM israeli_stock_holdings h
        LEFT JOIN stock_prices sp ON sp.ticker = h.symbol AND sp.market = 'israeli'
        WHERE h.user_id = :uid AND h.quantity > 0
    """), {"uid": uid}).fetchall():
        holdings.append(("israeli", sym, float(val or 0), float(cost or 0)))
    for tk, val, cost in db.execute(text("""
        SELECT h.ticker,
               h.quantity * COALESCE(sp.current_price, h.last_price),
               h.purchase_cost
        FROM world_stock_holdings h
        LEFT JOIN stock_prices sp ON sp.ticker = h.ticker AND sp.market = 'world'
        WHERE h.user_id = :uid AND h.quantity > 0
    """), {"uid": uid}).fetchall():
        holdings.append(("world", tk, float(val or 0) * fx_now, float(cost or 0) * fx_now))

    current_value = sum(h[2] for h in holdings)
    israeli_value = sum(h[2] for h in holdings if h[0] == "israeli")
    world_value = current_value - israeli_value

    # ── Dividends (ILS) ────────────────────────────────────────────────────────
    div_events = []   # (date, market, symbol, net_ils)
    for d, sym, net in db.execute(text("""
        SELECT payment_date, symbol, amount - COALESCE(tax, 0)
        FROM israeli_dividends WHERE user_id = :uid
    """), {"uid": uid}).fetchall():
        div_events.append((d, "israeli", sym, float(net or 0)))
    for d, tk, net, ex in db.execute(text("""
        SELECT payment_date, ticker,
               COALESCE(net_amount, amount - COALESCE(tax, 0)), exchange_rate
        FROM world_dividends WHERE user_id = :uid
    """), {"uid": uid}).fetchall():
        rate = float(ex) if ex else _fx_lookup(fx_series, d, db)
        div_events.append((d, "world", tk, float(net or 0) * rate))

    div_all_time = sum(e[3] for e in div_events)
    ttm_cutoff = today - timedelta(days=365)
    div_ttm = sum(e[3] for e in div_events if e[0] >= ttm_cutoff)
    div_tax_il = db.execute(text(
        "SELECT COALESCE(SUM(COALESCE(tax,0)),0) FROM israeli_dividends WHERE user_id=:uid"
    ), {"uid": uid}).scalar() or 0
    div_tax_w_rows = db.execute(text(
        "SELECT payment_date, COALESCE(tax,0), exchange_rate FROM world_dividends WHERE user_id=:uid AND COALESCE(tax,0) <> 0"
    ), {"uid": uid}).fetchall()
    div_tax = float(div_tax_il) + sum(
        float(t) * (float(ex) if ex else _fx_lookup(fx_series, d, db)) for d, t, ex in div_tax_w_rows
    )
    total_tax = txn_tax + div_tax

    # ── Total P&L ──────────────────────────────────────────────────────────────
    total_pl = current_value - net_invested + div_all_time
    total_pl_pct = (total_pl / net_invested * 100) if net_invested > 0 else None

    # ── Annualized money-weighted return (IRR) ─────────────────────────────────
    base = datetime.combine(first_txn, datetime.min.time())
    flows = [((datetime.combine(t[0], datetime.min.time()) - base).days,
              -t[5] if t[3] == 'BUY' else t[5]) for t in txns]
    flows += [((datetime.combine(e[0], datetime.min.time()) - base).days, e[3]) for e in div_events]
    days_now = max((datetime.utcnow() - base).days, 1)
    flows.append((days_now, current_value))

    def npv(rate):
        return sum(cf / (1 + rate) ** (d / 365.0) for d, cf in flows)

    irr_pct = None
    try:
        lo, hi = -0.9999, 10.0
        if npv(lo) * npv(hi) < 0:
            irr_pct = round(brentq(npv, lo, hi, maxiter=200, xtol=1e-8) * 100, 2)
    except Exception:
        pass

    # ── All-time daily series → drawdown, volatility, beta, best/worst month ──
    hist = get_portfolio_history(str(first_txn), str(today), "all", "", db, current_user)
    points = hist["points"]

    flow_by_date: dict = defaultdict(float)   # net money into securities per day
    for t in txns:
        flow_by_date[str(t[0])] += t[5] if t[3] == 'BUY' else -t[5]

    daily_returns = []       # flow-adjusted
    daily_dates = []
    max_dd = 0.0
    dd_peak_date = dd_trough_date = None
    peak_val, peak_date = 0.0, None
    prev = None
    for p in points:
        v = p["total_ils"]
        if prev is not None and prev["total_ils"] > 1000:
            f = flow_by_date.get(p["date"], 0.0)
            daily_returns.append((v - prev["total_ils"] - f) / prev["total_ils"])
            daily_dates.append(p["date"])
        if v > peak_val:
            peak_val, peak_date = v, p["date"]
        elif peak_val > 0:
            dd = (v - peak_val) / peak_val
            if dd < max_dd:
                max_dd, dd_peak_date, dd_trough_date = dd, peak_date, p["date"]
        prev = p

    vol_pct = None
    if len(daily_returns) > 20:
        mean = sum(daily_returns) / len(daily_returns)
        var = sum((r - mean) ** 2 for r in daily_returns) / (len(daily_returns) - 1)
        vol_pct = round(math.sqrt(var) * math.sqrt(252) * 100, 2)

    # Beta vs benchmarks
    beta = {}
    if len(daily_returns) > 20:
        bm_tickers = {"ta125": "^TA125.TA", "sp500": "^GSPC"}
        phs.ensure_coverage(db, list(bm_tickers.values()), 'benchmark', first_txn, today)
        bm_series_all = phs.get_price_series(db, list(bm_tickers.values()), first_txn, today)
        ret_by_date = dict(zip(daily_dates, daily_returns))
        for name, tk in bm_tickers.items():
            s = bm_series_all.get(tk, {})
            closes = sorted(s.items())
            pairs = []
            for (d0, c0), (d1, c1) in zip(closes, closes[1:]):
                pr = ret_by_date.get(str(d1))
                if pr is not None and c0 > 0:
                    pairs.append((pr, c1 / c0 - 1))
            if len(pairs) > 20:
                mp = sum(p for p, _ in pairs) / len(pairs)
                mb = sum(b for _, b in pairs) / len(pairs)
                cov = sum((p - mp) * (b - mb) for p, b in pairs) / (len(pairs) - 1)
                varb = sum((b - mb) ** 2 for _, b in pairs) / (len(pairs) - 1)
                if varb > 0:
                    beta[name] = round(cov / varb, 2)

    # Best/worst month (Modified Dietz, same as the frontend strip)
    last_of_month: dict = {}
    for p in points:
        last_of_month[p["date"][:7]] = p["total_ils"]
    month_flows: dict = defaultdict(float)
    for t in txns:
        month_flows[str(t[0])[:7]] += t[5] if t[3] == 'BUY' else -t[5]
    months = sorted(last_of_month)
    best_month = worst_month = None
    prev_v = points[0]["total_ils"] if points else 0
    for m in months:
        end_v = last_of_month[m]
        f = month_flows.get(m, 0.0)
        denom = prev_v + f / 2
        if denom > 1000:
            r = (end_v - prev_v - f) / denom * 100
            if best_month is None or r > best_month["return_pct"]:
                best_month = {"month": m, "return_pct": round(r, 2)}
            if worst_month is None or r < worst_month["return_pct"]:
                worst_month = {"month": m, "return_pct": round(r, 2)}
        prev_v = end_v

    # ── Win rate, profit factor ────────────────────────────────────────────────
    sells = [t for t in txns if t[3] == 'SELL' and t[6] != 0]
    wins = [t for t in sells if t[6] > 0]
    losses = [t for t in sells if t[6] < 0]
    gross_profit = sum(t[6] for t in wins)
    gross_loss = -sum(t[6] for t in losses)
    win_rate = round(len(wins) / len(sells) * 100, 1) if sells else None
    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else None

    # ── Average holding period (FIFO lot matching), winners vs losers ─────────
    lots: dict = defaultdict(list)    # (market, symbol) → [[date, qty], ...]
    win_days, win_w, loss_days, loss_w = 0.0, 0.0, 0.0, 0.0
    for t in txns:
        key = (t[1], t[2])
        if t[3] == 'BUY':
            lots[key].append([t[0], t[4]])
        else:
            remaining = t[4]
            weighted = 0.0
            matched = 0.0
            while remaining > 1e-9 and lots[key]:
                lot = lots[key][0]
                take = min(remaining, lot[1])
                weighted += take * (t[0] - lot[0]).days
                matched += take
                lot[1] -= take
                remaining -= take
                if lot[1] <= 1e-9:
                    lots[key].pop(0)
            if matched > 0:
                if t[6] >= 0:
                    win_days += weighted
                    win_w += matched
                else:
                    loss_days += weighted
                    loss_w += matched
    avg_hold_winners = round(win_days / win_w, 1) if win_w else None
    avg_hold_losers = round(loss_days / loss_w, 1) if loss_w else None

    # ── Best / worst stock all-time (realized + unrealized + dividends) ───────
    stock_pl: dict = defaultdict(float)
    for t in txns:
        if t[3] == 'SELL':
            stock_pl[(t[1], t[2])] += t[6]
    for mk, sym, val, cost in holdings:
        stock_pl[(mk, sym)] += val - cost
    for _, mk, sym, net in div_events:
        stock_pl[(mk, sym)] += net
    best_stock = worst_stock = None
    if stock_pl:
        (bmk, bsym), bpl = max(stock_pl.items(), key=lambda x: x[1])
        (wmk, wsym), wpl = min(stock_pl.items(), key=lambda x: x[1])
        best_stock = {"symbol": bsym, "market": bmk, "pl_ils": round(bpl, 2)}
        worst_stock = {"symbol": wsym, "market": wmk, "pl_ils": round(wpl, 2)}

    # ── Turnover ───────────────────────────────────────────────────────────────
    years = max(days_now / 365.0, 0.25)
    avg_value = (sum(p["total_ils"] for p in points) / len(points)) if points else 0
    turnover_pct = round(((total_buys + total_sells) / 2 / years) / avg_value * 100, 1) if avg_value > 0 else None

    # ── Concentration & exposure ───────────────────────────────────────────────
    top_symbol = top_pct = top5_pct = None
    if current_value > 0 and holdings:
        ranked = sorted(holdings, key=lambda h: h[2], reverse=True)
        top_symbol = ranked[0][1]
        top_pct = round(ranked[0][2] / current_value * 100, 1)
        top5_pct = round(sum(h[2] for h in ranked[:5]) / current_value * 100, 1)

    return {
        "inception": str(first_txn),
        "days_active": days_now,
        "invested": {
            "total_buys_ils": round(total_buys, 2),
            "total_sells_ils": round(total_sells, 2),
            "net_invested_ils": round(net_invested, 2),
            "current_value_ils": round(current_value, 2),
        },
        "total_pl": {
            "ils": round(total_pl, 2),
            "pct": round(total_pl_pct, 2) if total_pl_pct is not None else None,
        },
        "annualized_irr_pct": irr_pct,
        "best_month": best_month,
        "worst_month": worst_month,
        "win_rate": {
            "wins": len(wins), "losses": len(losses),
            "rate_pct": win_rate, "profit_factor": profit_factor,
        },
        "holding_period": {
            "avg_days_winners": avg_hold_winners,
            "avg_days_losers": avg_hold_losers,
        },
        "best_stock": best_stock,
        "worst_stock": worst_stock,
        "turnover_annual_pct": turnover_pct,
        "max_drawdown": {
            "pct": round(max_dd * 100, 2),
            "peak_date": dd_peak_date,
            "trough_date": dd_trough_date,
        },
        "volatility_annual_pct": vol_pct,
        "beta": beta,
        "dividends": {
            "all_time_ils": round(div_all_time, 2),
            "ttm_ils": round(div_ttm, 2),
            "ttm_yield_pct": round(div_ttm / current_value * 100, 2) if current_value > 0 else None,
        },
        "costs": {
            "fees_ils": round(total_fees, 2),
            "taxes_ils": round(total_tax, 2),
            "pct_of_profit": round((total_fees + total_tax) / total_pl * 100, 1) if total_pl > 0 else None,
        },
        "concentration": {
            "top_symbol": top_symbol, "top_pct": top_pct, "top5_pct": top5_pct,
        },
        "exposure": {
            "israeli_pct": round(israeli_value / current_value * 100, 1) if current_value > 0 else None,
            "world_pct": round(world_value / current_value * 100, 1) if current_value > 0 else None,
        },
    }


@router.get("/stock-indicators")
def get_stock_indicators(
    symbol: str = Query(...),
    market: str = Query(..., pattern="^(israeli|world)$"),
    period: str = Query("1y", pattern="^(3m|6m|1y|2y)$"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Technical indicator pack for a single stock: SMA 20/50/150/200, EMA 9/21,
    RSI(14), MACD(12/26/9), Bollinger(20,2σ), 52-week levels — plus per-
    indicator bullish/bearish/neutral states for the signal strip.
    Computed from cached daily closes (israeli in ILS, world in USD).
    """
    from app.services import price_history_service as phs
    from app.services import technical_indicators as ti

    today = date.today()
    display_days = {"3m": 92, "6m": 183, "1y": 365, "2y": 730}[period]
    display_start = today - timedelta(days=display_days)
    # SMA200 needs ~200 trading days (~290 calendar) before the first visible
    # point; fetch a generous warm-up window
    fetch_start = display_start - timedelta(days=420)

    # Resolve yfinance ticker
    if market == "israeli":
        row = db.execute(text(
            "SELECT yfinance_ticker FROM israeli_stocks WHERE symbol = :s"
        ), {"s": symbol}).fetchone()
        yf_ticker = row[0] if row and row[0] else f"{symbol}.TA"
    else:
        yf_ticker = symbol
        if not phs.valid_yf_ticker(yf_ticker):
            raise HTTPException(status_code=400, detail=f"Invalid ticker: {symbol}")

    phs.ensure_ohlcv(db, yf_ticker, market, fetch_start, today)
    series = phs.get_ohlcv_series(db, yf_ticker, fetch_start, today)
    if len(series) < 30:
        raise HTTPException(status_code=404, detail=f"Not enough price history for {symbol}")

    dates = sorted(series.keys())
    closes = [series[d]["c"] for d in dates]
    highs = [series[d]["h"] for d in dates]
    lows = [series[d]["l"] for d in dates]
    volumes = [series[d]["v"] for d in dates]

    sma20 = ti.sma(closes, 20)
    sma50 = ti.sma(closes, 50)
    sma150 = ti.sma(closes, 150)
    sma200 = ti.sma(closes, 200)
    ema9 = ti.ema(closes, 9)
    ema21 = ti.ema(closes, 21)
    rsi14 = ti.rsi(closes, 14)
    macd_line, signal_line, macd_hist = ti.macd(closes)
    bb_upper, bb_mid, bb_lower = ti.bollinger(closes)
    atr14 = ti.atr(highs, lows, closes, 14)
    obv_series = ti.obv(closes, volumes)

    # 52-week levels over the last ~252 trading days
    tail = closes[-252:]
    high_52w = max(tail) if tail else None
    low_52w = min(tail) if tail else None

    signals = ti.build_signals(
        closes, sma50, sma150, sma200, rsi14,
        macd_line, signal_line, bb_upper, bb_lower, high_52w, low_52w,
    )
    signals.append(ti.build_volume_signal(closes, volumes, obv_series))

    # Risk block: ATR-based stop suggestion (context, not a buy/sell signal)
    last_atr = atr14[-1]
    last_close = closes[-1]
    risk = None
    if last_atr is not None and last_close > 0:
        risk = {
            "atr": round(last_atr, 4),
            "atr_pct": round(last_atr / last_close * 100, 2),
            "suggested_stop": round(last_close - 2 * last_atr, 4),
        }
    summary = {
        "bullish": sum(1 for s in signals if s["state"] == "bullish"),
        "bearish": sum(1 for s in signals if s["state"] == "bearish"),
        "neutral": sum(1 for s in signals if s["state"] == "neutral"),
    }

    def rnd(v: Optional[float], p: int = 4) -> Optional[float]:
        return round(v, p) if v is not None else None

    # Trim warm-up: only return the display window
    out_points = []
    for i, d in enumerate(dates):
        if d < display_start:
            continue
        out_points.append({
            "date": str(d),
            "close": rnd(closes[i]),
            "sma20": rnd(sma20[i]),
            "sma50": rnd(sma50[i]),
            "sma150": rnd(sma150[i]),
            "sma200": rnd(sma200[i]),
            "ema9": rnd(ema9[i]),
            "ema21": rnd(ema21[i]),
            "bb_upper": rnd(bb_upper[i]),
            "bb_lower": rnd(bb_lower[i]),
            "rsi": rnd(rsi14[i], 2),
            "macd": rnd(macd_line[i]),
            "macd_signal": rnd(signal_line[i]),
            "macd_hist": rnd(macd_hist[i]),
            "atr": rnd(atr14[i]),
            "volume": volumes[i],
        })

    return {
        "symbol": symbol,
        "market": market,
        "currency": "ILS" if market == "israeli" else "USD",
        "period": period,
        "points": out_points,
        "levels": {"high_52w": rnd(high_52w), "low_52w": rnd(low_52w)},
        "signals": signals,
        "summary": summary,
        "risk": risk,
    }


@router.get("/holdings-rsi")
def get_holdings_rsi(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Batch RSI(14) for all of the user's current holdings — feeds the small
    badge next to each holding row. {israeli: {symbol: rsi}, world: {ticker: rsi}}
    """
    from app.services import price_history_service as phs
    from app.services import technical_indicators as ti

    uid = str(current_user.id)
    today = date.today()
    start = today - timedelta(days=150)   # ≥ ~100 trading days for stable Wilder RSI

    il_rows = db.execute(text("""
        SELECT h.symbol, COALESCE(s.yfinance_ticker, h.symbol || '.TA')
        FROM israeli_stock_holdings h
        LEFT JOIN israeli_stocks s ON s.symbol = h.symbol
        WHERE h.user_id = :uid AND h.quantity > 0
    """), {"uid": uid}).fetchall()
    w_rows = db.execute(text("""
        SELECT ticker FROM world_stock_holdings
        WHERE user_id = :uid AND quantity > 0
    """), {"uid": uid}).fetchall()

    il_map = {r[0]: r[1] for r in il_rows}                      # symbol → yf
    w_tickers = [r[0] for r in w_rows if phs.valid_yf_ticker(r[0])]

    phs.ensure_coverage(db, list(il_map.values()), 'israeli', start, today)
    phs.ensure_coverage(db, w_tickers, 'world', start, today)
    series = phs.get_price_series(
        db, list(il_map.values()) + w_tickers, start, today
    )

    def last_rsi(yf_ticker: str) -> Optional[float]:
        s = series.get(yf_ticker, {})
        if len(s) < 20:
            return None
        closes = [s[d] for d in sorted(s.keys())]
        r = ti.rsi(closes, 14)
        return round(r[-1], 1) if r[-1] is not None else None

    return {
        "israeli": {sym: last_rsi(yf) for sym, yf in il_map.items()},
        "world": {tk: last_rsi(tk) for tk in w_tickers},
    }
