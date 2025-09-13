#!/usr/bin/env python3
"""
Debug script for Israeli Stock PDF processing
This will help identify why transactions and dividends are not being extracted
"""

import os
import sys
import pdfplumber
import pandas as pd
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

try:
    from app.services.israeli_stock_service import IsraeliStockService
    print("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    print(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def debug_pdf_processing(pdf_path: str):
    """Debug PDF processing step by step"""
    
    print(f"\n🔍 DEBUGGING PDF: {pdf_path}")
    print("=" * 60)
    
    if not os.path.exists(pdf_path):
        print(f"✗ PDF file not found: {pdf_path}")
        return
    
    service = IsraeliStockService()
    
    # Step 1: Extract tables from PDF
    print("\n📊 STEP 1: Extracting tables from PDF...")
    try:
        tables = service.extract_tables_from_pdf(pdf_path)
        print(f"✓ Found {len(tables)} tables in PDF")
        
        for i, table in enumerate(tables):
            print(f"\n📋 Table {i+1} (Page {table['page']}):")
            print(f"   - Dimensions: {len(table['data'])} rows x {len(table['data'][0]) if table['data'] else 0} columns")
            if table['data']:
                print(f"   - First row: {table['data'][0][:3]}...")  # Show first 3 columns
                if len(table['data']) > 1:
                    print(f"   - Second row: {table['data'][1][:3]}...")
    except Exception as e:
        print(f"✗ Error extracting tables: {e}")
        return
    
    # Step 2: Save tables to CSV
    print(f"\n💾 STEP 2: Converting tables to CSV...")
    temp_dir = f"debug_csv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    try:
        csv_files = service.save_tables_to_csv(tables, temp_dir)
        print(f"✓ Created {len(csv_files)} CSV files in {temp_dir}/")
        for csv_file in csv_files:
            print(f"   - {os.path.basename(csv_file)}")
    except Exception as e:
        print(f"✗ Error creating CSV files: {e}")
        return
    
    # Step 3: Analyze each CSV file
    print(f"\n🔍 STEP 3: Analyzing CSV files...")
    israeli_stocks = service.load_israeli_stocks()
    print(f"✓ Loaded {len(israeli_stocks)} Israeli stocks from database")
    
    for csv_file in csv_files:
        print(f"\n📄 Analyzing: {os.path.basename(csv_file)}")
        try:
            df = pd.read_csv(csv_file)
            print(f"   - DataFrame shape: {df.shape}")
            print(f"   - Columns: {list(df.columns)}")
            
            # Determine CSV type
            csv_type = service.determine_csv_type(df, csv_file)
            print(f"   - Detected type: {csv_type}")
            
            # Check for Israeli stocks in this CSV
            df_str = df.to_string()
            found_stocks = []
            for security_no, (symbol, name, index_name) in israeli_stocks.items():
                if security_no in df_str:
                    found_stocks.append((security_no, symbol, name))
            
            print(f"   - Found {len(found_stocks)} Israeli stocks:")
            for security_no, symbol, name in found_stocks[:5]:  # Show first 5
                print(f"     * {symbol} ({security_no}): {name}")
            
            if found_stocks:
                print(f"   - Sample data for debugging:")
                print(f"     {df.head(3).to_string()}")
                
        except Exception as e:
            print(f"   ✗ Error analyzing {csv_file}: {e}")
    
    # Step 4: Test full processing
    print(f"\n🎯 STEP 4: Testing full processing...")
    try:
        holdings, transactions = service.analyze_csv_files(csv_files, os.path.basename(pdf_path), datetime.now())
        print(f"✓ Processing complete:")
        print(f"   - Holdings found: {len(holdings)}")
        print(f"   - Transactions found: {len(transactions)}")
        
        if holdings:
            print(f"\n📈 Sample Holdings:")
            for holding in holdings[:3]:
                print(f"   - {holding.get('symbol', 'N/A')}: {holding.get('quantity', 'N/A')} shares")
        
        if transactions:
            print(f"\n💰 Sample Transactions:")
            for transaction in transactions[:3]:
                print(f"   - {transaction.get('symbol', 'N/A')}: {transaction.get('transaction_type', 'N/A')} {transaction.get('quantity', 'N/A')}")
        else:
            print(f"\n❌ No transactions found - this might be the issue!")
            
    except Exception as e:
        print(f"✗ Error in full processing: {e}")
    
    # Clean up
    print(f"\n🧹 Cleaning up temporary files...")
    import shutil
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
        print(f"✓ Removed {temp_dir}/")

if __name__ == "__main__":
    # Use the uploaded PDF
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    debug_pdf_processing(pdf_path)
