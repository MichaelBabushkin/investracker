#!/usr/bin/env python3
"""
Extract all tables from PDF to CSV files for manual inspection
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
    with open("csv_extraction_log.txt", "a", encoding="utf-8") as f:
        f.write(message + "\n")

try:
    from app.services.israeli_stock_service import IsraeliStockService
    write_log("✓ Successfully imported IsraeliStockService")
except ImportError as e:
    write_log(f"✗ Failed to import IsraeliStockService: {e}")
    sys.exit(1)

def main():
    # Clear previous log
    with open("csv_extraction_log.txt", "w", encoding="utf-8") as f:
        f.write(f"CSV Extraction Log - {datetime.now()}\n")
        f.write("=" * 80 + "\n")
    
    pdf_path = r"c:\Users\misha\Downloads\Excellence-June.pdf"
    
    if not os.path.exists(pdf_path):
        write_log(f"✗ PDF not found: {pdf_path}")
        return
    
    write_log(f"🔍 Extracting tables to CSV files from: {pdf_path}")
    write_log("=" * 80)
    
    service = IsraeliStockService()
    
    try:
        # Create output directory for CSV files
        output_dir = "extracted_csv_files"
        if not os.path.exists(output_dir):
            os.makedirs(output_dir)
            write_log(f"📁 Created output directory: {output_dir}")
        
        # Extract tables from PDF
        write_log(f"📊 Extracting tables from PDF...")
        tables = service.extract_tables_from_pdf(pdf_path)
        write_log(f"✓ Extracted {len(tables)} tables")
        
        # Save tables to CSV files
        write_log(f"💾 Saving tables to CSV files...")
        csv_files = service.save_tables_to_csv(tables, output_dir)
        write_log(f"✓ Saved {len(csv_files)} CSV files")
        
        # Analyze each CSV file
        israeli_stocks = service.load_israeli_stocks()
        write_log(f"📋 Loaded {len(israeli_stocks)} Israeli stocks for analysis")
        
        write_log(f"\n📋 DETAILED ANALYSIS OF EACH CSV FILE:")
        write_log("=" * 80)
        
        for csv_file in csv_files:
            filename = os.path.basename(csv_file)
            write_log(f"\n📄 FILE: {filename}")
            write_log("-" * 50)
            
            try:
                df = pd.read_csv(csv_file)
                write_log(f"   📊 Shape: {df.shape}")
                write_log(f"   📁 Full path: {csv_file}")
                
                # Show columns
                write_log(f"   📋 Columns: {list(df.columns)}")
                
                # Determine type
                csv_type = service.determine_csv_type(df, csv_file)
                write_log(f"   🏷️ Classified as: {csv_type}")
                
                # Show first few rows
                write_log(f"   📄 First 3 rows:")
                for i, row in df.head(3).iterrows():
                    row_values = [str(val)[:50] + "..." if len(str(val)) > 50 else str(val) for val in row.values]
                    write_log(f"      Row {i}: {row_values}")
                
                # Check for Israeli stocks
                df_str = df.to_string()
                found_stocks = []
                for security_no, (symbol, name, index_name) in israeli_stocks.items():
                    if security_no in df_str:
                        found_stocks.append((security_no, symbol, name))
                
                write_log(f"   🎯 Israeli stocks found: {len(found_stocks)}")
                for security_no, symbol, name in found_stocks[:5]:  # Show first 5
                    write_log(f"      {security_no}: {symbol} - {name}")
                
                # Look for Hebrew content
                hebrew_chars = 'אבגדהוזחטיכלמנסעפצקרשת'
                hebrew_content = []
                for col in df.columns:
                    if any(char in str(col) for char in hebrew_chars):
                        hebrew_content.append(f"Column: {col}")
                
                for i, row in df.iterrows():
                    for val in row.values:
                        if any(char in str(val) for char in hebrew_chars):
                            hebrew_content.append(f"Row {i}: {str(val)[:100]}")
                            break
                    if len(hebrew_content) > 10:
                        break
                
                if hebrew_content:
                    write_log(f"   🔤 Hebrew content samples:")
                    for content in hebrew_content[:5]:
                        write_log(f"      {content}")
                
                # Look for specific patterns
                all_text = df.to_string().lower()
                
                # Transaction patterns
                transaction_patterns = ['ביד/', 'חסמ/', 'דיבידנד', 'רכישה', 'מכירה', 'קנייה']
                found_patterns = [p for p in transaction_patterns if p in all_text]
                if found_patterns:
                    write_log(f"   💰 Transaction patterns found: {found_patterns}")
                
                # Date patterns
                import re
                dates = re.findall(r'\d{1,2}/\d{1,2}/\d{2,4}', all_text)
                if dates:
                    write_log(f"   📅 Date patterns found: {dates[:5]}")  # Show first 5
                
            except Exception as e:
                write_log(f"   ❌ Error analyzing {filename}: {e}")
                import traceback
                write_log(f"   Traceback: {traceback.format_exc()}")
        
        write_log(f"\n✅ EXTRACTION COMPLETE!")
        write_log(f"📁 All CSV files are saved in: {output_dir}")
        write_log(f"📄 Log file: csv_extraction_log.txt")
        write_log(f"\nYou can now manually inspect the CSV files to see exactly what data was extracted.")
        
    except Exception as e:
        write_log(f"❌ Error in main process: {e}")
        import traceback
        write_log(f"Traceback: {traceback.format_exc()}")

if __name__ == "__main__":
    main()
