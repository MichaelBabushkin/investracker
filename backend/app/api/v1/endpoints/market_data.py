"""
Market Data endpoints — indices ticker bar.
"""

from fastapi import APIRouter, Depends, Query
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError
import yfinance as yf
import requests
import time
import logging

from app.core.deps import get_current_user

router = APIRouter(prefix="/market-data", tags=["market-data"])
logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Shared HTTP session — mimics a browser to avoid Yahoo Finance rate limits
# ---------------------------------------------------------------------------
_session = requests.Session()
_session.headers.update({
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/122.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.5",
    "Accept-Encoding": "gzip, deflate, br",
    "Connection": "keep-alive",
})

# ---------------------------------------------------------------------------
# Simple in-process cache  { category: (timestamp, items) }
# ---------------------------------------------------------------------------
_CACHE: dict[str, tuple[float, list]] = {}
CACHE_TTL = 120  # seconds — refresh data every 2 minutes max


# ---------------------------------------------------------------------------
# Category definitions
# ---------------------------------------------------------------------------
CATEGORIES: dict[str, dict] = {
    "us": {
        "name": "US Markets",
        "tickers": [
            ("^GSPC",  "S&P 500"),
            ("^DJI",   "Dow 30"),
            ("^IXIC",  "Nasdaq"),
            ("^RUT",   "Russell 2000"),
            ("^VIX",   "VIX"),
        ],
    },
    "europe": {
        "name": "Europe Markets",
        "tickers": [
            ("^FTSE",    "FTSE 100"),
            ("^GDAXI",   "DAX"),
            ("^FCHI",    "CAC 40"),
            ("^STOXX50E","Euro Stoxx 50"),
            ("^AEX",     "AEX"),
            ("^IBEX",    "IBEX 35"),
        ],
    },
    "asia": {
        "name": "Asia Markets",
        "tickers": [
            ("^N225",    "Nikkei 225"),
            ("^HSI",     "Hang Seng"),
            ("^AXJO",    "ASX 200"),
            ("000001.SS","Shanghai"),
            ("^KS11",    "KOSPI"),
            ("^BSESN",   "BSE Sensex"),
        ],
    },
    "crypto": {
        "name": "Cryptocurrencies",
        "tickers": [
            ("BTC-USD", "Bitcoin"),
            ("ETH-USD", "Ethereum"),
            ("BNB-USD", "BNB"),
            ("SOL-USD", "Solana"),
            ("XRP-USD", "XRP"),
        ],
    },
    "commodities": {
        "name": "Commodities",
        "tickers": [
            ("GC=F", "Gold"),
            ("SI=F", "Silver"),
            ("CL=F", "Crude Oil"),
            ("NG=F", "Natural Gas"),
            ("HG=F", "Copper"),
        ],
    },
    "rates": {
        "name": "Rates",
        "tickers": [
            ("^TNX", "10Y Treasury"),
            ("^FVX", "5Y Treasury"),
            ("^TYX", "30Y Treasury"),
            ("^IRX", "13W Treasury"),
        ],
    },
    "currencies": {
        "name": "Currencies",
        "tickers": [
            ("EURUSD=X", "EUR/USD"),
            ("GBPUSD=X", "GBP/USD"),
            ("JPY=X",    "USD/JPY"),
            ("ILS=X",    "USD/ILS"),
            ("CHFUSD=X", "CHF/USD"),
        ],
    },
}


# ---------------------------------------------------------------------------
# Helper — fetch a single ticker using the shared session
# ---------------------------------------------------------------------------
def _fetch_one(symbol: str, name: str) -> dict | None:
    try:
        t = yf.Ticker(symbol, session=_session)
        fi = t.fast_info
        price = getattr(fi, "last_price", None)
        price = float(price) if price else None
        prev  = getattr(fi, "previous_close", None)
        prev  = float(prev) if prev else None

        if price is None:
            logger.warning(f"[market_data] fast_info returned no price for {symbol}, trying history")
            # Fallback: try history
            hist = t.history(period="5d", auto_adjust=False)
            logger.warning(f"[market_data] history for {symbol}: {len(hist)} rows, cols={list(hist.columns)}")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
                prev  = float(hist["Close"].iloc[-2]) if len(hist) >= 2 else None
            if price is None:
                # Log raw HTTP status to diagnose Yahoo blocking
                try:
                    resp = _session.get(
                        f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
                        params={"interval": "1d", "range": "5d"},
                        timeout=8,
                    )
                    logger.warning(
                        f"[market_data] raw Yahoo HTTP for {symbol}: status={resp.status_code} "
                        f"size={len(resp.content)}b ok={resp.ok}"
                    )
                except Exception as http_e:
                    logger.warning(f"[market_data] raw Yahoo HTTP for {symbol} FAILED: {http_e}")
                return None

        change     = round(price - prev, 4) if prev is not None else None
        change_pct = round((change / prev) * 100, 2) if change is not None and prev else None
        return {
            "symbol":     symbol,
            "name":       name,
            "price":      price,
            "change":     change,
            "change_pct": change_pct,
        }
    except Exception as e:
        logger.warning(f"[market_data] _fetch_one({symbol}) exception: {e}")
        return None


def _fetch_category(cat_id: str, tickers: list[tuple[str, str]]) -> list[dict]:
    """Fetch all tickers for a category in parallel, return sorted results."""
    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=min(len(tickers), 6)) as pool:
        futures = {
            pool.submit(_fetch_one, sym, name): (sym, name)
            for sym, name in tickers
        }
        try:
            for future in as_completed(futures, timeout=20):
                try:
                    data = future.result()
                    if data:
                        results.append(data)
                except Exception:
                    pass
        except FuturesTimeoutError:
            for future in futures:
                if future.done():
                    try:
                        data = future.result()
                        if data:
                            results.append(data)
                    except Exception:
                        pass
            logger.warning(f"Timeout fetching tickers for '{cat_id}', returning partial results")

    # Preserve definition order
    order = {sym: i for i, (sym, _) in enumerate(tickers)}
    results.sort(key=lambda r: order.get(r["symbol"], 999))
    return results


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------
@router.get("/categories")
def list_categories(_: dict = Depends(get_current_user)):
    """Return the list of available categories for the ticker bar dropdown."""
    return [
        {"id": k, "name": v["name"]}
        for k, v in CATEGORIES.items()
    ]


@router.get("/indices")
def get_indices(
    category: str = Query("us", description="Category id, e.g. us / europe / crypto"),
    _: dict = Depends(get_current_user),
):
    """
    Return current price + change for all tickers in the requested category.
    Results are cached for CACHE_TTL seconds to reduce Yahoo Finance requests.
    """
    cat_id = category.lower()
    cat = CATEGORIES.get(cat_id)
    if cat is None:
        return {"category": category, "name": category, "items": []}

    # Serve from cache if fresh
    cached = _CACHE.get(cat_id)
    if cached and (time.time() - cached[0]) < CACHE_TTL:
        return {"category": cat_id, "name": cat["name"], "items": cached[1]}

    items = _fetch_category(cat_id, cat["tickers"])

    # Update cache (even if empty — avoids hammering Yahoo when blocked)
    _CACHE[cat_id] = (time.time(), items)

    return {
        "category": cat_id,
        "name":     cat["name"],
        "items":    items,
    }


@router.delete("/cache")
def clear_cache(_: dict = Depends(get_current_user)):
    """Force-clear the in-process price cache (useful after a block lifts)."""
    _CACHE.clear()
    return {"cleared": True}


@router.get("/debug/{symbol}")
def debug_symbol(
    symbol: str,
):
    """
    Debug endpoint — returns raw yfinance data for a single symbol.
    Useful for diagnosing rate-limit issues on production.
    """
    import traceback

    result: dict = {"symbol": symbol, "session_ua": _session.headers.get("User-Agent"), "steps": {}}

    # Step 1: fast_info
    try:
        t = yf.Ticker(symbol, session=_session)
        fi = t.fast_info
        result["steps"]["fast_info"] = {
            "last_price": getattr(fi, "last_price", "MISSING"),
            "previous_close": getattr(fi, "previous_close", "MISSING"),
            "currency": getattr(fi, "currency", "MISSING"),
        }
    except Exception as e:
        result["steps"]["fast_info"] = {"error": str(e), "trace": traceback.format_exc()[-500:]}

    # Step 2: history fallback
    try:
        t2 = yf.Ticker(symbol, session=_session)
        hist = t2.history(period="5d", auto_adjust=False)
        result["steps"]["history"] = {
            "rows": len(hist),
            "last_close": float(hist["Close"].iloc[-1]) if not hist.empty else None,
            "columns": list(hist.columns),
        }
    except Exception as e:
        result["steps"]["history"] = {"error": str(e), "trace": traceback.format_exc()[-500:]}

    # Step 3: raw HTTP check (does Yahoo respond at all?)
    try:
        resp = _session.get(
            f"https://query1.finance.yahoo.com/v8/finance/chart/{symbol}",
            params={"interval": "1d", "range": "5d"},
            timeout=10,
        )
        result["steps"]["raw_http"] = {
            "status_code": resp.status_code,
            "content_length": len(resp.content),
            "ok": resp.ok,
        }
    except Exception as e:
        result["steps"]["raw_http"] = {"error": str(e)}

    return result
