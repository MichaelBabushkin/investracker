import asyncio
from sqlalchemy import create_engine, text
from app.core.config import settings

# This script will connect directly to the DB and check if it can update.
# But wait, it's better to just write a simple python script simulating the FastAPI request.
# Let's bypass auth by making a fake router dependency or just testing the database query directly to see if somehow the query fails.

engine = create_engine(settings.DATABASE_URL)
with engine.connect() as conn:
    row = conn.execute(text("SELECT id, is_active FROM telegram_channels LIMIT 1")).fetchone()
    if row:
        print(f"Channel {row.id} is_active: {row.is_active}")
        # Try updating
        conn.execute(text("UPDATE telegram_channels SET is_active = :is_active WHERE id = :id"), {"is_active": not row.is_active, "id": row.id})
        conn.commit()
        # Verify
        new_row = conn.execute(text("SELECT id, is_active FROM telegram_channels WHERE id = :id"), {"id": row.id}).fetchone()
        print(f"Updated Channel {new_row.id} is_active: {new_row.is_active}")
    else:
        print("No channels found")
