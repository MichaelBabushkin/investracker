#!/usr/bin/env python3
"""
Clean up logo_svg data by removing TradingView comments
"""

import psycopg2
import os
from dotenv import load_dotenv

def clean_logo_svg_data():
    """Remove '<!-- by TradingView -->' comments from all logo_svg entries"""
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
        
        # Check how many logos have the TradingView comment
        cursor.execute("""
            SELECT COUNT(*) 
            FROM "IsraeliStocks" 
            WHERE logo_svg IS NOT NULL 
            AND logo_svg LIKE '%<!-- by TradingView -->%'
        """)
        
        comment_count = cursor.fetchone()[0]
        print(f"📊 Found {comment_count} logos with TradingView comment")
        
        if comment_count == 0:
            print("✅ No logos need cleaning!")
            return True
        
        # Show sample before cleaning
        cursor.execute("""
            SELECT symbol, LEFT(logo_svg, 100) as preview
            FROM "IsraeliStocks" 
            WHERE logo_svg IS NOT NULL 
            AND logo_svg LIKE '%<!-- by TradingView -->%'
            LIMIT 3
        """)
        
        print("\n📋 Sample logos before cleaning:")
        for row in cursor.fetchall():
            symbol, preview = row
            print(f"  {symbol}: {preview}...")
        
        # Clean up the logos by removing the comment
        print(f"\n🧹 Cleaning {comment_count} logos...")
        
        cursor.execute("""
            UPDATE "IsraeliStocks" 
            SET logo_svg = REPLACE(logo_svg, '<!-- by TradingView -->', '')
            WHERE logo_svg IS NOT NULL 
            AND logo_svg LIKE '%<!-- by TradingView -->%'
        """)
        
        updated_count = cursor.rowcount
        conn.commit()
        
        print(f"✅ Successfully cleaned {updated_count} logos")
        
        # Show sample after cleaning
        cursor.execute("""
            SELECT symbol, LEFT(logo_svg, 100) as preview
            FROM "IsraeliStocks" 
            WHERE logo_svg IS NOT NULL 
            ORDER BY symbol
            LIMIT 3
        """)
        
        print("\n📋 Sample logos after cleaning:")
        for row in cursor.fetchall():
            symbol, preview = row
            print(f"  {symbol}: {preview}...")
        
        # Final statistics
        cursor.execute("""
            SELECT 
                COUNT(*) as total_stocks,
                COUNT(CASE WHEN logo_svg IS NOT NULL AND logo_svg != '' THEN 1 END) as with_logos,
                COUNT(CASE WHEN logo_svg IS NULL OR logo_svg = '' THEN 1 END) as without_logos
            FROM "IsraeliStocks"
        """)
        
        total, with_logos, without_logos = cursor.fetchone()
        coverage = (with_logos / total * 100) if total > 0 else 0
        
        print(f"\n📈 Logo Coverage Statistics:")
        print(f"  📊 Total stocks: {total}")
        print(f"  ✅ With logos: {with_logos} ({coverage:.1f}%)")
        print(f"  ❌ Without logos: {without_logos}")
        
        cursor.close()
        conn.close()
        
        print("\n🎉 Logo cleanup completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        if conn:
            conn.rollback()
        return False

if __name__ == "__main__":
    success = clean_logo_svg_data()
    if success:
        print("\n💡 Next steps:")
        print("1. Test the API endpoints to see clean logos")
        print("2. Continue crawling more logos if needed")
    exit(0 if success else 1)
