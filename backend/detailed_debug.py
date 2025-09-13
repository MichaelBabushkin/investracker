#!/usr/bin/env python3
"""
Detailed debug script to analyze PDF processing step by step
"""

import os
import sys
import pdfplumber

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.israeli_stock_service import IsraeliStockService
    print("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    print(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def analyze_pdf_structure():
    """Analyze the PDF structure in detail"""
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"✗ PDF not found: {pdf_path}")
        return
    
    print(f"🔍 Analyzing PDF structure: {pdf_path}")
    print("=" * 80)
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"📄 Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages, 1):
            print(f"\n📄 PAGE {page_num}:")
            print("-" * 40)
            
            # Extract all tables
            tables = page.extract_tables()
            print(f"🔢 Tables found: {len(tables)}")
            
            for table_num, table in enumerate(tables, 1):
                print(f"\n📊 TABLE {table_num} (Page {page_num}):")
                if table and len(table) > 0:
                    # Show first few rows
                    print(f"   Rows: {len(table)}")
                    print(f"   Columns: {len(table[0]) if table[0] else 0}")
                    
                    # Show header
                    if table[0]:
                        print(f"   Header: {table[0]}")
                    
                    # Show first data row
                    if len(table) > 1 and table[1]:
                        print(f"   First data row: {table[1]}")
                        
                    # Look for dividend keywords in this table
                    dividend_count = 0
                    transaction_count = 0
                    
                    for row in table:
                        if row:
                            row_text = ' '.join(str(cell) for cell in row if cell)
                            if any(keyword in row_text for keyword in ['דיבידנד', 'dividend', 'דיביד']):
                                dividend_count += 1
                            if any(keyword in row_text for keyword in ['רכישה', 'מכירה', 'קנייה', 'buy', 'sell']):
                                transaction_count += 1
                    
                    print(f"   🎁 Dividend-like rows: {dividend_count}")
                    print(f"   💰 Transaction-like rows: {transaction_count}")
            
            # Also check raw text for Hebrew content
            text = page.extract_text()
            if text:
                # Count Hebrew keywords
                hebrew_keywords = ['דיבידנד', 'רכישה', 'מכירה', 'החזקות', 'עסקאות', 'מניות']
                found_keywords = [kw for kw in hebrew_keywords if kw in text]
                if found_keywords:
                    print(f"🔤 Hebrew keywords found in text: {found_keywords}")

def test_service_methods():
    """Test individual service methods"""
    print("\n" + "=" * 80)
    print("🧪 TESTING SERVICE METHODS")
    print("=" * 80)
    
    service = IsraeliStockService()
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    # Test extract_tables_from_pdf
    print("\n🔍 Testing extract_tables_from_pdf...")
    try:
        tables = service.extract_tables_from_pdf(pdf_path)
        print(f"✓ Extracted {len(tables)} tables total")
        
        for i, table in enumerate(tables, 1):
            print(f"   Table {i}: {len(table)} rows")
            
            # Test determine_csv_type on each table
            csv_type = service.determine_csv_type(table, table_number=i)
            print(f"   Type determined: {csv_type}")
            
            if csv_type == 'transactions':
                print(f"   🎯 Found transactions table!")
                # Test parse_transaction_data
                transactions, dividends = service.parse_transaction_data(table)
                print(f"   💰 Parsed transactions: {len(transactions)}")
                print(f"   🎁 Parsed dividends: {len(dividends)}")
                
                # Show some examples
                if transactions:
                    print(f"   Example transaction: {transactions[0]}")
                if dividends:
                    print(f"   Example dividend: {dividends[0]}")
                    
    except Exception as e:
        print(f"❌ Error in testing: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    analyze_pdf_structure()
    test_service_methods()
