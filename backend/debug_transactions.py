#!/usr/bin/env python3
"""
Debug script to see exactly what transactions and dividends are found
"""

import os
import sys
import pandas as pd

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.israeli_stock_service import IsraeliStockService
    print("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    print(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def debug_transaction_extraction():
    """Debug what transactions and dividends are being extracted"""
    print("🔍 Debugging transaction and dividend extraction")
    print("=" * 60)
    
    service = IsraeliStockService()
    israeli_stocks = service.load_israeli_stocks()
    
    # Look at the transaction CSV files we already have
    csv_files = [
        "extracted_csv_files/page_1_table_2.csv",
        "extracted_csv_files/page_2_table_1.csv", 
        "extracted_csv_files/page_3_table_1.csv"
    ]
    
    for csv_file in csv_files:
        if not os.path.exists(csv_file):
            continue
            
        print(f"\n📄 ANALYZING: {csv_file}")
        print("-" * 40)
        
        df = pd.read_csv(csv_file)
        print(f"   📊 Shape: {df.shape}")
        
        # Look for dividend patterns
        dividend_patterns = ['דנדביד', 'דיבידנד', 'ביד/']
        transaction_patterns = ['הינק', 'הריכמ', 'רכישה', 'מכירה', 'חסמ/', 'הרבעה']
        
        dividend_rows = []
        transaction_rows = []
        
        for i, row in df.iterrows():
            row_str = ' '.join(str(val) for val in row.values).lower()
            
            is_dividend = any(pattern in row_str for pattern in dividend_patterns)
            is_transaction = any(pattern in row_str for pattern in transaction_patterns)
            
            if is_dividend:
                dividend_rows.append((i, row))
            elif is_transaction:
                transaction_rows.append((i, row))
        
        print(f"   🎁 Dividend-like rows found: {len(dividend_rows)}")
        for row_num, row in dividend_rows:
            # Look for Israeli stock security numbers in this row
            row_str = ' '.join(str(val) for val in row.values)
            found_israeli = []
            for security_no, (symbol, name, index_name) in israeli_stocks.items():
                if security_no in row_str:
                    found_israeli.append((security_no, symbol, name))
            
            if found_israeli:
                print(f"      ✓ Row {row_num}: {found_israeli[0][1]} - {found_israeli[0][2]}")
                print(f"        Values: {list(row.values)}")
            else:
                print(f"      ❌ Row {row_num}: No Israeli stock found")
                print(f"        Values: {list(row.values)}")
        
        print(f"   💰 Transaction-like rows found: {len(transaction_rows)}")
        for row_num, row in transaction_rows[:5]:  # Show first 5
            # Look for Israeli stock security numbers in this row
            row_str = ' '.join(str(val) for val in row.values)
            found_israeli = []
            for security_no, (symbol, name, index_name) in israeli_stocks.items():
                if security_no in row_str:
                    found_israeli.append((security_no, symbol, name))
            
            if found_israeli:
                print(f"      ✓ Row {row_num}: {found_israeli[0][1]} - {found_israeli[0][2]}")
                print(f"        Values: {list(row.values)}")
            else:
                print(f"      ❌ Row {row_num}: No Israeli stock found")
                print(f"        Values: {list(row.values)}")
    
    # Now test the actual extraction method
    print(f"\n🧪 TESTING ACTUAL EXTRACTION")
    print("=" * 60)
    
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    try:
        result = service.analyze_pdf_for_israeli_stocks(pdf_path, "debug_user")
        print(f"✓ Extraction completed")
        print(f"   Holdings: {result.get('holdings_found', 0)}")
        print(f"   Transactions: {result.get('transactions_found', 0)}")
        print(f"   Dividends: {result.get('dividends_found', 0)}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    debug_transaction_extraction()
