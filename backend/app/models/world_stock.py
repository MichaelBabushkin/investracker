"""
World Stock SQLAlchemy Models
"""
from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from app.core.database import Base


class WorldStockAccount(Base):
    """World stock account information"""
    __tablename__ = "WorldStockAccount"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    account_number = Column(String(50), unique=True, index=True)
    account_alias = Column(String(100))
    account_type = Column(String(50))
    base_currency = Column(String(3), default="USD")
    broker_name = Column(String(200))
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    # Relationships
    holdings = relationship("WorldStockHolding", back_populates="account", cascade="all, delete-orphan")
    transactions = relationship("WorldStockTransaction", back_populates="account", cascade="all, delete-orphan")
    dividends = relationship("WorldStockDividend", back_populates="account", cascade="all, delete-orphan")
    performance = relationship("WorldStockPerformance", back_populates="account", cascade="all, delete-orphan")


class WorldStockHolding(Base):
    """World stock holdings/positions"""
    __tablename__ = "WorldStockHolding"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("WorldStockAccount.id", ondelete="CASCADE"), index=True)
    symbol = Column(String(20), nullable=False, index=True)
    company_name = Column(String(255))
    quantity = Column(Numeric(15, 4))
    avg_entry_price = Column(Numeric(15, 4))
    current_price = Column(Numeric(15, 4))
    current_value = Column(Numeric(15, 2))
    purchase_cost = Column(Numeric(15, 2))
    unrealized_pl = Column(Numeric(15, 2))
    unrealized_pl_percent = Column(Numeric(10, 4))
    currency = Column(String(3), default="USD")
    source_pdf = Column(String(500))
    last_updated = Column(DateTime, default=func.now())
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    account = relationship("WorldStockAccount", back_populates="holdings")


class WorldStockTransaction(Base):
    """World stock transactions/trades"""
    __tablename__ = "WorldStockTransaction"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("WorldStockAccount.id", ondelete="CASCADE"), index=True)
    symbol = Column(String(20), nullable=False, index=True)
    transaction_date = Column(Date, index=True)
    transaction_time = Column(String(20))  # Time as string (e.g., "12:23:39")
    transaction_type = Column(String(20))  # O (Open), C (Close), P (Partial)
    quantity = Column(Numeric(15, 4))
    trade_price = Column(Numeric(15, 4))
    close_price = Column(Numeric(15, 4))
    proceeds = Column(Numeric(15, 2))
    commission = Column(Numeric(15, 2))
    basis = Column(Numeric(15, 2))
    realized_pl = Column(Numeric(15, 2))
    mtm_pl = Column(Numeric(15, 2))
    trade_code = Column(String(10))
    currency = Column(String(3), default="USD")
    source_pdf = Column(String(500))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    account = relationship("WorldStockAccount", back_populates="transactions")


class WorldStockDividend(Base):
    """World stock dividends"""
    __tablename__ = "WorldStockDividend"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("WorldStockAccount.id", ondelete="CASCADE"), index=True)
    symbol = Column(String(20), nullable=False, index=True)
    isin = Column(String(20))
    payment_date = Column(Date, index=True)
    amount = Column(Numeric(15, 2))
    amount_per_share = Column(Numeric(15, 6))
    withholding_tax = Column(Numeric(15, 2))
    net_amount = Column(Numeric(15, 2))
    dividend_type = Column(String(50))
    currency = Column(String(3), default="USD")
    source_pdf = Column(String(500))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    account = relationship("WorldStockAccount", back_populates="dividends")


class WorldStockPerformance(Base):
    """World stock account performance metrics"""
    __tablename__ = "WorldStockPerformance"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    account_id = Column(Integer, ForeignKey("WorldStockAccount.id", ondelete="CASCADE"), index=True)
    report_start_date = Column(Date)
    report_end_date = Column(Date)
    starting_nav = Column(Numeric(15, 2))
    ending_nav = Column(Numeric(15, 2))
    total_deposits = Column(Numeric(15, 2))
    total_withdrawals = Column(Numeric(15, 2))
    total_dividends = Column(Numeric(15, 2))
    total_withholding_tax = Column(Numeric(15, 2))
    total_commissions = Column(Numeric(15, 2))
    total_fees = Column(Numeric(15, 2))
    time_weighted_return = Column(Numeric(10, 4))
    created_at = Column(DateTime, default=func.now())
    
    # Relationships
    account = relationship("WorldStockAccount", back_populates="performance")
