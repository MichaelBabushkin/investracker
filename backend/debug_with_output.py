#!/usr/bin/env python3
"""
Debug script that outputs results to a file
"""

import os
import sys
import pandas as pd
import pdfplumber
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def write_log(message):
    """Write message to both console and log file"""
    print(message)
    with open("debug_output.txt", "a", encoding="utf-8") as f:
        f.write(message + "\n")

try:
    from app.services.israeli_stock_service import IsraeliStockService
    write_log("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    write_log(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def main():
    # Clear previous log
    with open("debug_output.txt", "w", encoding="utf-8") as f:
        f.write(f"Debug run started at {datetime.now()}\n")
        f.write("=" * 80 + "\n")
    
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        write_log(f"✗ PDF not found: {pdf_path}")
        return
    
    write_log(f"🔍 Debugging Israeli stock detection in: {pdf_path}")
    write_log("=" * 80)
    
    service = IsraeliStockService()
    
    # Load Israeli stocks
    israeli_stocks = service.load_israeli_stocks()
    write_log(f"📊 Loaded {len(israeli_stocks)} Israeli stocks")
    
    # Show sample stocks
    write_log("\n📋 Sample Israeli stocks (first 5):")
    for i, (security_no, (symbol, name, index_name)) in enumerate(israeli_stocks.items()):
        if i < 5:
            write_log(f"   {security_no}: {symbol} - {name}")
    
    # Extract tables from PDF
    try:
        tables = service.extract_tables_from_pdf(pdf_path)
        write_log(f"\n🔢 Extracted {len(tables)} tables from PDF")
        
        # Save tables to CSV and analyze each one
        import tempfile
        temp_dir = tempfile.mkdtemp()
        csv_files = service.save_tables_to_csv(tables, temp_dir)
        
        transaction_tables_found = 0
        total_transactions_found = 0
        
        for csv_file in csv_files:
            write_log(f"\n🔍 Analyzing: {os.path.basename(csv_file)}")
            write_log("-" * 40)
            
            try:
                df = pd.read_csv(csv_file)
                write_log(f"   📊 Shape: {df.shape}")
                
                # Determine type
                csv_type = service.determine_csv_type(df, csv_file)
                write_log(f"   📝 Type: {csv_type}")
                
                if csv_type == 'transactions':
                    transaction_tables_found += 1
                    write_log(f"   🎯 This is a TRANSACTION table!")
                    
                    # Check if any Israeli stock security numbers are found
                    df_str = df.to_string()
                    found_stocks = []
                    
                    for security_no, (symbol, name, index_name) in israeli_stocks.items():
                        if security_no in df_str:
                            found_stocks.append((security_no, symbol, name))
                    
                    write_log(f"   🏗️ Found {len(found_stocks)} Israeli stocks in this table:")
                    
                    for security_no, symbol, name in found_stocks:
                        write_log(f"      {security_no}: {symbol} - {name}")
                        
                        # Try to extract transactions for this stock
                        transactions = service.extract_transaction_from_csv(df, security_no, symbol, name, "debug.pdf")
                        total_transactions_found += len(transactions)
                        write_log(f"         → Extracted {len(transactions)} transactions")
                        
                        for t in transactions:
                            write_log(f"           {t.get('transaction_type', 'UNKNOWN')} - {t.get('transaction_date', 'NO DATE')} - Value: {t.get('total_value', 'N/A')}")
                    
                    # Show some sample data from the table
                    write_log(f"\n   📄 Sample table content (first 3 rows):")
                    for i, row in df.head(3).iterrows():
                        write_log(f"      Row {i}: {list(row.values)}")
                    
                    # Look for dividend and transaction keywords in the table
                    all_text = df.to_string().lower()
                    dividend_keywords = ['דיבידנד', 'dividend', 'דיביד', 'ביד/']
                    transaction_keywords = ['רכישה', 'מכירה', 'קנייה', 'buy', 'sell', 'חסמ/']
                    
                    found_dividend_keywords = [kw for kw in dividend_keywords if kw in all_text]
                    found_transaction_keywords = [kw for kw in transaction_keywords if kw in all_text]
                    
                    write_log(f"   🎁 Dividend keywords found: {found_dividend_keywords}")
                    write_log(f"   💰 Transaction keywords found: {found_transaction_keywords}")
                
            except Exception as e:
                write_log(f"   ❌ Error analyzing {csv_file}: {e}")
                import traceback
                write_log(f"   Traceback: {traceback.format_exc()}")
        
        write_log(f"\n🎯 SUMMARY:")
        write_log(f"   Transaction tables found: {transaction_tables_found}")
        write_log(f"   Total transactions extracted: {total_transactions_found}")
        
        # Clean up
        import shutil
        shutil.rmtree(temp_dir)
        
    except Exception as e:
        write_log(f"❌ Error in main process: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main()
    write_log("\n✅ Debug completed. Check debug_output.txt for full results.")
