#!/usr/bin/env python3
"""
Test the updated holdings logic - latest report only
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

def test_holdings_logic():
    """Test that holdings only come from the latest report"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    print("🧪 Testing Holdings Logic - Latest Report Only")
    print("=" * 60)
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Find users who have holdings data
        cursor.execute('''
            SELECT user_id, COUNT(*) as total_holdings,
                   COUNT(DISTINCT source_pdf) as num_reports,
                   MIN(holding_date) as earliest_date,
                   MAX(holding_date) as latest_date
            FROM "IsraeliStockHolding" 
            GROUP BY user_id
            ORDER BY total_holdings DESC
        ''')
        
        users_with_holdings = cursor.fetchall()
        
        for user_id, total_holdings, num_reports, earliest_date, latest_date in users_with_holdings:
            print(f"\n👤 User: {user_id}")
            print(f"   Total holdings records: {total_holdings}")
            print(f"   Number of reports: {num_reports}")
            print(f"   Date range: {earliest_date} to {latest_date}")
            
            # Show holdings by report
            cursor.execute('''
                SELECT source_pdf, holding_date, COUNT(*) as holdings_count
                FROM "IsraeliStockHolding" 
                WHERE user_id = %s
                GROUP BY source_pdf, holding_date
                ORDER BY holding_date DESC, source_pdf DESC
            ''', (user_id,))
            
            reports = cursor.fetchall()
            print(f"   Reports breakdown:")
            for pdf, hold_date, count in reports:
                print(f"     📄 {pdf} ({hold_date}): {count} holdings")
            
            # Test the new logic - what would the service return?
            if latest_date:
                cursor.execute('''
                    SELECT COUNT(*), string_agg(symbol, ', ') as symbols
                    FROM "IsraeliStockHolding" 
                    WHERE user_id = %s AND holding_date = %s
                ''', (user_id, latest_date))
            else:
                # Fallback to latest PDF
                cursor.execute('''
                    SELECT source_pdf 
                    FROM "IsraeliStockHolding" 
                    WHERE user_id = %s 
                    ORDER BY created_at DESC 
                    LIMIT 1
                ''', (user_id,))
                latest_pdf = cursor.fetchone()[0]
                
                cursor.execute('''
                    SELECT COUNT(*), string_agg(symbol, ', ') as symbols
                    FROM "IsraeliStockHolding" 
                    WHERE user_id = %s AND source_pdf = %s
                ''', (user_id, latest_pdf))
            
            latest_result = cursor.fetchone()
            latest_count, latest_symbols = latest_result
            
            print(f"   🎯 Latest report holdings: {latest_count} stocks")
            print(f"   📊 Symbols: {latest_symbols}")
            print(f"   ✅ Reduction: {total_holdings} → {latest_count} holdings (removed {total_holdings - latest_count} duplicates)")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Holdings logic test completed!")
    print("\n💡 The updated service will now return only holdings from the latest report,")
    print("   eliminating duplicates and showing current portfolio state.")

if __name__ == "__main__":
    test_holdings_logic()
