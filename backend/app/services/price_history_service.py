"""
Daily-close price cache backed by the stock_price_history table.

Analytics never calls yfinance in the request path directly; it asks this
service to `ensure_coverage` for the tickers/date-range it needs. Missing
ranges are bulk-downloaded once and stored, so repeat requests are pure
indexed SQL.

Unit conventions match the rest of the DB:
  israeli → ILS (yfinance .TA closes are agorot → divided by 100 on insert)
  world   → USD
  fx      → ILS per USD (ticker 'USDILS=X')
"""
import logging
import re
from datetime import date, timedelta
from typing import Optional

from sqlalchemy import text
from sqlalchemy.orm import Session

logger = logging.getLogger(__name__)

FX_TICKER = "USDILS=X"

# Don't re-ask yfinance for a gap smaller than this (weekends/holidays create
# permanent 1-3 day holes in the calendar that will never fill)
_MIN_GAP_DAYS = 4

# Tickers yfinance returned nothing for this process lifetime (delisted,
# renamed, or garbage) — don't retry them on every request
_failed_tickers: set[str] = set()


def valid_yf_ticker(t: str) -> bool:
    """Filter out garbage tickers (Hebrew fragments, security numbers, names)."""
    if not t or len(t) > 12:
        return False
    if re.search(r'[^\x00-\x7F]', t):        # non-ASCII
        return False
    if any(c in t for c in (' ', '/', '\\', '(', ')')):
        return False
    if t.replace('.', '').isdigit():
        return False
    return True


def _download(tickers: list[str], start: date, end: date) -> dict[str, dict[date, float]]:
    """One bulk yfinance call. Returns {ticker: {date: close}}. Empty on failure."""
    if not tickers:
        return {}
    tickers = [t for t in tickers if t not in _failed_tickers]
    if not tickers:
        return {}
    try:
        import yfinance as yf
        import pandas as pd
        # auto_adjust=False: we want the ACTUAL close on each date for
        # valuation snapshots, not dividend/split-adjusted series
        hist = yf.download(
            tickers, start=str(start), end=str(end + timedelta(days=1)),
            auto_adjust=False, progress=False, threads=True,
        )
        if hist.empty:
            _failed_tickers.update(tickers)
            return {}
        close = hist["Close"]
        # Normalize to a DataFrame with one column per ticker: yfinance returns
        # a Series for a single string ticker, and a one-column DataFrame for a
        # single-element list
        if isinstance(close, pd.Series):
            close = close.to_frame(name=tickers[0])
        elif len(tickers) == 1 and tickers[0] not in close.columns:
            close.columns = [tickers[0]]
        result: dict[str, dict[date, float]] = {}
        for ticker in tickers:
            if ticker not in close.columns:
                continue
            for idx, val in close[ticker].items():
                if pd.notna(val):
                    result.setdefault(ticker, {})[idx.date()] = float(val)
        # Remember tickers that produced no data so we don't retry each request
        for t in tickers:
            if t not in result:
                _failed_tickers.add(t)
        return result
    except Exception as e:
        logger.warning(f"yfinance download failed for {tickers}: {e}")
        return {}


def _coverage(db: Session, tickers: list[str]) -> dict[str, tuple[Optional[date], Optional[date]]]:
    """{ticker: (min_date, max_date)} of stored rows; missing tickers absent."""
    if not tickers:
        return {}
    rows = db.execute(text("""
        SELECT ticker, MIN(date), MAX(date)
        FROM stock_price_history
        WHERE ticker = ANY(:t)
        GROUP BY ticker
    """), {"t": tickers}).fetchall()
    return {r[0]: (r[1], r[2]) for r in rows}


def _store(db: Session, market: str, prices: dict[str, dict[date, float]]) -> int:
    """Upsert downloaded closes. Israeli agorot → ILS."""
    inserted = 0
    for ticker, series in prices.items():
        divisor = 100.0 if market == 'israeli' else 1.0
        for d, close in series.items():
            db.execute(text("""
                INSERT INTO stock_price_history (ticker, market, date, close_price, created_at)
                VALUES (:tk, :mk, :d, :p, now())
                ON CONFLICT (ticker, date) DO NOTHING
            """), {"tk": ticker, "mk": market, "d": d, "p": close / divisor})
            inserted += 1
    return inserted


def ensure_coverage(
    db: Session,
    tickers: list[str],
    market: str,
    start: date,
    end: date,
) -> None:
    """
    Guarantee stock_price_history covers [start, end] for the given tickers,
    downloading only the missing head/tail ranges (grouped into one or two
    bulk yfinance calls for all tickers needing the same side).
    """
    tickers = [t for t in set(tickers) if valid_yf_ticker(t)]
    if not tickers:
        return
    end = min(end, date.today())
    if start > end:
        return

    cov = _coverage(db, tickers)

    need_full: list[str] = []        # nothing stored at all
    need_head: list[str] = []        # stored, but starts after `start`
    need_tail: list[str] = []        # stored, but ends before `end`

    for t in tickers:
        if t not in cov:
            need_full.append(t)
            continue
        lo, hi = cov[t]
        if (lo - start).days >= _MIN_GAP_DAYS:
            need_head.append(t)
        if (end - hi).days >= _MIN_GAP_DAYS:
            need_tail.append(t)

    dirty = False
    if need_full:
        prices = _download(need_full, start, end)
        dirty |= _store(db, market, prices) > 0
    if need_head:
        earliest = min(cov[t][0] for t in need_head)
        prices = _download(need_head, start, earliest - timedelta(days=1))
        dirty |= _store(db, market, prices) > 0
    if need_tail:
        latest = max(cov[t][1] for t in need_tail)
        prices = _download(need_tail, latest + timedelta(days=1), end)
        dirty |= _store(db, market, prices) > 0

    if dirty:
        db.commit()


def get_price_series(
    db: Session,
    tickers: list[str],
    start: date,
    end: date,
) -> dict[str, dict[date, float]]:
    """Read closes from the cache: {ticker: {date: close}}."""
    if not tickers:
        return {}
    rows = db.execute(text("""
        SELECT ticker, date, close_price
        FROM stock_price_history
        WHERE ticker = ANY(:t) AND date BETWEEN :s AND :e
        ORDER BY ticker, date
    """), {"t": list(tickers), "s": start, "e": end}).fetchall()
    result: dict[str, dict[date, float]] = {}
    for tk, d, p in rows:
        result.setdefault(tk, {})[d] = float(p)
    return result


def ensure_fx_coverage(db: Session, start: date, end: date) -> None:
    """USD→ILS daily rates via the same cache."""
    tickers = [FX_TICKER]
    end = min(end, date.today())
    if start > end:
        return
    cov = _coverage(db, tickers)
    if FX_TICKER not in cov:
        _store(db, 'fx', _download(tickers, start, end))
        db.commit()
        return
    lo, hi = cov[FX_TICKER]
    dirty = False
    if (lo - start).days >= _MIN_GAP_DAYS:
        dirty |= _store(db, 'fx', _download(tickers, start, lo - timedelta(days=1))) > 0
    if (end - hi).days >= _MIN_GAP_DAYS:
        dirty |= _store(db, 'fx', _download(tickers, hi + timedelta(days=1), end)) > 0
    if dirty:
        db.commit()
