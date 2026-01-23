"""
Script to import world stocks (S&P 500 + NASDAQ) into WorldStock table
Uses yfinance to fetch company information
"""
import sys
import os
import pandas as pd
from sqlalchemy.orm import Session
from sqlalchemy import select

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.database import SessionLocal, engine
from app.models.world_stock_models import WorldStock


def get_sp500_tickers():
    """Fetch S&P 500 tickers from Wikipedia"""
    print("Fetching S&P 500 companies from Wikipedia...")
    try:
        url = 'https://en.wikipedia.org/wiki/List_of_S%26P_500_companies'
        
        # Add headers to avoid 403 Forbidden
        import urllib.request
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req) as response:
            html_content = response.read()
        
        tables = pd.read_html(html_content)
        df = tables[0]
        
        # Extract ticker and company info
        stocks = []
        for _, row in df.iterrows():
            stocks.append({
                'ticker': row['Symbol'].replace('.', '-'),  # Fix tickers like BRK.B -> BRK-B
                'company_name': row['Security'],
                'sector': row['GICS Sector'],
                'industry': row['GICS Sub-Industry'],
                'exchange': 'US',
                'country': 'US',
                'currency': 'USD'
            })
        
        print(f"✓ Found {len(stocks)} S&P 500 companies")
        return stocks
    except Exception as e:
        print(f"✗ Error fetching S&P 500: {e}")
        return []


def get_nasdaq100_tickers():
    """Fetch NASDAQ-100 tickers from Wikipedia"""
    print("Fetching NASDAQ-100 companies from Wikipedia...")
    try:
        url = 'https://en.wikipedia.org/wiki/NASDAQ-100'
        
        # Add headers to avoid 403 Forbidden
        import urllib.request
        req = urllib.request.Request(url)
        req.add_header('User-Agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36')
        
        with urllib.request.urlopen(req) as response:
            html_content = response.read()
        
        tables = pd.read_html(html_content)
        df = tables[4]  # The main table is typically the 5th table
        
        stocks = []
        for _, row in df.iterrows():
            stocks.append({
                'ticker': row['Ticker'],
                'company_name': row['Company'],
                'sector': row['GICS Sector'] if 'GICS Sector' in row else None,
                'industry': row['GICS Sub-Industry'] if 'GICS Sub-Industry' in row else None,
                'exchange': 'NASDAQ',
                'country': 'US',
                'currency': 'USD'
            })
        
        print(f"✓ Found {len(stocks)} NASDAQ-100 companies")
        return stocks
    except Exception as e:
        print(f"✗ Error fetching NASDAQ-100: {e}")
        return []


def enrich_with_yfinance(stocks_list):
    """Enrich stock data with yfinance information"""
    print("\nEnriching stock data with yfinance...")
    
    try:
        import yfinance as yf
    except ImportError:
        print("✗ yfinance not installed. Installing...")
        os.system("pip install yfinance")
        import yfinance as yf
    
    enriched = []
    total = len(stocks_list)
    
    for idx, stock in enumerate(stocks_list, 1):
        ticker = stock['ticker']
        
        if idx % 50 == 0:
            print(f"  Progress: {idx}/{total} stocks processed...")
        
        try:
            # Fetch stock info
            yf_ticker = yf.Ticker(ticker)
            info = yf_ticker.info
            
            # Update with yfinance data if available
            if info:
                stock['company_name'] = info.get('longName') or stock.get('company_name')
                stock['sector'] = info.get('sector') or stock.get('sector')
                stock['industry'] = info.get('industry') or stock.get('industry')
                stock['country'] = info.get('country') or stock.get('country', 'US')
                stock['currency'] = info.get('currency') or stock.get('currency', 'USD')
            
            enriched.append(stock)
            
        except Exception as e:
            # If yfinance fails, keep the stock with basic info
            print(f"  Warning: Could not fetch data for {ticker}: {e}")
            enriched.append(stock)
    
    print(f"✓ Enriched {len(enriched)} stocks")
    return enriched


def import_stocks_to_db(stocks_list):
    """Import stocks into WorldStock table"""
    print("\nImporting stocks to database...")
    
    db: Session = SessionLocal()
    
    try:
        created = 0
        updated = 0
        skipped = 0
        
        for stock in stocks_list:
            ticker = stock['ticker']
            exchange = stock['exchange']
            
            # Check if stock already exists
            existing = db.query(WorldStock).filter(
                WorldStock.ticker == ticker,
                WorldStock.exchange == exchange
            ).first()
            
            if existing:
                # Update existing stock
                existing.company_name = stock.get('company_name')
                existing.sector = stock.get('sector')
                existing.industry = stock.get('industry')
                existing.country = stock.get('country')
                existing.currency = stock.get('currency')
                existing.is_active = True
                updated += 1
            else:
                # Create new stock
                new_stock = WorldStock(
                    ticker=ticker,
                    exchange=exchange,
                    company_name=stock.get('company_name'),
                    sector=stock.get('sector'),
                    industry=stock.get('industry'),
                    country=stock.get('country', 'US'),
                    currency=stock.get('currency', 'USD'),
                    is_active=True
                )
                db.add(new_stock)
                created += 1
        
        db.commit()
        print(f"\n✓ Database updated successfully!")
        print(f"  - Created: {created} stocks")
        print(f"  - Updated: {updated} stocks")
        print(f"  - Skipped: {skipped} stocks")
        
    except Exception as e:
        db.rollback()
        print(f"\n✗ Error importing to database: {e}")
        raise
    finally:
        db.close()


def main():
    """Main import function"""
    print("=" * 60)
    print("WORLD STOCKS IMPORT - S&P 500 + NASDAQ-100")
    print("=" * 60)
    
    # Fetch stock lists
    sp500_stocks = get_sp500_tickers()
    nasdaq_stocks = get_nasdaq100_tickers()
    
    # Combine and remove duplicates
    all_stocks = sp500_stocks + nasdaq_stocks
    unique_stocks = {stock['ticker']: stock for stock in all_stocks}
    stocks_list = list(unique_stocks.values())
    
    print(f"\nTotal unique stocks to import: {len(stocks_list)}")
    
    # Ask user if they want to enrich with yfinance
    print("\n" + "=" * 60)
    response = input("Enrich with yfinance? (y/n) [y]: ").strip().lower()
    
    if response in ['', 'y', 'yes']:
        stocks_list = enrich_with_yfinance(stocks_list)
    else:
        print("Skipping yfinance enrichment...")
    
    # Import to database
    import_stocks_to_db(stocks_list)
    
    print("\n" + "=" * 60)
    print("IMPORT COMPLETE!")
    print("=" * 60)


if __name__ == "__main__":
    main()
