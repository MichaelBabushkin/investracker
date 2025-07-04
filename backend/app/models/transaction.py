from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Float, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.core.database import Base

class TransactionType(enum.Enum):
    BUY = "buy"
    SELL = "sell"
    DIVIDEND = "dividend"
    SPLIT = "split"
    MERGER = "merger"
    SPINOFF = "spinoff"
    DEPOSIT = "deposit"
    WITHDRAWAL = "withdrawal"
    FEE = "fee"
    INTEREST = "interest"

class Transaction(Base):
    __tablename__ = "transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False)
    asset_id = Column(Integer, ForeignKey("assets.id"), nullable=True)  # Nullable for cash transactions
    
    transaction_type = Column(Enum(TransactionType), nullable=False)
    transaction_date = Column(DateTime, nullable=False)
    settlement_date = Column(DateTime, nullable=True)
    
    quantity = Column(Float, nullable=True)  # Number of shares/units
    price = Column(Float, nullable=True)  # Price per share/unit
    amount = Column(Float, nullable=False)  # Total transaction amount
    fees = Column(Float, default=0.0)  # Transaction fees
    currency = Column(String(3), nullable=False)
    
    # Additional fields
    description = Column(String(500), nullable=True)
    external_id = Column(String(100), nullable=True)  # ID from brokerage
    broker = Column(String(100), nullable=True)
    account_number = Column(String(50), nullable=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    portfolio = relationship("Portfolio", back_populates="transactions")
    asset = relationship("Asset", back_populates="transactions")
    
    def __repr__(self):
        return f"<Transaction(id={self.id}, type='{self.transaction_type}', amount={self.amount})>"
