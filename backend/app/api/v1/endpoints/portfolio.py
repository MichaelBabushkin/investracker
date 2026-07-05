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


def _fetch_historical_prices(tickers: list[str], target: date) -> dict[str, float]:
    """Return {ticker: close_price} at or before target date. Silently returns {} on failure."""
    if not tickers:
        return {}
    try:
        import yfinance as yf
        start = target - timedelta(days=7)
        end = target + timedelta(days=1)
        hist = yf.download(
            tickers, start=str(start), end=str(end),
            auto_adjust=True, progress=False, threads=True,
        )
        if hist.empty:
            return {}
        close = hist["Close"]
        # yfinance returns a Series (not DataFrame) when there is only one ticker
        if len(tickers) == 1:
            series = close.dropna()
            return {tickers[0]: float(series.iloc[-1])} if not series.empty else {}
        prices = {}
        for ticker in tickers:
            if ticker in close.columns:
                s = close[ticker].dropna()
                if not s.empty:
                    prices[ticker] = float(s.iloc[-1])
        return prices
    except Exception:
        return {}


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


def _portfolio_value_at(uid: str, target: date, db: Session, use_current: bool = False) -> Optional[dict]:
    """
    Compute portfolio ILS value at target date.
    use_current=True pulls from stock_prices table instead of yfinance.
    Returns None if prices are unavailable.
    """
    israeli_holdings, world_holdings = _reconstruct_holdings(uid, target, db)

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
        world_value = 0.0
        fx = _get_exchange_rate(target, db)
        world_value = sum(float(qty) * w_prices[tkr] * fx for tkr, qty in world_holdings if tkr in w_prices)

        return {
            "israeli_ils": round(israeli_value, 2),
            "world_ils": round(world_value, 2),
            "total_ils": round(israeli_value + world_value, 2),
            "source": "live",
        }

    # Fetch historical prices from yfinance
    il_tickers = [yf for _, yf, _ in israeli_holdings]
    w_tickers = [t for t, _ in world_holdings]
    all_tickers = il_tickers + w_tickers

    prices = _fetch_historical_prices(all_tickers, target)
    if not prices:
        return None

    fx = _get_exchange_rate(target, db)
    israeli_value = 0.0
    for symbol, yf_ticker, qty in israeli_holdings:
        p = prices.get(yf_ticker)
        if p:
            # yfinance .TA prices are in agorot → divide by 100 for ILS
            israeli_value += float(qty) * (p / 100.0)

    world_value = 0.0
    for ticker, qty in world_holdings:
        p = prices.get(ticker)
        if p:
            world_value += float(qty) * p * fx

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
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Period analytics: realized P&L, dividends, commissions, transaction list,
    and portfolio values at period start/end (via yfinance historical prices).
    """
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    uid = str(current_user.id)
    today = date.today()

    # ── Realized P&L ──────────────────────────────────────────────────────────
    il_pl = db.execute(text("""
        SELECT COALESCE(SUM(realized_pl), 0)
        FROM israeli_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'SELL'
          AND transaction_date BETWEEN :s AND :e
          AND realized_pl IS NOT NULL
    """), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0

    w_pl = db.execute(text("""
        SELECT COALESCE(SUM(realized_pl), 0)
        FROM world_stock_transactions
        WHERE user_id = :uid
          AND transaction_type = 'SELL'
          AND transaction_date BETWEEN :s AND :e
          AND realized_pl IS NOT NULL
    """), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0

    # ── Dividends ─────────────────────────────────────────────────────────────
    il_div = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tax, 0)), 0)
        FROM israeli_dividends
        WHERE user_id = :uid AND payment_date BETWEEN :s AND :e
    """), {"uid": uid, "s": start_date, "e": end_date}).fetchone()
    il_div_gross, il_div_tax = float(il_div[0]), float(il_div[1])

    w_div = db.execute(text("""
        SELECT COALESCE(SUM(amount), 0), COALESCE(SUM(COALESCE(tax, 0)), 0),
               COALESCE(SUM(COALESCE(net_amount, amount)), 0)
        FROM world_dividends
        WHERE user_id = :uid AND payment_date BETWEEN :s AND :e
    """), {"uid": uid, "s": start_date, "e": end_date}).fetchone()
    w_div_gross, w_div_tax, w_div_net = float(w_div[0]), float(w_div[1]), float(w_div[2])

    # ── Commissions ───────────────────────────────────────────────────────────
    il_comm = db.execute(text("""
        SELECT COALESCE(SUM(COALESCE(commission, 0)), 0)
        FROM israeli_stock_transactions
        WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
    """), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0

    w_comm = db.execute(text("""
        SELECT COALESCE(SUM(COALESCE(commission, 0)), 0)
        FROM world_stock_transactions
        WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
    """), {"uid": uid, "s": start_date, "e": end_date}).scalar() or 0

    # ── Transaction list ──────────────────────────────────────────────────────
    il_txs = db.execute(text("""
        SELECT transaction_date::text, transaction_type, symbol, company_name,
               COALESCE(quantity, 0)::float, COALESCE(price, 0)::float,
               COALESCE(total_value, 0)::float, COALESCE(commission, 0)::float,
               COALESCE(realized_pl, 0)::float, currency
        FROM israeli_stock_transactions
        WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
        ORDER BY transaction_date DESC
    """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()

    w_txs = db.execute(text("""
        SELECT transaction_date::text, transaction_type, ticker AS symbol,
               ticker AS company_name,
               COALESCE(quantity, 0)::float, COALESCE(price, 0)::float,
               COALESCE(total_value, 0)::float, COALESCE(commission, 0)::float,
               COALESCE(realized_pl, 0)::float, 'USD' AS currency
        FROM world_stock_transactions
        WHERE user_id = :uid AND transaction_date BETWEEN :s AND :e
        ORDER BY transaction_date DESC
    """), {"uid": uid, "s": start_date, "e": end_date}).fetchall()

    transactions = []
    for row in il_txs:
        transactions.append({
            "date": row[0], "type": row[1], "symbol": row[2],
            "company_name": row[3], "quantity": row[4], "price": row[5],
            "total_value_ils": row[6], "commission": row[7],
            "realized_pl": row[8], "currency": row[9], "market": "israeli",
        })
    for row in w_txs:
        transactions.append({
            "date": row[0], "type": row[1], "symbol": row[2],
            "company_name": row[3], "quantity": row[4], "price": row[5],
            "total_value_ils": row[6], "commission": row[7],
            "realized_pl": row[8], "currency": row[9], "market": "world",
        })
    transactions.sort(key=lambda t: t["date"], reverse=True)

    # ── Portfolio values ───────────────────────────────────────────────────────
    value_start = _portfolio_value_at(uid, start_date - timedelta(days=1), db, use_current=False)
    value_end = _portfolio_value_at(
        uid, end_date, db,
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
    }


@router.get("/analytics/history")
def get_portfolio_history(
    start: str = Query(...),
    end: str = Query(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Returns daily portfolio values for each trading day in [start, end].
    One yfinance download per market fetches the entire price series at once.
    """
    try:
        start_date = date.fromisoformat(start)
        end_date = date.fromisoformat(end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Dates must be YYYY-MM-DD")

    uid = str(current_user.id)
    today = date.today()

    # ── 1. Collect every transaction the user ever made (up to end_date) ──────
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

    w_all = db.execute(text("""
        SELECT transaction_date, ticker, transaction_type,
               COALESCE(quantity, 0) AS qty
        FROM world_stock_transactions
        WHERE user_id = :uid
          AND transaction_type IN ('BUY', 'SELL')
          AND transaction_date <= :e
        ORDER BY transaction_date, id
    """), {"uid": uid, "e": end_date}).fetchall()

    # ── 2. Build lookup: (symbol → yf_ticker) and unique ticker sets ──────────
    il_yf_map: dict[str, str] = {}     # symbol → yfinance ticker
    for row in il_all:
        il_yf_map[row[1]] = row[2]    # symbol → yf_ticker

    il_yf_tickers = list(set(il_yf_map.values()))
    w_tickers_all = list(set(row[1] for row in w_all))

    # Filter obviously invalid world tickers before hitting yfinance
    def _valid_ticker(t: str) -> bool:
        if not t or len(t) > 12:
            return False
        if any(c in t for c in (' ', '/', '\\', '(', ')', 'א', 'ב', 'ג', 'ד')):
            return False
        try:
            int(t)   # pure numbers are not valid tickers
            return False
        except ValueError:
            pass
        return True

    w_tickers_valid = [t for t in w_tickers_all if _valid_ticker(t)]

    # ── 3. Download full price history in one call per market ─────────────────
    def _download_history(tickers: list[str], s: date, e: date) -> dict[str, dict[date, float]]:
        """Returns {ticker: {date: close_price}}"""
        if not tickers:
            return {}
        try:
            import yfinance as yf
            import pandas as pd
            fetch_end = min(e + timedelta(days=1), today + timedelta(days=1))
            hist = yf.download(
                tickers, start=str(s), end=str(fetch_end),
                auto_adjust=True, progress=False, threads=True,
            )
            if hist.empty:
                return {}
            close = hist["Close"]
            result: dict[str, dict[date, float]] = {}
            if len(tickers) == 1:
                # Series, not DataFrame
                for idx, val in close.items():
                    if pd.notna(val):
                        d = idx.date() if hasattr(idx, 'date') else idx
                        result.setdefault(tickers[0], {})[d] = float(val)
            else:
                for ticker in tickers:
                    if ticker not in close.columns:
                        continue
                    for idx, val in close[ticker].items():
                        if pd.notna(val):
                            d = idx.date() if hasattr(idx, 'date') else idx
                            result.setdefault(ticker, {})[d] = float(val)
            return result
        except Exception:
            return {}

    il_prices = _download_history(il_yf_tickers, start_date - timedelta(days=7), end_date)
    w_prices = _download_history(w_tickers_valid, start_date - timedelta(days=7), end_date)

    # Also fetch USD/ILS rate history
    fx_history = _download_history(["USDILS=X"], start_date - timedelta(days=7), end_date)
    fx_series: dict[date, float] = fx_history.get("USDILS=X", {})

    def _fx_at(d: date) -> float:
        """Nearest available USD→ILS rate on or before d."""
        if fx_series:
            candidates = [(k, v) for k, v in fx_series.items() if k <= d]
            if candidates:
                return max(candidates, key=lambda x: x[0])[1]
        # Fall back to DB
        return _get_exchange_rate(d, db)

    def _price_at(price_dict: dict[date, float], d: date) -> Optional[float]:
        """Nearest available price on or before d (handles weekends/holidays)."""
        if d in price_dict:
            return price_dict[d]
        # Look back up to 5 days
        for delta in range(1, 6):
            candidate = d - timedelta(days=delta)
            if candidate in price_dict:
                return price_dict[candidate]
        return None

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
        return {"points": [], "currency": "ILS"}

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

        # Value Israeli holdings (agorot → ILS ÷ 100)
        il_value = 0.0
        for sym, qty in il_holdings.items():
            if qty <= 0:
                continue
            yf_ticker = il_yf_map.get(sym)
            if not yf_ticker:
                continue
            p = _price_at(il_prices.get(yf_ticker, {}), day)
            if p:
                il_value += qty * (p / 100.0)

        # Value world holdings (USD → ILS)
        fx = _fx_at(day)
        w_value = 0.0
        for ticker, qty in w_holdings.items():
            if qty <= 0 or not _valid_ticker(ticker):
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

    return {"points": points, "currency": "ILS"}
