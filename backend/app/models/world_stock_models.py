"""
SQLAlchemy models for World Stock Analysis System
Includes models for world stocks, holdings, transactions, and dividends
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Date, Text, UniqueConstraint, Index, DECIMAL, ForeignKey
from app.core.database import Base
from datetime import datetime
from decimal import Decimal
import os
import sys

# Add the app directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


class WorldStock(Base):
    """Model for world stocks (primarily US stocks)"""
    __tablename__ = "WorldStocks"
    
    id = Column(Integer, primary_key=True, index=True)
    ticker = Column(String(20), nullable=False, index=True)
    exchange = Column(String(10), nullable=False, index=True)
    company_name = Column(String(255), nullable=True)
    sector = Column(String(100), nullable=True)
    industry = Column(String(100), nullable=True)
    country = Column(String(100), default="US")
    currency = Column(String(10), default="USD")
    website = Column(String(255), nullable=True)
    full_time_employees = Column(Integer, nullable=True)
    business_summary = Column(Text, nullable=True)
    phone = Column(String(50), nullable=True)
    address = Column(String(255), nullable=True)
    city = Column(String(100), nullable=True)
    state = Column(String(50), nullable=True)
    zip_code = Column(String(20), nullable=True)
    logo_url = Column(Text, nullable=True)
    logo_svg = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_world_stock_ticker', 'ticker'),
        Index('idx_world_stock_exchange', 'exchange'),
        UniqueConstraint('ticker', 'exchange', name='idx_world_stock_ticker_exchange'),
    )
    
    def __repr__(self):
        return f"<WorldStock(ticker='{self.ticker}', exchange='{self.exchange}', name='{self.company_name}')>"


class WorldStockHolding(Base):
    """Model for world stock holdings (current positions)"""
    __tablename__ = "WorldStockHolding"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    symbol = Column(String(50), nullable=False)  # Display name like "NKE US"
    company_name = Column(String(255), nullable=True)
    quantity = Column(DECIMAL(18, 6), nullable=True)
    last_price = Column(DECIMAL(18, 4), nullable=True)  # Price in USD
    purchase_cost = Column(DECIMAL(18, 2), nullable=True)  # Total cost
    current_value = Column(DECIMAL(18, 2), nullable=True)  # Current value in ILS
    portfolio_percentage = Column(DECIMAL(5, 2), nullable=True)
    currency = Column(String(10), default='USD')
    exchange_rate = Column(DECIMAL(10, 4), nullable=True)  # USD to ILS rate
    holding_date = Column(Date, nullable=True)
    source_pdf = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'ticker', 'source_pdf', name='idx_world_holding_unique'),
        Index('idx_world_holding_user', 'user_id'),
        Index('idx_world_holding_ticker', 'ticker'),
        Index('idx_world_holding_date', 'holding_date'),
    )
    
    def __repr__(self):
        return f"<WorldStockHolding(user_id='{self.user_id}', ticker='{self.ticker}', quantity={self.quantity})>"


class WorldStockTransaction(Base):
    """Model for world stock transactions (buy/sell activities)"""
    __tablename__ = "WorldStockTransaction"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    symbol = Column(String(50), nullable=False)
    company_name = Column(String(255), nullable=True)
    transaction_type = Column(String(20), nullable=False)  # BUY, SELL, DIVIDEND
    transaction_date = Column(Date, nullable=False)
    transaction_time = Column(String(10), nullable=True)
    quantity = Column(DECIMAL(18, 6), nullable=True)
    price = Column(DECIMAL(18, 4), nullable=True)  # Price in USD
    total_value = Column(DECIMAL(18, 2), nullable=True)  # Total in ILS
    commission = Column(DECIMAL(18, 2), nullable=True)
    tax = Column(DECIMAL(18, 2), nullable=True)
    currency = Column(String(10), default='USD')
    exchange_rate = Column(DECIMAL(10, 4), nullable=True)
    source_pdf = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_world_transaction_user', 'user_id'),
        Index('idx_world_transaction_ticker', 'ticker'),
        Index('idx_world_transaction_date', 'transaction_date'),
        Index('idx_world_transaction_type', 'transaction_type'),
    )
    
    def __repr__(self):
        return f"<WorldStockTransaction(user_id='{self.user_id}', ticker='{self.ticker}', type='{self.transaction_type}')>"


class WorldDividend(Base):
    """Model for world stock dividends"""
    __tablename__ = "WorldDividend"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    ticker = Column(String(20), nullable=False)
    symbol = Column(String(50), nullable=False)
    company_name = Column(String(255), nullable=True)
    payment_date = Column(Date, nullable=False)
    amount = Column(DECIMAL(18, 2), nullable=True)  # In ILS
    tax = Column(DECIMAL(18, 2), nullable=True)
    net_amount = Column(DECIMAL(18, 2), nullable=True)
    currency = Column(String(10), default='USD')
    exchange_rate = Column(DECIMAL(10, 4), nullable=True)
    source_pdf = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_world_dividend_user', 'user_id'),
        Index('idx_world_dividend_ticker', 'ticker'),
        Index('idx_world_dividend_date', 'payment_date'),
    )
    
    def __repr__(self):
        return f"<WorldDividend(user_id='{self.user_id}', ticker='{self.ticker}', amount={self.amount})>"


class PendingWorldTransaction(Base):
    """Model for pending world transactions awaiting user approval"""
    __tablename__ = "PendingWorldTransaction"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, index=True)
    upload_batch_id = Column(String(255), nullable=False, index=True)
    pdf_filename = Column(String(255), nullable=True)
    ticker = Column(String(20), nullable=False)
    stock_name = Column(String(255), nullable=True)
    world_stock_id = Column(Integer, ForeignKey('WorldStocks.id', ondelete='SET NULL'), nullable=True)
    transaction_type = Column(String(20), nullable=False)
    transaction_date = Column(String(50), nullable=True)
    transaction_time = Column(String(10), nullable=True)
    quantity = Column(DECIMAL(18, 6), nullable=True)
    price = Column(DECIMAL(18, 4), nullable=True)
    amount = Column(DECIMAL(18, 2), nullable=True)
    commission = Column(DECIMAL(18, 2), nullable=True)
    tax = Column(DECIMAL(18, 2), nullable=True)
    currency = Column(String(10), default='USD')
    exchange_rate = Column(DECIMAL(10, 4), nullable=True)
    status = Column(String(20), default='pending')  # pending, approved, rejected
    review_notes = Column(Text, nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    reviewed_by = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_pending_world_user', 'user_id'),
        Index('idx_pending_world_batch', 'upload_batch_id'),
        Index('idx_pending_world_status', 'status'),
    )
    
    def __repr__(self):
        return f"<PendingWorldTransaction(user_id='{self.user_id}', ticker='{self.ticker}', status='{self.status}')>"


class ExchangeRate(Base):
    """Model for currency exchange rates"""
    __tablename__ = "ExchangeRate"
    
    id = Column(Integer, primary_key=True, index=True)
    from_currency = Column(String(10), nullable=False)
    to_currency = Column(String(10), nullable=False)
    rate = Column(DECIMAL(10, 4), nullable=False)
    date = Column(Date, nullable=False)
    source = Column(String(50), nullable=True)  # 'pdf', 'api', 'manual'
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_exchange_rate_currencies', 'from_currency', 'to_currency'),
        Index('idx_exchange_rate_date', 'date'),
        UniqueConstraint('from_currency', 'to_currency', 'date', name='idx_exchange_rate_unique'),
    )
    
    def __repr__(self):
        return f"<ExchangeRate({self.from_currency}/{self.to_currency}={self.rate} on {self.date})>"
