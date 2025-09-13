#!/usr/bin/env python3
"""
Test the updated PDF processing with proper table classification
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

def test_pdf_processing():
    """Test the updated PDF processing"""
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"✗ PDF not found: {pdf_path}")
        return
    
    print(f"🔍 Testing PDF processing: {pdf_path}")
    print("=" * 60)
    
    service = IsraeliStockService()
    
    # Test the full processing
    try:
        result = service.analyze_pdf_for_israeli_stocks(pdf_path, "test_user_123")
        
        print(f"\n📊 PROCESSING RESULTS:")
        print(f"✓ Success: {result.get('success', False)}")
        print(f"📄 PDF: {result.get('pdf_name', 'N/A')}")
        print(f"📅 Date: {result.get('holding_date', 'N/A')}")
        print(f"🏠 Holdings found: {result.get('holdings_found', 0)}")
        print(f"💰 Transactions found: {result.get('transactions_found', 0)}")
        print(f"🎁 Dividends found: {result.get('dividends_found', 0)}")
        print(f"💾 Holdings saved: {result.get('holdings_saved', 0)}")
        print(f"💾 Transactions saved: {result.get('transactions_saved', 0)}")
        print(f"💾 Dividends saved: {result.get('dividends_saved', 0)}")
        
        if result.get('error'):
            print(f"❌ Error: {result['error']}")
            
    except Exception as e:
        print(f"❌ Exception during processing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_pdf_processing()
