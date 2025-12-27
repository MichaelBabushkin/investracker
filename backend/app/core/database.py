from sqlalchemy import create_engine, MetaData
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.declarative import declarative_base
from app.core.config import settings

# Create the database engine
if settings.DATABASE_URL.startswith("sqlite"):
    # SQLite configuration
    engine = create_engine(
        settings.DATABASE_URL,
        echo=settings.DEBUG,
        connect_args={"check_same_thread": False}
    )
else:
    # PostgreSQL/MySQL configuration
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=settings.DEBUG
    )

# Create a sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create the base class for our models
Base = declarative_base()

# Metadata for table creation
metadata = MetaData()

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def create_tables():
    """
    Create all tables in the database using SQLAlchemy.
    This is a fallback method - prefer using Alembic migrations.
    """
    Base.metadata.create_all(bind=engine)

def ensure_tables_exist():
    """
    Ensure all tables exist, either through migrations or direct creation.
    This provides a robust fallback if migrations fail.
    """
    from sqlalchemy import inspect, text
    
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()
    
    # List of critical tables that must exist
    required_tables = [
        'users', 'portfolios', 'holdings', 'transactions',
        'dividends', 'israeli_stocks', 'world_stocks',
        'calendar_events', 'user_event_notification_preferences'
    ]
    
    missing_tables = [t for t in required_tables if t not in existing_tables]
    
    if missing_tables:
        print(f"⚠️  Missing tables detected: {missing_tables}")
        print("📝 Creating tables using SQLAlchemy...")
        
        try:
            # Create custom types first (PostgreSQL ENUMs)
            if not settings.DATABASE_URL.startswith("sqlite"):
                with engine.connect() as conn:
                    # Check if event_type enum exists
                    result = conn.execute(text(
                        "SELECT 1 FROM pg_type WHERE typname = 'event_type'"
                    ))
                    if not result.fetchone():
                        print("Creating event_type ENUM...")
                        conn.execute(text(
                            "CREATE TYPE event_type AS ENUM ('MARKET_CLOSED', 'EARLY_CLOSE', 'EARNINGS', 'ECONOMIC_DATA', 'FOMC', 'HOLIDAY')"
                        ))
                        conn.commit()
            
            # Now create all tables
            Base.metadata.create_all(bind=engine)
            print("✅ Tables created successfully!")
            
        except Exception as e:
            print(f"❌ Failed to create tables: {e}")
            raise
    else:
        print(f"✅ All required tables exist: {len(existing_tables)} tables found")
