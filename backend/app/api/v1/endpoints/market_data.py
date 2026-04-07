"""
Market Data endpoints — indices ticker bar.
"""

from fastapi import APIRouter, Depends, Query
from concurrent.futures import ThreadPoolExecutor, as_completed, TimeoutError as FuturesTimeoutError
import yfinance as yf
import logging

from app.core.deps import get_current_user

router = APIRouter(prefix="/market-data", tags=["market-data"])
logger = logging.getLogger(__name__)

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
            ("^CBOE",  "CBOE Interest I"),
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
            ("BTC-USD", "Bitcoin USD"),
            ("ETH-USD", "Ethereum USD"),
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
# Helper
# ---------------------------------------------------------------------------
def _fetch_one(symbol: str, name: str) -> dict | None:
    try:
        t = yf.Ticker(symbol)
        fi = t.fast_info
        price = getattr(fi, "last_price", None)
        price = float(price) if price else None
        prev  = getattr(fi, "previous_close", None)
        prev  = float(prev) if prev else None
        if price is None:
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
        logger.debug(f"market_data _fetch_one({symbol}): {e}")
        return None


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
    Fetches in parallel (one thread per ticker) with a 10-second total timeout.
    """
    cat = CATEGORIES.get(category.lower())
    if cat is None:
        return {"category": category, "name": category, "items": []}

    results: list[dict] = []
    with ThreadPoolExecutor(max_workers=len(cat["tickers"])) as pool:
        futures = {
            pool.submit(_fetch_one, sym, name): (sym, name)
            for sym, name in cat["tickers"]
        }
        try:
            for future in as_completed(futures, timeout=15):
                try:
                    data = future.result()
                    if data:
                        results.append(data)
                except Exception:
                    pass
        except FuturesTimeoutError:
            # Collect results from futures that already completed
            for future, (sym, name) in futures.items():
                if future.done():
                    try:
                        data = future.result()
                        if data:
                            results.append(data)
                    except Exception:
                        pass
            logger.warning(f"Timeout fetching some tickers for category '{category}', returning partial results")

    # Preserve the original order defined in CATEGORIES
    order = {sym: i for i, (sym, _) in enumerate(cat["tickers"])}
    results.sort(key=lambda r: order.get(r["symbol"], 999))

    return {
        "category": category,
        "name":     cat["name"],
        "items":    results,
    }
