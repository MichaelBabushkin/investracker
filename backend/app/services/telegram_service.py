"""
Telegram MTProto service via Telethon.

Reads public channels without requiring bot admin access.
Session is pre-generated via scripts/generate_telegram_session.py and stored
as TELEGRAM_SESSION_STRING in the environment.
"""

import asyncio
import logging
from datetime import datetime, timezone, timedelta
from typing import Optional

from telethon import TelegramClient
from telethon.sessions import StringSession
from telethon.tl.types import MessageMediaPhoto, MessageMediaDocument, Channel
from telethon.errors import FloodWaitError, ChannelPrivateError

from app.core.config import settings

logger = logging.getLogger(__name__)


def _get_client() -> TelegramClient:
    """Return an authenticated Telethon client using the stored session string."""
    return TelegramClient(
        StringSession(settings.TELEGRAM_SESSION_STRING),
        settings.TELEGRAM_API_ID,
        settings.TELEGRAM_API_HASH,
    )


async def _fetch_channel_meta_async(username: str) -> Optional[dict]:
    """Fetch channel title, description, subscriber count, and logo URL."""
    async with _get_client() as client:
        try:
            entity = await client.get_entity(username)
            if not isinstance(entity, Channel):
                return None

            full = await client(
                __import__(
                    "telethon.tl.functions.channels", fromlist=["GetFullChannelRequest"]
                ).GetFullChannelRequest(entity)
            )

            # Try to get channel photo URL
            logo_url = None
            try:
                photo = await client.download_profile_photo(entity, file=bytes)
                # We store the photo as bytes — for now skip media hosting, return None
                # In future: upload to S3/Cloudinary and store URL
                logo_url = None
            except Exception:
                pass

            return {
                "title": entity.title,
                "description": full.full_chat.about or None,
                "subscriber_count": full.full_chat.participants_count,
                "logo_url": logo_url,
            }
        except (ChannelPrivateError, ValueError) as e:
            logger.warning(f"Cannot access channel @{username}: {e}")
            return None
        except FloodWaitError as e:
            logger.warning(f"FloodWait {e.seconds}s when accessing @{username}")
            return None


async def _fetch_recent_messages_async(username: str, limit: int = 100) -> list[dict]:
    """
    Fetch the most recent `limit` messages from a public channel.
    Returns list of dicts with: message_id, text, has_media, views, forwards, posted_at.
    """
    results = []
    async with _get_client() as client:
        try:
            async for msg in client.iter_messages(username, limit=limit):
                # Skip service messages (joins, pins, etc.) that have no content
                if not msg.text and not msg.media:
                    continue

                media_type = None
                if isinstance(msg.media, MessageMediaPhoto):
                    media_type = "photo"
                elif isinstance(msg.media, MessageMediaDocument):
                    doc = msg.media.document
                    mime = getattr(doc, "mime_type", "") or ""
                    if mime.startswith("video/"):
                        media_type = "video"
                    else:
                        media_type = "document"
                has_media = media_type in ("photo", "video")

                posted_at = msg.date
                if posted_at and posted_at.tzinfo is None:
                    posted_at = posted_at.replace(tzinfo=timezone.utc)

                results.append({
                    "message_id": msg.id,
                    "text": msg.text or None,
                    "has_media": has_media,
                    "media_type": media_type,
                    "views": getattr(msg, "views", None),
                    "forwards": getattr(msg, "forwards", None),
                    "posted_at": posted_at,
                })
        except (ChannelPrivateError, ValueError) as e:
            logger.warning(f"Cannot read messages from @{username}: {e}")
        except FloodWaitError as e:
            logger.warning(f"FloodWait {e.seconds}s when reading @{username}")

    return results


async def _download_message_media_async(username: str, message_id: int) -> Optional[tuple[bytes, str]]:
    """
    Download photo or video from a specific message.
    Returns (bytes, mime_type) or None.
    """
    async with _get_client() as client:
        try:
            msgs = await client.get_messages(username, ids=message_id)
            msg = msgs if not isinstance(msgs, list) else (msgs[0] if msgs else None)
            if not msg or not msg.media:
                return None
            if isinstance(msg.media, MessageMediaPhoto):
                data = await client.download_media(msg.media, file=bytes)
                return (data, "image/jpeg") if data else None
            if isinstance(msg.media, MessageMediaDocument):
                doc = msg.media.document
                mime = getattr(doc, "mime_type", "application/octet-stream") or "application/octet-stream"
                if mime.startswith("video/") or mime.startswith("image/"):
                    data = await client.download_media(msg.media, file=bytes)
                    return (data, mime) if data else None
            return None
        except (ChannelPrivateError, ValueError):
            return None
        except FloodWaitError as e:
            logger.warning(f"FloodWait {e.seconds}s downloading media from @{username}")
            return None


# ---------------------------------------------------------------------------
# Sync helpers (called from tasks / endpoints, run async in thread)
# ---------------------------------------------------------------------------

def fetch_channel_meta(username: str) -> Optional[dict]:
    """Synchronous wrapper around _fetch_channel_meta_async."""
    return asyncio.run(_fetch_channel_meta_async(username))


def fetch_recent_messages(username: str, limit: int = 100) -> list[dict]:
    """Synchronous wrapper around _fetch_recent_messages_async."""
    return asyncio.run(_fetch_recent_messages_async(username, limit=limit))


def download_message_media(username: str, message_id: int) -> Optional[tuple[bytes, str]]:
    """Synchronous wrapper around _download_message_media_async. Returns (bytes, mime_type) or None."""
    return asyncio.run(_download_message_media_async(username, message_id))


def sync_channel(channel_id: int, username: str, db) -> int:
    """
    Pull latest messages for a channel and upsert into telegram_messages.
    Returns the number of new messages inserted.
    """
    from sqlalchemy import text

    messages = fetch_recent_messages(username, limit=100)
    new_count = 0

    for msg in messages:
        result = db.execute(
            text("""
                INSERT INTO telegram_messages (channel_id, message_id, text, has_media, media_type, views, forwards, posted_at)
                VALUES (:channel_id, :message_id, :text, :has_media, :media_type, :views, :forwards, :posted_at)
                ON CONFLICT ON CONSTRAINT uq_channel_message DO NOTHING
            """),
            {
                "channel_id": channel_id,
                "message_id": msg["message_id"],
                "text": msg["text"],
                "has_media": msg.get("has_media", False),
                "media_type": msg.get("media_type"),
                "views": msg.get("views"),
                "forwards": msg.get("forwards"),
                "posted_at": msg["posted_at"],
            },
        )
        if result.rowcount:
            new_count += 1

    # Update last_synced_at
    db.execute(
        text("UPDATE telegram_channels SET last_synced_at = now() WHERE id = :id"),
        {"id": channel_id},
    )
    db.commit()

    logger.info(f"sync_channel @{username}: {new_count} new messages")
    return new_count


def sync_all_active_channels(db) -> dict:
    """
    Sync all active channels that have at least one subscriber.
    Called by the background task.
    """
    from sqlalchemy import text

    rows = db.execute(
        text("""
            SELECT DISTINCT tc.id, tc.username
            FROM telegram_channels tc
            JOIN user_telegram_subscriptions uts ON uts.channel_id = tc.id
            WHERE tc.is_active = true
        """)
    ).fetchall()

    total_new = 0
    for row in rows:
        try:
            new = sync_channel(row.id, row.username, db)
            total_new += new
        except Exception as e:
            logger.error(f"Failed to sync @{row.username}: {e}")

    return {"channels_synced": len(rows), "new_messages": total_new}


def prune_old_messages(db, days: int = 30) -> int:
    """Delete messages older than `days` days. Returns deleted count."""
    from sqlalchemy import text

    result = db.execute(
        text("""
            DELETE FROM telegram_messages
            WHERE posted_at < now() - INTERVAL ':days days'
        """),
        {"days": days},
    )
    db.commit()
    deleted = result.rowcount
    logger.info(f"Pruned {deleted} telegram messages older than {days} days")
    return deleted


def is_configured() -> bool:
    """Return True if Telegram credentials are set in env."""
    return bool(
        settings.TELEGRAM_API_ID
        and settings.TELEGRAM_API_HASH
        and settings.TELEGRAM_SESSION_STRING
    )
