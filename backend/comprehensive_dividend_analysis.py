#!/usr/bin/env python3
"""
Comprehensive analysis of all dividend entries across all tables
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
    with open("comprehensive_dividend_analysis.txt", "a", encoding="utf-8") as f:
        f.write(message + "\n")

try:
    from app.services.israeli_stock_service import IsraeliStockService
    write_log("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    write_log(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def main():
    # Clear previous log
    with open("comprehensive_dividend_analysis.txt", "w", encoding="utf-8") as f:
        f.write(f"Comprehensive Dividend Analysis - {datetime.now()}\n")
        f.write("=" * 80 + "\n")
    
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        write_log(f"✗ PDF not found: {pdf_path}")
        return
    
    write_log(f"🔍 Comprehensive dividend analysis: {pdf_path}")
    write_log("=" * 80)
    
    service = IsraeliStockService()
    israeli_stocks = service.load_israeli_stocks()
    write_log(f"📊 Loaded {len(israeli_stocks)} Israeli stocks")
    
    # Dividend keywords in Hebrew
    dividend_keywords = ['דנדביד', 'דיבידנד', 'ביד/', 'דיביד', 'dividend']
    
    try:
        # First, scan the entire PDF for dividend mentions
        write_log(f"\n🔍 SCANNING ENTIRE PDF FOR DIVIDEND MENTIONS:")
        write_log("=" * 60)
        
        total_dividend_mentions = 0
        
        with pdfplumber.open(pdf_path) as pdf:
            for page_num, page in enumerate(pdf.pages, 1):
                text = page.extract_text() or ""
                
                page_dividend_count = 0
                for keyword in dividend_keywords:
                    page_dividend_count += text.lower().count(keyword.lower())
                
                if page_dividend_count > 0:
                    write_log(f"📄 Page {page_num}: {page_dividend_count} dividend mentions")
                    
                    # Show lines containing dividends
                    lines = text.split('\n')
                    for i, line in enumerate(lines):
                        if any(keyword.lower() in line.lower() for keyword in dividend_keywords):
                            write_log(f"   Line {i}: {line.strip()}")
                
                total_dividend_mentions += page_dividend_count
        
        write_log(f"\n📊 TOTAL DIVIDEND MENTIONS IN PDF: {total_dividend_mentions}")
        
        # Now analyze each CSV table
        write_log(f"\n🔍 ANALYZING EXTRACTED CSV TABLES:")
        write_log("=" * 60)
        
        csv_files = [
            "extracted_csv_files/page_1_table_1.csv",
            "extracted_csv_files/page_1_table_2.csv",
            "extracted_csv_files/page_2_table_1.csv", 
            "extracted_csv_files/page_3_table_1.csv"
        ]
        
        total_csv_dividends = 0
        total_israeli_dividends = 0
        
        for csv_file in csv_files:
            if not os.path.exists(csv_file):
                write_log(f"❌ File not found: {csv_file}")
                continue
                
            write_log(f"\n📄 ANALYZING: {os.path.basename(csv_file)}")
            write_log("-" * 40)
            
            df = pd.read_csv(csv_file)
            write_log(f"   📊 Shape: {df.shape}")
            
            # Find all rows with dividend keywords
            dividend_rows = []
            for i, row in df.iterrows():
                row_str = ' '.join(str(val) for val in row.values).lower()
                if any(keyword.lower() in row_str for keyword in dividend_keywords):
                    dividend_rows.append((i, row))
            
            write_log(f"   🎁 Dividend rows found: {len(dividend_rows)}")
            total_csv_dividends += len(dividend_rows)
            
            for row_num, row in dividend_rows:
                # Check if this dividend is for an Israeli stock
                row_str = ' '.join(str(val) for val in row.values)
                found_israeli = []
                for security_no, (symbol, name, index_name) in israeli_stocks.items():
                    if security_no in row_str:
                        found_israeli.append((security_no, symbol, name))
                
                if found_israeli:
                    total_israeli_dividends += 1
                    write_log(f"      ✅ Row {row_num}: {found_israeli[0][1]} - {found_israeli[0][2]}")
                    write_log(f"         Security: {found_israeli[0][0]}")
                    write_log(f"         Values: {list(row.values)}")
                else:
                    write_log(f"      ❌ Row {row_num}: Non-Israeli dividend")
                    write_log(f"         Values: {list(row.values)}")
        
        write_log(f"\n📊 SUMMARY:")
        write_log("=" * 40)
        write_log(f"📄 Total dividend mentions in PDF text: {total_dividend_mentions}")
        write_log(f"📊 Total dividend rows in CSV tables: {total_csv_dividends}")
        write_log(f"🇮🇱 Israeli stock dividends found: {total_israeli_dividends}")
        
        # Test actual extraction
        write_log(f"\n🧪 TESTING ACTUAL SERVICE EXTRACTION:")
        write_log("=" * 50)
        
        result = service.analyze_pdf_for_israeli_stocks(pdf_path, "comprehensive_test_user")
        write_log(f"✓ Service extraction completed:")
        write_log(f"   Holdings: {result.get('holdings_found', 0)}")
        write_log(f"   Transactions: {result.get('transactions_found', 0)}")
        write_log(f"   Dividends: {result.get('dividends_found', 0)}")
        
        if result.get('dividends_found', 0) < total_israeli_dividends:
            write_log(f"⚠️  POTENTIAL ISSUE: Service found {result.get('dividends_found', 0)} dividends but CSV analysis found {total_israeli_dividends}")
            write_log(f"   This suggests some dividends are not being extracted properly by the service")
        
    except Exception as e:
        write_log(f"❌ Error: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main()
    write_log("\n✅ Comprehensive dividend analysis completed.")
