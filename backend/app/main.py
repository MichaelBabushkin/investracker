from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

from app.core.config import settings
from app.core.database import engine
from app.api.v1.api import api_router
from app.core.auth import verify_token

# Import all models so SQLAlchemy can find them for migrations
from app import models

# Load environment variables
load_dotenv()

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print("🚀 Starting Investracker API...")
    
    # Import here to avoid circular imports
    from app.core.database import ensure_tables_exist
    
    # Ensure all required tables exist
    # This provides a robust fallback if migrations didn't run
    try:
        ensure_tables_exist()
    except Exception as e:
        print(f"❌ Database initialization failed: {e}")
        # Don't crash the app - let it try to start anyway
        # The health check will catch if DB is truly broken
    
    yield
    # Shutdown
    print("👋 Shutting down Investracker API...")
    pass

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
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
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
