#!/usr/bin/env python3
"""
Test the fixed dividend parsing to check net amount and tax extraction
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

def test_dividend_parsing():
    """Test the fixed dividend parsing"""
    print("🔍 Testing fixed dividend parsing")
    print("=" * 60)
    
    service = IsraeliStockService()
    
    # Test specific dividend row from page_3_table_1.csv
    # Row: 24.00,29/05/25,662.27,12.68,0.00,38.03,0.00,0.00,דנדביד,ימואלניב,593038,,29/05/25
    
    # Create a mock row for testing
    import pandas as pd
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
    
    # Test the parsing
    result = service.parse_transaction_row(row, '593038', 'FIBI', 'FIBI BANK', 'test.pdf')
    
    print(f"📊 PARSING RESULT:")
    print(f"   Security: {result.get('symbol')} ({result.get('security_no')})")
    print(f"   Type: {result.get('transaction_type')}")
    print(f"   Date: {result.get('transaction_date')}")
    print(f"   Net Amount: {result.get('total_value')} ← Should be 38.03")
    print(f"   Tax: {result.get('tax')} ← Should be 12.68")
    print(f"   Quantity: {result.get('quantity')} ← Should be 24.00")
    
    # Check if values are correct
    expected_net = 38.03
    expected_tax = 12.68
    expected_qty = 24.00
    
    success = True
    if abs(result.get('total_value', 0) - expected_net) > 0.01:
        print(f"❌ Net amount incorrect: Expected {expected_net}, got {result.get('total_value')}")
        success = False
    
    if abs(result.get('tax', 0) - expected_tax) > 0.01:
        print(f"❌ Tax incorrect: Expected {expected_tax}, got {result.get('tax')}")
        success = False
    
    if abs(result.get('quantity', 0) - expected_qty) > 0.01:
        print(f"❌ Quantity incorrect: Expected {expected_qty}, got {result.get('quantity')}")
        success = False
    
    if success:
        print(f"✅ All values parsed correctly!")
    
    print(f"\n🧪 Now testing full PDF processing...")
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    try:
        result = service.analyze_pdf_for_israeli_stocks(pdf_path, "test_parsing_user")
        print(f"✓ Full processing completed:")
        print(f"   Holdings: {result.get('holdings_found', 0)}")
        print(f"   Transactions: {result.get('transactions_found', 0)}")
        print(f"   Dividends: {result.get('dividends_found', 0)} ← Should be 8 now")
        
        if result.get('dividends_found', 0) >= 8:
            print(f"🎉 SUCCESS! Found all expected dividends with correct parsing!")
        else:
            print(f"⚠️ Still not finding all dividends")
            
    except Exception as e:
        print(f"❌ Error in full processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_dividend_parsing()
