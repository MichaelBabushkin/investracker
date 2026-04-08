"""
Telegram news feed endpoints.
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy import text
from typing import Optional

from app.core.deps import get_current_user, get_db
from app.core.auth import get_admin_user

router = APIRouter(prefix="/telegram", tags=["telegram"])


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
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
    db=Depends(get_db),
):
    """
    Paginated feed from channels the user is subscribed to.
    Optionally filter by ticker mention or specific channel.
    """
    offset = (page - 1) * page_size
    params: dict = {"user_id": current_user.id, "limit": page_size, "offset": offset}

    # Build WHERE clauses
    where_parts = [
        "uts.user_id = :user_id",
        "tc.is_active = true",
    ]

    if channel_id:
        where_parts.append("tm.channel_id = :channel_id")
        params["channel_id"] = channel_id

    if ticker:
        # Search for ticker and common name variants — simple ILIKE for now
        where_parts.append("tm.text ILIKE :ticker_pattern")
        params["ticker_pattern"] = f"%{ticker}%"

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
            "media_proxy_url": f"/api/telegram/media/{r.channel_id}/{r.id}" if r.has_media else None,
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
    Download and stream a Telegram message photo.
    Uses the DB message id (our PK) to look up the Telegram message_id and channel username.
    """
    from app.services.telegram_service import is_configured, download_message_photo

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

    photo_bytes = download_message_photo(row.username, row.message_id)
    if not photo_bytes:
        raise HTTPException(status_code=404, detail="Could not download media")

    return Response(content=photo_bytes, media_type="image/jpeg")


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
