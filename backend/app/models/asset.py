from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Text, Float
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base

class Asset(Base):
    __tablename__ = "assets"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    symbol = Column(String(20), nullable=False, index=True)
    name = Column(String(255), nullable=False)
    asset_class = Column(String(50), nullable=False)  # stock, bond, etf, crypto, commodity
    sector = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    region = Column(String(50), nullable=True)  # US, Europe, Asia, etc.
    currency = Column(String(3), nullable=False)
    exchange = Column(String(50), nullable=True)
    
    # ESG Information
    esg_score = Column(Float, nullable=True)
    environmental_score = Column(Float, nullable=True)
    social_score = Column(Float, nullable=True)
    governance_score = Column(Float, nullable=True)
    
    # Additional metadata
    isin = Column(String(12), nullable=True)  # International Securities Identification Number
    cusip = Column(String(9), nullable=True)  # Committee on Uniform Securities Identification Procedures
    description = Column(Text, nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="assets")
    holdings = relationship("Holding", back_populates="asset", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="asset", cascade="all, delete-orphan")
    price_history = relationship("PriceHistory", back_populates="asset", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Asset(id={self.id}, symbol='{self.symbol}', name='{self.name}')>"
