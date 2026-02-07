#!/usr/bin/env python3
"""
Recalculate returns for all holdings
"""
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.services.returns_calculator import ReturnsCalculator

def main():
    engine = create_engine(settings.DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    db = SessionLocal()
    
    try:
        # Get user ID from holdings
        result = db.execute(text('SELECT DISTINCT user_id FROM "WorldStockHolding" LIMIT 1'))
        user_row = result.fetchone()
        
        if user_row:
            user_id = user_row[0]
            print(f'Recalculating returns for user: {user_id}')
            print("="*60)
            
            calculator = ReturnsCalculator(db)
            results = calculator.update_all_user_returns(user_id)
            
            print(f"\n✅ Updated: {results['updated']} holdings")
            print(f"❌ Failed: {results['failed']} holdings")
            if results['errors']:
                print(f"Errors: {', '.join(results['errors'])}")
            
            # Show the calculated values
            print("\n" + "="*60)
            print("HOLDINGS WITH RETURNS:")
            print("="*60)
            
            result = db.execute(text("""
                SELECT ticker, 
                       ROUND(purchase_cost::numeric, 2) as cost,
                       ROUND(current_value::numeric, 2) as value,
                       ROUND(unrealized_gain::numeric, 2) as gain,
                       ROUND(unrealized_gain_pct::numeric, 2) as gain_pct,
                       ROUND(twr::numeric, 2) as twr,
                       ROUND(mwr::numeric, 2) as mwr
                FROM "WorldStockHolding"
                WHERE user_id = :user_id
                ORDER BY ticker
            """), {"user_id": user_id})
            
            for row in result.fetchall():
                ticker, cost, value, gain, gain_pct, twr, mwr = row
                print(f"\n{ticker}:")
                print(f"  Cost: ${cost:,.2f}")
                print(f"  Value: ${value:,.2f}")
                if gain is not None:
                    print(f"  Unrealized Gain: ${gain:,.2f} ({gain_pct}%)")
                else:
                    print(f"  Unrealized Gain: N/A")
                if twr is not None:
                    print(f"  TWR: {twr}%")
                else:
                    print(f"  TWR: N/A")
                if mwr is not None:
                    print(f"  MWR: {mwr}%")
                else:
                    print(f"  MWR: N/A")
                
        else:
            print('No holdings found')
    finally:
        db.close()

if __name__ == "__main__":
    main()
