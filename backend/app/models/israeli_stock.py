"""
Database model for Israeli stocks from TA-125 index
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from app.core.database import Base
from datetime import datetime

class IsraeliStock(Base):
    __tablename__ = "israeli_stocks"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # Company name in English
    symbol = Column(String, unique=True, nullable=False, index=True)  # Trading symbol
    security_number = Column(String, unique=True, nullable=False, index=True)  # Israeli security number
    index_name = Column(String, default="TA-125")  # Index name
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    def __repr__(self):
        return f"<IsraeliStock(symbol='{self.symbol}', name='{self.name}', security_no='{self.security_number}')>"
