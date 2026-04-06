"""
Scheduled task: sync Telegram news channels.
Run every 15 minutes via Railway cron or manual API call.
"""
import logging
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import SessionLocal
from app.services.telegram_service import sync_all_active_channels, prune_old_messages, is_configured

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def run_telegram_sync():
    """
    Sync new messages from all subscribed Telegram channels.
    Skips gracefully if credentials are not configured.
    """
    if not is_configured():
        logger.info("Telegram credentials not configured — skipping sync")
        return

    logger.info("Starting Telegram channel sync...")
    db = SessionLocal()
    try:
        result = sync_all_active_channels(db)
        logger.info(
            f"Telegram sync complete: {result['channels_synced']} channels, "
            f"{result['new_messages']} new messages"
        )
    except Exception as e:
        logger.error(f"Telegram sync failed: {e}")
        raise
    finally:
        db.close()


def run_telegram_prune():
    """Delete messages older than 30 days. Run once daily."""
    db = SessionLocal()
    try:
        deleted = prune_old_messages(db, days=30)
        logger.info(f"Telegram prune complete: {deleted} messages deleted")
    except Exception as e:
        logger.error(f"Telegram prune failed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    run_telegram_sync()
