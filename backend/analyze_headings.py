#!/usr/bin/env python3
"""
Extract headings from PDF to identify table types by Hebrew headings
"""

import os
import sys
import pdfplumber
from datetime import datetime

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def write_log(message):
    """Write message to both console and log file"""
    print(message)
    with open("heading_analysis.txt", "a", encoding="utf-8") as f:
        f.write(message + "\n")

def main():
    # Clear previous logcheck 
    with open("heading_analysis.txt", "w", encoding="utf-8") as f:
        f.write(f"Hebrew Heading Analysis - {datetime.now()}\n")
        f.write("=" * 80 + "\n")
    
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        write_log(f"✗ PDF not found: {pdf_path}")
        return
    
    write_log(f"🔍 Analyzing Hebrew headings in: {pdf_path}")
    write_log("=" * 80)
    
    try:
        with pdfplumber.open(pdf_path) as pdf:
            write_log(f"📄 PDF has {len(pdf.pages)} pages")
            
            # Target headings to look for
            holdings_heading = "פירוט יתרות"
            transactions_heading = "פירוט תנועות"
            
            write_log(f"\n🎯 Looking for these headings:")
            write_log(f"   Holdings: '{holdings_heading}'")
            write_log(f"   Transactions: '{transactions_heading}'")
            
            for page_num, page in enumerate(pdf.pages, 1):
                write_log(f"\n📄 PAGE {page_num}:")
                write_log("-" * 40)
                
                # Extract all text from the page
                text = page.extract_text()
                if text:
                    # Look for our target headings
                    if holdings_heading in text:
                        write_log(f"   ✓ Found holdings heading: '{holdings_heading}'")
                        # Show context around the heading
                        lines = text.split('\n')
                        for i, line in enumerate(lines):
                            if holdings_heading in line:
                                write_log(f"      Context around line {i}:")
                                start = max(0, i-2)
                                end = min(len(lines), i+3)
                                for j in range(start, end):
                                    marker = ">>> " if j == i else "    "
                                    write_log(f"      {marker}{lines[j]}")
                                break
                    
                    if transactions_heading in text:
                        write_log(f"   ✓ Found transactions heading: '{transactions_heading}'")
                        # Show context around the heading
                        lines = text.split('\n')
                        for i, line in enumerate(lines):
                            if transactions_heading in line:
                                write_log(f"      Context around line {i}:")
                                start = max(0, i-2)
                                end = min(len(lines), i+3)
                                for j in range(start, end):
                                    marker = ">>> " if j == i else "    "
                                    write_log(f"      {marker}{lines[j]}")
                                break
                    
                    # Also look for any Hebrew text that might be headings
                    lines = text.split('\n')
                    hebrew_lines = []
                    for i, line in enumerate(lines):
                        if any(char in line for char in 'אבגדהוזחטיכלמנסעפצקרשת'):
                            if len(line.strip()) < 50 and len(line.strip()) > 5:  # Likely headings
                                hebrew_lines.append((i, line.strip()))
                    
                    if hebrew_lines:
                        write_log(f"   📝 Potential Hebrew headings found:")
                        for line_num, line in hebrew_lines[:10]:  # Show first 10
                            write_log(f"      Line {line_num}: '{line}'")
                
                # Extract tables and see their position relative to headings
                tables = page.extract_tables()
                if tables:
                    write_log(f"   📊 Found {len(tables)} tables on this page")
                    
                    for table_num, table in enumerate(tables, 1):
                        if table and len(table) > 0:
                            write_log(f"      Table {table_num}: {len(table)} rows, {len(table[0]) if table[0] else 0} columns")
                            # Show first row (headers)
                            if table[0]:
                                write_log(f"         Headers: {table[0]}")
        
        write_log(f"\n✅ HEADING ANALYSIS COMPLETE!")
        write_log(f"📄 Check heading_analysis.txt for full results")
        
    except Exception as e:
        write_log(f"❌ Error: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main()
