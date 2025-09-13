#!/usr/bin/env python3
"""
Simple script to create PostgreSQL database and TA-125 stocks table
"""

import sys
import os
from pathlib import Path

# Add the app directory to Python path
sys.path.append(str(Path(__file__).parent))

from sqlalchemy import create_engine, text
from app.core.config import settings
from app.models.ta125_stock import TA125Stock
from app.core.database import Base

def create_database():
    """Create the investracker_db database if it doesn't exist"""
    try:
        # Connect to postgres database to create our database
        postgres_url = "postgresql://postgres:Admin@localhost:5432/postgres"
        temp_engine = create_engine(postgres_url)
        
        with temp_engine.connect() as conn:
            # End any existing transaction
            conn.execute(text("COMMIT"))
            
            # Check if database exists
            result = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = 'investracker_db'"))
            if not result.fetchone():
                conn.execute(text("CREATE DATABASE investracker_db"))
                print("✅ Database 'investracker_db' created successfully")
            else:
                print("✅ Database 'investracker_db' already exists")
        
        temp_engine.dispose()
        
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        raise

def create_tables():
    """Create the TA-125 stocks table"""
    try:
        # Connect to our investracker database
        engine = create_engine(settings.DATABASE_URL)
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ TA-125 stocks table created successfully")
        
        engine.dispose()
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        raise

def test_connection():
    """Test the database connection"""
    try:
        engine = create_engine(settings.DATABASE_URL)
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            version = result.fetchone()[0]
            print(f"✅ Connected to PostgreSQL: {version[:50]}...")
        engine.dispose()
        return True
    except Exception as e:
        print(f"❌ Failed to connect to PostgreSQL: {e}")
        return False

def main():
    """Main setup function"""
    print("🚀 Setting up PostgreSQL for Investracker...")
    print(f"Database URL: {settings.DATABASE_URL}")
    
    if not test_connection():
        print("\n💡 Make sure PostgreSQL is running with:")
        print("   - Username: postgres")
        print("   - Password: Admin")
        print("   - Port: 5432")
        return False
    
    create_database()
    create_tables()
    
    print("\n✅ PostgreSQL setup complete!")
    print("✅ Ready to import TA-125 stocks!")
    return True

if __name__ == "__main__":
    main()
