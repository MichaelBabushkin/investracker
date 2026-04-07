#!/opt/homebrew/bin/python3.11
"""
Seed initial Telegram channels and trigger a sync.
Run once: python backend/scripts/seed_telegram_channels.py
"""
import sys, os, asyncio
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from sqlalchemy import text
from app.core.database import SessionLocal
from app.services.telegram_service import is_configured, fetch_channel_meta, sync_channel

# ── Add your channel usernames here (without @) ──────────────────────────────
CHANNELS = [
    {"username": "investingil",       "language": "he", "category": "general"},
    {"username": "TheMarker",         "language": "he", "category": "general"},
    {"username": "calcalist",         "language": "he", "category": "general"},
    {"username": "globes_co_il",      "language": "he", "category": "general"},
    {"username": "FinanceNewsHE",     "language": "he", "category": "stocks"},
    {"username": "BloombergMarkets",  "language": "en", "category": "general"},
    {"username": "cnbcinternational", "language": "en", "category": "general"},
    {"username": "cryptonews",        "language": "en", "category": "crypto"},
]

if not is_configured():
    print("❌ TELEGRAM_SESSION_STRING not set in .env")
    sys.exit(1)

db = SessionLocal()

for ch in CHANNELS:
    username = ch["username"]

    # Skip if already exists
    existing = db.execute(
        text("SELECT id FROM telegram_channels WHERE username = :u"),
        {"u": username}
    ).fetchone()
    if existing:
        print(f"⏭  @{username} already exists (id={existing[0]})")
        continue

    print(f"📡 Fetching meta for @{username}...")
    try:
        meta = fetch_channel_meta(username)
    except Exception as e:
        print(f"  ⚠️  Could not fetch meta: {e} — adding with username only")
        meta = None

    title = (meta or {}).get("title") or username
    description = (meta or {}).get("description")
    subscriber_count = (meta or {}).get("subscriber_count")

    result = db.execute(
        text("""
            INSERT INTO telegram_channels (username, title, description, language, category, is_active, subscriber_count)
            VALUES (:username, :title, :description, :language, :category, true, :subscriber_count)
            ON CONFLICT (username) DO NOTHING
            RETURNING id
        """),
        {
            "username": username,
            "title": title,
            "description": description,
            "language": ch["language"],
            "category": ch["category"],
            "subscriber_count": subscriber_count,
        }
    )
    db.commit()
    row = result.fetchone()
    if row:
        print(f"  ✅ Added @{username} → '{title}' (id={row[0]})")
    else:
        print(f"  ⚠️  @{username} skipped (conflict)")

# ── List all channels ─────────────────────────────────────────────────────────
channels = db.execute(
    text("SELECT id, username, title FROM telegram_channels WHERE is_active = true ORDER BY id")
).fetchall()

print(f"\n📋 {len(channels)} channels in DB:")
for c in channels:
    print(f"  [{c.id}] @{c.username} — {c.title}")

# ── Sync all ─────────────────────────────────────────────────────────────────
print("\n🔄 Syncing messages (this may take a minute)...")
total_new = 0
for c in channels:
    try:
        new = sync_channel(c.id, c.username, db)
        print(f"  @{c.username}: {new} new messages")
        total_new += new
    except Exception as e:
        print(f"  ⚠️  @{c.username} sync failed: {e}")

print(f"\n✅ Done! {total_new} total new messages across {len(channels)} channels.")
db.close()
