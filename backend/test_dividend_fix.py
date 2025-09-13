#!/usr/bin/env python3
"""
Test script to verify dividend gross amount calculation
"""

import os
import sys
sys.path.append(os.path.dirname(__file__))

from app.services.israeli_stock_service import IsraeliStockService

def test_dividend_parsing():
    """Test that dividend parsing correctly calculates gross amount"""
    service = IsraeliStockService()
    
    # Test parse_transaction_row with dividend data
    # Simulating row data: [remaining_qty, date, cash_balance, tax, commission, net_amount, ...]
    # Based on user's example: Net=25.35, Tax=12.68, Expected Gross=38.03
    
    # Create a mock row with test data
    import pandas as pd
    
    # Mock row values: [qty, date, balance, tax(12.68), commission, net(25.35), price, qty, type, name, security, hour, value_date]
    row_data = ['100', '15/01/24', '1000', '12.68', '0', '25.35', '1.2', '100', 'ביד/', 'FIBI BANK', '593038', '10:30', '15/01/24']
    
    # Create a pandas Series to simulate a row
    row = pd.Series(row_data)
    
    # Test parsing
    result = service.parse_transaction_row(row, '593038', 'FIBI', 'FIBI BANK', 'test.pdf')
    
    if result:
        print("=== Dividend Parsing Test Results ===")
        print(f"Symbol: {result.get('symbol')}")
        print(f"Transaction Type: {result.get('transaction_type')}")
        print(f"Total Value (Gross): {result.get('total_value')}")
        print(f"Tax: {result.get('tax')}")
        print(f"Net Amount: {result.get('total_value', 0) - result.get('tax', 0)}")
        
        # Verify the calculation
        expected_gross = 25.35 + 12.68  # Net + Tax = Gross
        actual_gross = result.get('total_value', 0)
        
        print(f"\n=== Verification ===")
        print(f"Expected Gross: {expected_gross}")
        print(f"Actual Gross: {actual_gross}")
        print(f"Test {'PASSED' if abs(expected_gross - actual_gross) < 0.01 else 'FAILED'}")
        
        return abs(expected_gross - actual_gross) < 0.01
    else:
        print("ERROR: No result returned from parsing")
        return False

if __name__ == "__main__":
    success = test_dividend_parsing()
    exit(0 if success else 1)
