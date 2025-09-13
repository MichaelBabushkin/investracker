#!/usr/bin/env python3
"""
Comprehensive test of dividend parsing with file output
"""

import os
import sys
import pandas as pd
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def write_log(message):
    """Write message to both console and log file"""
    print(message)
    with open("dividend_parsing_test.txt", "a", encoding="utf-8") as f:
        f.write(message + "\n")

try:
    from app.services.israeli_stock_service import IsraeliStockService
    write_log("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    write_log(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def main():
    # Clear previous log
    with open("dividend_parsing_test.txt", "w", encoding="utf-8") as f:
        f.write(f"Dividend Parsing Test - {datetime.now()}\n")
        f.write("=" * 80 + "\n")
    
    write_log("🔍 Testing fixed dividend parsing")
    write_log("=" * 60)
    
    service = IsraeliStockService()
    
    # Test specific dividend row from page_3_table_1.csv
    write_log("📊 Testing FIBI Bank dividend (593038):")
    write_log("Expected: Net=38.03, Tax=12.68, Qty=24.00")
    
    # Create a mock row for testing
    test_data = {
        0: 24.00,           # תומכ תרתי (Remaining quantity)
        1: '29/05/25',      # ךיראת עוציב (Execution date)
        2: 662.27,          # תיפסכ הרתי (Cash balance)
        3: 12.68,           # סמ (Tax) ← This should be the tax
        4: 0.00,            # הלמע (Commission)
        5: 38.03,           # םוכס יוכיז/בויחל (Net amount) ← This should be the total_value
        6: 0.00,            # עוציב רעש הקסע (Execution price)
        7: 0.00,            # תומכ (Quantity)
        8: 'דנדביד',         # גוס העונת (Transaction type)
        9: 'ימואלניב',       # ריינ םש (Security name)
        10: 593038,         # רפסמ ריינ (Security number)
        11: '',             # העש (Hour)
        12: '29/05/25'      # םוי ךרע (Value date)
    }
    
    row = pd.Series(test_data)
    
    try:
        # Test the parsing
        result = service.parse_transaction_row(row, '593038', 'FIBI', 'FIBI BANK', 'test.pdf')
        
        if result:
            write_log(f"✓ Parsing successful:")
            write_log(f"   Security: {result.get('symbol')} ({result.get('security_no')})")
            write_log(f"   Type: {result.get('transaction_type')}")
            write_log(f"   Date: {result.get('transaction_date')}")
            write_log(f"   Net Amount: {result.get('total_value')} ← Should be 38.03")
            write_log(f"   Tax: {result.get('tax')} ← Should be 12.68")
            write_log(f"   Quantity: {result.get('quantity')} ← Should be 24.00")
            
            # Check if values are correct
            expected_net = 38.03
            expected_tax = 12.68
            expected_qty = 24.00
            
            success = True
            if abs(result.get('total_value', 0) - expected_net) > 0.01:
                write_log(f"❌ Net amount incorrect: Expected {expected_net}, got {result.get('total_value')}")
                success = False
            
            if abs(result.get('tax', 0) - expected_tax) > 0.01:
                write_log(f"❌ Tax incorrect: Expected {expected_tax}, got {result.get('tax')}")
                success = False
            
            if abs(result.get('quantity', 0) - expected_qty) > 0.01:
                write_log(f"❌ Quantity incorrect: Expected {expected_qty}, got {result.get('quantity')}")
                success = False
            
            if success:
                write_log(f"✅ All values parsed correctly!")
            else:
                write_log(f"❌ Some values were parsed incorrectly")
        else:
            write_log(f"❌ Parsing failed - no result returned")
            
    except Exception as e:
        write_log(f"❌ Error in parsing test: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")
    
    # Test full PDF processing
    write_log(f"\n🧪 Testing full PDF processing...")
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    try:
        result = service.analyze_pdf_for_israeli_stocks(pdf_path, "test_parsing_user")
        write_log(f"✓ Full processing completed:")
        write_log(f"   Holdings: {result.get('holdings_found', 0)}")
        write_log(f"   Transactions: {result.get('transactions_found', 0)}")
        write_log(f"   Dividends: {result.get('dividends_found', 0)} ← Should be 8 now")
        
        if result.get('dividends_found', 0) >= 8:
            write_log(f"🎉 SUCCESS! Found all expected dividends with correct parsing!")
        else:
            write_log(f"⚠️ Still not finding all dividends - expected 8, got {result.get('dividends_found', 0)}")
            
    except Exception as e:
        write_log(f"❌ Error in full processing: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main()
    write_log("\n✅ Dividend parsing test completed.")
