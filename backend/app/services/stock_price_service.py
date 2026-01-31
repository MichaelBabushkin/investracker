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
    
    def get_active_tickers(self) -> List[str]:
        """Get tickers that are in user holdings (Tier 1)"""
        result = self.db.execute(
            text("""
                SELECT DISTINCT ticker 
                FROM "WorldStockHolding" 
                WHERE quantity > 0
            """)
        )
        return [row[0] for row in result.fetchall()]
    
    def get_stale_catalog_tickers(self, hours: int = 24, limit: int = 500) -> List[str]:
        """Get tickers not updated in the last N hours (Tier 2)"""
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        result = self.db.execute(
            text("""
                SELECT ticker 
                FROM "WorldStocks" 
                WHERE price_updated_at IS NULL OR price_updated_at < :cutoff
                ORDER BY price_updated_at ASC NULLS FIRST
                LIMIT :limit
            """),
            {"cutoff": cutoff, "limit": limit}
        )
        return [row[0] for row in result.fetchall()]
    
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
    
    def update_world_stock_prices(self, tickers: Optional[List[str]] = None) -> Tuple[int, int]:
        """
        Update prices for world stocks.
        Returns (updated_count, failed_count)
        """
        if tickers is None:
            tickers = self.get_active_tickers()
        
        if not tickers:
            logger.info("No tickers to update")
            return 0, 0
        
        logger.info(f"Updating prices for {len(tickers)} world stocks")
        
        # Fetch prices
        price_data = self.fetch_prices_batch(tickers)
        
        updated = 0
        failed = 0
        now = datetime.utcnow()
        
        for ticker, data in price_data.items():
            try:
                self.db.execute(
                    text("""
                        UPDATE "WorldStocks"
                        SET current_price = :current_price,
                            previous_close = :previous_close,
                            price_change = :price_change,
                            price_change_pct = :price_change_pct,
                            day_high = :day_high,
                            day_low = :day_low,
                            volume = :volume,
                            market_cap = :market_cap,
                            price_updated_at = :updated_at
                        WHERE ticker = :ticker
                    """),
                    {
                        "ticker": ticker,
                        "current_price": data.get('current_price'),
                        "previous_close": data.get('previous_close'),
                        "price_change": data.get('price_change'),
                        "price_change_pct": data.get('price_change_pct'),
                        "day_high": data.get('day_high'),
                        "day_low": data.get('day_low'),
                        "volume": data.get('volume'),
                        "market_cap": data.get('market_cap'),
                        "updated_at": now
                    }
                )
                updated += 1
            except Exception as e:
                logger.error(f"Failed to update {ticker}: {e}")
                failed += 1
        
        self.db.commit()
        logger.info(f"Updated {updated} stocks, {failed} failed")
        return updated, failed
    
    def update_holdings_values(self, user_id: Optional[str] = None) -> int:
        """
        Recalculate current_value for holdings based on latest stock prices.
        Returns number of holdings updated.
        """
        query = """
            UPDATE "WorldStockHolding" h
            SET current_value = h.quantity * s.current_price,
                last_price = s.current_price,
                updated_at = :now
            FROM "WorldStocks" s
            WHERE h.ticker = s.ticker
            AND s.current_price IS NOT NULL
        """
        
        if user_id:
            query += " AND h.user_id = :user_id"
            result = self.db.execute(text(query), {"now": datetime.utcnow(), "user_id": user_id})
        else:
            result = self.db.execute(text(query), {"now": datetime.utcnow()})
        
        self.db.commit()
        return result.rowcount
    
    def get_price_stats(self) -> Dict:
        """Get statistics about price data freshness"""
        result = self.db.execute(
            text("""
                SELECT 
                    COUNT(*) as total,
                    COUNT(current_price) as with_price,
                    COUNT(CASE WHEN price_updated_at > NOW() - INTERVAL '15 minutes' THEN 1 END) as fresh_15m,
                    COUNT(CASE WHEN price_updated_at > NOW() - INTERVAL '24 hours' THEN 1 END) as fresh_24h,
                    MIN(price_updated_at) as oldest_update,
                    MAX(price_updated_at) as newest_update
                FROM "WorldStocks"
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


def update_catalog_stocks_prices(db: Session, limit: int = 500) -> Tuple[int, int]:
    """Update prices for catalog stocks (batch job)"""
    service = StockPriceService(db)
    tickers = service.get_stale_catalog_tickers(hours=24, limit=limit)
    return service.update_world_stock_prices(tickers)


def recalculate_holdings_values(db: Session) -> int:
    """Recalculate all holdings values"""
    service = StockPriceService(db)
    return service.update_holdings_values()
