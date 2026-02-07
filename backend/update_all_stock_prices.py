"""
Batch update stock prices for all world and Israeli stocks
Includes rate limiting, error handling, and progress tracking
"""

import time
import logging
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.stock_price_service import StockPriceService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def update_stocks_in_batches(
    db: Session,
    market: str,
    batch_size: int = 100,
    delay_seconds: float = 1.0
) -> Tuple[int, int, int]:
    """
    Update stock prices in batches with rate limiting
    
    Args:
        market: 'world' or 'israeli'
        batch_size: Number of stocks per batch
        delay_seconds: Delay between batches to avoid rate limits
    
    Returns:
        (total_updated, total_failed, batches_processed)
    """
    service = StockPriceService(db)
    
    # Get all stale tickers (older than 24 hours)
    all_tickers = service.get_stale_catalog_tickers(
        hours=24, 
        limit=10000,  # Get all
        market=market
    )
    
    total_updated = 0
    total_failed = 0
    batches_processed = 0
    
    logger.info(f"Found {len(all_tickers)} {market} stocks to update")
    
    # Process in batches
    for i in range(0, len(all_tickers), batch_size):
        batch = all_tickers[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(all_tickers) + batch_size - 1) // batch_size
        
        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} stocks)...")
        
        try:
            updated, failed = service.update_world_stock_prices(batch, market=market)
            total_updated += updated
            total_failed += failed
            batches_processed += 1
            
            logger.info(f"Batch {batch_num}: Updated {updated}, Failed {failed}")
            logger.info(f"Progress: {total_updated + total_failed}/{len(all_tickers)} ({(total_updated + total_failed)/len(all_tickers)*100:.1f}%)")
            
            # Commit after each batch
            db.commit()
            
            # Rate limiting delay
            if i + batch_size < len(all_tickers):
                logger.info(f"Sleeping {delay_seconds}s before next batch...")
                time.sleep(delay_seconds)
                
        except Exception as e:
            logger.error(f"Error processing batch {batch_num}: {e}")
            db.rollback()
            total_failed += len(batch)
            continue
    
    return total_updated, total_failed, batches_processed


def main():
    """Update all world and Israeli stocks"""
    db = SessionLocal()
    
    try:
        # Update world stocks (2,948 stocks)
        logger.info("=" * 70)
        logger.info("UPDATING WORLD STOCKS")
        logger.info("=" * 70)
        world_start = time.time()
        world_updated, world_failed, world_batches = update_stocks_in_batches(
            db, market='world', batch_size=100, delay_seconds=1.0
        )
        world_duration = time.time() - world_start
        
        logger.info(f"\n{'=' * 70}")
        logger.info(f"World Stocks Summary:")
        logger.info(f"  Updated: {world_updated}")
        logger.info(f"  Failed: {world_failed}")
        logger.info(f"  Batches: {world_batches}")
        logger.info(f"  Duration: {world_duration/60:.1f} minutes")
        logger.info(f"  Rate: {world_updated/world_duration:.1f} stocks/sec")
        
        # Small delay between markets
        time.sleep(5)
        
        # Update Israeli stocks (185 stocks)
        logger.info("\n" + "=" * 70)
        logger.info("UPDATING ISRAELI STOCKS")
        logger.info("=" * 70)
        israeli_start = time.time()
        israeli_updated, israeli_failed, israeli_batches = update_stocks_in_batches(
            db, market='israeli', batch_size=50, delay_seconds=1.0
        )
        israeli_duration = time.time() - israeli_start
        
        logger.info(f"\n{'=' * 70}")
        logger.info(f"Israeli Stocks Summary:")
        logger.info(f"  Updated: {israeli_updated}")
        logger.info(f"  Failed: {israeli_failed}")
        logger.info(f"  Batches: {israeli_batches}")
        logger.info(f"  Duration: {israeli_duration/60:.1f} minutes")
        logger.info(f"  Rate: {israeli_updated/israeli_duration:.1f} stocks/sec")
        
        # Overall summary
        total_duration = world_duration + israeli_duration
        logger.info("\n" + "=" * 70)
        logger.info("OVERALL SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total Updated: {world_updated + israeli_updated}")
        logger.info(f"Total Failed: {world_failed + israeli_failed}")
        logger.info(f"Total Batches: {world_batches + israeli_batches}")
        logger.info(f"Total Duration: {total_duration/60:.1f} minutes")
        logger.info(f"Overall Rate: {(world_updated + israeli_updated)/total_duration:.1f} stocks/sec")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
