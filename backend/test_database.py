#!/usr/bin/env python3
"""
Direct database test for Israeli stock data
"""

import os
import sys
import psycopg2
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(__file__))

def test_database():
    """Test the database directly"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    print("🔍 Testing Database Directly")
    print("=" * 50)
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Check if users exist
        print("\n👥 Users in database:")
        cursor.execute('SELECT id, email FROM users LIMIT 5')
        users = cursor.fetchall()
        for user in users:
            print(f"   User ID: {user[0]}, Email: {user[1]}")
        
        if users:
            user_id = users[0][0]  # Get first user ID
            print(f"\n🎯 Testing with user ID: {user_id}")
            
            # Check holdings
            print("\n📊 Holdings:")
            cursor.execute('SELECT COUNT(*) FROM "IsraeliStockHolding" WHERE user_id = %s', (user_id,))
            holdings_count = cursor.fetchone()[0]
            print(f"   Count: {holdings_count}")
            
            if holdings_count > 0:
                cursor.execute('SELECT security_no, symbol, company_name, quantity FROM "IsraeliStockHolding" WHERE user_id = %s LIMIT 3', (user_id,))
                holdings = cursor.fetchall()
                for holding in holdings:
                    print(f"   {holding[1]} ({holding[0]}): {holding[3]} shares of {holding[2]}")
            
            # Check transactions
            print("\n💰 Transactions:")
            cursor.execute('SELECT COUNT(*) FROM "IsraeliStockTransaction" WHERE user_id = %s', (user_id,))
            transactions_count = cursor.fetchone()[0]
            print(f"   Count: {transactions_count}")
            
            if transactions_count > 0:
                cursor.execute('SELECT security_no, symbol, transaction_type, quantity FROM "IsraeliStockTransaction" WHERE user_id = %s LIMIT 3', (user_id,))
                transactions = cursor.fetchall()
                for transaction in transactions:
                    print(f"   {transaction[1]} ({transaction[0]}): {transaction[2]} {transaction[3]} shares")
            
            # Check dividends
            print("\n💵 Dividends:")
            cursor.execute('SELECT COUNT(*) FROM "IsraeliDividend" WHERE user_id = %s', (user_id,))
            dividends_count = cursor.fetchone()[0]
            print(f"   Count: {dividends_count}")
            
            if dividends_count > 0:
                cursor.execute('SELECT security_no, symbol, amount FROM "IsraeliDividend" WHERE user_id = %s LIMIT 3', (user_id,))
                dividends = cursor.fetchall()
                for dividend in dividends:
                    print(f"   {dividend[1]} ({dividend[0]}): {dividend[2]} ILS")
        else:
            print("   No users found - register a user first")
        
        cursor.close()
        conn.close()
        
    except Exception as e:
        print(f"❌ Database error: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Database test completed!")

if __name__ == "__main__":
    test_database()
