#!/usr/bin/env python3
"""
Debug script to examine the actual CSV structure for holdings
"""

import os
import sys
sys.path.append(os.path.dirname(__file__))

from app.services.israeli_stock_service import IsraeliStockService
import pandas as pd

def debug_holdings_structure():
    """Debug the actual structure of holdings CSV files"""
    print("=== DEBUGGING HOLDINGS CSV STRUCTURE ===")
    
    # Look for any existing CSV files that might have been extracted
    pdf_path = os.path.join("pdf", "January - report.pdf")
    
    if not os.path.exists(pdf_path):
        print(f"PDF not found at {pdf_path}")
        return
    
    service = IsraeliStockService()
    
    try:
        # Extract tables from PDF
        print("Extracting tables from PDF...")
        tables = service.extract_tables_from_pdf(pdf_path)
        
        if not tables:
            print("No tables found in PDF")
            return
        
        # Save to temporary CSV files
        temp_dir = "debug_csv_structure"
        csv_files = service.save_tables_to_csv(tables, temp_dir)
        
        print(f"Created {len(csv_files)} CSV files:")
        
        for csv_file in csv_files:
            print(f"\n=== {os.path.basename(csv_file)} ===")
            
            try:
                df = pd.read_csv(csv_file)
                print(f"Shape: {df.shape}")
                print(f"Columns: {list(df.columns)}")
                print("First few rows:")
                print(df.head())
                
                # Check if this looks like holdings data
                df_str = df.to_string().lower()
                if any(keyword in df_str for keyword in ['1184936', '23011']):  # ALTF and BEZQ security numbers
                    print("*** This appears to contain Israeli stock data ***")
                    
                    # Find rows with these security numbers
                    israeli_stocks = service.load_israeli_stocks()
                    for security_no, (symbol, name, index) in israeli_stocks.items():
                        if security_no in df_str:
                            print(f"\nFound {symbol} ({security_no}):")
                            mask = df.astype(str).apply(lambda x: x.str.contains(security_no, na=False)).any(axis=1)
                            relevant_rows = df[mask]
                            for idx, row in relevant_rows.iterrows():
                                print(f"Row {idx}: {list(row.values)}")
                
            except Exception as e:
                print(f"Error reading CSV: {e}")
        
        # Clean up
        import shutil
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    debug_holdings_structure()
