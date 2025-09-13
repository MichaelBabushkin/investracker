#!/usr/bin/env python3
"""
Test Israeli stock endpoints to verify data retrieval
"""
import sys
import os
sys.path.append(os.path.dirname(__file__))

from app.services.israeli_stock_service import IsraeliStockService

def test_service():
    """Test the Israeli stock service methods"""
    service = IsraeliStockService()
    
    # Test with a sample user ID (you'll need to replace with actual user ID)
    user_id = "user_d4c51fcc1305a61e"  # Replace with actual user ID from registration
    
    print("=== Testing Israeli Stock Service ===\n")
    
    # Test holdings
    print("Testing holdings retrieval...")
    holdings = service.get_user_holdings(user_id, limit=10)
    print(f"Holdings found: {len(holdings)}")
    if holdings:
        print("Sample holding:", holdings[0])
    print()
    
    # Test transactions  
    print("Testing transactions retrieval...")
    transactions = service.get_user_transactions(user_id, limit=10)
    print(f"Transactions found: {len(transactions)}")
    if transactions:
        print("Sample transaction:", transactions[0])
    print()
    
    # Test dividends
    print("Testing dividends retrieval...")
    dividends = service.get_user_dividends(user_id, limit=10)
    print(f"Dividends found: {len(dividends)}")
    if dividends:
        print("Sample dividend:", dividends[0])
    print()
    
    # Test Israeli stocks list
    print("Testing Israeli stocks list...")
    stocks = service.get_israeli_stocks(limit=5)
    print(f"Stocks found: {len(stocks)}")
    if stocks:
        print("Sample stock:", stocks[0])

if __name__ == "__main__":
    test_service()
