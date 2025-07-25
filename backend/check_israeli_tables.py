#!/usr/bin/env python3
"""
Check Israeli stock tables specifically
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

def check_israeli_tables():
    """Check the Israeli stock tables specifically"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    print("🔍 Checking Israeli Stock Tables")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Check what Israeli stock tables exist
        print("\n📋 Available Israeli stock tables:")
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_name LIKE '%israeli%' OR table_name LIKE '%Israeli%'
            ORDER BY table_name
        """)
        tables = cursor.fetchall()
        for table in tables:
            print(f"   ✓ {table[0]}")
        
        # Check specific tables for data
        israeli_tables = [
            'IsraeliStockHolding',
            'IsraeliStockTransaction', 
            'IsraeliDividend',
            'IsraeliStocks'
        ]
        
        for table in israeli_tables:
            print(f"\n📊 Table: {table}")
            try:
                # Check if table exists and get row count
                cursor.execute(f'SELECT COUNT(*) FROM "{table}"')
                count = cursor.fetchone()[0]
                print(f"   Total rows: {count}")
                
                if count > 0:
                    # Get column names
                    cursor.execute(f"""
                        SELECT column_name 
                        FROM information_schema.columns 
                        WHERE table_name = '{table}' 
                        ORDER BY ordinal_position
                    """)
                    columns = [row[0] for row in cursor.fetchall()]
                    print(f"   Columns: {', '.join(columns)}")
                    
                    # Show sample data
                    cursor.execute(f'SELECT * FROM "{table}" LIMIT 3')
                    rows = cursor.fetchall()
                    for i, row in enumerate(rows, 1):
                        print(f"   Row {i}: {row}")
                        
                    # Check for user_id distribution if column exists
                    if 'user_id' in columns:
                        cursor.execute(f'SELECT user_id, COUNT(*) FROM "{table}" GROUP BY user_id')
                        user_counts = cursor.fetchall()
                        print(f"   User distribution:")
                        for user_id, user_count in user_counts:
                            print(f"     {user_id}: {user_count} records")
                else:
                    print("   ⚠️  No data in this table")
                    
            except Exception as e:
                print(f"   ❌ Error accessing table: {e}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Israeli tables check completed!")

if __name__ == "__main__":
    check_israeli_tables()
