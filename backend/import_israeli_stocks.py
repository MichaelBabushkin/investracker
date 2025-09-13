#!/usr/bin/env python3
"""
Script to parse TA-125 Israeli stocks CSV and populate the database
"""

import sys
import os
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add the project root to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.core.database import engine, SessionLocal
from app.models.israeli_stock import IsraeliStock

def parse_and_import_israeli_stocks(csv_path: str):
    """Parse the TA-125 CSV file and import stocks to database"""
    
    try:
        # Read CSV file - try different encodings for Hebrew text
        print(f"Reading CSV file: {csv_path}")
        
        # Try different encodings
        for encoding in ['utf-8', 'cp1255', 'iso-8859-8']:
            try:
                df = pd.read_csv(csv_path, encoding=encoding)
                print(f"Successfully read CSV with {encoding} encoding")
                break
            except UnicodeDecodeError:
                continue
        else:
            raise ValueError("Could not read CSV with any supported encoding")
        
        print(f"Found {len(df)} stocks in the CSV")
        print("Columns:", df.columns.tolist())
        print("First few rows:")
        print(df.head())
        
        # Create database session
        db = SessionLocal()
        
        # Clear existing Israeli stocks (optional - for fresh import)
        print("Clearing existing Israeli stocks...")
        db.query(IsraeliStock).delete()
        db.commit()
        
        # Process each row
        imported_count = 0
        for index, row in df.iterrows():
            try:
                # Extract data from CSV row - adjust column names based on actual CSV structure
                stock = IsraeliStock(
                    symbol=str(row.get('Symbol', row.get('symbol', f'SYM{index}'))).strip(),
                    name=str(row.get('Name', row.get('name', row.get('Company', f'Company {index}')))).strip(),
                    security_number=str(row.get('Security Number', row.get('security_number', f'{1000000 + index}'))).strip(),
                    index_name="TA-125"
                )
                name = str(row['Name']).strip() if pd.notna(row['Name']) else None
                symbol = str(row['Symbol ']).strip() if pd.notna(row['Symbol ']) else None  # Note the space in column name
                security_no = str(row['Security No']).strip() if pd.notna(row['Security No']) else None
                
                # Skip empty rows
                if not name or not symbol or not security_no:
                    print(f"Skipping row {index}: missing data - {name}, {symbol}, {security_no}")
                    continue
                
                # Create IsraeliStock object
                stock = IsraeliStock(
                    name=name,
                    symbol=symbol,
                    security_number=security_no,
                    index_name="TA-125",
                    is_active=True
                )
                
                db.add(stock)
                imported_count += 1
                print(f"Added: {symbol} - {name} ({security_no})")
                
            except Exception as e:
                print(f"Error processing row {index}: {e}")
                continue
        
        # Commit all changes
        db.commit()
        print(f"\nSuccessfully imported {imported_count} Israeli stocks to database!")
        
        # Verify import
        total_stocks = db.query(IsraeliStock).count()
        print(f"Total Israeli stocks in database: {total_stocks}")
        
        # Show some examples
        print("\nSample imported stocks:")
        sample_stocks = db.query(IsraeliStock).limit(10).all()
        for stock in sample_stocks:
            print(f"  {stock.symbol} - {stock.name} ({stock.security_number})")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
        raise
    finally:
        db.close()

def main():
    """Main function"""
    if len(sys.argv) != 2:
        print("Usage: python import_israeli_stocks.py <csv_file_path>")
        print("Example: python import_israeli_stocks.py c:\\Users\\misha\\Downloads\\indexcomponents.csv")
        sys.exit(1)
    
    csv_path = sys.argv[1]
    
    if not os.path.exists(csv_path):
        print(f"Error: CSV file not found: {csv_path}")
        sys.exit(1)
    
    try:
        parse_and_import_israeli_stocks(csv_path)
        print("\nImport completed successfully!")
    except Exception as e:
        print(f"Import failed: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
