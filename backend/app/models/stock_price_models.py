"""
Stock Price Models
Separate table for frequently updated price data
"""
from sqlalchemy import Column, Integer, String, DECIMAL, DateTime, BigInteger, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base


class StockPrice(Base):
    """Stock price data - frequently updated, separated from reference data"""
    __tablename__ = "StockPrices"
    
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
