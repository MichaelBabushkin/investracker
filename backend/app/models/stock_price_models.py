"""
Stock Price Models
Separate table for frequently updated price data
"""
from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, Date, BigInteger, ForeignKey, UniqueConstraint, Index
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class StockPrice(Base):
    """Stock price data - frequently updated, separated from reference data"""
    __tablename__ = "stock_prices"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    market = Column(String(20), nullable=False, default='world')  # 'world' or 'israeli'
    
    # Price data
    current_price = Column(DECIMAL(18, 4), nullable=True)
    previous_close = Column(DECIMAL(18, 4), nullable=True)
    price_change = Column(DECIMAL(18, 4), nullable=True)
    price_change_pct = Column(DECIMAL(8, 4), nullable=True)
    
    # Daily range
    day_high = Column(DECIMAL(18, 4), nullable=True)
    day_low = Column(DECIMAL(18, 4), nullable=True)
    
    # Volume and market cap
    volume = Column(BigInteger, nullable=True)
    market_cap = Column(DECIMAL(20, 2), nullable=True)
    
    # Timestamps
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow, index=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<StockPrice {self.ticker} ({self.market}): ${self.current_price}>"


class StockPriceHistory(Base):
    """
    Daily close cache shared across all users — one row per (ticker, date).

    Filled by bulk yfinance downloads once per missing range; analytics
    endpoints read only from this table, never from yfinance directly.

    Unit conventions (match the rest of the DB):
      israeli → ILS (yfinance .TA closes are agorot and are divided by 100
                     before insert)
      world   → USD
      fx      → rate (e.g. ticker 'USDILS=X' → ILS per USD)
    """
    __tablename__ = "stock_price_history"

    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(30), nullable=False)   # yfinance ticker (TEVA.TA, AAPL, USDILS=X)
    market = Column(String(20), nullable=False)   # 'israeli' | 'world' | 'fx'
    date = Column(Date, nullable=False)
    close_price = Column(DECIMAL(18, 6), nullable=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint('ticker', 'date', name='uq_price_history_ticker_date'),
        Index('idx_price_history_ticker_date', 'ticker', 'date'),
        Index('idx_price_history_market_date', 'market', 'date'),
    )

    def __repr__(self):
        return f"<StockPriceHistory {self.ticker} {self.date}: {self.close_price}>"
