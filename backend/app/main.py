from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import os
import logging
from dotenv import load_dotenv

from app.core.config import settings
from app.core.database import engine
from app.api.v1.api import api_router
from app.core.auth import verify_token

# Import all models so SQLAlchemy can find them for migrations
from app import models

# Load environment variables
load_dotenv()

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Investracker API...")

    # Run Alembic migrations on every startup so Railway (or any environment)
    # is always up to date without needing manual shell access.
    try:
        from pathlib import Path
        from alembic.config import Config
        from alembic import command
        backend_dir = Path(__file__).resolve().parent.parent  # backend/
        alembic_cfg = Config(str(backend_dir / "alembic.ini"))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        command.upgrade(alembic_cfg, "head")
        print("✅ Database migrations applied.")
    except Exception as e:
        print(f"⚠️  Migration step failed (continuing): {e}")

    # Import here to avoid circular imports
    from app.core.database import ensure_tables_exist

    # Ensure all required tables exist
    # This provides a robust fallback if migrations didn't run
    try:
        ensure_tables_exist()
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")

    # Start background price update scheduler
    # Runs every 15 min, Sun–Fri, 07:00–22:00 UTC
    # (covers Israeli market Sun–Thu 07:00–14:30 UTC and US market Mon–Fri 13:30–20:00 UTC)
    scheduler = None
    try:
        from apscheduler.schedulers.background import BackgroundScheduler
        from app.tasks.fetch_stock_prices import run_active_price_update

        scheduler = BackgroundScheduler(timezone="UTC")
        scheduler.add_job(
            run_active_price_update,
            trigger="cron",
            day_of_week="sun,mon,tue,wed,thu,fri",
            hour="7-22",
            minute="*/15",
            id="active_price_update",
            replace_existing=True,
            misfire_grace_time=120,
        )
        scheduler.start()
        print("✅ Price update scheduler started (every 15 min, Sun–Fri 07–22 UTC).")
    except Exception as e:
        print(f"⚠️  Scheduler failed to start (continuing without it): {e}")

    yield

    # Shutdown
    if scheduler and scheduler.running:
        scheduler.shutdown(wait=False)
    print("👋 Shutting down Investracker API...")

app = FastAPI(
    title=settings.APP_NAME,
    description="Investment tracking and analytics application",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Include API router
app.include_router(api_router, prefix=f"/api/{settings.API_VERSION}")

@app.get("/")
async def root():
    return {"message": "Welcome to Investracker API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app", 
        host="0.0.0.0", 
        port=8000, 
        reload=settings.DEBUG
    )
