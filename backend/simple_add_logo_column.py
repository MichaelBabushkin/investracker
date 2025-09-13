#!/usr/bin/env python3
"""
Simple script to add logo_svg column to IsraeliStocks table
Run this script from the backend directory
"""

import psycopg2
import os
from dotenv import load_dotenv

def add_logo_column():
    """Add logo_svg column to IsraeliStocks table with proper positioning"""
    load_dotenv()
    
    # Database configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    print("🔄 Connecting to database...")
    print(f"Host: {db_config['host']}:{db_config['port']}")
    print(f"Database: {db_config['database']}")
    
    try:
        # Connect to database
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        print("✅ Connected to database")
        
        # Check if column already exists
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'IsraeliStocks' 
            AND column_name = 'logo_svg'
        """)
        
        if cursor.fetchone():
            print("✅ Column 'logo_svg' already exists in IsraeliStocks table")
        else:
            print("🔄 Adding logo_svg column with proper positioning...")
            
            # Check if table has data
            cursor.execute('SELECT COUNT(*) FROM "IsraeliStocks"')
            row_count = cursor.fetchone()[0]
            print(f"📊 Found {row_count} existing records")
            
            # Create new table with proper column order
            cursor.execute("""
                CREATE TABLE "IsraeliStocks_new" (
                    id SERIAL PRIMARY KEY,
                    security_no VARCHAR(20) UNIQUE NOT NULL,
                    symbol VARCHAR(10) NOT NULL,
                    name VARCHAR(100) NOT NULL,
                    index_name VARCHAR(20) NOT NULL DEFAULT 'TA-125',
                    is_active BOOLEAN DEFAULT true,
                    logo_svg TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
            if row_count > 0:
                # Copy existing data
                cursor.execute("""
                    INSERT INTO "IsraeliStocks_new" (
                        id, security_no, symbol, name, index_name, is_active, created_at, updated_at
                    )
                    SELECT 
                        id, security_no, symbol, name, 
                        COALESCE(index_name, 'TA-125'), 
                        COALESCE(is_active, true), 
                        COALESCE(created_at, CURRENT_TIMESTAMP), 
                        COALESCE(updated_at, CURRENT_TIMESTAMP)
                    FROM "IsraeliStocks"
                    ORDER BY id
                """)
                
                # Update sequence
                cursor.execute("""
                    SELECT setval('"IsraeliStocks_new_id_seq"', 
                                  (SELECT COALESCE(MAX(id), 1) FROM "IsraeliStocks_new"))
                """)
                
                print(f"✅ Copied {row_count} records to new table")
            
            # Drop old table and rename new one
            cursor.execute('DROP TABLE "IsraeliStocks" CASCADE')
            cursor.execute('ALTER TABLE "IsraeliStocks_new" RENAME TO "IsraeliStocks"')
            
            # Recreate indexes
            cursor.execute('CREATE INDEX idx_israeli_stocks_security_no ON "IsraeliStocks"(security_no)')
            cursor.execute('CREATE INDEX idx_israeli_stocks_symbol ON "IsraeliStocks"(symbol)')
            cursor.execute('CREATE INDEX idx_israeli_stocks_index ON "IsraeliStocks"(index_name)')
            
            # Add comments
            cursor.execute("""
                COMMENT ON COLUMN "IsraeliStocks".logo_svg 
                IS 'SVG logo content fetched from TradingView'
            """)
            
            conn.commit()
            print("✅ Successfully recreated IsraeliStocks table with logo_svg column in correct position")
        
        # Show updated table structure
        print("\n📋 IsraeliStocks table structure:")
        cursor.execute("""
            SELECT column_name, data_type, character_maximum_length, is_nullable, ordinal_position
            FROM information_schema.columns 
            WHERE table_name = 'IsraeliStocks' 
            ORDER BY ordinal_position
        """)
        
        for row in cursor.fetchall():
            column_name, data_type, max_length, nullable, position = row
            length_info = f"({max_length})" if max_length else ""
            null_info = "NULL" if nullable == "YES" else "NOT NULL"
            print(f"  {position:2d}. {column_name}: {data_type}{length_info} {null_info}")
        
        # Show final row count
        cursor.execute('SELECT COUNT(*) FROM "IsraeliStocks"')
        final_count = cursor.fetchone()[0]
        print(f"\n📊 Final table has {final_count} records")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Migration completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        return False

if __name__ == "__main__":
    success = add_logo_column()
    if success:
        print("\n💡 Next steps:")
        print("1. Test the logo crawler with: python test_logo_crawler.py")
        print("2. Crawl logos for all stocks with: python crawl_logos.py")
    exit(0 if success else 1)
