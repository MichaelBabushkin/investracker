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
            SELECT transaction_date::text, transaction_type, symbol, company_name,
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
                "date": row[0], "type": row[1], "symbol": row[2],
                "company_name": row[3], "quantity": row[4], "price": row[5],
                "total_value_ils": row[6], "commission": row[7],
                "realized_pl": row[8], "currency": row[9], "market": "israeli",
            })
            if row[1] == 'BUY':
                stats["buys"] += 1
                stats["buy_volume_ils"] += row[6]
            elif row[1] == 'SELL':
                stats["sells"] += 1
                stats["sell_volume_ils"] += row[6]
            stats["transaction_tax_ils"] += row[10]

    if want_w:
        w_txs = db.execute(text("""
            SELECT transaction_date::text, transaction_type, ticker AS symbol,
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
            rate = float(row[11]) if row[11] else _fx_lookup(fx_series, row[10], db)
            value_ils = round(row[6] * rate, 2)
            transactions.append({
                "date": row[0], "type": row[1], "symbol": row[2],
                "company_name": row[3], "quantity": row[4], "price": row[5],
                "total_value_ils": value_ils, "commission": row[7],
                "realized_pl": round(row[8] * rate, 2), "currency": row[9], "market": "world",
            })
            if row[1] == 'BUY':
                stats["buys"] += 1
                stats["buy_volume_ils"] += value_ils
            elif row[1] == 'SELL':
                stats["sells"] += 1
                stats["sell_volume_ils"] += value_ils
            stats["transaction_tax_ils"] += row[12] * rate
    transactions.sort(key=lambda t: t["date"], reverse=True)

    # ── Top / worst trades by realized P&L ────────────────────────────────────
    closed = [t for t in transactions if t["type"] == "SELL" and t["realized_pl"] != 0]
    closed_sorted = sorted(closed, key=lambda t: t["realized_pl"], reverse=True)
    top_trades = closed_sorted[:5]
    worst_trades = [t for t in closed_sorted[-5:] if t["realized_pl"] < 0][::-1]

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
        return_pct = round((change / base * 100), 2) if base else None
        portfolio_values = {
            "start": value_start,
            "end": value_end,
            "change_ils": round(change, 2),
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


@router.get("/analytics/history")
def get_portfolio_history(
    start: str = Query(...),
    end: str = Query(...),
    market: str = Query("all", pattern="^(all|israeli|world)$"),
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

    return {"points": points, "currency": "ILS", "market": market}
