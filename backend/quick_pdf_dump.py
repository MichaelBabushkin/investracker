#!/usr/bin/env python3
"""
Quick PDF content dump
"""

import sys
import os
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

def quick_pdf_dump():
    """Quick dump of PDF content"""
    
    pdf_path = r"c:\Users\misha\Downloads\January - report.pdf"
    
    try:
        import pdfplumber
        
        with pdfplumber.open(pdf_path) as pdf:
            print(f"PDF has {len(pdf.pages)} pages")
            
            for page_num, page in enumerate(pdf.pages):
                print(f"\n{'='*20} PAGE {page_num + 1} {'='*20}")
                text = page.extract_text()
                if text:
                    print(text)
                else:
                    print("No text found on this page")
                    
                # Try to extract tables
                tables = page.extract_tables()
                if tables:
                    print(f"\nFound {len(tables)} tables on page {page_num + 1}:")
                    for i, table in enumerate(tables):
                        print(f"\nTable {i+1}:")
                        for row in table[:5]:  # Show first 5 rows
                            print(row)
                        if len(table) > 5:
                            print(f"... and {len(table) - 5} more rows")
    
    except Exception as e:
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    quick_pdf_dump()
