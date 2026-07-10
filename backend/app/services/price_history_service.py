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
import time
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

# Small tail gaps (1-3 days) are usually weekends/holidays or data that isn't
# published yet. Retry them, but at most once per TTL per ticker so charts of
# recent days stay fresh without a yfinance call on every request.
_TAIL_CHECK_TTL_SEC = 900
_tail_checked: dict[str, float] = {}


def _tail_due(ticker: str) -> bool:
    now = time.time()
    if now - _tail_checked.get(ticker, 0) < _TAIL_CHECK_TTL_SEC:
        return False
    _tail_checked[ticker] = now
    return True


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


def _download(
    tickers: list[str],
    start: date,
    end: date,
    mark_failures: bool = True,
) -> dict[str, dict[date, dict]]:
    """One bulk yfinance call. Returns {ticker: {date: {c,o,h,l,v}}}.
    Empty on failure.

    mark_failures should be True only for full-range fetches of new tickers:
    a head/tail refresh returning nothing (weekend, pre-IPO) is not evidence
    the ticker is dead.
    """
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
            if mark_failures:
                _failed_tickers.update(tickers)
            return {}

        def _frame(field: str):
            """Field frame normalized to one column per ticker (yfinance
            returns a Series for a single string ticker, and a one-column
            DataFrame for a single-element list)."""
            top_level = (hist.columns.get_level_values(0)
                         if isinstance(hist.columns, pd.MultiIndex) else hist.columns)
            if field not in top_level:
                return None
            f = hist[field]
            if isinstance(f, pd.Series):
                f = f.to_frame(name=tickers[0])
            elif len(tickers) == 1 and tickers[0] not in f.columns:
                f.columns = [tickers[0]]
            return f

        frames = {key: _frame(field) for key, field in
                  (("c", "Close"), ("o", "Open"), ("h", "High"), ("l", "Low"), ("v", "Volume"))}
        close = frames["c"]
        if close is None:
            return {}

        result: dict[str, dict[date, dict]] = {}
        for ticker in tickers:
            if ticker not in close.columns:
                continue
            for idx, val in close[ticker].items():
                if not pd.notna(val):
                    continue
                d = idx.date()
                bar = {"c": float(val)}
                for key in ("o", "h", "l", "v"):
                    f = frames[key]
                    if f is not None and ticker in f.columns:
                        fv = f[ticker].get(idx)
                        if pd.notna(fv):
                            bar[key] = float(fv)
                result.setdefault(ticker, {})[d] = bar
        # Remember tickers that produced no data so we don't retry each request
        if mark_failures:
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
    """Upsert downloaded closes. Israeli agorot → ILS.

    Guards against provider glitches (e.g. a broken intraday FX bar 80x off):
    a close that jumps more than 5x vs the previous known close is dropped.
    Existing rows are updated, so today's partial bar self-corrects on the
    next refresh instead of being frozen forever.
    """
    inserted = 0
    for ticker, series in prices.items():
        divisor = 100.0 if market == 'israeli' else 1.0
        # Seed the plausibility check with the last stored close before the
        # new series begins
        first_new = min(series.keys())
        row = db.execute(text("""
            SELECT close_price FROM stock_price_history
            WHERE ticker = :tk AND date < :d ORDER BY date DESC LIMIT 1
        """), {"tk": ticker, "d": first_new}).fetchone()
        prev = float(row[0]) if row else None

        for d in sorted(series.keys()):
            bar = series[d]
            value = bar["c"] / divisor
            if prev is not None and prev > 0:
                ratio = value / prev
                if ratio > 5 or ratio < 0.2:
                    logger.warning(
                        f"Rejecting implausible close for {ticker} {d}: "
                        f"{value} (prev {prev})"
                    )
                    continue
            db.execute(text("""
                INSERT INTO stock_price_history
                    (ticker, market, date, close_price, open_price, high_price, low_price, volume, created_at)
                VALUES (:tk, :mk, :d, :c, :o, :h, :l, :v, now())
                ON CONFLICT (ticker, date)
                DO UPDATE SET close_price = EXCLUDED.close_price,
                              open_price = EXCLUDED.open_price,
                              high_price = EXCLUDED.high_price,
                              low_price = EXCLUDED.low_price,
                              volume = EXCLUDED.volume
            """), {
                "tk": ticker, "mk": market, "d": d, "c": value,
                "o": bar.get("o") / divisor if bar.get("o") is not None else None,
                "h": bar.get("h") / divisor if bar.get("h") is not None else None,
                "l": bar.get("l") / divisor if bar.get("l") is not None else None,
                "v": int(bar["v"]) if bar.get("v") is not None else None,
            })
            prev = value
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
        tail_gap = (end - hi).days
        if tail_gap >= _MIN_GAP_DAYS or (tail_gap >= 1 and _tail_due(t)):
            need_tail.append(t)

    dirty = False
    if need_full:
        prices = _download(need_full, start, end)
        dirty |= _store(db, market, prices) > 0
    if need_head:
        earliest = min(cov[t][0] for t in need_head)
        prices = _download(need_head, start, earliest - timedelta(days=1), mark_failures=False)
        dirty |= _store(db, market, prices) > 0
    if need_tail:
        latest = max(cov[t][1] for t in need_tail)
        # Start a few days back: the most recent stored rows may be partial
        # intraday bars — the upsert overwrites them with finalized closes
        prices = _download(need_tail, latest - timedelta(days=3), end, mark_failures=False)
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
        dirty |= _store(db, 'fx', _download(tickers, start, lo - timedelta(days=1), mark_failures=False)) > 0
    tail_gap = (end - hi).days
    if tail_gap >= _MIN_GAP_DAYS or (tail_gap >= 1 and _tail_due(FX_TICKER)):
        dirty |= _store(db, 'fx', _download(tickers, hi + timedelta(days=1), end, mark_failures=False)) > 0
    if dirty:
        db.commit()


def get_ohlcv_series(
    db: Session,
    ticker: str,
    start: date,
    end: date,
) -> dict[date, dict]:
    """{date: {c, o, h, l, v}} from the cache (o/h/l/v may be None on old rows)."""
    rows = db.execute(text("""
        SELECT date, close_price, open_price, high_price, low_price, volume
        FROM stock_price_history
        WHERE ticker = :tk AND date BETWEEN :s AND :e
        ORDER BY date
    """), {"tk": ticker, "s": start, "e": end}).fetchall()
    return {
        r[0]: {
            "c": float(r[1]),
            "o": float(r[2]) if r[2] is not None else None,
            "h": float(r[3]) if r[3] is not None else None,
            "l": float(r[4]) if r[4] is not None else None,
            "v": int(r[5]) if r[5] is not None else None,
        }
        for r in rows
    }


def ensure_ohlcv(
    db: Session,
    ticker: str,
    market: str,
    start: date,
    end: date,
) -> None:
    """
    Guarantee OHLCV columns are populated for [start, end]. Rows written
    before the OHLCV migration have NULL high/low/volume — if any exist in
    the range, refetch the whole range once and upsert (per-ticker, one-time).
    """
    ensure_coverage(db, [ticker], market, start, end)
    null_count = db.execute(text("""
        SELECT COUNT(*) FROM stock_price_history
        WHERE ticker = :tk AND date BETWEEN :s AND :e AND high_price IS NULL
    """), {"tk": ticker, "s": start, "e": end}).scalar() or 0
    if null_count > 3:     # tolerate a few odd rows (some indices lack OHLC)
        prices = _download([ticker], start, end, mark_failures=False)
        if _store(db, market, prices) > 0:
            db.commit()
