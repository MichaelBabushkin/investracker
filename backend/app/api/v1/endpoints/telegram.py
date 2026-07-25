"""
Telegram news feed endpoints.
"""

import threading
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import text
from typing import Optional

from app.core.deps import get_current_user, get_db
from app.core.auth import get_admin_user

router = APIRouter(prefix="/telegram", tags=["telegram"])

# ── On-demand sync state ──
# News is refreshed lazily: any authenticated user viewing /news triggers a
# sync, but at most once per cooldown, in a background thread. No always-on
# worker — cost scales with actual usage and the service can still sleep.
_SYNC_COOLDOWN_SEC = 15 * 60
_sync_lock = threading.Lock()
_sync_running = False
_last_sync_at: datetime | None = None
_last_sync_new = 0


def _run_background_sync():
    """Sync all subscribed channels once, in a worker thread with its own session."""
    global _sync_running, _last_sync_at, _last_sync_new
    from app.core.database import SessionLocal
    from app.services.telegram_service import sync_all_active_channels
    db = SessionLocal()
    try:
        result = sync_all_active_channels(db)
        _last_sync_new = int(result.get("new_messages", 0))
    except Exception:
        pass  # transient (FloodWait, network) — next trigger retries
    finally:
        db.close()
        with _sync_lock:
            _last_sync_at = datetime.now(timezone.utc)
            _sync_running = False


# ---------------------------------------------------------------------------
# Channels
# ---------------------------------------------------------------------------

@router.get("/channels")
def list_channels(
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """List all active channels with is_subscribed flag for current user."""
    rows = db.execute(
        text("""
            SELECT
                tc.id,
                tc.username,
                tc.title,
                tc.description,
                tc.logo_url,
                tc.language,
                tc.categories,
                tc.subscriber_count,
                tc.last_synced_at,
                CASE WHEN uts.id IS NOT NULL THEN true ELSE false END AS is_subscribed
            FROM telegram_channels tc
            LEFT JOIN user_telegram_subscriptions uts
                ON uts.channel_id = tc.id AND uts.user_id = :user_id
            WHERE tc.is_active = true
            ORDER BY tc.title
        """),
        {"user_id": current_user.id},
    ).fetchall()

    return [dict(r._mapping) for r in rows]


# ---------------------------------------------------------------------------
# Subscriptions
# ---------------------------------------------------------------------------

@router.post("/subscriptions/{channel_id}", status_code=201)
def subscribe(
    channel_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    # Verify channel exists and is active
    ch = db.execute(
        text("SELECT id FROM telegram_channels WHERE id = :id AND is_active = true"),
        {"id": channel_id},
    ).fetchone()
    if not ch:
        raise HTTPException(status_code=404, detail="Channel not found")

    db.execute(
        text("""
            INSERT INTO user_telegram_subscriptions (user_id, channel_id)
            VALUES (:user_id, :channel_id)
            ON CONFLICT ON CONSTRAINT uq_user_channel_subscription DO NOTHING
        """),
        {"user_id": current_user.id, "channel_id": channel_id},
    )
    db.commit()
    return {"subscribed": True, "channel_id": channel_id}


@router.delete("/subscriptions/{channel_id}", status_code=200)
def unsubscribe(
    channel_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    db.execute(
        text("""
            DELETE FROM user_telegram_subscriptions
            WHERE user_id = :user_id AND channel_id = :channel_id
        """),
        {"user_id": current_user.id, "channel_id": channel_id},
    )
    db.commit()
    return {"unsubscribed": True, "channel_id": channel_id}


# ---------------------------------------------------------------------------
# Feed
# ---------------------------------------------------------------------------

@router.get("/feed")
def get_feed(
    ticker: Optional[str] = Query(None, description="Filter messages mentioning this ticker/symbol"),
    channel_id: Optional[int] = Query(None, description="Filter to a single channel"),
    category: Optional[str] = Query(None, description="Filter by channel category (e.g. stocks, crypto)"),
    channel_ids: Optional[str] = Query(None, description="Comma-separated channel IDs to filter"),
    holdings_only: bool = Query(False, description="Only posts mentioning a currently-held ticker"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Paginated feed from channels the user is subscribed to.
    Optionally filter by ticker mention, single channel, multiple channels, or category.
    """
    offset = (page - 1) * page_size
    params: dict = {"user_id": current_user.id, "limit": page_size, "offset": offset}

    # Build WHERE clauses
    where_parts = [
        "uts.user_id = :user_id",
        "tc.is_active = true",
    ]

    if holdings_only:
        # Portfolio lens: posts whose text mentions any currently-held ticker,
        # matched on word boundaries so "MP" doesn't hit "important".
        import re as _re
        held = db.execute(text("""
            SELECT ticker FROM world_stock_holdings WHERE user_id = :user_id AND quantity > 0
            UNION
            SELECT symbol FROM israeli_stock_holdings WHERE user_id = :user_id AND quantity > 0
        """), {"user_id": current_user.id}).fetchall()
        syms = sorted({str(h[0]).split()[0].upper() for h in held if h and h[0]})
        if not syms:
            where_parts.append("false")   # holds nothing → no matches
        else:
            params["holdings_pattern"] = r"\y(" + "|".join(_re.escape(s) for s in syms) + r")\y"
            where_parts.append("tm.text ~* :holdings_pattern")

    if channel_ids:
        ids = [int(x.strip()) for x in channel_ids.split(",") if x.strip().isdigit()]
        if ids:
            placeholders = ", ".join(f":cid_{i}" for i in range(len(ids)))
            where_parts.append(f"tm.channel_id IN ({placeholders})")
            for i, cid in enumerate(ids):
                params[f"cid_{i}"] = cid
    elif channel_id:
        where_parts.append("tm.channel_id = :channel_id")
        params["channel_id"] = channel_id

    if ticker:
        # Search for ticker and common name variants — simple ILIKE for now
        where_parts.append("tm.text ILIKE :ticker_pattern")
        params["ticker_pattern"] = f"%{ticker}%"

    if category:
        # Filter channels whose categories JSON array contains the given category
        where_parts.append("tc.categories::jsonb @> :cat_json::jsonb")
        import json
        params["cat_json"] = json.dumps([category.lower()])

    where_sql = " AND ".join(where_parts)

    count_row = db.execute(
        text(f"""
            SELECT COUNT(*) FROM telegram_messages tm
            JOIN telegram_channels tc ON tc.id = tm.channel_id
            JOIN user_telegram_subscriptions uts ON uts.channel_id = tc.id
            WHERE {where_sql}
        """),
        params,
    ).fetchone()
    total = count_row[0] if count_row else 0

    rows = db.execute(
        text(f"""
            SELECT
                tm.id,
                tm.text,
                tm.has_media,
                tm.media_type,
                tm.views,
                tm.forwards,
                tm.posted_at,
                tc.id AS channel_id,
                tc.username AS channel_username,
                tc.title AS channel_title,
                tc.logo_url AS channel_logo_url,
                tc.categories AS channel_categories
            FROM telegram_messages tm
            JOIN telegram_channels tc ON tc.id = tm.channel_id
            JOIN user_telegram_subscriptions uts ON uts.channel_id = tc.id
            WHERE {where_sql}
            ORDER BY tm.posted_at DESC
            LIMIT :limit OFFSET :offset
        """),
        params,
    ).fetchall()

    items = []
    for r in rows:
        items.append({
            "id": r.id,
            "text": r.text,
            "has_media": bool(r.has_media),
            "media_type": r.media_type,
            "media_proxy_url": f"telegram/media/{r.channel_id}/{r.id}" if r.has_media else None,
            "views": r.views,
            "forwards": r.forwards,
            "posted_at": r.posted_at,
            "channel": {
                "id": r.channel_id,
                "username": r.channel_username,
                "title": r.channel_title,
                "logo_url": r.channel_logo_url,
                "categories": r.channel_categories,
            },
        })

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.post("/refresh")
def refresh_feed(
    current_user: dict = Depends(get_current_user),
):
    """
    Lazily refresh the news feed. Kicks a background sync of subscribed channels
    if none is running and the cooldown has elapsed; otherwise a cheap no-op.
    Returns immediately — the client polls /feed to pick up new rows.
    """
    global _sync_running, _last_sync_at
    from app.services.telegram_service import is_configured

    if not is_configured():
        return {"status": "not_configured", "last_synced_at": None, "syncing": False}

    now = datetime.now(timezone.utc)
    started = False
    with _sync_lock:
        due = _last_sync_at is None or (now - _last_sync_at).total_seconds() >= _SYNC_COOLDOWN_SEC
        if not _sync_running and due:
            _sync_running = True
            started = True

    if started:
        threading.Thread(target=_run_background_sync, daemon=True).start()

    return {
        "status": "syncing" if (started or _sync_running) else "fresh",
        "last_synced_at": _last_sync_at.isoformat() if _last_sync_at else None,
        "syncing": started or _sync_running,
    }


# ---------------------------------------------------------------------------
# Media proxy
# ---------------------------------------------------------------------------

@router.get("/media/{channel_id}/{message_db_id}")
def get_message_media(
    channel_id: int,
    message_db_id: int,
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Download and stream a Telegram message photo or video.
    Uses the DB message id (our PK) to look up the Telegram message_id and channel username.
    """
    from app.services.telegram_service import is_configured, download_message_media

    if not is_configured():
        raise HTTPException(status_code=503, detail="Telegram not configured")

    row = db.execute(
        text("""
            SELECT tm.message_id, tc.username
            FROM telegram_messages tm
            JOIN telegram_channels tc ON tc.id = tm.channel_id
            WHERE tm.id = :db_id AND tm.channel_id = :channel_id AND tm.has_media = true
        """),
        {"db_id": message_db_id, "channel_id": channel_id},
    ).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Media not found")

    result = download_message_media(row.username, row.message_id)
    if not result:
        raise HTTPException(status_code=404, detail="Could not download media")

    media_bytes, mime_type = result
    return Response(content=media_bytes, media_type=mime_type)


# ---------------------------------------------------------------------------
# Admin endpoints
# ---------------------------------------------------------------------------

@router.post("/admin/channels", status_code=201)
def admin_add_channel(
    body: dict,
    current_user: dict = Depends(get_admin_user),
    db=Depends(get_db),
):
    """
    Add a new Telegram channel. Triggers a metadata fetch from Telegram
    if credentials are configured.
    Body: { username, language?, category? }
    """
    username = (body.get("username") or "").lstrip("@").strip()
    if not username:
        raise HTTPException(status_code=400, detail="username is required")

    language = body.get("language", "en")
    categories = body.get("categories", ["general"])

    # Check duplicate
    existing = db.execute(
        text("SELECT id FROM telegram_channels WHERE username = :u"), {"u": username}
    ).fetchone()
    if existing:
        raise HTTPException(status_code=409, detail="Channel already exists")

    # Fetch metadata from Telegram if possible
    title = username
    description = None
    subscriber_count = None
    logo_url = None

    from app.services.telegram_service import is_configured, fetch_channel_meta
    if is_configured():
        try:
            meta = fetch_channel_meta(username)
            if meta:
                title = meta.get("title") or username
                description = meta.get("description")
                subscriber_count = meta.get("subscriber_count")
                logo_url = meta.get("logo_url")
        except Exception as e:
            # Non-fatal — channel is still created with minimal info
            pass

    import json
    result = db.execute(
        text("""
            INSERT INTO telegram_channels (username, title, description, logo_url, language, categories, is_active, subscriber_count)
            VALUES (:username, :title, :description, :logo_url, :language, :categories, true, :subscriber_count)
            RETURNING id
        """),
        {
            "username": username,
            "title": title,
            "description": description,
            "logo_url": logo_url,
            "language": language,
            "categories": json.dumps(categories),
            "subscriber_count": subscriber_count,
        },
    )
    db.commit()
    new_id = result.fetchone()[0]
    return {"id": new_id, "username": username, "title": title}


@router.patch("/admin/channels/{channel_id}")
def admin_update_channel(
    channel_id: int,
    body: dict,
    current_user: dict = Depends(get_admin_user),
    db=Depends(get_db),
):
    """Update channel fields: is_active, language, categories, title."""
    allowed = {"is_active", "language", "categories", "title"}
    updates = {k: v for k, v in body.items() if k in allowed}
    if not updates:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    if "categories" in updates:
        import json
        updates["categories"] = json.dumps(updates["categories"])

    set_parts = ", ".join(f"{k} = :{k}" for k in updates)
    updates["id"] = channel_id

    db.execute(
        text(f"UPDATE telegram_channels SET {set_parts} WHERE id = :id"),
        updates,
    )
    db.commit()
    return {"updated": True, "channel_id": channel_id}


@router.delete("/admin/channels/{channel_id}", status_code=200)
def admin_delete_channel(
    channel_id: int,
    current_user: dict = Depends(get_admin_user),
    db=Depends(get_db),
):
    """Permanently delete a channel and all its messages/subscriptions (CASCADE)."""
    row = db.execute(
        text("SELECT id, username FROM telegram_channels WHERE id = :id"),
        {"id": channel_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Channel not found")

    db.execute(text("DELETE FROM telegram_channels WHERE id = :id"), {"id": channel_id})
    db.commit()
    return {"deleted": True, "channel_id": channel_id, "username": row.username}


@router.post("/admin/channels/{channel_id}/sync")
def admin_sync_channel(
    channel_id: int,
    current_user: dict = Depends(get_admin_user),
    db=Depends(get_db),
):
    """Force-sync messages for a channel right now."""
    from app.services.telegram_service import is_configured, sync_channel

    if not is_configured():
        raise HTTPException(
            status_code=503,
            detail="Telegram credentials not configured. Set TELEGRAM_SESSION_STRING in environment.",
        )

    row = db.execute(
        text("SELECT id, username FROM telegram_channels WHERE id = :id"),
        {"id": channel_id},
    ).fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Channel not found")

    try:
        new_messages = sync_channel(row.id, row.username, db)
        return {"synced": True, "new_messages": new_messages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/admin/channels")
def admin_list_channels(
    current_user: dict = Depends(get_admin_user),
    db=Depends(get_db),
):
    """Admin: list all channels (including inactive)."""
    rows = db.execute(
        text("""
            SELECT tc.*,
                   COUNT(DISTINCT uts.user_id) AS subscriber_count_app,
                   COUNT(DISTINCT tm.id) AS message_count
            FROM telegram_channels tc
            LEFT JOIN user_telegram_subscriptions uts ON uts.channel_id = tc.id
            LEFT JOIN telegram_messages tm ON tm.channel_id = tc.id
            GROUP BY tc.id
            ORDER BY tc.created_at DESC
        """)
    ).fetchall()
    return [dict(r._mapping) for r in rows]
