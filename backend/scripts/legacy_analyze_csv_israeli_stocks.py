#!/usr/bin/env python3

"""
LEGACY SCRIPT - This functionality has been migrated to IsraeliStockService
This file is kept for reference only. Use the API endpoints in /israeli-stocks/ instead.

Legacy CSV Analysis Script for Israeli Stocks
This script was used to analyze extracted CSV files for Israeli stock data.
The functionality has been moved to:
- app/services/israeli_stock_service.py (core logic)
- app/api/v1/endpoints/israeli_stocks.py (API endpoints)
"""

import pandas as pd
import os
import glob
from dotenv import load_dotenv
import psycopg2

def load_ta125_data():
    """Load TA-125 stocks from PostgreSQL database"""
    load_dotenv()
    
    db_config = {
        'host': os.getenv('DB_HOST', 'localhost'),
        'port': os.getenv('DB_PORT', '5433'),
        'database': os.getenv('DB_NAME', 'investracker_db'),
        'user': os.getenv('DB_USER', 'postgres'),
        'password': os.getenv('DB_PASSWORD', 'postgres')
    }
    
    try:
        conn = psycopg2.connect(**db_config)
        cursor = conn.cursor()
        
        # Get all TA-125 stocks
        cursor.execute('SELECT security_no, symbol, name FROM "Ta125Stock"')
        stocks = cursor.fetchall()
        
        # Convert to dictionary: security_no -> (symbol, name)
        ta125_dict = {}
        for security_no, symbol, name in stocks:
            ta125_dict[security_no] = (symbol, name)
        
        cursor.close()
        conn.close()
        
        print(f"Loaded {len(ta125_dict)} TA-125 stocks from database")
        return ta125_dict
        
    except Exception as e:
        print(f"Error loading TA-125 data from database: {e}")
        print("Falling back to hardcoded data...")
        


def analyze_csv_files():
    """Analyze CSV files for Israeli stocks"""
    
    # Load TA-125 data
    ta125_stocks = load_ta125_data()
    
    # Find all CSV files in the extracted_tables directory
    csv_files = glob.glob("extracted_tables/*.csv")
    
    if not csv_files:
        print("No CSV files found in extracted_tables directory")
        return
    
    print(f"Found {len(csv_files)} CSV files to analyze:")
    for csv_file in csv_files:
        print(f"  - {csv_file}")
    
    all_israeli_stocks = []
    
    for csv_file in csv_files:
        print(f"\n==== ANALYZING {csv_file} ====")
        
        try:
            # Read CSV file
            df = pd.read_csv(csv_file)
            print(f"CSV has {len(df)} rows and {len(df.columns)} columns")
            print(f"Columns: {list(df.columns)}")
            
            # Display first few rows
            print("\nFirst 5 rows:")
            print(df.head())
            
            # Look for Israeli stocks
            found_stocks = []
            
            # Check each row for Israeli security numbers
            for index, row in df.iterrows():
                # Convert all row values to string for searching
                row_str = ' '.join([str(val) for val in row.values if pd.notna(val)])
                
                # Check if any TA-125 security number appears in this row
                for security_no, (symbol, name) in ta125_stocks.items():
                    if security_no in row_str:
                        # Extract relevant data from this row
                        stock_data = {
                            'security_no': security_no,
                            'symbol': symbol,
                            'name': name,
                            'row_index': index,
                            'raw_data': dict(row),
                            'csv_file': csv_file
                        }
                        found_stocks.append(stock_data)
                        all_israeli_stocks.append(stock_data)
                        break
            
            if found_stocks:
                print(f"\n🇮🇱 Found {len(found_stocks)} Israeli TA-125 stocks in this CSV:")
                for stock in found_stocks:
                    print(f"\n  📊 {stock['security_no']} ({stock['symbol']}): {stock['name']}")
                    print(f"     Row {stock['row_index']}: {stock['raw_data']}")
                    
                    # Try to extract specific financial data
                    row_data = stock['raw_data']
                    
                    # Look for common financial columns
                    financial_data = {}
                    for col, value in row_data.items():
                        if pd.notna(value) and col:
                            col_lower = str(col).lower()
                            if any(keyword in col_lower for keyword in ['price', 'value', 'amount', 'quantity', 'shares', 'רעש', 'תולע', 'תומכ']):
                                financial_data[col] = value
                    
                    if financial_data:
                        print(f"     💰 Financial data:")
                        for col, value in financial_data.items():
                            print(f"        {col}: {value}")
            else:
                print(f"No Israeli TA-125 stocks found in this CSV")
                
        except Exception as e:
            print(f"Error reading {csv_file}: {e}")
            continue
    
    # Summary
    print(f"\n==== SUMMARY ====")
    if all_israeli_stocks:
        print(f"🎯 Total Israeli TA-125 stocks found across all CSVs: {len(all_israeli_stocks)}")
        
        # Group by security number
        by_security = {}
        for stock in all_israeli_stocks:
            sec_no = stock['security_no']
            if sec_no not in by_security:
                by_security[sec_no] = []
            by_security[sec_no].append(stock)
        
        print(f"\n📈 Breakdown by security:")
        for security_no, stocks in by_security.items():
            symbol = stocks[0]['symbol']
            name = stocks[0]['name']
            print(f"  {security_no} ({symbol}): {name} - appears in {len(stocks)} row(s)")
            
            # Show all financial data for this security
            print(f"    💹 All transaction data:")
            for i, stock in enumerate(stocks, 1):
                print(f"      Transaction {i} (from {stock['csv_file']}):")
                for col, value in stock['raw_data'].items():
                    if pd.notna(value) and str(value).strip():
                        print(f"        {col}: {value}")
                print()
    else:
        print("❌ No Israeli TA-125 stocks found in any CSV files")

if __name__ == "__main__":
    analyze_csv_files()
