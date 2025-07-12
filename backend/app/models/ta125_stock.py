"""
Simple model for TA-125 Israeli stocks
"""
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from app.core.database import Base

class TA125Stock(Base):
    """TA-125 Israeli stock model"""
    
    __tablename__ = "ta125_stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)  # Company name from CSV
    symbol = Column(String(10), unique=True, nullable=False, index=True)  # Trading symbol
    security_no = Column(String(20), unique=True, nullable=False, index=True)  # Security number
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<TA125Stock(symbol='{self.symbol}', name='{self.name}')>"
