#!/usr/bin/env python3
"""
Sync holding prices from StockPrices table
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

def main():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        print("Updating holding prices from StockPrices...")
        
        # Update holdings with current prices
        db.execute(text("""
            UPDATE "WorldStockHolding" h
            SET last_price = sp.current_price,
                current_value = h.quantity * sp.current_price
            FROM "StockPrices" sp
            WHERE h.ticker = sp.ticker 
            AND sp.market = 'world'
        """))
        
        db.commit()
        
        # Show updated holdings
        result = db.execute(text("""
            SELECT ticker, quantity, last_price, 
                   ROUND(current_value::numeric, 2) as current_value
            FROM "WorldStockHolding"
            ORDER BY ticker
        """))
        
        print("\nUpdated Holdings:")
        print("="*60)
        for row in result.fetchall():
            ticker, qty, price, value = row
            print(f"{ticker}: {qty} shares @ ${price} = ${value:,.2f}")
        
        print("\n✅ Holdings updated successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    main()
