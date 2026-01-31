"""
Scheduled tasks for stock price updates
Run via cron jobs (Railway) or manual API calls
"""
import logging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services.stock_price_service import (
    update_active_stocks_prices,
    update_catalog_stocks_prices,
    recalculate_holdings_values
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_active_price_update():
    """
    Update prices for stocks in user holdings.
    Run every 15 minutes during market hours.
    """
    logger.info("Starting active stocks price update...")
    db = SessionLocal()
    try:
        updated, failed = update_active_stocks_prices(db)
        holdings_updated = recalculate_holdings_values(db)
        logger.info(f"Active update complete: {updated} prices updated, {failed} failed, {holdings_updated} holdings recalculated")
    except Exception as e:
        logger.error(f"Active price update failed: {e}")
        raise
    finally:
        db.close()


def run_catalog_price_update():
    """
    Update prices for all stocks in catalog.
    Run once daily (overnight).
    """
    logger.info("Starting catalog stocks price update...")
    db = SessionLocal()
    try:
        updated, failed = update_catalog_stocks_prices(db, limit=1000)
        logger.info(f"Catalog update complete: {updated} prices updated, {failed} failed")
    except Exception as e:
        logger.error(f"Catalog price update failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Stock price update tasks")
    parser.add_argument(
        "task",
        choices=["active", "catalog", "both"],
        help="Which update task to run"
    )
    args = parser.parse_args()
    
    if args.task == "active":
        run_active_price_update()
    elif args.task == "catalog":
        run_catalog_price_update()
    elif args.task == "both":
        run_active_price_update()
        run_catalog_price_update()
