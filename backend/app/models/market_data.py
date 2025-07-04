from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class PriceHistory(Base):
    __tablename__ = "price_history"
    
    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=False)
    
    date = Column(DateTime, nullable=False, index=True)
    open_price = Column(Float, nullable=True)
    high_price = Column(Float, nullable=True)
    low_price = Column(Float, nullable=True)
    close_price = Column(Float, nullable=False)
    adjusted_close = Column(Float, nullable=True)
    volume = Column(Integer, nullable=True)
    
    # Additional metrics
    dividend_amount = Column(Float, nullable=True)
    split_ratio = Column(Float, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    asset = relationship("Asset", back_populates="price_history")
    
    def __repr__(self):
        return f"<PriceHistory(asset_id={self.asset_id}, date={self.date}, close={self.close_price})>"


class CurrencyRate(Base):
    __tablename__ = "currency_rates"
    
    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(String(3), nullable=False, index=True)
    to_currency = Column(String(3), nullable=False, index=True)
    rate = Column(Float, nullable=False)
    date = Column(DateTime, nullable=False, index=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<CurrencyRate({self.from_currency}/{self.to_currency}: {self.rate})>"
