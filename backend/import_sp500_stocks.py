#!/usr/bin/env python3
"""
Import S&P 500 stocks into WorldStock table from CSV
Uses the provided constituents.csv which already has sector/industry data
"""
import sys
import csv
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.world_stock_models import WorldStock

def import_sp500_from_csv(csv_path: str):
    """Import S&P 500 stocks from CSV file"""
    
    print(f"\n{'='*70}")
    print("Importing S&P 500 Stocks to WorldStock Table")
    print('='*70)
    
    db = SessionLocal()
    
    try:
        # Read CSV
        print(f"\n📖 Reading CSV from: {csv_path}")
        stocks_data = []
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                stocks_data.append({
                    'ticker': row['Symbol'].strip(),
                    'exchange': 'US',  # All S&P 500 are US
                    'company_name': row['Security'].strip(),
                    'sector': row['GICS Sector'].strip() if row['GICS Sector'] else None,
                    'industry': row['GICS Sub-Industry'].strip() if row['GICS Sub-Industry'] else None,
                    'country': 'US',
                    'currency': 'USD',
                })
        
        print(f"✅ Found {len(stocks_data)} stocks in CSV")
        
        # Check existing stocks
        existing_tickers = {
            stock.ticker for stock in db.query(WorldStock.ticker).all()
        }
        print(f"📊 Currently {len(existing_tickers)} stocks in database")
        
        # Filter new stocks
        new_stocks = [s for s in stocks_data if s['ticker'] not in existing_tickers]
        duplicate_stocks = [s for s in stocks_data if s['ticker'] in existing_tickers]
        
        print(f"🆕 {len(new_stocks)} new stocks to add")
        print(f"♻️  {len(duplicate_stocks)} stocks already exist")
        
        if not new_stocks:
            print("\n✅ All stocks already imported!")
            return
        
        # Show sample
        print(f"\n📋 Sample of stocks to import:")
        print('-'*70)
        for stock in new_stocks[:5]:
            print(f"  {stock['ticker']:6} - {stock['company_name'][:40]:40} | {stock['sector']}")
        if len(new_stocks) > 5:
            print(f"  ... and {len(new_stocks) - 5} more")
        
        # Confirm
        response = input(f"\n❓ Import {len(new_stocks)} stocks? (y/n): ")
        if response.lower() != 'y':
            print("❌ Import cancelled")
            return
        
        # Insert stocks
        print("\n📥 Importing stocks...")
        inserted_count = 0
        
        for stock_data in new_stocks:
            try:
                stock = WorldStock(
                    ticker=stock_data['ticker'],
                    exchange=stock_data['exchange'],
                    company_name=stock_data['company_name'],
                    sector=stock_data['sector'],
                    industry=stock_data['industry'],
                    country=stock_data['country'],
                    currency=stock_data['currency'],
                    is_active=True
                )
                db.add(stock)
                inserted_count += 1
                
                if inserted_count % 50 == 0:
                    print(f"  ... {inserted_count}/{len(new_stocks)} imported")
                    
            except Exception as e:
                print(f"⚠️  Error importing {stock_data['ticker']}: {e}")
        
        # Commit
        db.commit()
        print(f"\n✅ Successfully imported {inserted_count} stocks!")
        
        # Show statistics
        total_stocks = db.query(WorldStock).count()
        sectors = db.query(WorldStock.sector).distinct().all()
        
        print(f"\n📊 Database Statistics:")
        print('-'*70)
        print(f"  Total Stocks: {total_stocks}")
        print(f"  Unique Sectors: {len([s[0] for s in sectors if s[0]])}")
        print(f"\n  Sectors:")
        for sector in sorted([s[0] for s in sectors if s[0]]):
            count = db.query(WorldStock).filter(WorldStock.sector == sector).count()
            print(f"    - {sector:30} : {count:3} stocks")
        
    except FileNotFoundError:
        print(f"❌ Error: CSV file not found at {csv_path}")
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    csv_path = "/Users/michaelbabushkin/Downloads/constituents.csv"
    
    if len(sys.argv) > 1:
        csv_path = sys.argv[1]
    
    import_sp500_from_csv(csv_path)
