#!/usr/bin/env python3
"""
Database setup and initialization script for Investracker (SQLite version)
"""

import os
import sys
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent))

try:
    from sqlalchemy import create_engine
    from app.core.config import settings
    from app.core.database import Base
    
    # Import all models to ensure they're registered with Base
    from app.models.user import User
    from app.models.portfolio import Portfolio
    from app.models.asset import Asset
    from app.models.transaction import Transaction
    from app.models.holding import Holding
    from app.models.market_data import PriceHistory, CurrencyRate
    from app.models.report import ReportUpload, ExtractedHolding, ExtractedTransaction
    from app.models.israeli_stock import IsraeliStock
    
    def create_tables():
        """Create all tables"""
        engine = create_engine(settings.DATABASE_URL)
        
        try:
            # Create all tables
            Base.metadata.create_all(bind=engine)
            print("All tables created successfully")
            
        except Exception as e:
            print(f"Error creating tables: {e}")
        finally:
            engine.dispose()

    def init_database():
        """Initialize the database with tables"""
        print("Initializing Investracker database (SQLite)...")
        
        create_tables()
        
        print("Database initialization completed!")
        print(f"Database file: {settings.DATABASE_URL}")

    if __name__ == "__main__":
        init_database()
        
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install required dependencies:")
    print("pip install -r requirements.txt")
    sys.exit(1)
