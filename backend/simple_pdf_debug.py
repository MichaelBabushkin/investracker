#!/usr/bin/env python3
"""
Simple PDF table extractor to see what's in the Excellence-June.pdf
"""

import pdfplumber
import os

def analyze_pdf_tables(pdf_path):
    print(f"📄 Analyzing PDF: {pdf_path}")
    print("=" * 60)
    
    with pdfplumber.open(pdf_path) as pdf:
        print(f"📊 Total pages: {len(pdf.pages)}")
        
        for page_num, page in enumerate(pdf.pages):
            print(f"\n📖 PAGE {page_num + 1}")
            print("-" * 30)
            
            # Extract tables
            tables = page.extract_tables()
            print(f"🔢 Tables found: {len(tables)}")
            
            for table_num, table in enumerate(tables):
                if table:
                    print(f"\n📋 Table {table_num + 1}:")
                    print(f"   - Rows: {len(table)}")
                    print(f"   - Columns: {len(table[0]) if table else 0}")
                    
                    # Show first few rows
                    for i, row in enumerate(table[:5]):  # First 5 rows
                        clean_row = [str(cell).strip() if cell else "" for cell in row]
                        print(f"   Row {i+1}: {clean_row}")
                    
                    if len(table) > 5:
                        print(f"   ... (showing first 5 of {len(table)} rows)")
            
            # Also extract text to look for keywords
            text = page.extract_text()
            if text:
                print(f"\n📝 Text content preview:")
                words = text.split()[:50]  # First 50 words
                print("   " + " ".join(words))
                
                # Look for transaction keywords
                transaction_keywords = ['buy', 'sell', 'dividend', 'transaction', 'trade', 'קנייה', 'מכירה', 'דנדביד']
                found_keywords = [word for word in transaction_keywords if word.lower() in text.lower()]
                if found_keywords:
                    print(f"   🎯 Transaction keywords found: {found_keywords}")

if __name__ == "__main__":
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    if os.path.exists(pdf_path):
        analyze_pdf_tables(pdf_path)
    else:
        print(f"PDF not found: {pdf_path}")
