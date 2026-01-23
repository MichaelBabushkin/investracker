#!/usr/bin/env python3
"""
Enrich WorldStocks table with additional data from yfinance
Fetches: website, employees, business summary, address, phone
"""
import sys
import time
import yfinance as yf
from sqlalchemy.orm import Session
from app.core.database import SessionLocal, engine
from app.models.world_stock_models import WorldStock

def enrich_stocks(batch_size=50, delay=1.0):
    """Enrich stocks with yfinance data"""
    
    print(f"\n{'='*80}")
    print("Enriching WorldStocks with yfinance Data")
    print('='*80)
    
    db = SessionLocal()
    
    try:
        # Get all stocks that need enrichment (where website is null)
        stocks_to_enrich = db.query(WorldStock).filter(
            WorldStock.website.is_(None)
        ).all()
        
        total_stocks = len(stocks_to_enrich)
        
        if total_stocks == 0:
            print("\n✅ All stocks are already enriched!")
            return
        
        print(f"\n📊 Found {total_stocks} stocks to enrich")
        print(f"⏱️  Batch size: {batch_size}, Delay: {delay}s between batches")
        
        # Confirm
        response = input(f"\n❓ Start enrichment? (y/n): ")
        if response.lower() != 'y':
            print("❌ Enrichment cancelled")
            return
        
        print("\n🚀 Starting enrichment...")
        enriched_count = 0
        failed_count = 0
        failed_tickers = []
        
        for i, stock in enumerate(stocks_to_enrich, 1):
            try:
                # Fetch data from yfinance
                ticker = yf.Ticker(stock.ticker)
                info = ticker.info
                
                # Update stock with enriched data
                if info:
                    stock.website = info.get('website')
                    stock.full_time_employees = info.get('fullTimeEmployees')
                    stock.business_summary = info.get('longBusinessSummary')
                    stock.phone = info.get('phone')
                    stock.address = info.get('address1')
                    stock.city = info.get('city')
                    stock.state = info.get('state')
                    stock.zip_code = info.get('zip')
                    
                    # Also update sector/industry if better data available
                    if info.get('sector') and not stock.sector:
                        stock.sector = info.get('sector')
                    if info.get('industry') and not stock.industry:
                        stock.industry = info.get('industry')
                    
                    enriched_count += 1
                    
                    # Print progress
                    if enriched_count % 10 == 0 or enriched_count == 1:
                        print(f"  ✓ [{i}/{total_stocks}] {stock.ticker:6} - {stock.company_name[:40]:40}")
                    
                    # Commit in batches
                    if enriched_count % batch_size == 0:
                        db.commit()
                        print(f"\n  💾 Saved batch of {batch_size} stocks")
                        print(f"  ⏸️  Waiting {delay}s to avoid rate limiting...")
                        time.sleep(delay)
                        
                else:
                    print(f"  ⚠️  [{i}/{total_stocks}] {stock.ticker:6} - No data returned")
                    failed_count += 1
                    failed_tickers.append(stock.ticker)
                    
            except Exception as e:
                print(f"  ❌ [{i}/{total_stocks}] {stock.ticker:6} - Error: {str(e)[:50]}")
                failed_count += 1
                failed_tickers.append(stock.ticker)
                
                # Small delay on error
                time.sleep(0.5)
        
        # Final commit
        db.commit()
        
        print(f"\n{'='*80}")
        print("📊 Enrichment Summary")
        print('='*80)
        print(f"  ✅ Successfully enriched: {enriched_count}/{total_stocks}")
        print(f"  ❌ Failed: {failed_count}/{total_stocks}")
        
        if failed_tickers:
            print(f"\n  Failed tickers: {', '.join(failed_tickers[:20])}")
            if len(failed_tickers) > 20:
                print(f"  ... and {len(failed_tickers) - 20} more")
        
        # Show sample enriched data
        print(f"\n{'='*80}")
        print("📝 Sample Enriched Data")
        print('='*80)
        
        enriched_sample = db.query(WorldStock).filter(
            WorldStock.website.isnot(None)
        ).limit(3).all()
        
        for stock in enriched_sample:
            print(f"\n{stock.ticker} - {stock.company_name}")
            print(f"  Sector: {stock.sector}")
            print(f"  Industry: {stock.industry}")
            print(f"  Website: {stock.website}")
            print(f"  Employees: {stock.full_time_employees:,}" if stock.full_time_employees else "  Employees: N/A")
            print(f"  Location: {stock.city}, {stock.state} {stock.zip_code}")
            if stock.business_summary:
                print(f"  Summary: {stock.business_summary[:120]}...")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    # Allow command-line arguments for batch size and delay
    batch_size = int(sys.argv[1]) if len(sys.argv) > 1 else 50
    delay = float(sys.argv[2]) if len(sys.argv) > 2 else 1.0
    
    enrich_stocks(batch_size=batch_size, delay=delay)
