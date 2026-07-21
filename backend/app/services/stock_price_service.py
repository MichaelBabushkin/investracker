"""
Stock Price Service
Fetches and updates stock prices from external APIs (yfinance)
Implements tiered update strategy for cost efficiency
"""
# yfinance/pandas are imported lazily inside the functions that fetch prices —
# these run in the background price task, not on the web request path, so
# there's no reason to hold ~150MB resident in the web process for them.
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text
import logging
import time

from app.models.world_stock_models import WorldStock, WorldStockHolding
from app.models.israeli_stock_models import IsraeliStock
from app.models.stock_price_models import StockPrice

logger = logging.getLogger(__name__)


class StockPriceService:
    """
    Service for fetching and updating stock prices.
    
    Tiered Update Strategy:
    - Tier 1 (Active): Stocks in user holdings - update every 15 mins during market hours
    - Tier 2 (Catalog): All other stocks - update daily (overnight batch)
    """
    
    # Rate limiting: yfinance recommends max 2000 requests/hour
    BATCH_SIZE = 50  # Fetch up to 50 tickers at once
    BATCH_DELAY = 1.0  # Seconds between batches
    
    # Cache duration
    ACTIVE_CACHE_MINUTES = 15  # Re-fetch active stocks after 15 mins
    CATALOG_CACHE_HOURS = 24  # Re-fetch catalog stocks after 24 hours
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_active_tickers(self, market: str = 'world') -> List[str]:
        """Get tickers that are in user holdings (Tier 1)"""
        if market == 'world':
            result = self.db.execute(
                text("""
                    SELECT DISTINCT ticker 
                    FROM "world_stock_holdings" 
                    WHERE quantity > 0
                """)
            )
        else:
            result = self.db.execute(
                text("""
                    SELECT DISTINCT symbol 
                    FROM "israeli_stock_holdings" 
                    WHERE quantity > 0
                """)
            )
        return [row[0] for row in result.fetchall()]
    
    def get_stale_catalog_tickers(self, hours: int = 24, limit: int = 500, market: str = 'world') -> List[str]:
        """Get tickers not updated in the last N hours (Tier 2)"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        if market == 'world':
            table = '"world_stocks"'
            ticker_field = 's.ticker'
        else:
            table = '"israeli_stocks"'
            ticker_field = 's.symbol'  # Use symbol (display ticker) for Israeli stocks
        
        result = self.db.execute(
            text(f"""
                SELECT {ticker_field}
                FROM {table} s
                LEFT JOIN "stock_prices" sp ON {ticker_field} = sp.ticker AND sp.market = :market
                WHERE sp.updated_at IS NULL OR sp.updated_at < :cutoff
                ORDER BY sp.updated_at ASC NULLS FIRST
                LIMIT :limit
            """),
            {"cutoff": cutoff, "limit": limit, "market": market}
        )
        return [row[0] for row in result.fetchall()]
    
    def _get_israeli_ticker_map(self, display_tickers: List[str]) -> dict:
        """Get mapping of display ticker (symbol) -> yfinance ticker for Israeli stocks"""
        result = self.db.execute(
            text("""
                SELECT symbol, yfinance_ticker 
                FROM "israeli_stocks" 
                WHERE symbol = ANY(:tickers)
            """),
            {"tickers": display_tickers}
        )
        return {row[0]: row[1] for row in result.fetchall()}
    
    def _fetch_price_direct_http(self, yf_ticker: str) -> Optional[Dict]:
        """
        Fetch current price and metadata directly from the Yahoo chart API using requests.
        Bypasses yfinance's quoteSummary endpoints (which get blocked with 429).
        """
        import requests
        url = f"https://query1.finance.yahoo.com/v8/finance/chart/{yf_ticker}"
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
        }
        try:
            r = requests.get(url, headers=headers, timeout=10)
            if r.status_code == 200:
                data = r.json()
                if 'chart' in data and data['chart']['result']:
                    meta = data['chart']['result'][0]['meta']
                    
                    price = meta.get('regularMarketPrice')
                    prev_close = meta.get('chartPreviousClose') or meta.get('previousClose')
                    high = meta.get('regularMarketDayHigh')
                    low = meta.get('regularMarketDayLow')
                    volume = meta.get('regularMarketVolume')
                    currency = meta.get('currency', 'USD')
                    
                    is_agorot = (currency == 'ILA')
                    if is_agorot:
                        if price is not None: price = price / 100.0
                        if prev_close is not None: prev_close = prev_close / 100.0
                        if high is not None: high = high / 100.0
                        if low is not None: low = low / 100.0
                        currency = 'ILS'
                        
                    change = None
                    change_pct = None
                    if price is not None and prev_close is not None:
                        change = price - prev_close
                        change_pct = (change / prev_close) * 100 if prev_close > 0 else 0
                        
                    return {
                        'current_price': price,
                        'previous_close': prev_close,
                        'day_high': high,
                        'day_low': low,
                        'volume': volume,
                        'market_cap': None,
                        'price_change': change,
                        'price_change_pct': change_pct,
                        'currency': currency
                    }
        except Exception as e:
            logger.warning(f"Direct HTTP fetch failed for {yf_ticker}: {e}")
        return None
    
    def fetch_prices_batch(self, tickers: List[str]) -> Dict[str, Dict]:
        """
        Fetch prices for multiple tickers using yfinance.
        Returns dict of ticker -> price data
        """
        import yfinance as yf
        import pandas as pd
        if not tickers:
            return {}
        
        results = {}
        
        # Process in batches
        for i in range(0, len(tickers), self.BATCH_SIZE):
            batch = tickers[i:i + self.BATCH_SIZE]
            logger.info(f"Fetching prices for batch {i//self.BATCH_SIZE + 1}: {len(batch)} tickers")
            
            try:
                # yfinance can fetch multiple tickers at once
                non_ta_tickers = [t for t in batch if not t.endswith('.TA')]
                
                data = pd.DataFrame()
                if non_ta_tickers:
                    tickers_str_non_ta = " ".join(non_ta_tickers)
                    logger.info(f"Calling yf.download for non-TA tickers: {tickers_str_non_ta}")
                    data = yf.download(
                        tickers_str_non_ta,
                        period="1d",
                        interval="1d",
                        progress=False,
                        threads=True
                    )
                
                # Also get info for each ticker
                for ticker in batch:
                    try:
                        logger.info(f"Processing ticker: {ticker}")
                        
                        # Direct HTTP fetch check for Israeli stock tickers or Exchange rate tickers
                        direct_data = None
                        if ticker.endswith('.TA') or ticker.endswith('=X'):
                            logger.info(f"Using direct HTTP fetch for {ticker}")
                            direct_data = self._fetch_price_direct_http(ticker)
                            
                        if direct_data:
                            results[ticker] = direct_data
                            logger.info(f"Direct HTTP fetch successful for {ticker}: {direct_data['current_price']}")
                            continue
                        
                        # Standard yfinance logic
                        stock = yf.Ticker(ticker)
                        info = stock.info
                        logger.info(f"Ticker {ticker} info keys: {list(info.keys())[:20]}")
                        logger.info(f"Ticker {ticker} currentPrice: {info.get('currentPrice')}, regularMarketPrice: {info.get('regularMarketPrice')}")
                        
                        # Handle both single and multi-ticker response format
                        if len(non_ta_tickers) == 1:
                            logger.info(f"Single ticker mode, data columns: {list(data.columns) if hasattr(data, 'columns') else 'N/A'}")
                            if not data.empty and len(data) > 0:
                                if isinstance(data.columns, pd.MultiIndex) or (len(data.columns) > 0 and isinstance(data.columns[0], tuple)):
                                    close = data[('Close', ticker)].iloc[-1] if ('Close', ticker) in data.columns else None
                                    volume = data[('Volume', ticker)].iloc[-1] if ('Volume', ticker) in data.columns else None
                                    high = data[('High', ticker)].iloc[-1] if ('High', ticker) in data.columns else None
                                    low = data[('Low', ticker)].iloc[-1] if ('Low', ticker) in data.columns else None
                                else:
                                    close = data['Close'].iloc[-1] if 'Close' in data.columns else None
                                    volume = data['Volume'].iloc[-1] if 'Volume' in data.columns else None
                                    high = data['High'].iloc[-1] if 'High' in data.columns else None
                                    low = data['Low'].iloc[-1] if 'Low' in data.columns else None
                                logger.info(f"Extracted from data: close={close}, volume={volume}, high={high}, low={low}")
                            else:
                                close = volume = high = low = None
                                logger.info("Data is empty, setting all values to None")
                        else:
                            close = data['Close'][ticker].iloc[-1] if not data.empty and 'Close' in data.columns and ticker in data['Close'].columns and len(data['Close'][ticker]) > 0 else None
                            volume = data['Volume'][ticker].iloc[-1] if not data.empty and 'Volume' in data.columns and ticker in data['Volume'].columns and len(data['Volume'][ticker]) > 0 else None
                            high = data['High'][ticker].iloc[-1] if not data.empty and 'High' in data.columns and ticker in data['High'].columns and len(data['High'][ticker]) > 0 else None
                            low = data['Low'][ticker].iloc[-1] if not data.empty and 'Low' in data.columns and ticker in data['Low'].columns and len(data['Low'][ticker]) > 0 else None
                        
                        current_price = float(info.get('currentPrice') or info.get('regularMarketPrice') or close or 0)
                        previous_close = float(info.get('previousClose') or info.get('regularMarketPreviousClose') or 0)
                        
                        # Handle potential agorot returned in standard yfinance call
                        currency = info.get('currency', 'USD')
                        is_agorot = (currency == 'ILA')
                        if is_agorot:
                            current_price /= 100.0
                            previous_close /= 100.0
                            if close: close /= 100.0
                            if high: high /= 100.0
                            if low: low /= 100.0
                        
                        logger.info(f"Final values for {ticker}: current_price={current_price}, previous_close={previous_close}")
                        
                        results[ticker] = {
                            'current_price': current_price,
                            'previous_close': previous_close,
                            'day_high': float(high) if high else info.get('dayHigh'),
                            'day_low': float(low) if low else info.get('dayLow'),
                            'volume': int(volume) if volume else info.get('volume'),
                            'market_cap': info.get('marketCap'),
                        }
                        
                        if is_agorot:
                            if results[ticker]['day_high']: results[ticker]['day_high'] /= 100.0
                            if results[ticker]['day_low']: results[ticker]['day_low'] /= 100.0
                        
                        # Calculate price change
                        if results[ticker]['current_price'] and results[ticker]['previous_close']:
                            change = results[ticker]['current_price'] - results[ticker]['previous_close']
                            change_pct = (change / results[ticker]['previous_close']) * 100
                            results[ticker]['price_change'] = change
                            results[ticker]['price_change_pct'] = change_pct
                        
                    except Exception as e:
                        logger.error(f"Failed to fetch {ticker} via yfinance: {e}", exc_info=True)
                        logger.info(f"Attempting fallback direct HTTP fetch for {ticker}")
                        direct_data = self._fetch_price_direct_http(ticker)
                        if direct_data:
                            results[ticker] = direct_data
                            logger.info(f"Fallback direct HTTP fetch successful for {ticker}: {direct_data['current_price']}")
                        else:
                            continue
                
            except Exception as e:
                logger.error(f"Batch fetch failed: {e}")
            
            # Rate limiting delay between batches
            if i + self.BATCH_SIZE < len(tickers):
                time.sleep(self.BATCH_DELAY)
        
        return results
    
    def update_world_stock_prices(self, tickers: Optional[List[str]] = None, market: str = 'world') -> Tuple[int, int]:
        """
        Update prices for stocks in the StockPrices table.
        Args:
            tickers: List of display tickers to update
            market: 'world' or 'israeli'
        Returns (updated_count, failed_count)
        """
        if tickers is None:
            tickers = self.get_active_tickers(market=market)
        
        if not tickers:
            logger.info("No tickers to update")
            return 0, 0
        
        logger.info(f"Updating prices for {len(tickers)} {market} stocks")
        logger.info(f"Display tickers: {tickers}")
        
        # For Israeli stocks, map display tickers to yfinance tickers
        if market == 'israeli':
            ticker_map = self._get_israeli_ticker_map(tickers)  # display -> yfinance
            yfinance_tickers = list(ticker_map.values())
            reverse_map = {v: k for k, v in ticker_map.items()}  # yfinance -> display
            logger.info(f"Israeli ticker mapping: {ticker_map}")
            logger.info(f"yfinance tickers to fetch: {yfinance_tickers}")
        else:
            ticker_map = {t: t for t in tickers}
            yfinance_tickers = tickers
            reverse_map = ticker_map
        
        # Fetch prices using yfinance tickers
        price_data = self.fetch_prices_batch(yfinance_tickers)
        logger.info(f"Fetched price data for {len(price_data)} tickers: {list(price_data.keys())}")
        
        updated = 0
        failed = 0
        now = datetime.utcnow()
        
        for yf_ticker, data in price_data.items():
            try:
                # Get display ticker for storage
                display_ticker = reverse_map.get(yf_ticker, yf_ticker)
                logger.info(f"Processing {market} stock: yf_ticker={yf_ticker}, display_ticker={display_ticker}, price={data.get('current_price')}")
                
                # Use INSERT ... ON CONFLICT to upsert
                self.db.execute(
                    text("""
                        INSERT INTO "stock_prices" 
                        (ticker, market, current_price, previous_close, price_change, price_change_pct,
                         day_high, day_low, volume, market_cap, updated_at, created_at)
                        VALUES (:ticker, :market, :current_price, :previous_close, :price_change, :price_change_pct,
                                :day_high, :day_low, :volume, :market_cap, :updated_at, :created_at)
                        ON CONFLICT (ticker, market) DO UPDATE SET
                            current_price = EXCLUDED.current_price,
                            previous_close = EXCLUDED.previous_close,
                            price_change = EXCLUDED.price_change,
                            price_change_pct = EXCLUDED.price_change_pct,
                            day_high = EXCLUDED.day_high,
                            day_low = EXCLUDED.day_low,
                            volume = EXCLUDED.volume,
                            market_cap = EXCLUDED.market_cap,
                            updated_at = EXCLUDED.updated_at
                    """),
                    {
                        "ticker": display_ticker,  # Store with display ticker
                        "market": market,
                        "current_price": data.get('current_price'),
                        "previous_close": data.get('previous_close'),
                        "price_change": data.get('price_change'),
                        "price_change_pct": data.get('price_change_pct'),
                        "day_high": data.get('day_high'),
                        "day_low": data.get('day_low'),
                        "volume": data.get('volume'),
                        "market_cap": data.get('market_cap'),
                        "updated_at": now,
                        "created_at": now
                    }
                )
                updated += 1
                logger.info(f"Successfully updated {display_ticker} in StockPrices table")
            except Exception as e:
                logger.error(f"Failed to update {yf_ticker} (display: {display_ticker}): {e}", exc_info=True)
                failed += 1
        
        self.db.commit()
        logger.info(f"Updated {updated} stocks, {failed} failed")
        return updated, failed
    
    def update_holdings_values(self, user_id: Optional[str] = None, market: str = 'world') -> int:
        """
        Recalculate current_value for holdings based on latest stock prices from StockPrices table.
        Args:
            user_id: Optional user ID to filter by
            market: 'world' or 'israeli'
        Returns number of holdings updated.
        """
        table = '"world_stock_holdings"' if market == 'world' else '"israeli_stock_holdings"'
        ticker_field = 'h.ticker' if market == 'world' else 'h.symbol'
        
        query = f"""
            UPDATE {table} h
            SET current_value = h.quantity * sp.current_price,
                last_price = sp.current_price
            FROM "stock_prices" sp
            WHERE {ticker_field} = sp.ticker
            AND sp.market = :market
            AND sp.current_price IS NOT NULL
        """
        
        if user_id:
            query += " AND h.user_id = :user_id"
            result = self.db.execute(text(query), {"market": market, "user_id": user_id})
        else:
            result = self.db.execute(text(query), {"market": market})
        
        self.db.commit()
        return result.rowcount
    
    def get_price_stats(self) -> Dict:
        """Get statistics about price data freshness"""
        result = self.db.execute(
            text("""
                SELECT 
                    (SELECT COUNT(*) FROM "world_stocks") as total,
                    COUNT(sp.current_price) as with_price,
                    COUNT(CASE WHEN sp.updated_at > NOW() - INTERVAL '15 minutes' THEN 1 END) as fresh_15m,
                    COUNT(CASE WHEN sp.updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as fresh_24h,
                    MIN(sp.updated_at) as oldest_update,
                    MAX(sp.updated_at) as newest_update
                FROM "stock_prices" sp
            """)
        )
        row = result.fetchone()
        return {
            "total_stocks": row[0],
            "stocks_with_price": row[1],
            "fresh_15m": row[2],
            "fresh_24h": row[3],
            "oldest_update": row[4],
            "newest_update": row[5]
        }


# Standalone functions for cron jobs
def update_active_stocks_prices(db: Session) -> Tuple[int, int]:
    """Update prices for stocks in user holdings"""
    service = StockPriceService(db)
    world_updated, world_failed = service.update_world_stock_prices(market='world')
    israeli_updated, israeli_failed = service.update_world_stock_prices(market='israeli')
    return (world_updated + israeli_updated, world_failed + israeli_failed)



def update_catalog_stocks_prices(db: Session, limit: int = 500, market: str = 'world') -> Tuple[int, int]:
    """Update prices for catalog stocks (batch job)"""
    service = StockPriceService(db)
    tickers = service.get_stale_catalog_tickers(hours=24, limit=limit, market=market)
    return service.update_world_stock_prices(tickers, market=market)


def recalculate_holdings_values(db: Session, market: str = 'world') -> int:
    """Recalculate all holdings values"""
    service = StockPriceService(db)
    return service.update_holdings_values(market=market)


def get_or_refresh_usd_ils_rate(engine) -> Optional[float]:
    """
    Get USD/ILS exchange rate from exchange_rates table.
    Rate meaning: 1 USD = X ILS (e.g. 3.1330).
    If the stored rate is older than 7 days, fetches a fresh one from yfinance (ILS=X ticker)
    and upserts it into the exchange_rates table.
    Returns the rate as a float, or None if unavailable.
    """
    import yfinance as yf
    from datetime import date, timedelta

    cutoff = date.today() - timedelta(days=7)

    with engine.connect() as conn:
        row = conn.execute(text("""
            SELECT rate FROM exchange_rates
            WHERE from_currency = 'USD' AND to_currency = 'ILS'
            AND date >= :cutoff
            ORDER BY date DESC LIMIT 1
        """), {"cutoff": cutoff}).fetchone()
        if row:
            return float(row[0])

    # Rate is stale or missing — fetch from yfinance
    try:
        ticker = yf.Ticker("ILS=X")
        rate = float(ticker.fast_info.last_price)
        if rate > 0:
            today = date.today()
            with engine.begin() as conn:
                conn.execute(text("""
                    DELETE FROM exchange_rates
                    WHERE from_currency = 'USD' AND to_currency = 'ILS' AND date = :date
                """), {"date": today})
                conn.execute(text("""
                    INSERT INTO exchange_rates (from_currency, to_currency, rate, date, source)
                    VALUES ('USD', 'ILS', :rate, :date, 'api')
                """), {"rate": rate, "date": today})
            logger.info(f"Refreshed USD/ILS rate from yfinance: {rate}")
            return rate
    except Exception as e:
        logger.warning(f"Could not fetch USD/ILS rate from yfinance (ILS=X): {e}")

    return None


def _fetch_detail_direct(ticker: str, is_israeli: bool = False) -> Optional[dict]:
    import requests
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if 'chart' in data and data['chart']['result']:
                meta = data['chart']['result'][0]['meta']
                currency = meta.get('currency', 'USD')
                is_agorot = (currency == 'ILA')
                
                # Scale fields
                current = meta.get('regularMarketPrice')
                prev_close = meta.get('chartPreviousClose') or meta.get('previousClose')
                high = meta.get('regularMarketDayHigh')
                low = meta.get('regularMarketDayLow')
                week_52_high = meta.get('fiftyTwoWeekHigh')
                week_52_low = meta.get('fiftyTwoWeekLow')
                
                if is_agorot:
                    if current is not None: current /= 100.0
                    if prev_close is not None: prev_close /= 100.0
                    if high is not None: high /= 100.0
                    if low is not None: low /= 100.0
                    if week_52_high is not None: week_52_high /= 100.0
                    if week_52_low is not None: week_52_low /= 100.0
                    currency = 'ILS'
                    
                change = round(current - prev_close, 4) if current is not None and prev_close is not None else None
                change_pct = round((change / prev_close) * 100, 2) if change is not None and prev_close else None
                
                company_name = meta.get('longName') or meta.get('shortName') or ticker
                exchange = meta.get('fullExchangeName') or meta.get('exchangeName') or ("TASE" if is_israeli else "NASDAQ")
                
                return {
                    "ticker": ticker,
                    "company_name": company_name,
                    "exchange": exchange,
                    "sector": None,
                    "industry": None,
                    "currency": currency,
                    "market_state": "CLOSED",
                    "price": {
                        "current": current,
                        "change": change,
                        "change_pct": change_pct,
                        "previous_close": prev_close,
                        "day_high": high,
                        "day_low": low,
                        "post_market_price": None,
                        "post_market_change_pct": None,
                        "pre_market_price": None,
                    },
                    "stats": {
                        "market_cap": None,
                        "pe_ratio": None,
                        "forward_pe": None,
                        "eps": None,
                        "forward_eps": None,
                        "dividend_yield": None,
                        "dividend_rate": None,
                        "ex_dividend_date": None,
                        "last_dividend_value": None,
                        "five_yr_avg_yield": None,
                        "beta": None,
                        "week_52_high": week_52_high,
                        "week_52_low": week_52_low,
                        "avg_volume": meta.get('regularMarketVolume'),
                        "fifty_day_avg": None,
                        "two_hundred_day_avg": None,
                        "earnings_date": None,
                    },
                    "analyst": {
                        "recommendation": None,
                        "recommendation_mean": None,
                        "analyst_count": None,
                        "target_mean": None,
                        "target_high": None,
                        "target_low": None,
                        "recommendations_trend": [],
                        "upgrades_downgrades": [],
                    },
                    "about": {
                        "description": None,
                        "employees": None,
                        "website": None,
                        "ceo": None,
                        "founded": None,
                    },
                }
    except Exception as e:
        logger.warning(f"_fetch_detail_direct failed for {ticker}: {e}")
    return None

def _fetch_history_direct(ticker: str, period: str) -> Optional[dict]:
    import requests
    from datetime import datetime
    yf_period, yf_interval = _HISTORY_PARAMS.get(period.upper(), ("1mo", "1d"))
    
    url = f"https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?range={yf_period}&interval={yf_interval}"
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    }
    try:
        r = requests.get(url, headers=headers, timeout=10)
        if r.status_code == 200:
            data = r.json()
            if 'chart' in data and data['chart']['result']:
                chart = data['chart']['result'][0]
                meta = chart.get('meta', {})
                currency = meta.get('currency', 'USD')
                is_agorot = (currency == 'ILA')
                
                timestamp = chart.get('timestamp', [])
                indicators = chart.get('indicators', {}).get('quote', [{}])[0]
                
                opens = indicators.get('open', [])
                highs = indicators.get('high', [])
                lows = indicators.get('low', [])
                closes = indicators.get('close', [])
                volumes = indicators.get('volume', [])
                
                history_data = []
                for i in range(len(timestamp)):
                    ts = timestamp[i]
                    close_val = closes[i] if i < len(closes) else None
                    if close_val is None:
                        continue
                        
                    open_val = opens[i] if i < len(opens) else None
                    high_val = highs[i] if i < len(highs) else None
                    low_val = lows[i] if i < len(lows) else None
                    vol_val = volumes[i] if i < len(volumes) else 0
                    
                    if is_agorot:
                        if open_val is not None: open_val /= 100.0
                        if high_val is not None: high_val /= 100.0
                        if low_val is not None: low_val /= 100.0
                        if close_val is not None: close_val /= 100.0
                        
                    dt = datetime.fromtimestamp(ts)
                    date_str = dt.strftime("%Y-%m-%d") if yf_interval not in ("5m", "15m") else dt.strftime("%Y-%m-%dT%H:%M:%S")
                    
                    history_data.append({
                        "date": date_str,
                        "open": round(float(open_val), 4) if open_val is not None else None,
                        "high": round(float(high_val), 4) if high_val is not None else None,
                        "low": round(float(low_val), 4) if low_val is not None else None,
                        "close": round(float(close_val), 4) if close_val is not None else None,
                        "volume": int(vol_val) if vol_val is not None else 0
                    })
                return {"ticker": ticker, "period": period, "data": history_data}
    except Exception as e:
        logger.warning(f"_fetch_history_direct failed for {ticker}: {e}")
    return None

def get_stock_detail(ticker: str, is_israeli: bool = False) -> dict:
    """
    Fetch rich metadata and current price stats for a single stock from yfinance.
    Returns a structured dict matching the StockDetail API response schema.
    For Israeli stocks pass is_israeli=True — ticker should already be the yfinance ticker (e.g. "TEVA.TA").
    """
    import yfinance as yf
    # If is_israeli is True or ticker ends with .TA, try direct HTTP fetch first to ensure we get prices
    direct_detail = None
    if is_israeli or ticker.endswith('.TA'):
        direct_detail = _fetch_detail_direct(ticker, is_israeli=is_israeli)
        
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        fast = t.fast_info

        current_price = None
        try:
            current_price = float(fast.last_price) if fast.last_price else None
        except Exception:
            current_price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0) or None

        if not current_price and direct_detail:
            current_price = direct_detail["price"]["current"]

        previous_close = float(info.get("previousClose") or info.get("regularMarketPreviousClose") or 0) or None
        if not previous_close and direct_detail:
            previous_close = direct_detail["price"]["previous_close"]

        # Agorot scaling
        currency = info.get("currency") or ("ILS" if is_israeli else "USD")
        is_agorot = (currency == 'ILA')
        
        # Scale prices
        change = round(current_price - previous_close, 4) if current_price and previous_close else None
        change_pct = round((change / previous_close) * 100, 2) if change and previous_close else None

        market_cap = info.get("marketCap")
        pe_ratio = info.get("trailingPE")
        eps = info.get("trailingEps")
        beta = info.get("beta")
        week_52_high = info.get("fiftyTwoWeekHigh")
        if not week_52_high and direct_detail:
            week_52_high = direct_detail["stats"]["week_52_high"]
        week_52_low = info.get("fiftyTwoWeekLow")
        if not week_52_low and direct_detail:
            week_52_low = direct_detail["stats"]["week_52_low"]
        avg_volume = info.get("averageVolume") or (direct_detail["stats"]["avg_volume"] if direct_detail else None)

        raw_yield = info.get("dividendYield")
        dividend_yield_pct = None
        if raw_yield is not None:
            raw_yield = float(raw_yield)
            dividend_yield_pct = round(raw_yield * 100 if raw_yield < 1 else raw_yield, 2)

        market_state = (info.get("marketState") or "CLOSED").upper()
        post_market_price = float(info.get("postMarketPrice")) if info.get("postMarketPrice") else None
        post_market_change_pct = float(info.get("postMarketChangePercent")) if info.get("postMarketChangePercent") else None
        pre_market_price = float(info.get("preMarketPrice")) if info.get("preMarketPrice") else None

        day_high = float(info.get("dayHigh") or info.get("regularMarketDayHigh") or 0) or None
        if not day_high and direct_detail:
            day_high = direct_detail["price"]["day_high"]
        day_low = float(info.get("dayLow") or info.get("regularMarketDayLow") or 0) or None
        if not day_low and direct_detail:
            day_low = direct_detail["price"]["day_low"]
        fifty_day_avg = float(info.get("fiftyDayAverage")) if info.get("fiftyDayAverage") else None
        two_hundred_day_avg = float(info.get("twoHundredDayAverage")) if info.get("twoHundredDayAverage") else None

        dividend_rate = float(info.get("dividendRate")) if info.get("dividendRate") else None
        five_yr_avg_yield = float(info.get("fiveYearAvgDividendYield")) if info.get("fiveYearAvgDividendYield") else None
        last_dividend_value = float(info.get("lastDividendValue")) if info.get("lastDividendValue") else None
        
        if is_agorot:
            currency = 'ILS'
            if current_price is not None: current_price /= 100.0
            if previous_close is not None: previous_close /= 100.0
            if change is not None: change /= 100.0
            if day_high is not None: day_high /= 100.0
            if day_low is not None: day_low /= 100.0
            if week_52_high is not None: week_52_high /= 100.0
            if week_52_low is not None: week_52_low /= 100.0
            if fifty_day_avg is not None: fifty_day_avg /= 100.0
            if two_hundred_day_avg is not None: two_hundred_day_avg /= 100.0
            if dividend_rate is not None: dividend_rate /= 100.0
            if last_dividend_value is not None: last_dividend_value /= 100.0
            # Recompute change
            change = round(current_price - previous_close, 4) if current_price and previous_close else None
            change_pct = round((change / previous_close) * 100, 2) if change and previous_close else None

        ex_dividend_ts = info.get("exDividendDate") or info.get("lastDividendDate")
        ex_dividend_date = None
        if ex_dividend_ts:
            try:
                from datetime import timezone
                ex_dividend_date = datetime.fromtimestamp(int(ex_dividend_ts), tz=timezone.utc).strftime("%Y-%m-%d")
            except Exception:
                pass

        earnings_ts = info.get("earningsTimestamp")
        earnings_date = None
        if earnings_ts:
            try:
                from datetime import timezone
                earnings_date = datetime.fromtimestamp(int(earnings_ts), tz=timezone.utc).strftime("%Y-%m-%d")
            except Exception:
                pass

        recommendation = info.get("recommendationKey")
        recommendation_mean = float(info.get("recommendationMean")) if info.get("recommendationMean") else None
        analyst_count = int(info.get("numberOfAnalystOpinions")) if info.get("numberOfAnalystOpinions") else None
        target_mean = float(info.get("targetMeanPrice")) if info.get("targetMeanPrice") else None
        target_high = float(info.get("targetHighPrice")) if info.get("targetHighPrice") else None
        target_low = float(info.get("targetLowPrice")) if info.get("targetLowPrice") else None
        
        if is_agorot:
            if target_mean is not None: target_mean /= 100.0
            if target_high is not None: target_high /= 100.0
            if target_low is not None: target_low /= 100.0

        recommendations_trend = []
        try:
            rec_df = t.recommendations
            if rec_df is not None and not rec_df.empty:
                for _, row in rec_df.tail(4).iterrows():
                    period_val = row.name if hasattr(row, 'name') else None
                    period_str = str(period_val) if period_val is not None else None
                    recommendations_trend.append({
                        "period": period_str,
                        "strong_buy": int(row.get("strongBuy", 0)),
                        "buy": int(row.get("buy", 0)),
                        "hold": int(row.get("hold", 0)),
                        "sell": int(row.get("sell", 0)),
                        "strong_sell": int(row.get("strongSell", 0)),
                    })
        except Exception:
            pass

        upgrades_downgrades = []
        try:
            ud_df = t.upgrades_downgrades
            if ud_df is not None and not ud_df.empty:
                ud_df = ud_df.sort_index(ascending=False).head(10).reset_index()
                for _, row in ud_df.iterrows():
                    grade_date = row.get("GradeDate") or row.get("Date")
                    date_str = str(grade_date)[:10] if grade_date is not None else None
                    upgrades_downgrades.append({
                        "date": date_str,
                        "firm": row.get("Firm"),
                        "to_grade": row.get("ToGrade"),
                        "from_grade": row.get("FromGrade"),
                        "action": row.get("Action"),
                    })
        except Exception:
            pass

        forward_pe = float(info.get("forwardPE")) if info.get("forwardPE") else None
        forward_eps = float(info.get("forwardEps")) if info.get("forwardEps") else None
        
        if is_agorot:
            if forward_eps is not None: forward_eps /= 100.0

        ceo = None
        officers = info.get("companyOfficers") or []
        for officer in officers:
            title = (officer.get("title") or "").lower()
            if "chief executive" in title or "ceo" in title:
                ceo = officer.get("name")
                break

        return {
            "ticker": ticker,
            "company_name": info.get("longName") or info.get("shortName") or (direct_detail["company_name"] if direct_detail else ticker),
            "exchange": info.get("fullExchangeName") or info.get("exchange") or (direct_detail["exchange"] if direct_detail else ("TASE" if is_israeli else "NASDAQ")),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "currency": currency,
            "market_state": market_state,
            "price": {
                "current": current_price,
                "change": change,
                "change_pct": change_pct,
                "previous_close": previous_close,
                "day_high": day_high,
                "day_low": day_low,
                "post_market_price": post_market_price,
                "post_market_change_pct": round(post_market_change_pct, 2) if post_market_change_pct else None,
                "pre_market_price": pre_market_price,
            },
            "stats": {
                "market_cap": float(market_cap) if market_cap else None,
                "pe_ratio": float(pe_ratio) if pe_ratio else None,
                "forward_pe": forward_pe,
                "eps": float(eps) if eps else None,
                "forward_eps": forward_eps,
                "dividend_yield": dividend_yield_pct,
                "dividend_rate": dividend_rate,
                "ex_dividend_date": ex_dividend_date,
                "last_dividend_value": last_dividend_value,
                "five_yr_avg_yield": five_yr_avg_yield,
                "beta": float(beta) if beta else None,
                "week_52_high": week_52_high,
                "week_52_low": week_52_low,
                "avg_volume": int(avg_volume) if avg_volume is not None else None,
                "fifty_day_avg": fifty_day_avg,
                "two_hundred_day_avg": two_hundred_day_avg,
                "earnings_date": earnings_date,
            },
            "analyst": {
                "recommendation": recommendation,
                "recommendation_mean": recommendation_mean,
                "analyst_count": analyst_count,
                "target_mean": target_mean,
                "target_high": target_high,
                "target_low": target_low,
                "recommendations_trend": recommendations_trend,
                "upgrades_downgrades": upgrades_downgrades,
            },
            "about": {
                "description": info.get("longBusinessSummary"),
                "employees": info.get("fullTimeEmployees"),
                "website": info.get("website"),
                "ceo": ceo,
                "founded": None,
            },
        }
    except Exception as e:
        logger.warning(f"get_stock_detail({ticker}) failed: {e}")
        if direct_detail:
            logger.info(f"Returning direct_detail fallback for {ticker}")
            return direct_detail
        return {
            "ticker": ticker,
            "company_name": ticker,
            "exchange": None,
            "sector": None,
            "industry": None,
            "currency": "ILS" if is_israeli else "USD",
            "market_state": "CLOSED",
            "price": {"current": None, "change": None, "change_pct": None, "previous_close": None,
                      "day_high": None, "day_low": None, "post_market_price": None,
                      "post_market_change_pct": None, "pre_market_price": None},
            "stats": {},
            "analyst": {"recommendation": None, "recommendation_mean": None, "analyst_count": None,
                        "target_mean": None, "target_high": None, "target_low": None,
                        "recommendations_trend": [], "upgrades_downgrades": []},
            "about": {"description": None, "employees": None, "website": None, "ceo": None, "founded": None},
        }

# Period → (yfinance period, yfinance interval)
_HISTORY_PARAMS = {
    "1D":  ("1d",  "5m"),
    "1W":  ("5d",  "15m"),
    "1M":  ("1mo", "1d"),
    "3M":  ("3mo", "1d"),
    "1Y":  ("1y",  "1d"),
    "ALL": ("5y",  "1wk"),
}

def get_stock_history(ticker: str, period: str = "1M") -> dict:
    """
    Fetch OHLCV history for a ticker from yfinance.
    period: one of 1D, 1W, 1M, 3M, 1Y, ALL
    Returns { ticker, period, data: [{date, open, high, low, close, volume}] }
    """
    import yfinance as yf
    import pandas as pd
    if ticker.endswith('.TA'):
        direct_hist = _fetch_history_direct(ticker, period)
        if direct_hist:
            return direct_hist
            
    yf_period, yf_interval = _HISTORY_PARAMS.get(period.upper(), ("1mo", "1d"))
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=yf_period, interval=yf_interval)
        
        # Determine if ticker currency is ILA to scale down history data
        is_agorot = False
        try:
            is_agorot = (t.info.get('currency') == 'ILA')
        except Exception:
            pass
            
        data = []
        for ts, row in hist.iterrows():
            close_val = float(row["Close"])
            open_val = float(row["Open"])
            high_val = float(row["High"])
            low_val = float(row["Low"])
            vol_val = int(row["Volume"]) if not pd.isna(row["Volume"]) else 0
            
            if is_agorot:
                close_val /= 100.0
                open_val /= 100.0
                high_val /= 100.0
                low_val /= 100.0
                
            data.append({
                "date": ts.strftime("%Y-%m-%d") if yf_interval != "5m" and yf_interval != "15m"
                        else ts.strftime("%Y-%m-%dT%H:%M:%S"),
                "open":   round(open_val,   4),
                "high":   round(high_val,   4),
                "low":    round(low_val,    4),
                "close":  round(close_val,  4),
                "volume": vol_val,
            })
        return {"ticker": ticker, "period": period, "data": data}
    except Exception as e:
        logger.warning(f"get_stock_history({ticker}, {period}) failed: {e}")
        direct_hist = _fetch_history_direct(ticker, period)
        if direct_hist:
            return direct_hist
        return {"ticker": ticker, "period": period, "data": []}
