#!/usr/bin/env python3
"""
Check what stock names we have in the database
"""

import sys
import os
from dotenv import load_dotenv
import psycopg2

def check_stock_names():
    """Check stock names in the database"""
    load_dotenv()
    
    # Database configuration
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Get first 10 stock names to see the format
        cursor.execute("""
            SELECT symbol, name, logo_svg IS NOT NULL as has_logo 
            FROM "IsraeliStocks" 
            ORDER BY name 
            LIMIT 15
        """)
        
        print("📊 Sample stock names in database:")
        print("Symbol | Name | Has Logo")
        print("-" * 50)
        
        for row in cursor.fetchall():
            symbol, name, has_logo = row
            logo_status = "✅" if has_logo else "❌"
            print(f"{symbol:6} | {name:30} | {logo_status}")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    check_stock_names()
