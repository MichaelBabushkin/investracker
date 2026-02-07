#!/usr/bin/env python3
"""
Fetch and update stock prices for current holdings
"""
import yfinance as yf
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from datetime import datetime
from decimal import Decimal

def main():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Tickers to update
        tickers = ['SNOW', 'F', 'ELF']
        
        print("Fetching stock prices from yfinance...")
        print("="*60)
        
        for ticker in tickers:
            try:
                stock = yf.Ticker(ticker)
                info = stock.info
                
                # Get current price
                current_price = info.get('currentPrice') or info.get('regularMarketPrice')
                previous_close = info.get('previousClose')
                
                if current_price:
                    # Calculate price change
                    price_change = None
                    price_change_pct = None
                    if previous_close:
                        price_change = current_price - previous_close
                        price_change_pct = (price_change / previous_close) * 100
                    
                    # Check if price exists
                    result = db.execute(
                        text("SELECT id FROM \"StockPrices\" WHERE ticker = :ticker AND market = 'world'"),
                        {"ticker": ticker}
                    )
                    existing = result.fetchone()
                    
                    if existing:
                        # Update existing
                        db.execute(
                            text("""
                                UPDATE "StockPrices" 
                                SET current_price = :price,
                                    previous_close = :prev_close,
                                    price_change = :change,
                                    price_change_pct = :change_pct,
                                    updated_at = :updated_at
                                WHERE ticker = :ticker AND market = 'world'
                            """),
                            {
                                "price": Decimal(str(current_price)),
                                "prev_close": Decimal(str(previous_close)) if previous_close else None,
                                "change": Decimal(str(price_change)) if price_change else None,
                                "change_pct": Decimal(str(price_change_pct)) if price_change_pct else None,
                                "updated_at": datetime.now(),
                                "ticker": ticker
                            }
                        )
                        print(f"✅ Updated {ticker}: ${current_price:.2f}")
                    else:
                        # Insert new
                        db.execute(
                            text("""
                                INSERT INTO "StockPrices" 
                                (ticker, market, current_price, previous_close, price_change, price_change_pct, updated_at, created_at)
                                VALUES (:ticker, 'world', :price, :prev_close, :change, :change_pct, :updated_at, :created_at)
                            """),
                            {
                                "ticker": ticker,
                                "price": Decimal(str(current_price)),
                                "prev_close": Decimal(str(previous_close)) if previous_close else None,
                                "change": Decimal(str(price_change)) if price_change else None,
                                "change_pct": Decimal(str(price_change_pct)) if price_change_pct else None,
                                "updated_at": datetime.now(),
                                "created_at": datetime.now()
                            }
                        )
                        print(f"✅ Inserted {ticker}: ${current_price:.2f}")
                        
                else:
                    print(f"⚠️  No price data for {ticker}")
                    
            except Exception as e:
                print(f"❌ Error fetching {ticker}: {e}")
        
        db.commit()
        print("\n" + "="*60)
        print("✅ Prices updated successfully!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
