"""
Database Migration Script for Israeli Stock Models
Creates all necessary tables with proper indexes and constraints
"""

import sys
import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

# Import models
from app.models.israeli_stock_models import (
    Base,
    IsraeliStock,
    IsraeliStockHolding, 
    IsraeliStockTransaction,
    IsraeliDividend,
    IsraeliStockSummary,
    DIVIDEND_TRIGGER_SQL,
    SUMMARY_UPDATE_TRIGGER_SQL
)

def create_tables():
    """Create all Israeli stock tables"""
    load_dotenv()
    
    # Database configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    # Create database URL
    db_url = f"postgresql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['database']}"
    
    try:
        # Create engine and session
        engine = create_engine(db_url)
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        
        print("Creating Israeli Stock tables...")
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        print("✅ Tables created successfully!")
        
        # Create triggers and functions
        print("Creating database triggers...")
        
        with engine.connect() as conn:
            # Create dividend trigger
            conn.execute(text(DIVIDEND_TRIGGER_SQL))
            print("✅ Dividend trigger created!")
            
            # Create summary update trigger  
            conn.execute(text(SUMMARY_UPDATE_TRIGGER_SQL))
            print("✅ Summary update trigger created!")
            
            conn.commit()
        
        print("\n🎉 All Israeli Stock database objects created successfully!")
        print("\n📋 Created Tables:")
        print("  - IsraeliStocks (master stock list)")
        print("  - IsraeliStockHolding (user holdings)")
        print("  - IsraeliStockTransaction (user transactions)")
        print("  - IsraeliDividend (dividend payments)")
        print("  - IsraeliStockSummary (portfolio summaries)")
        
        print("\n🔧 Created Triggers:")
        print("  - Automatic dividend record creation")
        print("  - Automatic summary updates")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating tables: {e}")
        return False

def migrate_legacy_data():
    """Migrate data from legacy Ta125Stock table to new IsraeliStocks table"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    db_url = f"postgresql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['database']}"
    
    try:
        engine = create_engine(db_url)
        
        print("Migrating legacy TA-125 data...")
        
        with engine.connect() as conn:
            # Check if legacy table exists
            legacy_check = conn.execute(text("""
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'Ta125Stock'
                );
            """)).scalar()
            
            if legacy_check:
                # Migrate data
                migration_sql = """
                INSERT INTO "IsraeliStocks" (security_no, symbol, name, index_name, is_active, created_at, updated_at)
                SELECT 
                    security_no, 
                    symbol, 
                    name, 
                    'TA-125' as index_name,
                    is_active,
                    created_at,
                    CURRENT_TIMESTAMP as updated_at
                FROM "Ta125Stock"
                ON CONFLICT (security_no) DO UPDATE SET
                    symbol = EXCLUDED.symbol,
                    name = EXCLUDED.name,
                    index_name = EXCLUDED.index_name,
                    updated_at = CURRENT_TIMESTAMP;
                """
                
                result = conn.execute(text(migration_sql))
                conn.commit()
                
                print(f"✅ Migrated {result.rowcount} stocks from legacy table!")
            else:
                print("ℹ️  No legacy Ta125Stock table found - skipping migration")
        
        return True
        
    except Exception as e:
        print(f"❌ Error migrating legacy data: {e}")
        return False

def populate_sample_data():
    """Populate IsraeliStocks table with sample TA-125 and SME-60 data"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    db_url = f"postgresql://{db_config['user']}:{db_config['password']}@{db_config['host']}:{db_config['port']}/{db_config['database']}"
    
    # Sample TA-125 stocks (top 10)
    ta125_stocks = [
        ('691212', 'DSCT', 'DISCOUNT', 'TA-125'),
        ('662577', 'POLI', 'POALIM', 'TA-125'),
        ('695437', 'MZTF', 'MIZRAHI TEFAHOT', 'TA-125'),
        ('604611', 'LUMI', 'LEUMI', 'TA-125'),
        ('629014', 'TEVA', 'TEVA', 'TA-125'),
        ('1084557', 'NVMI', 'NOVA', 'TA-125'),
        ('1081124', 'ESLT', 'ELBIT SYSTEMS', 'TA-125'),
        ('273011', 'NICE', 'NICE', 'TA-125'),
        ('767012', 'PHOE', 'PHOENIX', 'TA-125'),
        ('281014', 'ICL', 'ICL', 'TA-125')
    ]
    
    # Sample SME-60 stocks
    sme60_stocks = [
        ('1175116', 'NYAX', 'NAYAX', 'SME-60'),
        ('1175371', 'ARGO', 'ARGO PROP.', 'SME-60'),
        ('1166768', 'DORL', 'DORAL ENERGY', 'SME-60'),
        ('1161264', 'YHNF', 'YOCHANANOF', 'SME-60'),
        ('1175611', 'TRPZ', 'TURPAZ', 'SME-60')
    ]
    
    try:
        engine = create_engine(db_url)
        
        print("Populating sample Israeli stock data...")
        
        with engine.connect() as conn:
            # Insert TA-125 stocks
            for security_no, symbol, name, index_name in ta125_stocks:
                insert_sql = """
                INSERT INTO "IsraeliStocks" (security_no, symbol, name, index_name, is_active, created_at, updated_at)
                VALUES (:security_no, :symbol, :name, :index_name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (security_no) DO UPDATE SET
                    symbol = EXCLUDED.symbol,
                    name = EXCLUDED.name,
                    index_name = EXCLUDED.index_name,
                    updated_at = CURRENT_TIMESTAMP;
                """
                
                conn.execute(text(insert_sql), {
                    'security_no': security_no,
                    'symbol': symbol,
                    'name': name,
                    'index_name': index_name
                })
            
            # Insert SME-60 stocks
            for security_no, symbol, name, index_name in sme60_stocks:
                insert_sql = """
                INSERT INTO "IsraeliStocks" (security_no, symbol, name, index_name, is_active, created_at, updated_at)
                VALUES (:security_no, :symbol, :name, :index_name, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (security_no) DO UPDATE SET
                    symbol = EXCLUDED.symbol,
                    name = EXCLUDED.name,
                    index_name = EXCLUDED.index_name,
                    updated_at = CURRENT_TIMESTAMP;
                """
                
                conn.execute(text(insert_sql), {
                    'security_no': security_no,
                    'symbol': symbol,
                    'name': name,
                    'index_name': index_name
                })
            
            conn.commit()
            
            print(f"✅ Populated {len(ta125_stocks)} TA-125 stocks")
            print(f"✅ Populated {len(sme60_stocks)} SME-60 stocks")
        
        return True
        
    except Exception as e:
        print(f"❌ Error populating sample data: {e}")
        return False

def main():
    """Run the complete migration"""
    print("🚀 Starting Israeli Stock Database Migration...")
    print("=" * 50)
    
    # Step 1: Create tables
    if not create_tables():
        print("❌ Failed to create tables. Exiting.")
        return
    
    # Step 2: Migrate legacy data
    if not migrate_legacy_data():
        print("❌ Failed to migrate legacy data. Continuing...")
    
    # Step 3: Populate sample data
    if not populate_sample_data():
        print("❌ Failed to populate sample data. Continuing...")
    
    print("\n" + "=" * 50)
    print("🎉 Migration completed successfully!")
    print("\n💡 Next steps:")
    print("  1. Use the IsraeliStockService API for PDF processing")
    print("  2. Access data via /api/v1/israeli-stocks/ endpoints")
    print("  3. Legacy scripts are available in scripts/ directory")

if __name__ == "__main__":
    main()
