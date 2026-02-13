"""
Stock Price Service
Fetches and updates stock prices from external APIs (yfinance)
Implements tiered update strategy for cost efficiency
"""
import yfinance as yf
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
                    FROM "WorldStockHolding" 
                    WHERE quantity > 0
                """)
            )
        else:
            result = self.db.execute(
                text("""
                    SELECT DISTINCT symbol 
                    FROM "IsraeliStockHolding" 
                    WHERE quantity > 0
                """)
            )
        return [row[0] for row in result.fetchall()]
    
    def get_stale_catalog_tickers(self, hours: int = 24, limit: int = 500, market: str = 'world') -> List[str]:
        """Get tickers not updated in the last N hours (Tier 2)"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        
        if market == 'world':
            table = '"WorldStocks"'
            ticker_field = 's.ticker'
        else:
            table = '"IsraeliStocks"'
            ticker_field = 's.symbol'  # Use symbol (display ticker) for Israeli stocks
        
        result = self.db.execute(
            text(f"""
                SELECT {ticker_field}
                FROM {table} s
                LEFT JOIN "StockPrices" sp ON {ticker_field} = sp.ticker AND sp.market = :market
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
                FROM "IsraeliStocks" 
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
                data = yf.download(
                    tickers_str,
                    period="1d",
                    interval="1d",
                    progress=False,
                    threads=True
                )
                
                # Also get info for each ticker
                for ticker in batch:
                    try:
                        stock = yf.Ticker(ticker)
                        info = stock.info
                        
                        # Handle both single and multi-ticker response format
                        if len(batch) == 1:
                            close = data['Close'].iloc[-1] if not data.empty else None
                            volume = data['Volume'].iloc[-1] if not data.empty else None
                            high = data['High'].iloc[-1] if not data.empty else None
                            low = data['Low'].iloc[-1] if not data.empty else None
                        else:
                            close = data['Close'][ticker].iloc[-1] if ticker in data['Close'].columns and not data['Close'][ticker].empty else None
                            volume = data['Volume'][ticker].iloc[-1] if ticker in data['Volume'].columns else None
                            high = data['High'][ticker].iloc[-1] if ticker in data['High'].columns else None
                            low = data['Low'][ticker].iloc[-1] if ticker in data['Low'].columns else None
                        
                        results[ticker] = {
                            'current_price': float(info.get('currentPrice') or info.get('regularMarketPrice') or close or 0),
                            'previous_close': float(info.get('previousClose') or info.get('regularMarketPreviousClose') or 0),
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
                        logger.warning(f"Failed to fetch {ticker}: {e}")
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
        
        # For Israeli stocks, map display tickers to yfinance tickers
        if market == 'israeli':
            ticker_map = self._get_israeli_ticker_map(tickers)  # display -> yfinance
            yfinance_tickers = list(ticker_map.values())
            reverse_map = {v: k for k, v in ticker_map.items()}  # yfinance -> display
        else:
            ticker_map = {t: t for t in tickers}
            yfinance_tickers = tickers
            reverse_map = ticker_map
        
        # Fetch prices using yfinance tickers
        price_data = self.fetch_prices_batch(yfinance_tickers)
        
        updated = 0
        failed = 0
        now = datetime.utcnow()
        
        for yf_ticker, data in price_data.items():
            try:
                # Get display ticker for storage
                display_ticker = reverse_map.get(yf_ticker, yf_ticker)
                
                # Use INSERT ... ON CONFLICT to upsert
                self.db.execute(
                    text("""
                        INSERT INTO "StockPrices" 
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
            except Exception as e:
                logger.error(f"Failed to update {yf_ticker}: {e}")
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
        table = '"WorldStockHolding"' if market == 'world' else '"IsraeliStockHolding"'
        query = f"""
            UPDATE {table} h
            SET current_value = h.quantity * sp.current_price,
                last_price = sp.current_price,
                updated_at = :now
            FROM "StockPrices" sp
            WHERE h.ticker = sp.ticker
            AND sp.market = :market
            AND sp.current_price IS NOT NULL
        """
        
        if user_id:
            query += " AND h.user_id = :user_id"
            result = self.db.execute(text(query), {"now": datetime.utcnow(), "market": market, "user_id": user_id})
        else:
            result = self.db.execute(text(query), {"now": datetime.utcnow(), "market": market})
        
        self.db.commit()
        return result.rowcount
    
    def get_price_stats(self) -> Dict:
        """Get statistics about price data freshness"""
        result = self.db.execute(
            text("""
                SELECT 
                    (SELECT COUNT(*) FROM "WorldStocks") as total,
                    COUNT(sp.current_price) as with_price,
                    COUNT(CASE WHEN sp.updated_at > NOW() - INTERVAL '15 minutes' THEN 1 END) as fresh_15m,
                    COUNT(CASE WHEN sp.updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as fresh_24h,
                    MIN(sp.updated_at) as oldest_update,
                    MAX(sp.updated_at) as newest_update
                FROM "StockPrices" sp
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
