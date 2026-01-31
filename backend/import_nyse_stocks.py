#!/usr/bin/env python3
"""
Import NYSE-listed stocks from CSV into WorldStocks table
Then optionally enrich with yfinance data
"""
import sys
import csv
import time
import yfinance as yf
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.core.database import SessionLocal
from app.models.world_stock_models import WorldStock

def clean_ticker(ticker: str) -> str:
    """Clean ticker symbol - remove special suffixes like .U, .W, etc."""
    # Remove warrant/unit suffixes
    ticker = ticker.split('.')[0]
    # Handle special characters
    ticker = ticker.replace('$', '-P')  # Preferred stock notation
    ticker = ticker.replace('^', '-')
    return ticker.strip()

def clean_company_name(name: str) -> str:
    """Clean company name - remove stock type descriptions"""
    # Remove common suffixes
    suffixes = [
        'Common Stock',
        'Ordinary Shares',
        'Class A Ordinary Shares',
        'American Depositary Shares',
        'Units',
        'Warrants',
        'Preferred Stock',
    ]
    
    for suffix in suffixes:
        if suffix in name:
            name = name.split(suffix)[0]
    
    return name.strip().rstrip(',')

def import_nyse_stocks(csv_path: str, skip_existing: bool = True):
    """Import NYSE stocks from CSV"""
    
    print(f"\n{'='*80}")
    print("IMPORTING NYSE STOCKS")
    print('='*80)
    
    db = SessionLocal()
    
    try:
        # Read CSV
        print(f"\n📖 Reading CSV from: {csv_path}")
        stocks_data = []
        
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                ticker = clean_ticker(row['ACT Symbol'])
                company_name = clean_company_name(row['Company Name'])
                
                # Skip special cases (warrants, units, some preferred)
                if any(x in row['ACT Symbol'] for x in ['.U', '.W', '.R']):
                    continue
                
                stocks_data.append({
                    'ticker': ticker,
                    'company_name': company_name,
                    'exchange': 'NYSE',
                })
        
        print(f"✅ Found {len(stocks_data)} valid stocks in CSV")
        
        # Check existing stocks
        existing = db.execute(
            text('SELECT ticker FROM "WorldStocks" WHERE exchange = :exchange'),
            {'exchange': 'NYSE'}
        ).fetchall()
        existing_tickers = {row[0] for row in existing}
        
        print(f"📊 Currently {len(existing_tickers)} NYSE stocks in database")
        
        # Filter new stocks
        if skip_existing:
            new_stocks = [s for s in stocks_data if s['ticker'] not in existing_tickers]
            duplicate_stocks = [s for s in stocks_data if s['ticker'] in existing_tickers]
            
            print(f"🆕 {len(new_stocks)} new stocks to add")
            print(f"♻️  {len(duplicate_stocks)} stocks already exist (will skip)")
        else:
            new_stocks = stocks_data
            print(f"🔄 Will process all {len(new_stocks)} stocks (update mode)")
        
        if not new_stocks:
            print("\n✅ All stocks already imported!")
            return 0
        
        # Show sample
        print(f"\n📋 Sample of stocks to import:")
        print('-'*80)
        for stock in new_stocks[:10]:
            print(f"  {stock['ticker']:8} - {stock['company_name'][:60]}")
        if len(new_stocks) > 10:
            print(f"  ... and {len(new_stocks) - 10} more")
        
        # Confirm
        response = input(f"\n❓ Import {len(new_stocks)} NYSE stocks? (y/n): ")
        if response.lower() != 'y':
            print("❌ Import cancelled")
            return 0
        
        # Insert stocks
        print("\n📥 Importing stocks...")
        inserted_count = 0
        error_count = 0
        
        for i, stock_data in enumerate(new_stocks, 1):
            try:
                stock = WorldStock(
                    ticker=stock_data['ticker'],
                    exchange=stock_data['exchange'],
                    company_name=stock_data['company_name'],
                    country='US',
                    currency='USD',
                    is_active=True
                )
                db.add(stock)
                db.commit()  # Commit individually to avoid batch rollback
                inserted_count += 1
                
                if inserted_count % 100 == 0:
                    print(f"  ... {inserted_count}/{len(new_stocks)} imported")
                    
            except Exception as e:
                db.rollback()  # Rollback only this stock
                error_count += 1
                if error_count <= 5:  # Only show first 5 errors
                    print(f"⚠️  Error importing {stock_data['ticker']}: {str(e)[:100]}")
        
        print(f"\n✅ Successfully imported {inserted_count} NYSE stocks!")
        if error_count > 0:
            print(f"⚠️  {error_count} stocks failed (likely duplicates)")
        
        # Show statistics
        total_stocks = db.execute(text('SELECT COUNT(*) FROM "WorldStocks"')).scalar()
        nyse_stocks = db.execute(
            text('SELECT COUNT(*) FROM "WorldStocks" WHERE exchange = :exchange'),
            {'exchange': 'NYSE'}
        ).scalar()
        
        print(f"\n📊 Database Statistics:")
        print('-'*80)
        print(f"  Total World Stocks: {total_stocks}")
        print(f"  NYSE Stocks: {nyse_stocks}")
        
        return inserted_count
        
    except FileNotFoundError:
        print(f"❌ Error: CSV file not found at {csv_path}")
        return 0
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
        return 0
    finally:
        db.close()

def enrich_stocks_with_yfinance(exchange: str = 'NYSE', batch_size: int = 50, delay: float = 1.0, limit: int = None):
    """Enrich stocks with yfinance data"""
    
    print(f"\n{'='*80}")
    print(f"ENRICHING {exchange} STOCKS WITH YFINANCE")
    print('='*80)
    
    db = SessionLocal()
    
    try:
        # Get stocks that need enrichment
        query = text("""
            SELECT id, ticker, company_name 
            FROM "WorldStocks" 
            WHERE exchange = :exchange 
            AND (sector IS NULL OR industry IS NULL)
            ORDER BY ticker
        """)
        
        if limit:
            query = text(f"""
                SELECT id, ticker, company_name 
                FROM "WorldStocks" 
                WHERE exchange = :exchange 
                AND (sector IS NULL OR industry IS NULL)
                ORDER BY ticker
                LIMIT {limit}
            """)
        
        result = db.execute(query, {'exchange': exchange})
        stocks_to_enrich = result.fetchall()
        
        total_stocks = len(stocks_to_enrich)
        
        if total_stocks == 0:
            print(f"\n✅ All {exchange} stocks are already enriched!")
            return
        
        print(f"\n📊 Found {total_stocks} stocks to enrich")
        print(f"⏱️  Batch size: {batch_size}, Delay: {delay}s between requests")
        
        # Confirm
        response = input(f"\n❓ Start enrichment? (y/n): ")
        if response.lower() != 'y':
            print("❌ Enrichment cancelled")
            return
        
        print("\n🚀 Starting enrichment...")
        enriched_count = 0
        failed_count = 0
        failed_tickers = []
        
        for i, (stock_id, ticker, company_name) in enumerate(stocks_to_enrich, 1):
            try:
                # Fetch data from yfinance
                yf_ticker = yf.Ticker(ticker)
                info = yf_ticker.info
                
                if info and len(info) > 5:  # Valid response
                    # Update stock with enriched data
                    update_data = {}
                    
                    if info.get('sector'):
                        update_data['sector'] = info.get('sector')
                    if info.get('industry'):
                        update_data['industry'] = info.get('industry')
                    if info.get('longName'):
                        update_data['company_name'] = info.get('longName')
                    if info.get('website'):
                        update_data['website'] = info.get('website')
                    if info.get('fullTimeEmployees'):
                        update_data['full_time_employees'] = info.get('fullTimeEmployees')
                    if info.get('longBusinessSummary'):
                        update_data['business_summary'] = info.get('longBusinessSummary')
                    if info.get('phone'):
                        update_data['phone'] = info.get('phone')
                    if info.get('address1'):
                        update_data['address'] = info.get('address1')
                    if info.get('city'):
                        update_data['city'] = info.get('city')
                    if info.get('state'):
                        update_data['state'] = info.get('state')
                    if info.get('zip'):
                        update_data['zip_code'] = info.get('zip')
                    
                    if update_data:
                        # Build SET clause
                        set_clauses = ', '.join([f'{k} = :{k}' for k in update_data.keys()])
                        query = text(f'UPDATE "WorldStocks" SET {set_clauses} WHERE id = :id')
                        update_data['id'] = stock_id
                        db.execute(query, update_data)
                        
                        enriched_count += 1
                        
                        # Print progress
                        if enriched_count % 10 == 0 or enriched_count == 1:
                            print(f"  ✓ [{i}/{total_stocks}] {ticker:8} - {company_name[:50]}")
                        
                        # Commit in batches
                        if enriched_count % batch_size == 0:
                            db.commit()
                            print(f"\n  💾 Saved batch of {batch_size} stocks")
                            print(f"  ⏸️  Waiting {delay}s...")
                            time.sleep(delay)
                    else:
                        print(f"  ⚠️  [{i}/{total_stocks}] {ticker:8} - No useful data")
                        failed_count += 1
                        
                else:
                    print(f"  ⚠️  [{i}/{total_stocks}] {ticker:8} - No data returned")
                    failed_count += 1
                    failed_tickers.append(ticker)
                
                # Small delay between requests
                time.sleep(0.3)
                    
            except Exception as e:
                print(f"  ❌ [{i}/{total_stocks}] {ticker:8} - Error: {str(e)[:50]}")
                failed_count += 1
                failed_tickers.append(ticker)
                time.sleep(0.5)
        
        # Final commit
        db.commit()
        
        print(f"\n{'='*80}")
        print("📊 Enrichment Summary")
        print('='*80)
        print(f"  ✅ Successfully enriched: {enriched_count}/{total_stocks}")
        print(f"  ❌ Failed: {failed_count}/{total_stocks}")
        
        if failed_tickers[:20]:
            print(f"\n  Failed tickers: {', '.join(failed_tickers[:20])}")
            if len(failed_tickers) > 20:
                print(f"  ... and {len(failed_tickers) - 20} more")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Import and enrich NYSE stocks')
    parser.add_argument('--csv', type=str, 
                       default='/Users/michaelbabushkin/Downloads/nyse-listed.csv',
                       help='Path to NYSE CSV file')
    parser.add_argument('--skip-import', action='store_true',
                       help='Skip import, only enrich')
    parser.add_argument('--skip-enrich', action='store_true',
                       help='Skip enrichment, only import')
    parser.add_argument('--batch-size', type=int, default=50,
                       help='Batch size for enrichment')
    parser.add_argument('--delay', type=float, default=1.0,
                       help='Delay between batches (seconds)')
    parser.add_argument('--limit', type=int, default=None,
                       help='Limit number of stocks to enrich (for testing)')
    
    args = parser.parse_args()
    
    # Import
    if not args.skip_import:
        inserted = import_nyse_stocks(args.csv)
        if inserted == 0:
            print("\n💡 No new stocks to import")
    
    # Enrich
    if not args.skip_enrich:
        print("\n" + "="*80)
        response = input("❓ Proceed with yfinance enrichment? (y/n): ")
        if response.lower() == 'y':
            enrich_stocks_with_yfinance(
                exchange='NYSE',
                batch_size=args.batch_size,
                delay=args.delay,
                limit=args.limit
            )
        else:
            print("⏭️  Skipping enrichment")
    
    print("\n" + "="*80)
    print("✅ PROCESS COMPLETE!")
    print("="*80 + "\n")
