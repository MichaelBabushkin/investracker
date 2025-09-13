#!/usr/bin/env python3
"""
Check all pages of the PDF for more tables that might contain Israeli stock transactions
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
    with open("full_pdf_analysis.txt", "a", encoding="utf-8") as f:
        f.write(message + "\n")

try:
    from app.services.israeli_stock_service import IsraeliStockService
    write_log("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    write_log(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def main():
    # Clear previous log
    with open("full_pdf_analysis.txt", "w", encoding="utf-8") as f:
        f.write(f"Full PDF Analysis started at {datetime.now()}\n")
        f.write("=" * 80 + "\n")
    
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        write_log(f"✗ PDF not found: {pdf_path}")
        return
    
    write_log(f"🔍 Full PDF Analysis: {pdf_path}")
    write_log("=" * 80)
    
    service = IsraeliStockService()
    israeli_stocks = service.load_israeli_stocks()
    write_log(f"📊 Loaded {len(israeli_stocks)} Israeli stocks")
    
    # Get some Israeli stock security numbers to look for
    sample_israeli_stocks = list(israeli_stocks.items())[:10]
    write_log(f"\n🔍 Looking for these Israeli stocks:")
    for security_no, (symbol, name, index_name) in sample_israeli_stocks:
        write_log(f"   {security_no}: {symbol} - {name}")
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            write_log(f"\n📄 PDF has {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages, 1):
                write_log(f"\n🔍 PAGE {page_num}:")
                write_log("-" * 40)
                
                # Extract all tables from this page
                tables = page.extract_tables()
                write_log(f"   Found {len(tables)} tables on page {page_num}")
                
                for table_num, table in enumerate(tables, 1):
                    write_log(f"\n   📊 TABLE {table_num} (Page {page_num}):")
                    if table and len(table) > 0:
                        write_log(f"      Rows: {len(table)}")
                        write_log(f"      Columns: {len(table[0]) if table[0] else 0}")
                        
                        # Convert table to string for searching
                        table_str = str(table)
                        
                        # Look for Israeli stock security numbers
                        found_israeli_stocks = []
                        for security_no, (symbol, name, index_name) in israeli_stocks.items():
                            if security_no in table_str:
                                found_israeli_stocks.append((security_no, symbol, name))
                        
                        if found_israeli_stocks:
                            write_log(f"      🎯 FOUND {len(found_israeli_stocks)} ISRAELI STOCKS!")
                            for security_no, symbol, name in found_israeli_stocks[:5]:  # Show first 5
                                write_log(f"         {security_no}: {symbol} - {name}")
                            
                            # Show some sample rows
                            write_log(f"      📄 Sample rows:")
                            for i, row in enumerate(table[:3]):
                                write_log(f"         Row {i}: {row}")
                        else:
                            write_log(f"      ❌ No Israeli stocks found in this table")
                            
                            # Show sample data to understand what's in this table
                            write_log(f"      📄 Sample rows (to understand content):")
                            for i, row in enumerate(table[:2]):
                                write_log(f"         Row {i}: {row}")
                        
                        # Look for Hebrew keywords
                        hebrew_keywords = ['דיבידנד', 'רכישה', 'מכירה', 'החזקות', 'עסקאות', 'מניות', 'ביד/', 'חסמ/']
                        found_keywords = [kw for kw in hebrew_keywords if kw in table_str]
                        if found_keywords:
                            write_log(f"      🔤 Hebrew keywords: {found_keywords}")
                
                # Also check the raw text of the page
                text = page.extract_text()
                if text:
                    # Look for Israeli stock security numbers in the text
                    text_israeli_stocks = []
                    for security_no, (symbol, name, index_name) in sample_israeli_stocks:
                        if security_no in text:
                            text_israeli_stocks.append((security_no, symbol, name))
                    
                    if text_israeli_stocks:
                        write_log(f"\n   📝 Found Israeli stocks in page text:")
                        for security_no, symbol, name in text_israeli_stocks:
                            write_log(f"      {security_no}: {symbol} - {name}")
        
    except Exception as e:
        write_log(f"❌ Error: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main()
    write_log("\n✅ Full PDF analysis completed. Check full_pdf_analysis.txt for results.")
