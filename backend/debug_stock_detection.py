#!/usr/bin/env python3
"""
Debug script to check if Israeli stocks are being found in transaction tables
"""

import os
import sys
import pandas as pd
import pdfplumber

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.israeli_stock_service import IsraeliStockService
    print("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    print(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def debug_israeli_stock_detection():
    """Debug how Israeli stocks are detected in tables"""
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        print(f"✗ PDF not found: {pdf_path}")
        return
    
    print(f"🔍 Debugging Israeli stock detection in: {pdf_path}")
    print("=" * 80)
    
    service = IsraeliStockService()
    
    # Load Israeli stocks
    israeli_stocks = service.load_israeli_stocks()
    print(f"📊 Loaded {len(israeli_stocks)} Israeli stocks")
    
    # Show sample stocks
    print("\n📋 Sample Israeli stocks (first 5):")
    for i, (security_no, (symbol, name, index_name)) in enumerate(israeli_stocks.items()):
        if i < 5:
            print(f"   {security_no}: {symbol} - {name}")
    
    # Extract tables from PDF
    tables = service.extract_tables_from_pdf(pdf_path)
    print(f"\n🔢 Extracted {len(tables)} tables from PDF")
    
    # Save tables to CSV and analyze each one
    import tempfile
    temp_dir = tempfile.mkdtemp()
    csv_files = service.save_tables_to_csv(tables, temp_dir)
    
    for csv_file in csv_files:
        print(f"\n🔍 Analyzing: {os.path.basename(csv_file)}")
        print("-" * 40)
        
        try:
            df = pd.read_csv(csv_file)
            print(f"   📊 Shape: {df.shape}")
            
            # Determine type
            csv_type = service.determine_csv_type(df, csv_file)
            print(f"   📝 Type: {csv_type}")
            
            if csv_type == 'transactions':
                print(f"   🎯 This is a TRANSACTION table!")
                
                # Check if any Israeli stock security numbers are found
                df_str = df.to_string()
                found_stocks = []
                
                for security_no, (symbol, name, index_name) in israeli_stocks.items():
                    if security_no in df_str:
                        found_stocks.append((security_no, symbol, name))
                
                print(f"   🏗️ Found {len(found_stocks)} Israeli stocks in this table:")
                
                for security_no, symbol, name in found_stocks:
                    print(f"      {security_no}: {symbol} - {name}")
                    
                    # Try to extract transactions for this stock
                    transactions = service.extract_transaction_from_csv(df, security_no, symbol, name, "debug.pdf")
                    print(f"         → Extracted {len(transactions)} transactions")
                    
                    for t in transactions:
                        print(f"           {t.get('transaction_type', 'UNKNOWN')} - {t.get('transaction_date', 'NO DATE')} - Value: {t.get('total_value', 'N/A')}")
                
                # Show some sample data from the table
                print(f"\n   📄 Sample table content (first 3 rows):")
                for i, row in df.head(3).iterrows():
                    print(f"      Row {i}: {list(row.values)}")
                
                # Check for Hebrew text in the table
                hebrew_content = []
                for col in df.columns:
                    if any(char in str(col) for char in 'אבגדהוזחטיכלמנסעפצקרשת'):
                        hebrew_content.append(f"Column: {col}")
                
                for i, row in df.iterrows():
                    for val in row.values:
                        if any(char in str(val) for char in 'אבגדהוזחטיכלמנסעפצקרשת'):
                            hebrew_content.append(f"Value: {val}")
                            break
                    if len(hebrew_content) > 10:  # Limit output
                        break
                
                if hebrew_content:
                    print(f"   🔤 Found Hebrew content:")
                    for content in hebrew_content[:5]:  # Show first 5
                        print(f"      {content}")
            
        except Exception as e:
            print(f"   ❌ Error analyzing {csv_file}: {e}")
    
    # Clean up
    import shutil
    shutil.rmtree(temp_dir)

if __name__ == "__main__":
    debug_israeli_stock_detection()
