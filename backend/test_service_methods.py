#!/usr/bin/env python3
"""
Test Israeli stock service methods directly
"""

import os
import sys

# Add the app directory to Python path
sys.path.append(os.path.dirname(__file__))
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.services.israeli_stock_service import IsraeliStockService

def test_service_methods():
    """Test the service methods directly"""
    print("🧪 Testing Israeli Stock Service Methods")
    print("=" * 60)
    
    # The user ID that has data (from the database check)
    test_user_id = "user_e31e99619f4c1930"
    
    service = IsraeliStockService()
    
    print(f"\n🎯 Testing with user ID: {test_user_id}")
    
    # Test holdings
    print("\n📊 Testing get_user_holdings():")
    try:
        holdings = service.get_user_holdings(test_user_id)
        print(f"   Retrieved: {len(holdings)} holdings")
        for i, holding in enumerate(holdings[:3], 1):
            print(f"   Holding {i}: {holding['symbol']} - {holding['quantity']} shares")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test transactions
    print("\n💰 Testing get_user_transactions():")
    try:
        transactions = service.get_user_transactions(test_user_id)
        print(f"   Retrieved: {len(transactions)} transactions")
        for i, transaction in enumerate(transactions[:3], 1):
            print(f"   Transaction {i}: {transaction['symbol']} - {transaction['transaction_type']} {transaction['quantity']} shares")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test dividends
    print("\n💵 Testing get_user_dividends():")
    try:
        dividends = service.get_user_dividends(test_user_id)
        print(f"   Retrieved: {len(dividends)} dividends")
        for i, dividend in enumerate(dividends[:3], 1):
            print(f"   Dividend {i}: {dividend['symbol']} - {dividend['amount']} ILS")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    # Test with a user that has no data
    print(f"\n🎯 Testing with user that has no data:")
    empty_user_id = "user_bd2844865233f92b"  # From the earlier database check
    
    print(f"\n📊 Testing holdings for {empty_user_id}:")
    try:
        holdings = service.get_user_holdings(empty_user_id)
        print(f"   Retrieved: {len(holdings)} holdings (should be 0)")
    except Exception as e:
        print(f"   ❌ Error: {e}")
    
    print("\n" + "=" * 60)
    print("✅ Service methods test completed!")

if __name__ == "__main__":
    test_service_methods()
