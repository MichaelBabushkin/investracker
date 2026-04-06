"""
Stock Price Service
Fetches and updates stock prices from external APIs (yfinance)
Implements tiered update strategy for cost efficiency
"""
import yfinance as yf
import pandas as pd
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
    
    def fetch_prices_batch(self, tickers: List[str]) -> Dict[str, Dict]:
        """
        Fetch prices for multiple tickers using yfinance.
        Returns dict of ticker -> price data
        """
        if not tickers:
            return {}
        
        results = {}
        
        # Process in batches
        for i in range(0, len(tickers), self.BATCH_SIZE):
            batch = tickers[i:i + self.BATCH_SIZE]
            logger.info(f"Fetching prices for batch {i//self.BATCH_SIZE + 1}: {len(batch)} tickers")
            
            try:
                # yfinance can fetch multiple tickers at once
                tickers_str = " ".join(batch)
                logger.info(f"Calling yf.download for: {tickers_str}")
                data = yf.download(
                    tickers_str,
                    period="1d",
                    interval="1d",
                    progress=False,
                    threads=True
                )
                
                logger.info(f"yf.download returned data.shape: {data.shape if hasattr(data, 'shape') else 'N/A'}")
                logger.info(f"yf.download data.empty: {data.empty if hasattr(data, 'empty') else 'N/A'}")
                logger.info(f"yf.download data.columns: {list(data.columns) if hasattr(data, 'columns') else 'N/A'}")
                logger.info(f"yf.download data.index: {data.index.tolist() if hasattr(data, 'index') else 'N/A'}")
                
                # Also get info for each ticker
                for ticker in batch:
                    try:
                        logger.info(f"Processing ticker: {ticker}")
                        stock = yf.Ticker(ticker)
                        info = stock.info
                        logger.info(f"Ticker {ticker} info keys: {list(info.keys())[:20]}")
                        logger.info(f"Ticker {ticker} currentPrice: {info.get('currentPrice')}, regularMarketPrice: {info.get('regularMarketPrice')}")
                        
                        # Handle both single and multi-ticker response format
                        if len(batch) == 1:
                            # For single ticker, data structure might have MultiIndex columns
                            logger.info(f"Single ticker mode, data columns: {list(data.columns) if hasattr(data, 'columns') else 'N/A'}")
                            if not data.empty and len(data) > 0:
                                # Check if columns are MultiIndex (tuple format)
                                if isinstance(data.columns, pd.MultiIndex) or (len(data.columns) > 0 and isinstance(data.columns[0], tuple)):
                                    # MultiIndex format: ('Close', 'HARL.TA')
                                    close = data[('Close', ticker)].iloc[-1] if ('Close', ticker) in data.columns else None
                                    volume = data[('Volume', ticker)].iloc[-1] if ('Volume', ticker) in data.columns else None
                                    high = data[('High', ticker)].iloc[-1] if ('High', ticker) in data.columns else None
                                    low = data[('Low', ticker)].iloc[-1] if ('Low', ticker) in data.columns else None
                                else:
                                    # Simple columns: 'Close', 'Volume', etc.
                                    close = data['Close'].iloc[-1] if 'Close' in data.columns else None
                                    volume = data['Volume'].iloc[-1] if 'Volume' in data.columns else None
                                    high = data['High'].iloc[-1] if 'High' in data.columns else None
                                    low = data['Low'].iloc[-1] if 'Low' in data.columns else None
                                logger.info(f"Extracted from data: close={close}, volume={volume}, high={high}, low={low}")
                            else:
                                close = volume = high = low = None
                                logger.info("Data is empty, setting all values to None")
                        else:
                            close = data['Close'][ticker].iloc[-1] if ticker in data['Close'].columns and len(data['Close'][ticker]) > 0 else None
                            volume = data['Volume'][ticker].iloc[-1] if ticker in data['Volume'].columns and len(data['Volume'][ticker]) > 0 else None
                            high = data['High'][ticker].iloc[-1] if ticker in data['High'].columns and len(data['High'][ticker]) > 0 else None
                            low = data['Low'][ticker].iloc[-1] if ticker in data['Low'].columns and len(data['Low'][ticker]) > 0 else None
                        
                        current_price = float(info.get('currentPrice') or info.get('regularMarketPrice') or close or 0)
                        previous_close = float(info.get('previousClose') or info.get('regularMarketPreviousClose') or 0)
                        
                        logger.info(f"Final values for {ticker}: current_price={current_price}, previous_close={previous_close}")
                        
                        results[ticker] = {
                            'current_price': current_price,
                            'previous_close': previous_close,
                            'day_high': float(high) if high else info.get('dayHigh'),
                            'day_low': float(low) if low else info.get('dayLow'),
                            'volume': int(volume) if volume else info.get('volume'),
                            'market_cap': info.get('marketCap'),
                        }
                        
                        # Calculate price change
                        if results[ticker]['current_price'] and results[ticker]['previous_close']:
                            change = results[ticker]['current_price'] - results[ticker]['previous_close']
                            change_pct = (change / results[ticker]['previous_close']) * 100
                            results[ticker]['price_change'] = change
                            results[ticker]['price_change_pct'] = change_pct
                        
                    except Exception as e:
                        logger.error(f"Failed to fetch {ticker}: {e}", exc_info=True)
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
            tickers = self.get_active_tickers()
        
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
    return service.update_world_stock_prices()


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


def get_stock_detail(ticker: str, is_israeli: bool = False) -> dict:
    """
    Fetch rich metadata and current price stats for a single stock from yfinance.
    Returns a structured dict matching the StockDetail API response schema.
    For Israeli stocks pass is_israeli=True — ticker should already be the yfinance ticker (e.g. "TEVA.TA").
    """
    try:
        t = yf.Ticker(ticker)
        info = t.info or {}
        fast = t.fast_info

        current_price = None
        try:
            current_price = float(fast.last_price) if fast.last_price else None
        except Exception:
            current_price = float(info.get("currentPrice") or info.get("regularMarketPrice") or 0) or None

        previous_close = float(info.get("previousClose") or info.get("regularMarketPreviousClose") or 0) or None
        change = round(current_price - previous_close, 4) if current_price and previous_close else None
        change_pct = round((change / previous_close) * 100, 2) if change and previous_close else None

        market_cap = info.get("marketCap")
        pe_ratio = info.get("trailingPE")
        eps = info.get("trailingEps")
        beta = info.get("beta")
        week_52_high = info.get("fiftyTwoWeekHigh")
        week_52_low = info.get("fiftyTwoWeekLow")
        avg_volume = info.get("averageVolume")

        # dividendYield: yfinance returns decimal (0.0668) but sometimes already pct (6.68)
        # Normalise to percentage always
        raw_yield = info.get("dividendYield")
        dividend_yield_pct = None
        if raw_yield is not None:
            raw_yield = float(raw_yield)
            dividend_yield_pct = round(raw_yield * 100 if raw_yield < 1 else raw_yield, 2)

        # Market state & extended hours
        market_state = (info.get("marketState") or "CLOSED").upper()  # OPEN/CLOSED/PRE/POST
        post_market_price = float(info.get("postMarketPrice")) if info.get("postMarketPrice") else None
        post_market_change_pct = float(info.get("postMarketChangePercent")) if info.get("postMarketChangePercent") else None
        pre_market_price = float(info.get("preMarketPrice")) if info.get("preMarketPrice") else None

        # Day range & moving averages
        day_high = float(info.get("dayHigh") or info.get("regularMarketDayHigh") or 0) or None
        day_low = float(info.get("dayLow") or info.get("regularMarketDayLow") or 0) or None
        fifty_day_avg = float(info.get("fiftyDayAverage")) if info.get("fiftyDayAverage") else None
        two_hundred_day_avg = float(info.get("twoHundredDayAverage")) if info.get("twoHundredDayAverage") else None

        # Dividend details
        dividend_rate = float(info.get("dividendRate")) if info.get("dividendRate") else None
        five_yr_avg_yield = float(info.get("fiveYearAvgDividendYield")) if info.get("fiveYearAvgDividendYield") else None
        last_dividend_value = float(info.get("lastDividendValue")) if info.get("lastDividendValue") else None
        ex_dividend_ts = info.get("exDividendDate") or info.get("lastDividendDate")
        ex_dividend_date = None
        if ex_dividend_ts:
            try:
                from datetime import timezone
                ex_dividend_date = datetime.fromtimestamp(int(ex_dividend_ts), tz=timezone.utc).strftime("%Y-%m-%d")
            except Exception:
                pass

        # Earnings
        earnings_ts = info.get("earningsTimestamp")
        earnings_date = None
        if earnings_ts:
            try:
                from datetime import timezone
                earnings_date = datetime.fromtimestamp(int(earnings_ts), tz=timezone.utc).strftime("%Y-%m-%d")
            except Exception:
                pass

        # Analyst consensus
        recommendation = info.get("recommendationKey")  # "buy"/"hold"/"sell"/"strong_buy" etc.
        recommendation_mean = float(info.get("recommendationMean")) if info.get("recommendationMean") else None
        analyst_count = int(info.get("numberOfAnalystOpinions")) if info.get("numberOfAnalystOpinions") else None
        target_mean = float(info.get("targetMeanPrice")) if info.get("targetMeanPrice") else None
        target_high = float(info.get("targetHighPrice")) if info.get("targetHighPrice") else None
        target_low = float(info.get("targetLowPrice")) if info.get("targetLowPrice") else None

        # Forward metrics
        forward_pe = float(info.get("forwardPE")) if info.get("forwardPE") else None
        forward_eps = float(info.get("forwardEps")) if info.get("forwardEps") else None

        # Officers — try to extract CEO
        ceo = None
        officers = info.get("companyOfficers") or []
        for officer in officers:
            title = (officer.get("title") or "").lower()
            if "chief executive" in title or "ceo" in title:
                ceo = officer.get("name")
                break

        return {
            "ticker": ticker,
            "company_name": info.get("longName") or info.get("shortName") or ticker,
            "exchange": info.get("fullExchangeName") or info.get("exchange") or ("TASE" if is_israeli else "NASDAQ"),
            "sector": info.get("sector"),
            "industry": info.get("industry"),
            "currency": info.get("currency") or ("ILS" if is_israeli else "USD"),
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
                "week_52_high": float(week_52_high) if week_52_high else None,
                "week_52_low": float(week_52_low) if week_52_low else None,
                "avg_volume": int(avg_volume) if avg_volume else None,
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
                        "target_mean": None, "target_high": None, "target_low": None},
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
    yf_period, yf_interval = _HISTORY_PARAMS.get(period.upper(), ("1mo", "1d"))
    try:
        t = yf.Ticker(ticker)
        hist = t.history(period=yf_period, interval=yf_interval)
        data = []
        for ts, row in hist.iterrows():
            data.append({
                "date": ts.strftime("%Y-%m-%d") if yf_interval != "5m" and yf_interval != "15m"
                        else ts.strftime("%Y-%m-%dT%H:%M:%S"),
                "open":   round(float(row["Open"]),   4),
                "high":   round(float(row["High"]),   4),
                "low":    round(float(row["Low"]),    4),
                "close":  round(float(row["Close"]),  4),
                "volume": int(row["Volume"]) if not pd.isna(row["Volume"]) else 0,
            })
        return {"ticker": ticker, "period": period, "data": data}
    except Exception as e:
        logger.warning(f"get_stock_history({ticker}, {period}) failed: {e}")
        return {"ticker": ticker, "period": period, "data": []}
