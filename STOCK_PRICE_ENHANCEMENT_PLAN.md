# Stock Price Enhancement Plan

**Date:** February 7, 2026  
**Status:** Planning  
**Goal:** Implement comprehensive stock price tracking with Israeli market support, returns calculation (TWR & MWR), and Redis caching

---

## Overview

This plan outlines the implementation of a complete stock price infrastructure that supports:
- Multi-market price tracking (World & Israeli stocks)
- Automated portfolio returns calculation (TWR and MWR)
- Redis caching layer for performance optimization
- Batch price update system for 3,133 total stocks

---

## Phase 1: Israeli Market Integration

### Task 1: Add yfinance_ticker Column to IsraeliStocks

**Problem:** Israeli stocks on yfinance use `.TA` suffix (Tel Aviv Stock Exchange), e.g., "TEVA" → "TEVA.TA"

**Implementation:**

1. **Create Alembic Migration**
   ```python
   # backend/alembic/versions/2026_02_07_1900-add_yfinance_ticker_column.py
   
   """Add yfinance_ticker column to IsraeliStocks
   
   Revision ID: xxxxxxxxxxxx
   Revises: ef02295b00dd
   Create Date: 2026-02-07 19:00:00
   """
   
   from alembic import op
   import sqlalchemy as sa
   
   revision = 'xxxxxxxxxxxx'
   down_revision = 'ef02295b00dd'
   branch_labels = None
   depends_on = None
   
   def upgrade():
       # Add column as nullable first
       op.add_column('IsraeliStocks', 
           sa.Column('yfinance_ticker', sa.String(20), nullable=True))
       
       # Populate with ticker + .TA suffix
       op.execute("""
           UPDATE "IsraeliStocks" 
           SET yfinance_ticker = ticker || '.TA'
       """)
       
       # Make it NOT NULL after population
       op.alter_column('IsraeliStocks', 'yfinance_ticker', nullable=False)
       
       # Add index for performance
       op.create_index('ix_israelistocks_yfinance_ticker', 
                       'IsraeliStocks', ['yfinance_ticker'])
   
   def downgrade():
       op.drop_index('ix_israelistocks_yfinance_ticker')
       op.drop_column('IsraeliStocks', 'yfinance_ticker')
   ```

2. **Update IsraeliStock Model**
   ```python
   # backend/app/models/stock_models.py
   
   class IsraeliStock(Base):
       __tablename__ = "IsraeliStocks"
       
       id = Column(Integer, primary_key=True, index=True)
       ticker = Column(String(20), unique=True, nullable=False, index=True)
       yfinance_ticker = Column(String(20), nullable=False, index=True)  # NEW
       name = Column(String(200))
       sector = Column(String(100))
       industry = Column(String(100))
       created_at = Column(DateTime, default=datetime.utcnow)
       updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
   ```

3. **Run Migration**
   ```bash
   # Local
   cd backend && alembic upgrade head
   
   # Railway (auto-runs on deploy)
   git push origin main
   ```

**Files to Modify:**
- `backend/alembic/versions/2026_02_07_1900-add_yfinance_ticker_column.py` (NEW)
- `backend/app/models/stock_models.py`

**Validation:**
```sql
SELECT ticker, yfinance_ticker FROM "IsraeliStocks" LIMIT 5;
-- Expected: TEVA | TEVA.TA, ELCO | ELCO.TA, etc.
```

---

### Task 2: Create Batch Stock Price Update Script

**Purpose:** Update all stocks efficiently with rate limiting and error handling

**Implementation:**

```python
# backend/update_all_stock_prices.py

"""
Batch update stock prices for all world and Israeli stocks
Includes rate limiting, error handling, and progress tracking
"""

import time
import logging
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.core.database import SessionLocal
from app.services.stock_price_service import StockPriceService

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

def update_stocks_in_batches(
    db: Session,
    market: str,
    batch_size: int = 100,
    delay_seconds: float = 1.0
) -> Tuple[int, int, int]:
    """
    Update stock prices in batches with rate limiting
    
    Args:
        market: 'world' or 'israeli'
        batch_size: Number of stocks per batch
        delay_seconds: Delay between batches to avoid rate limits
    
    Returns:
        (total_updated, total_failed, batches_processed)
    """
    service = StockPriceService(db)
    
    # Get all stale tickers (older than 24 hours)
    all_tickers = service.get_stale_catalog_tickers(
        hours=24, 
        limit=10000,  # Get all
        market=market
    )
    
    total_updated = 0
    total_failed = 0
    batches_processed = 0
    
    logger.info(f"Found {len(all_tickers)} {market} stocks to update")
    
    # Process in batches
    for i in range(0, len(all_tickers), batch_size):
        batch = all_tickers[i:i + batch_size]
        batch_num = (i // batch_size) + 1
        total_batches = (len(all_tickers) + batch_size - 1) // batch_size
        
        logger.info(f"Processing batch {batch_num}/{total_batches} ({len(batch)} stocks)...")
        
        try:
            updated, failed = service.update_world_stock_prices(batch, market=market)
            total_updated += updated
            total_failed += failed
            batches_processed += 1
            
            logger.info(f"Batch {batch_num}: Updated {updated}, Failed {failed}")
            logger.info(f"Progress: {total_updated + total_failed}/{len(all_tickers)} ({(total_updated + total_failed)/len(all_tickers)*100:.1f}%)")
            
            # Commit after each batch
            db.commit()
            
            # Rate limiting delay
            if i + batch_size < len(all_tickers):
                logger.info(f"Sleeping {delay_seconds}s before next batch...")
                time.sleep(delay_seconds)
                
        except Exception as e:
            logger.error(f"Error processing batch {batch_num}: {e}")
            db.rollback()
            total_failed += len(batch)
            continue
    
    return total_updated, total_failed, batches_processed


def main():
    """Update all world and Israeli stocks"""
    db = SessionLocal()
    
    try:
        # Update world stocks (2,948 stocks)
        logger.info("=" * 70)
        logger.info("UPDATING WORLD STOCKS")
        logger.info("=" * 70)
        world_start = time.time()
        world_updated, world_failed, world_batches = update_stocks_in_batches(
            db, market='world', batch_size=100, delay_seconds=1.0
        )
        world_duration = time.time() - world_start
        
        logger.info(f"\n{'=' * 70}")
        logger.info(f"World Stocks Summary:")
        logger.info(f"  Updated: {world_updated}")
        logger.info(f"  Failed: {world_failed}")
        logger.info(f"  Batches: {world_batches}")
        logger.info(f"  Duration: {world_duration/60:.1f} minutes")
        logger.info(f"  Rate: {world_updated/world_duration:.1f} stocks/sec")
        
        # Small delay between markets
        time.sleep(5)
        
        # Update Israeli stocks (185 stocks)
        logger.info("\n" + "=" * 70)
        logger.info("UPDATING ISRAELI STOCKS")
        logger.info("=" * 70)
        israeli_start = time.time()
        israeli_updated, israeli_failed, israeli_batches = update_stocks_in_batches(
            db, market='israeli', batch_size=50, delay_seconds=1.0
        )
        israeli_duration = time.time() - israeli_start
        
        logger.info(f"\n{'=' * 70}")
        logger.info(f"Israeli Stocks Summary:")
        logger.info(f"  Updated: {israeli_updated}")
        logger.info(f"  Failed: {israeli_failed}")
        logger.info(f"  Batches: {israeli_batches}")
        logger.info(f"  Duration: {israeli_duration/60:.1f} minutes")
        logger.info(f"  Rate: {israeli_updated/israeli_duration:.1f} stocks/sec")
        
        # Overall summary
        total_duration = world_duration + israeli_duration
        logger.info("\n" + "=" * 70)
        logger.info("OVERALL SUMMARY")
        logger.info("=" * 70)
        logger.info(f"Total Updated: {world_updated + israeli_updated}")
        logger.info(f"Total Failed: {world_failed + israeli_failed}")
        logger.info(f"Total Batches: {world_batches + israeli_batches}")
        logger.info(f"Total Duration: {total_duration/60:.1f} minutes")
        logger.info(f"Overall Rate: {(world_updated + israeli_updated)/total_duration:.1f} stocks/sec")
        
    except Exception as e:
        logger.error(f"Fatal error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
```

**Usage:**
```bash
cd backend
python update_all_stock_prices.py

# With Railway
railway run python update_all_stock_prices.py
```

**Files to Create:**
- `backend/update_all_stock_prices.py` (NEW)

**Expected Output:**
```
2026-02-07 19:00:00 - INFO - Found 2948 world stocks to update
2026-02-07 19:00:01 - INFO - Processing batch 1/30 (100 stocks)...
2026-02-07 19:00:15 - INFO - Batch 1: Updated 95, Failed 5
2026-02-07 19:00:15 - INFO - Progress: 100/2948 (3.4%)
...
```

---

### Task 3: Update Service for Israeli Market Support

**Implementation:**

```python
# backend/app/services/stock_price_service.py

def _get_israeli_ticker_map(self, display_tickers: List[str]) -> dict:
    """Get mapping of display ticker -> yfinance ticker for Israeli stocks"""
    result = self.db.execute(
        text("""
            SELECT ticker, yfinance_ticker 
            FROM "IsraeliStocks" 
            WHERE ticker = ANY(:tickers)
        """),
        {"tickers": display_tickers}
    )
    return {row[0]: row[1] for row in result.fetchall()}

def update_world_stock_prices(self, tickers: Optional[List[str]] = None, market: str = 'world') -> Tuple[int, int]:
    """
    Update prices for stocks in the StockPrices table.
    Args:
        tickers: List of tickers to update
        market: 'world' or 'israeli'
    Returns (updated_count, failed_count)
    """
    if tickers is None:
        tickers = self.get_active_tickers()
    
    if not tickers:
        logger.info("No tickers to update")
        return 0, 0
    
    logger.info(f"Updating prices for {len(tickers)} {market} stocks")
    
    # NEW: Handle Israeli stocks with yfinance ticker mapping
    if market == 'israeli':
        ticker_map = self._get_israeli_ticker_map(tickers)  # display -> yfinance
        yfinance_tickers = list(ticker_map.values())
        reverse_map = {v: k for k, v in ticker_map.items()}  # yfinance -> display
    else:
        ticker_map = {t: t for t in tickers}
        yfinance_tickers = tickers
        reverse_map = ticker_map
    
    updated_count = 0
    failed_count = 0
    
    for yf_ticker in yfinance_tickers:
        try:
            stock = yf.Ticker(yf_ticker)
            info = stock.info
            
            if not info or info.get('regularMarketPrice') is None:
                logger.warning(f"No data for {yf_ticker}")
                failed_count += 1
                continue
            
            data = {
                'current_price': info.get('regularMarketPrice') or info.get('currentPrice'),
                'previous_close': info.get('previousClose'),
                'price_change': info.get('regularMarketChange'),
                'price_change_pct': info.get('regularMarketChangePercent'),
                'day_high': info.get('dayHigh'),
                'day_low': info.get('dayLow'),
                'volume': info.get('volume'),
                'market_cap': info.get('marketCap')
            }
            
            now = datetime.utcnow()
            
            # Use display ticker for storage
            display_ticker = reverse_map[yf_ticker]
            
            self.db.execute(
                text("""
                    INSERT INTO "StockPrices" 
                    (ticker, market, current_price, previous_close, price_change, price_change_pct,
                     day_high, day_low, volume, market_cap, updated_at, created_at)
                    VALUES (:ticker, :market, :current_price, :previous_close, :price_change, :price_change_pct,
                            :day_high, :day_low, :volume, :market_cap, :updated_at, :created_at)
                    ON CONFLICT (ticker, market) DO UPDATE SET
                        current_price = EXCLUDED.current_price,
                        previous_close = EXCLUDED.previous_close,
                        price_change = EXCLUDED.price_change,
                        price_change_pct = EXCLUDED.price_change_pct,
                        day_high = EXCLUDED.day_high,
                        day_low = EXCLUDED.day_low,
                        volume = EXCLUDED.volume,
                        market_cap = EXCLUDED.market_cap,
                        updated_at = EXCLUDED.updated_at
                """),
                {
                    "ticker": display_ticker,  # Store with display ticker
                    "market": market,
                    "current_price": data.get('current_price'),
                    "previous_close": data.get('previous_close'),
                    "price_change": data.get('price_change'),
                    "price_change_pct": data.get('price_change_pct'),
                    "day_high": data.get('day_high'),
                    "day_low": data.get('day_low'),
                    "volume": data.get('volume'),
                    "market_cap": data.get('market_cap'),
                    "updated_at": now,
                    "created_at": now
                }
            )
            
            updated_count += 1
            
        except Exception as e:
            logger.error(f"Error updating {yf_ticker}: {e}")
            failed_count += 1
    
    logger.info(f"Update complete: {updated_count} updated, {failed_count} failed")
    return updated_count, failed_count
```

**Files to Modify:**
- `backend/app/services/stock_price_service.py`

---

## Phase 2: Returns Calculation (TWR & MWR)

### Understanding Returns Metrics

**TWR (Time-Weighted Return):**
- Measures portfolio performance independent of cash flows
- Good for comparing to benchmarks (S&P 500, etc.)
- Formula: Compound growth rate across sub-periods
- Use case: "How well did my investments perform?"

**MWR (Money-Weighted Return / IRR):**
- Measures actual investor return considering timing of cash flows
- Accounts for when you bought/sold and how much
- Formula: Internal Rate of Return (IRR)
- Use case: "How much money did I actually make?"

**Example:**
```
Portfolio starts at $10,000
Day 1: Market drops 50%, value = $5,000
Day 2: Investor adds $10,000, total = $15,000
Day 3: Market doubles, value = $30,000

TWR: -50% → +100% = 0% return (geometric mean)
MWR: Invested $20k, ended with $30k = +50% return (accounts for timing)
```

---

### Task 4: Add Returns Fields to Holdings Models

**Implementation:**

1. **Create Alembic Migration**
   ```python
   # backend/alembic/versions/2026_02_08_1000-add_returns_to_holdings.py
   
   """Add return fields to holdings tables
   
   Revision ID: yyyyyyyyyyyy
   Revises: xxxxxxxxxxxx
   Create Date: 2026-02-08 10:00:00
   """
   
   from alembic import op
   import sqlalchemy as sa
   
   revision = 'yyyyyyyyyyyy'
   down_revision = 'xxxxxxxxxxxx'
   branch_labels = None
   depends_on = None
   
   def upgrade():
       # WorldStockHolding
       op.add_column('WorldStockHolding',
           sa.Column('unrealized_gain', sa.DECIMAL(18, 4), nullable=True))
       op.add_column('WorldStockHolding',
           sa.Column('unrealized_gain_pct', sa.DECIMAL(10, 4), nullable=True))
       op.add_column('WorldStockHolding',
           sa.Column('twr', sa.DECIMAL(10, 4), nullable=True))
       op.add_column('WorldStockHolding',
           sa.Column('mwr', sa.DECIMAL(10, 4), nullable=True))
       
       # IsraeliStockHolding
       op.add_column('IsraeliStockHolding',
           sa.Column('unrealized_gain', sa.DECIMAL(18, 4), nullable=True))
       op.add_column('IsraeliStockHolding',
           sa.Column('unrealized_gain_pct', sa.DECIMAL(10, 4), nullable=True))
       op.add_column('IsraeliStockHolding',
           sa.Column('twr', sa.DECIMAL(10, 4), nullable=True))
       op.add_column('IsraeliStockHolding',
           sa.Column('mwr', sa.DECIMAL(10, 4), nullable=True))
   
   def downgrade():
       # WorldStockHolding
       op.drop_column('WorldStockHolding', 'mwr')
       op.drop_column('WorldStockHolding', 'twr')
       op.drop_column('WorldStockHolding', 'unrealized_gain_pct')
       op.drop_column('WorldStockHolding', 'unrealized_gain')
       
       # IsraeliStockHolding
       op.drop_column('IsraeliStockHolding', 'mwr')
       op.drop_column('IsraeliStockHolding', 'twr')
       op.drop_column('IsraeliStockHolding', 'unrealized_gain_pct')
       op.drop_column('IsraeliStockHolding', 'unrealized_gain')
   ```

2. **Update Models**
   ```python
   # backend/app/models/holding_models.py
   
   class WorldStockHolding(Base):
       __tablename__ = "WorldStockHolding"
       
       id = Column(Integer, primary_key=True, index=True)
       user_id = Column(String, ForeignKey("users.id"), nullable=False, index=True)
       ticker = Column(String(20), ForeignKey("WorldStocks.ticker"), nullable=False)
       quantity = Column(DECIMAL(18, 4), nullable=False)
       cost_basis = Column(DECIMAL(18, 4))  # Total amount paid
       average_price = Column(DECIMAL(18, 4))  # cost_basis / quantity
       current_value = Column(DECIMAL(18, 4))  # quantity * current_price
       last_price = Column(DECIMAL(18, 4))
       
       # NEW: Return metrics
       unrealized_gain = Column(DECIMAL(18, 4))  # current_value - cost_basis
       unrealized_gain_pct = Column(DECIMAL(10, 4))  # (unrealized_gain / cost_basis) * 100
       twr = Column(DECIMAL(10, 4))  # Time-Weighted Return
       mwr = Column(DECIMAL(10, 4))  # Money-Weighted Return (IRR)
       
       created_at = Column(DateTime, default=datetime.utcnow)
       updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
   
   # Same for IsraeliStockHolding
   ```

3. **Create Returns Calculation Service**
   ```python
   # backend/app/services/returns_calculator.py
   
   """
   Calculate portfolio returns using TWR and MWR methods
   """
   
   from decimal import Decimal
   from typing import List, Dict, Optional
   from datetime import datetime
   import numpy as np
   from scipy.optimize import newton
   from sqlalchemy.orm import Session
   from sqlalchemy import text
   import logging
   
   logger = logging.getLogger(__name__)
   
   class ReturnsCalculator:
       def __init__(self, db: Session):
           self.db = db
       
       def calculate_unrealized_gains(
           self,
           cost_basis: Decimal,
           current_value: Decimal
       ) -> tuple[Decimal, Decimal]:
           """
           Calculate simple unrealized gains
           Returns: (gain_amount, gain_percentage)
           """
           gain = current_value - cost_basis
           gain_pct = (gain / cost_basis * 100) if cost_basis > 0 else Decimal(0)
           return gain, gain_pct
       
       def calculate_twr(
           self,
           user_id: str,
           ticker: str,
           market: str = 'world'
       ) -> Optional[Decimal]:
           """
           Calculate Time-Weighted Return for a holding
           
           TWR = [(1 + R1) × (1 + R2) × ... × (1 + Rn)] - 1
           
           where R = return for each sub-period between cash flows
           """
           table = 'WorldStockTransaction' if market == 'world' else 'IsraeliStockTransaction'
           
           # Get all transactions ordered by time
           result = self.db.execute(
               text(f"""
                   SELECT transaction_type, quantity, price, transaction_time
                   FROM "{table}"
                   WHERE user_id = :user_id 
                   AND ticker = :ticker
                   AND status = 'approved'
                   ORDER BY transaction_time
               """),
               {"user_id": user_id, "ticker": ticker}
           )
           
           transactions = result.fetchall()
           
           if not transactions:
               return None
           
           # Get current price
           price_result = self.db.execute(
               text("""
                   SELECT current_price 
                   FROM "StockPrices"
                   WHERE ticker = :ticker AND market = :market
               """),
               {"ticker": ticker, "market": market}
           )
           
           current_price_row = price_result.fetchone()
           if not current_price_row or not current_price_row[0]:
               return None
           
           current_price = float(current_price_row[0])
           
           # Calculate sub-period returns
           portfolio_value = 0
           shares = 0
           period_returns = []
           
           for i, txn in enumerate(transactions):
               txn_type, quantity, price, txn_time = txn
               quantity = float(quantity)
               price = float(price)
               
               if i > 0:
                   # Calculate return for period before this transaction
                   if portfolio_value > 0:
                       ending_value = shares * price
                       period_return = (ending_value - portfolio_value) / portfolio_value
                       period_returns.append(period_return)
               
               # Apply transaction
               if txn_type == 'BUY':
                   shares += quantity
                   portfolio_value = shares * price
               elif txn_type == 'SELL':
                   shares -= quantity
                   portfolio_value = shares * price
           
           # Final period return (to current price)
           if portfolio_value > 0 and shares > 0:
               ending_value = shares * current_price
               period_return = (ending_value - portfolio_value) / portfolio_value
               period_returns.append(period_return)
           
           if not period_returns:
               return None
           
           # Calculate TWR: compound all period returns
           twr = 1.0
           for r in period_returns:
               twr *= (1 + r)
           
           twr = (twr - 1) * 100  # Convert to percentage
           
           return Decimal(str(round(twr, 4)))
       
       def calculate_mwr(
           self,
           user_id: str,
           ticker: str,
           market: str = 'world'
       ) -> Optional[Decimal]:
           """
           Calculate Money-Weighted Return (IRR) for a holding
           
           Solves: NPV = Σ(CF_i / (1 + MWR)^t_i) = 0
           
           where CF = cash flow (negative for buys, positive for sells + current value)
           """
           table = 'WorldStockTransaction' if market == 'world' else 'IsraeliStockTransaction'
           
           # Get all transactions
           result = self.db.execute(
               text(f"""
                   SELECT transaction_type, quantity, price, total_value, transaction_time
                   FROM "{table}"
                   WHERE user_id = :user_id 
                   AND ticker = :ticker
                   AND status = 'approved'
                   ORDER BY transaction_time
               """),
               {"user_id": user_id, "ticker": ticker}
           )
           
           transactions = result.fetchall()
           
           if not transactions:
               return None
           
           # Get current holding
           holding_table = 'WorldStockHolding' if market == 'world' else 'IsraeliStockHolding'
           holding_result = self.db.execute(
               text(f"""
                   SELECT quantity, current_value
                   FROM "{holding_table}"
                   WHERE user_id = :user_id AND ticker = :ticker
               """),
               {"user_id": user_id, "ticker": ticker}
           )
           
           holding = holding_result.fetchone()
           if not holding:
               return None
           
           current_shares, current_value = holding
           current_shares = float(current_shares)
           current_value = float(current_value) if current_value else 0
           
           # Build cash flows list: (days_from_start, cash_flow)
           first_txn_time = transactions[0][4]
           cash_flows = []
           
           for txn in transactions:
               txn_type, quantity, price, total_value, txn_time = txn
               
               # Days from first transaction
               days = (txn_time - first_txn_time).days
               
               # Cash flow (negative for buys, positive for sells)
               if txn_type == 'BUY':
                   cf = -float(total_value)
               elif txn_type == 'SELL':
                   cf = float(total_value)
               else:
                   continue
               
               cash_flows.append((days, cf))
           
           # Add current value as final positive cash flow
           days_now = (datetime.utcnow() - first_txn_time).days
           cash_flows.append((days_now, current_value))
           
           # Calculate IRR using Newton's method
           def npv(rate):
               """Calculate NPV at given annual rate"""
               return sum(cf / (1 + rate) ** (days / 365.0) for days, cf in cash_flows)
           
           def npv_derivative(rate):
               """Derivative of NPV"""
               return sum(-cf * (days / 365.0) / (1 + rate) ** (days / 365.0 + 1) 
                         for days, cf in cash_flows)
           
           try:
               # Try to find IRR (starting guess: 10% return)
               irr = newton(npv, 0.1, fprime=npv_derivative, maxiter=100)
               mwr = irr * 100  # Convert to percentage
               
               # Sanity check: IRR should be reasonable (-100% to +1000%)
               if -100 <= mwr <= 1000:
                   return Decimal(str(round(mwr, 4)))
               else:
                   logger.warning(f"Unreasonable MWR calculated: {mwr}%")
                   return None
                   
           except Exception as e:
               logger.error(f"Error calculating MWR for {ticker}: {e}")
               return None
       
       def update_holding_returns(
           self,
           user_id: str,
           ticker: str,
           market: str = 'world'
       ) -> bool:
           """Update all return metrics for a holding"""
           holding_table = 'WorldStockHolding' if market == 'world' else 'IsraeliStockHolding'
           
           # Get current holding data
           result = self.db.execute(
               text(f"""
                   SELECT cost_basis, current_value
                   FROM "{holding_table}"
                   WHERE user_id = :user_id AND ticker = :ticker
               """),
               {"user_id": user_id, "ticker": ticker}
           )
           
           holding = result.fetchone()
           if not holding:
               return False
           
           cost_basis = Decimal(str(holding[0])) if holding[0] else Decimal(0)
           current_value = Decimal(str(holding[1])) if holding[1] else Decimal(0)
           
           # Calculate metrics
           gain, gain_pct = self.calculate_unrealized_gains(cost_basis, current_value)
           twr = self.calculate_twr(user_id, ticker, market)
           mwr = self.calculate_mwr(user_id, ticker, market)
           
           # Update database
           self.db.execute(
               text(f"""
                   UPDATE "{holding_table}"
                   SET unrealized_gain = :gain,
                       unrealized_gain_pct = :gain_pct,
                       twr = :twr,
                       mwr = :mwr,
                       updated_at = :now
                   WHERE user_id = :user_id AND ticker = :ticker
               """),
               {
                   "gain": gain,
                   "gain_pct": gain_pct,
                   "twr": twr,
                   "mwr": mwr,
                   "now": datetime.utcnow(),
                   "user_id": user_id,
                   "ticker": ticker
               }
           )
           
           return True
       
       def update_all_user_returns(self, user_id: str) -> Dict[str, int]:
           """Update returns for all holdings of a user"""
           # Get all world holdings
           world_result = self.db.execute(
               text("""
                   SELECT ticker FROM "WorldStockHolding"
                   WHERE user_id = :user_id
               """),
               {"user_id": user_id}
           )
           world_tickers = [row[0] for row in world_result.fetchall()]
           
           # Get all Israeli holdings
           israeli_result = self.db.execute(
               text("""
                   SELECT ticker FROM "IsraeliStockHolding"
                   WHERE user_id = :user_id
               """),
               {"user_id": user_id}
           )
           israeli_tickers = [row[0] for row in israeli_result.fetchall()]
           
           world_updated = 0
           israeli_updated = 0
           
           for ticker in world_tickers:
               if self.update_holding_returns(user_id, ticker, 'world'):
                   world_updated += 1
           
           for ticker in israeli_tickers:
               if self.update_holding_returns(user_id, ticker, 'israeli'):
                   israeli_updated += 1
           
           self.db.commit()
           
           return {
               "world": world_updated,
               "israeli": israeli_updated,
               "total": world_updated + israeli_updated
           }
   ```

**Files to Create:**
- `backend/alembic/versions/2026_02_08_1000-add_returns_to_holdings.py` (NEW)
- `backend/app/services/returns_calculator.py` (NEW)

**Files to Modify:**
- `backend/app/models/holding_models.py`
- `backend/requirements.txt` (add `scipy` for IRR calculation)

**Required Package:**
```txt
# backend/requirements.txt
scipy==1.11.4
```

---

### Task 5: Update Holdings API with Returns

**Implementation:**

1. **Update Response Schema**
   ```python
   # backend/app/schemas/world_stocks.py
   
   class WorldStockHoldingResponse(BaseModel):
       id: int
       ticker: str
       quantity: Decimal
       cost_basis: Decimal
       average_price: Decimal
       current_value: Decimal
       last_price: Decimal
       
       # NEW: Return metrics
       unrealized_gain: Optional[Decimal] = None
       unrealized_gain_pct: Optional[Decimal] = None
       twr: Optional[Decimal] = None  # Time-Weighted Return
       mwr: Optional[Decimal] = None  # Money-Weighted Return
       
       stock_name: Optional[str] = None
       updated_at: datetime
       
       class Config:
           from_attributes = True
   
   class PortfolioSummaryResponse(BaseModel):
       total_value: Decimal
       total_cost: Decimal
       total_gain: Decimal              # NEW: total unrealized gain
       total_gain_pct: Decimal          # NEW: total return percentage
       portfolio_twr: Optional[Decimal] = None  # NEW: portfolio-level TWR
       portfolio_mwr: Optional[Decimal] = None  # NEW: portfolio-level MWR
       holdings: List[WorldStockHoldingResponse]
   ```

2. **Update Endpoint**
   ```python
   # backend/app/api/v1/endpoints/world_stocks.py
   
   from app.services.returns_calculator import ReturnsCalculator
   
   @router.get("/holdings", response_model=PortfolioSummaryResponse)
   def get_holdings(
       refresh_returns: bool = False,
       user_id: str = Depends(get_current_user),
       db: Session = Depends(get_db)
   ):
       """
       Get user's holdings with return metrics
       
       Args:
           refresh_returns: If True, recalculate TWR/MWR before returning
       """
       
       # Optionally refresh returns
       if refresh_returns:
           calculator = ReturnsCalculator(db)
           calculator.update_all_user_returns(user_id)
       
       # Get holdings
       holdings = db.query(WorldStockHolding)\
           .filter(WorldStockHolding.user_id == user_id)\
           .all()
       
       # Calculate portfolio totals
       total_value = sum(h.current_value for h in holdings if h.current_value)
       total_cost = sum(h.cost_basis for h in holdings if h.cost_basis)
       total_gain = total_value - total_cost
       total_gain_pct = (total_gain / total_cost * 100) if total_cost > 0 else Decimal(0)
       
       # Calculate portfolio-level returns (weighted by cost basis)
       portfolio_twr = None
       portfolio_mwr = None
       
       if holdings:
           # Weighted TWR
           twr_numerator = Decimal(0)
           twr_denominator = Decimal(0)
           for h in holdings:
               if h.twr and h.cost_basis:
                   twr_numerator += h.twr * h.cost_basis
                   twr_denominator += h.cost_basis
           portfolio_twr = twr_numerator / twr_denominator if twr_denominator > 0 else None
           
           # Weighted MWR
           mwr_numerator = Decimal(0)
           mwr_denominator = Decimal(0)
           for h in holdings:
               if h.mwr and h.cost_basis:
                   mwr_numerator += h.mwr * h.cost_basis
                   mwr_denominator += h.cost_basis
           portfolio_mwr = mwr_numerator / mwr_denominator if mwr_denominator > 0 else None
       
       return {
           "total_value": total_value,
           "total_cost": total_cost,
           "total_gain": total_gain,
           "total_gain_pct": total_gain_pct,
           "portfolio_twr": portfolio_twr,
           "portfolio_mwr": portfolio_mwr,
           "holdings": holdings
       }
   
   @router.post("/holdings/refresh-returns")
   def refresh_returns(
       user_id: str = Depends(get_current_user),
       db: Session = Depends(get_db)
   ):
       """Manually trigger returns calculation"""
       calculator = ReturnsCalculator(db)
       results = calculator.update_all_user_returns(user_id)
       return {
           "message": "Returns updated successfully",
           "updated": results
       }
   ```

3. **Update Frontend Types**
   ```typescript
   // frontend/src/types/world-stocks.ts
   
   export interface WorldStockHolding {
     id: number;
     ticker: string;
     quantity: string;
     cost_basis: string;
     average_price: string;
     current_value: string;
     last_price: string;
     
     // NEW: Return metrics
     unrealized_gain?: string;
     unrealized_gain_pct?: string;
     twr?: string;  // Time-Weighted Return
     mwr?: string;  // Money-Weighted Return
     
     stock_name?: string;
     updated_at: string;
   }
   
   export interface PortfolioSummary {
     total_value: string;
     total_cost: string;
     total_gain: string;          // NEW
     total_gain_pct: string;      // NEW
     portfolio_twr?: string;      // NEW
     portfolio_mwr?: string;      // NEW
     holdings: WorldStockHolding[];
   }
   ```

**Files to Modify:**
- `backend/app/schemas/world_stocks.py`
- `backend/app/api/v1/endpoints/world_stocks.py`
- `frontend/src/types/world-stocks.ts`

---

## Phase 3: Redis Caching Layer

### Task 6: Setup Redis Infrastructure

**Implementation:**

1. **Update Requirements**
   ```txt
   # backend/requirements.txt
   
   redis==5.0.1
   hiredis==2.3.2  # C parser for performance
   ```

2. **Add Redis Config**
   ```python
   # backend/app/core/config.py
   
   class Settings(BaseSettings):
       # ... existing settings ...
       
       # Redis Configuration
       REDIS_URL: str = "redis://localhost:6379/0"
       REDIS_CACHE_TTL_MARKET_HOURS: int = 300      # 5 minutes
       REDIS_CACHE_TTL_OFF_HOURS: int = 3600        # 1 hour
       REDIS_MAX_CONNECTIONS: int = 10
       REDIS_SOCKET_TIMEOUT: int = 5
       REDIS_SOCKET_CONNECT_TIMEOUT: int = 5
       
       class Config:
           env_file = ".env"
   ```

3. **Create Redis Client**
   ```python
   # backend/app/core/redis.py
   
   import redis
   from redis.connection import ConnectionPool
   from typing import Optional
   from app.core.config import settings
   import logging
   
   logger = logging.getLogger(__name__)
   
   # Global connection pool
   redis_pool: Optional[ConnectionPool] = None
   redis_client: Optional[redis.Redis] = None
   
   def get_redis_pool() -> ConnectionPool:
       """Get or create Redis connection pool"""
       global redis_pool
       if redis_pool is None:
           try:
               redis_pool = ConnectionPool.from_url(
                   settings.REDIS_URL,
                   max_connections=settings.REDIS_MAX_CONNECTIONS,
                   socket_timeout=settings.REDIS_SOCKET_TIMEOUT,
                   socket_connect_timeout=settings.REDIS_SOCKET_CONNECT_TIMEOUT,
                   decode_responses=True  # Auto-decode bytes to strings
               )
               logger.info("Redis connection pool created")
           except Exception as e:
               logger.error(f"Failed to create Redis pool: {e}")
               raise
       return redis_pool
   
   def get_redis() -> redis.Redis:
       """Get Redis client with connection pooling"""
       global redis_client
       if redis_client is None:
           try:
               redis_client = redis.Redis(connection_pool=get_redis_pool())
               logger.info("Redis client initialized")
           except Exception as e:
               logger.error(f"Failed to initialize Redis client: {e}")
               raise
       return redis_client
   
   def close_redis():
       """Close Redis connections gracefully"""
       global redis_pool, redis_client
       if redis_client:
           try:
               redis_client.close()
               redis_client = None
               logger.info("Redis client closed")
           except Exception as e:
               logger.error(f"Error closing Redis client: {e}")
       
       if redis_pool:
           try:
               redis_pool.disconnect()
               redis_pool = None
               logger.info("Redis pool disconnected")
           except Exception as e:
               logger.error(f"Error disconnecting Redis pool: {e}")
   
   def test_redis_connection() -> bool:
       """Test Redis connection and log status"""
       try:
           client = get_redis()
           response = client.ping()
           if response:
               info = client.info('server')
               redis_version = info.get('redis_version', 'unknown')
               logger.info(f"✅ Redis connection successful (version: {redis_version})")
               return True
           else:
               logger.error("❌ Redis ping failed")
               return False
       except redis.ConnectionError as e:
           logger.error(f"❌ Redis connection failed: {e}")
           return False
       except Exception as e:
           logger.error(f"❌ Redis test failed: {e}")
           return False
   
   def get_redis_info() -> dict:
       """Get Redis server information"""
       try:
           client = get_redis()
           return {
               "server": client.info('server'),
               "memory": client.info('memory'),
               "stats": client.info('stats'),
               "clients": client.info('clients')
           }
       except Exception as e:
           logger.error(f"Error getting Redis info: {e}")
           return {}
   ```

4. **Add to Startup**
   ```python
   # backend/app/main.py
   
   from app.core.redis import test_redis_connection, close_redis
   
   @app.on_event("startup")
   async def startup_event():
       logger.info("Starting up application...")
       
       # Test database connection
       # ... existing code ...
       
       # Test Redis connection
       if test_redis_connection():
           logger.info("Redis is ready")
       else:
           logger.warning("Redis is not available - caching disabled")
   
   @app.on_event("shutdown")
   async def shutdown_event():
       logger.info("Shutting down application...")
       close_redis()
       logger.info("Shutdown complete")
   ```

**Files to Create:**
- `backend/app/core/redis.py` (NEW)

**Files to Modify:**
- `backend/requirements.txt`
- `backend/app/core/config.py`
- `backend/app/main.py`

**Environment Variables:**
```env
# .env (local)
REDIS_URL=redis://localhost:6379/0

# Railway (production) - add Redis plugin first
REDIS_URL=redis://default:<password>@redis.railway.internal:6379
```

---

### Task 7: Implement Redis Caching for Stock Prices

**Implementation:**

```python
# backend/app/services/cache_service.py

import json
from typing import Optional, Dict, Any, List
from datetime import datetime
from app.core.redis import get_redis
from app.core.config import settings
import logging

logger = logging.getLogger(__name__)

class CacheService:
    def __init__(self):
        try:
            self.redis = get_redis()
            self.enabled = True
        except Exception as e:
            logger.error(f"Redis not available: {e}")
            self.redis = None
            self.enabled = False
    
    @staticmethod
    def _get_cache_key(market: str, ticker: str) -> str:
        """Generate cache key for stock price"""
        return f"stock_price:{market}:{ticker}"
    
    @staticmethod
    def _get_ttl() -> int:
        """
        Get TTL based on market hours
        
        Market hours: 14:30-21:00 UTC (9:30am-4pm EST)
        Shorter TTL during market hours for fresher data
        """
        now = datetime.utcnow()
        hour = now.hour
        weekday = now.weekday()
        
        # Check if during market hours (Mon-Fri, 14:30-21:00 UTC)
        is_market_hours = (
            weekday < 5 and  # Monday-Friday
            14 <= hour < 21
        )
        
        if is_market_hours:
            return settings.REDIS_CACHE_TTL_MARKET_HOURS
        else:
            return settings.REDIS_CACHE_TTL_OFF_HOURS
    
    def get_stock_price(self, market: str, ticker: str) -> Optional[Dict[str, Any]]:
        """
        Get stock price from cache
        
        Returns:
            Dict with price data if cached, None if miss or error
        """
        if not self.enabled:
            return None
        
        key = self._get_cache_key(market, ticker)
        
        try:
            data = self.redis.get(key)
            if data:
                logger.debug(f"Cache HIT: {key}")
                return json.loads(data)
            else:
                logger.debug(f"Cache MISS: {key}")
                return None
        except Exception as e:
            logger.error(f"Redis GET error for {key}: {e}")
            return None
    
    def set_stock_price(
        self,
        market: str,
        ticker: str,
        data: Dict[str, Any],
        ttl: Optional[int] = None
    ) -> bool:
        """
        Cache stock price with TTL
        
        Args:
            market: 'world' or 'israeli'
            ticker: Stock ticker
            data: Price data dict
            ttl: Optional custom TTL (uses market hours logic if None)
        
        Returns:
            True if cached successfully
        """
        if not self.enabled:
            return False
        
        key = self._get_cache_key(market, ticker)
        ttl = ttl or self._get_ttl()
        
        try:
            serialized = json.dumps(data, default=str)  # Handle datetime
            self.redis.setex(key, ttl, serialized)
            logger.debug(f"Cache SET: {key} (TTL: {ttl}s)")
            return True
        except Exception as e:
            logger.error(f"Redis SET error for {key}: {e}")
            return False
    
    def delete_stock_price(self, market: str, ticker: str) -> bool:
        """Invalidate cached stock price"""
        if not self.enabled:
            return False
        
        key = self._get_cache_key(market, ticker)
        
        try:
            self.redis.delete(key)
            logger.debug(f"Cache DELETE: {key}")
            return True
        except Exception as e:
            logger.error(f"Redis DELETE error for {key}: {e}")
            return False
    
    def delete_many(self, market: str, tickers: List[str]) -> int:
        """Batch delete multiple stock prices"""
        if not self.enabled:
            return 0
        
        keys = [self._get_cache_key(market, t) for t in tickers]
        
        try:
            deleted = self.redis.delete(*keys)
            logger.debug(f"Cache BULK DELETE: {deleted} keys")
            return deleted
        except Exception as e:
            logger.error(f"Redis bulk delete error: {e}")
            return 0
    
    def get_cache_stats(self) -> Dict[str, Any]:
        """Get Redis cache statistics"""
        if not self.enabled:
            return {"enabled": False}
        
        try:
            stats_info = self.redis.info('stats')
            memory_info = self.redis.info('memory')
            clients_info = self.redis.info('clients')
            
            hits = stats_info.get('keyspace_hits', 0)
            misses = stats_info.get('keyspace_misses', 0)
            total = hits + misses
            hit_rate = (hits / total * 100) if total > 0 else 0.0
            
            return {
                "enabled": True,
                "keyspace_hits": hits,
                "keyspace_misses": misses,
                "hit_rate": round(hit_rate, 2),
                "connected_clients": clients_info.get('connected_clients', 0),
                "used_memory_human": memory_info.get('used_memory_human', 'unknown'),
                "total_keys": self._count_stock_price_keys()
            }
        except Exception as e:
            logger.error(f"Error getting cache stats: {e}")
            return {"enabled": True, "error": str(e)}
    
    def _count_stock_price_keys(self) -> int:
        """Count number of stock_price:* keys in cache"""
        try:
            keys = self.redis.keys('stock_price:*')
            return len(keys)
        except Exception:
            return 0
    
    def clear_all_stock_prices(self) -> int:
        """Clear all cached stock prices (use with caution)"""
        if not self.enabled:
            return 0
        
        try:
            keys = self.redis.keys('stock_price:*')
            if keys:
                deleted = self.redis.delete(*keys)
                logger.info(f"Cleared {deleted} stock price entries from cache")
                return deleted
            return 0
        except Exception as e:
            logger.error(f"Error clearing cache: {e}")
            return 0
```

**Update Stock Price Service:**

```python
# backend/app/services/stock_price_service.py

from app.services.cache_service import CacheService

class StockPriceService:
    def __init__(self, db: Session):
        self.db = db
        self.cache = CacheService()
    
    def get_stock_price(self, ticker: str, market: str = 'world') -> Optional[Dict]:
        """
        Get stock price with cache-aside pattern
        
        Flow:
        1. Check Redis cache
        2. If miss, query database
        3. Cache the result
        4. Return data
        """
        
        # Try cache first
        cached_data = self.cache.get_stock_price(market, ticker)
        if cached_data:
            return cached_data
        
        # Cache miss - query database
        result = self.db.execute(
            text("""
                SELECT ticker, market, current_price, previous_close,
                       price_change, price_change_pct, day_high, day_low,
                       volume, market_cap, updated_at
                FROM "StockPrices"
                WHERE ticker = :ticker AND market = :market
            """),
            {"ticker": ticker, "market": market}
        ).fetchone()
        
        if not result:
            return None
        
        # Format data
        data = {
            "ticker": result[0],
            "market": result[1],
            "current_price": float(result[2]) if result[2] else None,
            "previous_close": float(result[3]) if result[3] else None,
            "price_change": float(result[4]) if result[4] else None,
            "price_change_pct": float(result[5]) if result[5] else None,
            "day_high": float(result[6]) if result[6] else None,
            "day_low": float(result[7]) if result[7] else None,
            "volume": int(result[8]) if result[8] else None,
            "market_cap": int(result[9]) if result[9] else None,
            "updated_at": result[10].isoformat() if result[10] else None
        }
        
        # Cache the result
        self.cache.set_stock_price(market, ticker, data)
        
        return data
    
    def update_world_stock_prices(
        self,
        tickers: Optional[List[str]] = None,
        market: str = 'world'
    ) -> Tuple[int, int]:
        """
        Update prices and invalidate cache
        """
        # ... existing update logic ...
        
        updated_tickers = []
        
        for yf_ticker in yfinance_tickers:
            try:
                # Fetch and update (existing code)
                # ...
                
                updated_tickers.append(display_ticker)
                updated_count += 1
                
            except Exception as e:
                logger.error(f"Error updating {yf_ticker}: {e}")
                failed_count += 1
        
        # Invalidate cache for updated tickers
        if updated_tickers:
            self.cache.delete_many(market, updated_tickers)
            logger.info(f"Invalidated cache for {len(updated_tickers)} tickers")
        
        return updated_count, failed_count
```

**Add Cache Stats Endpoint:**

```python
# backend/app/api/v1/endpoints/admin.py (or world_stocks.py)

from app.services.cache_service import CacheService

@router.get("/cache/stats")
def get_cache_stats(
    user_id: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get Redis cache statistics"""
    cache = CacheService()
    return cache.get_cache_stats()

@router.post("/cache/clear")
def clear_cache(
    user_id: str = Depends(get_current_user),  # Add admin check
    db: Session = Depends(get_db)
):
    """Clear all cached stock prices (admin only)"""
    cache = CacheService()
    cleared = cache.clear_all_stock_prices()
    return {"message": f"Cleared {cleared} entries from cache"}
```

**Files to Create:**
- `backend/app/services/cache_service.py` (NEW)

**Files to Modify:**
- `backend/app/services/stock_price_service.py`
- `backend/app/api/v1/endpoints/world_stocks.py` (or admin.py)

---

### Task 8: End-to-End Testing

**Test Plan:**

#### 1. Israeli Stock Integration Test
```bash
# Check yfinance_ticker column
psql investracker -c "
    SELECT ticker, yfinance_ticker, name 
    FROM \"IsraeliStocks\" 
    LIMIT 10
"

# Expected output:
# ticker | yfinance_ticker | name
# -------|----------------|------
# TEVA   | TEVA.TA        | Teva Pharmaceutical
# ELCO   | ELCO.TA        | Elco Holdings
```

#### 2. Batch Price Update Test
```bash
cd backend

# Dry run - update just 10 stocks
python -c "
from app.core.database import SessionLocal
from app.services.stock_price_service import StockPriceService

db = SessionLocal()
service = StockPriceService(db)

# Test world stocks
updated, failed = service.update_world_stock_prices(['AAPL', 'MSFT', 'GOOGL'], market='world')
print(f'World: Updated {updated}, Failed {failed}')

# Test Israeli stocks
updated, failed = service.update_world_stock_prices(['TEVA', 'ELCO'], market='israeli')
print(f'Israeli: Updated {updated}, Failed {failed}')

db.close()
"

# Full run
python update_all_stock_prices.py
```

#### 3. Returns Calculation Test
```python
# backend/test_returns.py

from app.core.database import SessionLocal
from app.services.returns_calculator import ReturnsCalculator

db = SessionLocal()
calculator = ReturnsCalculator(db)

# Test user (replace with actual user_id)
user_id = "test_user_id"

# Update returns
results = calculator.update_all_user_returns(user_id)
print(f"Updated returns: {results}")

# Query holdings
from app.models.holding_models import WorldStockHolding
holdings = db.query(WorldStockHolding).filter_by(user_id=user_id).all()

for h in holdings:
    print(f"{h.ticker}:")
    print(f"  Cost: ${h.cost_basis}")
    print(f"  Value: ${h.current_value}")
    print(f"  Gain: ${h.unrealized_gain} ({h.unrealized_gain_pct}%)")
    print(f"  TWR: {h.twr}%")
    print(f"  MWR: {h.mwr}%")
    print()

db.close()
```

#### 4. Redis Cache Test
```python
# backend/test_cache.py

import time
from app.core.database import SessionLocal
from app.services.stock_price_service import StockPriceService

db = SessionLocal()
service = StockPriceService(db)

# Test 1: Cache miss (first call)
print("Test 1: First call (cache miss)")
start = time.time()
data1 = service.get_stock_price('AAPL', 'world')
time1 = (time.time() - start) * 1000
print(f"  Time: {time1:.2f}ms")
print(f"  Price: ${data1['current_price']}")

# Test 2: Cache hit (second call)
print("\nTest 2: Second call (cache hit)")
start = time.time()
data2 = service.get_stock_price('AAPL', 'world')
time2 = (time.time() - start) * 1000
print(f"  Time: {time2:.2f}ms")
print(f"  Price: ${data2['current_price']}")
print(f"  Speedup: {time1/time2:.1f}x faster")

# Test 3: Batch test
print("\nTest 3: Batch test (100 stocks)")
tickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'] * 20

# First pass (cache miss)
start = time.time()
for ticker in tickers:
    service.get_stock_price(ticker, 'world')
miss_time = time.time() - start

# Second pass (cache hit)
start = time.time()
for ticker in tickers:
    service.get_stock_price(ticker, 'world')
hit_time = time.time() - start

print(f"  Cold: {miss_time:.2f}s ({len(tickers)/miss_time:.1f} req/s)")
print(f"  Warm: {hit_time:.2f}s ({len(tickers)/hit_time:.1f} req/s)")
print(f"  Speedup: {miss_time/hit_time:.1f}x")

# Test 4: Cache stats
print("\nTest 4: Cache statistics")
stats = service.cache.get_cache_stats()
print(f"  Enabled: {stats.get('enabled')}")
print(f"  Hit rate: {stats.get('hit_rate', 0):.1f}%")
print(f"  Total keys: {stats.get('total_keys', 0)}")
print(f"  Memory: {stats.get('used_memory_human', 'unknown')}")

db.close()
```

#### 5. API Integration Test
```bash
# Test holdings endpoint
curl -X GET "http://localhost:8000/api/v1/world-stocks/holdings?refresh_returns=true" \
  -H "Authorization: Bearer <token>"

# Expected response:
{
  "total_value": "150000.00",
  "total_cost": "120000.00",
  "total_gain": "30000.00",
  "total_gain_pct": "25.00",
  "portfolio_twr": "23.45",
  "portfolio_mwr": "26.78",
  "holdings": [
    {
      "ticker": "AAPL",
      "quantity": "100",
      "cost_basis": "25000.00",
      "current_value": "27812.00",
      "unrealized_gain": "2812.00",
      "unrealized_gain_pct": "11.25",
      "twr": "10.50",
      "mwr": "12.30"
    }
  ]
}
```

#### 6. Performance Validation
```python
# backend/test_performance.py

import statistics
import time
from app.core.database import SessionLocal
from app.services.stock_price_service import StockPriceService

db = SessionLocal()
service = StockPriceService(db)

def benchmark(func, runs=100):
    """Benchmark function execution time"""
    times = []
    for _ in range(runs):
        start = time.time()
        func()
        times.append((time.time() - start) * 1000)
    
    return {
        "mean": statistics.mean(times),
        "median": statistics.median(times),
        "min": min(times),
        "max": max(times),
        "stdev": statistics.stdev(times) if len(times) > 1 else 0
    }

# Warm up cache
service.get_stock_price('AAPL', 'world')

# Benchmark cached reads
def cached_read():
    service.get_stock_price('AAPL', 'world')

results = benchmark(cached_read, runs=1000)
print("Cached Read Performance (1000 runs):")
print(f"  Mean: {results['mean']:.2f}ms")
print(f"  Median: {results['median']:.2f}ms")
print(f"  Min: {results['min']:.2f}ms")
print(f"  Max: {results['max']:.2f}ms")
print(f"  Std Dev: {results['stdev']:.2f}ms")

# Success criteria
assert results['mean'] < 10, "Cache reads should be <10ms average"
assert results['median'] < 5, "Cache reads should be <5ms median"

print("\n✅ Performance tests passed!")

db.close()
```

**Success Criteria:**
- ✅ All 3,133 stocks (2,948 world + 185 Israeli) have prices
- ✅ Israeli stocks fetch correctly with .TA suffix
- ✅ Holdings show TWR and MWR calculations
- ✅ Redis cache hit rate >80% after warmup
- ✅ API response time <100ms with cache
- ✅ Cache reads average <10ms

---

## Deployment Strategy

### Local Development

1. **Start Redis**
   ```bash
   # Option 1: Docker
   docker run -d -p 6379:6379 --name investracker-redis redis:7-alpine
   
   # Option 2: Homebrew (macOS)
   brew install redis
   brew services start redis
   ```

2. **Run Migrations**
   ```bash
   cd backend
   alembic upgrade head
   ```

3. **Initial Price Population**
   ```bash
   python update_all_stock_prices.py
   ```

4. **Test Application**
   ```bash
   python run.py
   ```

### Railway Production

1. **Add Redis Plugin**
   - Go to Railway project
   - Click "New" → "Database" → "Add Redis"
   - Note the `REDIS_URL` from plugin variables

2. **Update Environment Variables**
   ```env
   # Railway Project Variables
   REDIS_URL=redis://default:<password>@redis.railway.internal:6379
   REDIS_CACHE_TTL_MARKET_HOURS=300
   REDIS_CACHE_TTL_OFF_HOURS=3600
   ```

3. **Deploy Backend**
   ```bash
   git add .
   git commit -m "Add stock price enhancements (Israeli market, TWR/MWR, Redis)"
   git push origin main
   ```
   - Railway auto-deploys
   - Migrations run automatically via `migrate_on_startup.py`

4. **Initial Price Population**
   ```bash
   railway run python update_all_stock_prices.py
   ```

5. **Schedule Periodic Updates**
   
   **Option A: Railway Cron Jobs**
   ```yaml
   # railway.toml
   [cron]
   schedule = "*/5 * * * *"  # Every 5 minutes
   command = "python update_all_stock_prices.py"
   ```
   
   **Option B: GitHub Actions**
   ```yaml
   # .github/workflows/update-prices.yml
   name: Update Stock Prices
   
   on:
     schedule:
       - cron: '*/5 9-16 * * 1-5'  # Every 5 min, 9am-4pm EST, Mon-Fri
   
   jobs:
     update:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - name: Trigger Railway update
           run: |
             curl -X POST "${{ secrets.RAILWAY_WEBHOOK_URL }}"
   ```

---

## Timeline Estimate

| Phase | Tasks | Estimated Time |
|-------|-------|----------------|
| **Phase 1: Israeli Market** | | |
| Task 1: yfinance_ticker column | Migration + model update | 1 hour |
| Task 2: Batch update script | Script with rate limiting | 2 hours |
| Task 3: Service update | Israeli ticker mapping | 1 hour |
| **Phase 2: Returns** | | |
| Task 4: Returns fields | Migration + calculator | 4 hours |
| Task 5: API updates | Endpoints + frontend types | 2 hours |
| **Phase 3: Redis** | | |
| Task 6: Redis setup | Infrastructure + config | 2 hours |
| Task 7: Cache implementation | Service integration | 3 hours |
| Task 8: Testing | All tests + validation | 3 hours |
| **Total** | **8 tasks** | **18 hours** |

**Breakdown:**
- Phase 1: 4 hours
- Phase 2: 6 hours  
- Phase 3: 8 hours

---

## Future Enhancements

### 1. WebSocket Real-Time Updates
- Push price updates to connected clients
- Update holdings and returns without refresh
- Live portfolio value tracking

### 2. Historical Price Storage
- Store daily snapshots in separate table
- Generate performance charts
- Calculate historical volatility

### 3. Advanced Returns Metrics
- Sharpe Ratio (risk-adjusted return)
- Max Drawdown (largest peak-to-trough decline)
- Alpha/Beta vs market benchmarks
- Sortino Ratio (downside risk)

### 4. Price Alerts
- Notify on price targets
- Stop-loss alerts
- Significant gain/loss notifications

### 5. Portfolio Rebalancing Suggestions
- Calculate deviation from target allocation
- Suggest trades to rebalance
- Tax-loss harvesting opportunities

---

## Risk Mitigation

| Risk | Impact | Mitigation Strategy |
|------|--------|---------------------|
| yfinance rate limits | High | Batch with delays, cache aggressively, consider paid API |
| Redis downtime | Medium | Graceful degradation to DB, health checks, Redis Sentinel |
| Israeli stock data quality | Medium | Validate data, error handling, fallback to manual entry |
| IRR calculation failures | Low | Try-catch with fallback, log errors, validate inputs |
| Database lock contention | Low | Use proper indexing, batch commits, read replicas |
| Cache invalidation bugs | Medium | Conservative TTLs, manual clear endpoint, monitoring |

---

## Cost Analysis

### yfinance API
- **Free Tier:** 2,000 requests/hour
- **Our Usage:** 3,133 stocks × 1 request = 3,133 requests
- **Update Frequency:** Every 5 minutes = 12 per hour
- **Daily Total:** ~600 requests (well under limit)
- **Cost:** FREE ✅

### Redis (Railway)
- **Shared:** $5/month - 256MB (sufficient for our use)
- **Dedicated:** $15/month - 1GB (recommended)
- **Cost:** ~$60/year ✅

### Database Storage
- **StockPrices table:** ~3,133 rows × 200 bytes = 627KB
- **Daily growth:** Minimal (updates, not inserts)
- **Cost:** Negligible ✅

**Total Monthly Cost:** ~$5-15 (Redis only)

---

## Monitoring & Observability

### Key Metrics to Track

1. **Price Update Success Rate**
   - Target: >95%
   - Alert if <90%

2. **Cache Hit Rate**
   - Target: >80%
   - Alert if <60%

3. **API Response Time**
   - Target: <100ms (p95)
   - Alert if >200ms

4. **Redis Memory Usage**
   - Target: <80% capacity
   - Alert if >90%

5. **Returns Calculation Time**
   - Target: <5s per user
   - Alert if >10s

### Logging Strategy
```python
# Key events to log:
logger.info("Price update started: {count} stocks")
logger.info("Price update completed: {updated} updated, {failed} failed")
logger.error("Price fetch failed for {ticker}: {error}")
logger.warning("Cache miss rate high: {rate}%")
logger.info("Returns calculated for user {user_id}: {twr}% TWR, {mwr}% MWR")
```

---

## Questions & Decisions

### 1. Israeli Stock Data Source
- **Question:** Is yfinance sufficient for TASE (Tel Aviv) stocks?
- **Alternative:** Direct TASE API if yfinance quality is poor
- **Decision:** Start with yfinance, monitor data quality

### 2. Returns Calculation Frequency
- **Question:** When to recalculate TWR/MWR?
- **Options:**
  - A) On every price update (heavy)
  - B) On demand when user views holdings (lazy)
  - C) Scheduled job every hour (balanced)
- **Decision:** Option B with endpoint to manually refresh

### 3. Redis Persistence
- **Question:** Do we need Redis persistence (RDB/AOF)?
- **Trade-off:** Performance vs durability
- **Decision:** No persistence needed (cache can rebuild from DB)

### 4. Batch Update Scheduling
- **Question:** Railway Cron vs GitHub Actions?
- **Decision:** Railway Cron (simpler, same infrastructure)

---

## Implementation Checklist

### Pre-Implementation
- [ ] Review plan with team
- [ ] Confirm yfinance works for Israeli stocks
- [ ] Provision Redis on Railway
- [ ] Backup database before migrations

### Phase 1
- [ ] Create yfinance_ticker migration
- [ ] Update IsraeliStock model
- [ ] Test migration locally
- [ ] Create batch update script
- [ ] Test with small batch (10 stocks)
- [ ] Update stock_price_service for Israeli market
- [ ] Test Israeli stock fetching
- [ ] Deploy to Railway

### Phase 2
- [ ] Create returns fields migration
- [ ] Update holding models
- [ ] Implement ReturnsCalculator service
- [ ] Add scipy to requirements
- [ ] Test TWR calculation
- [ ] Test MWR/IRR calculation
- [ ] Update API schemas
- [ ] Update API endpoints
- [ ] Update frontend types
- [ ] Test API integration
- [ ] Deploy to Railway

### Phase 3
- [ ] Add Redis to requirements
- [ ] Create Redis client module
- [ ] Add Redis config
- [ ] Test Redis connection locally
- [ ] Implement CacheService
- [ ] Update StockPriceService with caching
- [ ] Add cache stats endpoint
- [ ] Test cache performance
- [ ] Deploy to Railway
- [ ] Run full batch update (all 3,133 stocks)

### Post-Implementation
- [ ] Monitor logs for errors
- [ ] Check cache hit rate
- [ ] Validate returns calculations
- [ ] Performance testing
- [ ] Update documentation

---

**End of Plan**

**Next Steps:** Review plan, then start with Phase 1, Task 1 (yfinance_ticker column)
