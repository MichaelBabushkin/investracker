"""
SQLAlchemy models for Israeli Stock Analysis System
Includes models for stocks, holdings, transactions, and dividends
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, Date, Time, Text, UniqueConstraint, Index, DECIMAL
from app.core.database import Base
from datetime import datetime
from decimal import Decimal
import os
import sys

# Add the app directory to Python path for imports
sys.path.append(os.path.dirname(os.path.dirname(__file__)))


class IsraeliStock(Base):
    """Model for Israeli stocks (TA-125 and SME-60 indexes)"""
    __tablename__ = "IsraeliStocks"
    
    id = Column(Integer, primary_key=True, index=True)
    security_no = Column(String(20), unique=True, nullable=False, index=True)
    symbol = Column(String(10), nullable=False, index=True)
    name = Column(String(100), nullable=False)
    index_name = Column(String(20), nullable=False, default="TA-125")  # TA-125 or SME-60
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Indexes
    __table_args__ = (
        Index('idx_israeli_stocks_security_no', 'security_no'),
        Index('idx_israeli_stocks_symbol', 'symbol'),
        Index('idx_israeli_stocks_index', 'index_name'),
    )
    
    def __repr__(self):
        return f"<IsraeliStock(security_no='{self.security_no}', symbol='{self.symbol}', name='{self.name}', index='{self.index_name}')>"


class IsraeliStockHolding(Base):
    """Model for Israeli stock holdings (current positions)"""
    __tablename__ = "IsraeliStockHolding"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    security_no = Column(String(20), nullable=False)
    symbol = Column(String(10), nullable=False)
    company_name = Column(String(100), nullable=False)
    quantity = Column(DECIMAL(15, 4), nullable=False)
    last_price = Column(DECIMAL(15, 4))
    purchase_cost = Column(DECIMAL(15, 4))  # Total amount paid for purchase
    current_value = Column(DECIMAL(15, 4))  # Current position worth (market value)
    portfolio_percentage = Column(DECIMAL(5, 2))  # Percentage of whole portfolio
    currency = Column(String(3), default='ILS')
    holding_date = Column(Date)  # Date from PDF header
    source_pdf = Column(String(255), nullable=False)  # Original PDF filename
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'security_no', 'source_pdf', name='uq_holding_user_security_pdf'),
        Index('idx_israeli_stock_holding_user_id', 'user_id'),
        Index('idx_israeli_stock_holding_security_no', 'security_no'),
        Index('idx_israeli_stock_holding_symbol', 'symbol'),
    )
    
    def __repr__(self):
        return f"<IsraeliStockHolding(user_id='{self.user_id}', symbol='{self.symbol}', quantity={self.quantity})>"


class IsraeliStockTransaction(Base):
    """Model for Israeli stock transactions (buy/sell activities)"""
    __tablename__ = "IsraeliStockTransaction"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    security_no = Column(String(20), nullable=False)
    symbol = Column(String(10), nullable=False)
    company_name = Column(String(100), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # BUY, SELL, DIVIDEND, FEE, etc.
    transaction_date = Column(Date)
    transaction_time = Column(Time)
    quantity = Column(DECIMAL(15, 4), nullable=False)
    price = Column(DECIMAL(15, 4))  # Price per share
    total_value = Column(DECIMAL(15, 4))  # Total transaction value
    commission = Column(DECIMAL(15, 4))  # Broker commission
    tax = Column(DECIMAL(15, 4))  # Tax amount
    currency = Column(String(3), default='ILS')
    source_pdf = Column(String(255), nullable=False)  # Original PDF filename
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'security_no', 'transaction_date', 'transaction_type', 'source_pdf', 
                        name='uq_transaction_user_security_date_type_pdf'),
        Index('idx_israeli_stock_transaction_user_id', 'user_id'),
        Index('idx_israeli_stock_transaction_security_no', 'security_no'),
        Index('idx_israeli_stock_transaction_symbol', 'symbol'),
        Index('idx_israeli_stock_transaction_type', 'transaction_type'),
        Index('idx_israeli_stock_transaction_date', 'transaction_date'),
    )
    
    def __repr__(self):
        return f"<IsraeliStockTransaction(user_id='{self.user_id}', symbol='{self.symbol}', type='{self.transaction_type}', quantity={self.quantity})>"


class IsraeliDividend(Base):
    """Model for Israeli stock dividends (auto-populated from transactions)"""
    __tablename__ = "IsraeliDividend"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    security_no = Column(String(20), nullable=False)
    symbol = Column(String(10), nullable=False)
    company_name = Column(String(100), nullable=False)
    payment_date = Column(Date, nullable=False)
    amount = Column(DECIMAL(15, 4), nullable=False)  # Dividend amount received
    tax = Column(DECIMAL(15, 4))  # Tax withheld
    currency = Column(String(3), default='ILS')
    source_pdf = Column(String(255), nullable=False)  # Original PDF filename
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'security_no', 'payment_date', 'source_pdf', 
                        name='uq_dividend_user_security_date_pdf'),
        Index('idx_israeli_dividend_user_id', 'user_id'),
        Index('idx_israeli_dividend_security_no', 'security_no'),
        Index('idx_israeli_dividend_symbol', 'symbol'),
        Index('idx_israeli_dividend_payment_date', 'payment_date'),
    )
    
    def __repr__(self):
        return f"<IsraeliDividend(user_id='{self.user_id}', symbol='{self.symbol}', amount={self.amount}, date={self.payment_date})>"


# Additional helper models for analysis and reporting

class IsraeliStockSummary(Base):
    """Model for user portfolio summary (can be materialized view or computed)"""
    __tablename__ = "IsraeliStockSummary"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), nullable=False, index=True)
    security_no = Column(String(20), nullable=False)
    symbol = Column(String(10), nullable=False)
    company_name = Column(String(100), nullable=False)
    
    # Holdings summary
    total_quantity = Column(DECIMAL(15, 4), default=0)
    average_purchase_price = Column(DECIMAL(15, 4))
    total_purchase_cost = Column(DECIMAL(15, 4), default=0)
    current_market_value = Column(DECIMAL(15, 4), default=0)
    unrealized_gain_loss = Column(DECIMAL(15, 4), default=0)
    unrealized_gain_loss_percent = Column(DECIMAL(8, 4), default=0)
    
    # Transaction summary
    total_buy_quantity = Column(DECIMAL(15, 4), default=0)
    total_sell_quantity = Column(DECIMAL(15, 4), default=0)
    total_buy_value = Column(DECIMAL(15, 4), default=0)
    total_sell_value = Column(DECIMAL(15, 4), default=0)
    total_commission = Column(DECIMAL(15, 4), default=0)
    total_tax = Column(DECIMAL(15, 4), default=0)
    realized_gain_loss = Column(DECIMAL(15, 4), default=0)
    
    # Dividend summary
    total_dividends_received = Column(DECIMAL(15, 4), default=0)
    dividend_tax_withheld = Column(DECIMAL(15, 4), default=0)
    net_dividends = Column(DECIMAL(15, 4), default=0)
    
    # Metadata
    first_transaction_date = Column(Date)
    last_transaction_date = Column(Date)
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Constraints
    __table_args__ = (
        UniqueConstraint('user_id', 'security_no', name='uq_summary_user_security'),
        Index('idx_israeli_summary_user_id', 'user_id'),
        Index('idx_israeli_summary_security_no', 'security_no'),
        Index('idx_israeli_summary_symbol', 'symbol'),
    )
    
    def __repr__(self):
        return f"<IsraeliStockSummary(user_id='{self.user_id}', symbol='{self.symbol}', quantity={self.total_quantity})>"


# Legacy model compatibility (for migration purposes)
class Ta125Stock(Base):
    """Legacy model for TA-125 stocks (deprecated, use IsraeliStock instead)"""
    __tablename__ = "Ta125Stock"
    
    id = Column(Integer, primary_key=True, index=True)
    security_no = Column(String(20), unique=True, nullable=False)
    symbol = Column(String(10), nullable=False)
    name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    def __repr__(self):
        return f"<Ta125Stock(security_no='{self.security_no}', symbol='{self.symbol}', name='{self.name}')>"
