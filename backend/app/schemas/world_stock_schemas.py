"""
Pydantic schemas for World Stock Analysis API (Fixed version)
These schemas are used for request/response validation and serialization
"""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict
from typing import Optional, List
from datetime import date, datetime
from decimal import Decimal


# Account schema
class WorldStockAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    account_number: Optional[str] = None
    account_alias: Optional[str] = None
    account_type: Optional[str] = None
    base_currency: Optional[str] = None
    broker_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Holding schemas
class WorldStockHoldingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    ticker: str
    symbol: str
    company_name: Optional[str] = None
    quantity: Optional[Decimal] = None
    last_price: Optional[Decimal] = None
    purchase_cost: Optional[Decimal] = None
    current_value: Optional[Decimal] = None
    portfolio_percentage: Optional[Decimal] = None
    currency: str = "USD"
    exchange_rate: Optional[Decimal] = None
    holding_date: Optional[date] = None
    source_pdf: str
    created_at: datetime
    updated_at: datetime


# Transaction schemas
class WorldStockTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    ticker: str
    symbol: str
    company_name: Optional[str] = None
    transaction_type: str
    transaction_date: Optional[date] = None
    transaction_time: Optional[str] = None
    quantity: Optional[Decimal] = None
    price: Optional[Decimal] = None
    total_value: Optional[Decimal] = None
    commission: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    currency: str = "USD"
    exchange_rate: Optional[Decimal] = None
    source_pdf: str
    created_at: datetime
    updated_at: datetime


# Dividend schemas
class WorldStockDividendResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    ticker: str
    symbol: str
    company_name: Optional[str] = None
    ex_date: Optional[date] = None
    payment_date: Optional[date] = None
    amount_per_share: Optional[Decimal] = None
    total_amount: Optional[Decimal] = None
    amount: Optional[Decimal] = None  # Alias for total_amount (gross amount)
    withholding_tax: Optional[Decimal] = None  # Tax withheld
    net_amount: Optional[Decimal] = None  # After tax
    currency: str = "USD"
    dividend_type: Optional[str] = None
    exchange_rate: Optional[Decimal] = None
    source_pdf: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# Upload response
class WorldStockUploadResponse(BaseModel):
    success: bool
    pdf_name: str
    batch_id: str
    holdings_found: int
    transactions_found: int
    dividends_found: int
    pending_transactions_saved: int
    error: Optional[str] = None


# Summary schema
class WorldStockSummaryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    total_value: Decimal
    total_holdings: int
    total_transactions: int
    total_dividends: Decimal
    total_tax: Decimal
    total_commissions: Decimal
    holdings_count: int
    transactions_count: int
    dividends_count: int


# Pending transaction schemas (simplified)
class PendingWorldTransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    user_id: str
    upload_batch_id: str
    ticker: Optional[str] = None
    stock_name: Optional[str] = None
    transaction_type: Optional[str] = None
    pdf_filename: Optional[str] = None
    transaction_date: Optional[str] = None
    transaction_time: Optional[str] = None
    quantity: Optional[Decimal] = None
    price: Optional[Decimal] = None
    amount: Optional[Decimal] = None
    commission: Optional[Decimal] = None
    tax: Optional[Decimal] = None
    exchange_rate: Optional[Decimal] = None
    status: str
    review_notes: Optional[str] = None
    reviewed_at: Optional[datetime] = None
    reviewed_by: Optional[str] = None
    created_at: datetime


# WorldStock (reference data) schemas
class WorldStockResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    ticker: str
    exchange: str
    company_name: Optional[str] = None
    sector: Optional[str] = None
    industry: Optional[str] = None
    country: str
    currency: str
    logo_svg: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


# Exchange Rate schema
class ExchangeRateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: int
    from_currency: str
    to_currency: str
    rate: Decimal
    date: date
    source: Optional[str] = None
    created_at: datetime
