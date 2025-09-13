#!/usr/bin/env python3
"""
Check specific security numbers found in the CSV files
"""

import os
import sys

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.israeli_stock_service import IsraeliStockService
    print("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    print(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def check_security_numbers():
    """Check specific security numbers"""
    service = IsraeliStockService()
    israeli_stocks = service.load_israeli_stocks()
    
    # Security numbers found in the CSV files
    security_numbers_found = ['593038', '1119478', '1173137', '258012', '230011', '691212']
    
    print("🔍 Checking security numbers found in CSV files:")
    print("=" * 60)
    
    for security_no in security_numbers_found:
        if security_no in israeli_stocks:
            symbol, name, index_name = israeli_stocks[security_no]
            print(f"✓ {security_no}: {symbol} - {name} ({index_name})")
        else:
            print(f"❌ {security_no}: NOT FOUND in Israeli stocks database")
    
    print(f"\n🔍 Let's also check what FIBI Bank's actual security number is:")
    for security_no, (symbol, name, index_name) in israeli_stocks.items():
        if 'FIBI' in name.upper() or 'פיבי' in name:
            print(f"✓ FIBI: {security_no}: {symbol} - {name}")

if __name__ == "__main__":
    check_security_numbers()
