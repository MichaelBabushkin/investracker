"""
Pydantic schemas for Israeli Stock Analysis API
These schemas are used for request/response validation and serialization
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List
from datetime import date, datetime, time
from decimal import Decimal


# Base schemas for common fields
class IsraeliStockBase(BaseModel):
    security_no: str = Field(..., description="Israeli security number")
    symbol: str = Field(..., description="Stock trading symbol")
    company_name: str = Field(..., description="Company name")


# Israeli Stock schemas
class IsraeliStockCreate(IsraeliStockBase):
    index_name: str = Field(default="TA-125", description="Index name (TA-125 or SME-60)")
    is_active: bool = Field(default=True, description="Whether stock is active")


class IsraeliStockResponse(IsraeliStockBase):
    id: int
    index_name: str
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Holdings schemas
class IsraeliStockHoldingBase(IsraeliStockBase):
    quantity: Decimal = Field(..., description="Number of shares held")
    currency: str = Field(default="ILS", description="Currency code")


class IsraeliStockHoldingCreate(IsraeliStockHoldingBase):
    last_price: Optional[Decimal] = Field(None, description="Last price per share")
    purchase_cost: Optional[Decimal] = Field(None, description="Total purchase cost")
    current_value: Optional[Decimal] = Field(None, description="Current market value")
    portfolio_percentage: Optional[Decimal] = Field(None, description="Percentage of portfolio")
    holding_date: Optional[date] = Field(None, description="Date from PDF header")
    source_pdf: str = Field(..., description="Source PDF filename")


class IsraeliStockHoldingResponse(IsraeliStockHoldingBase):
    id: int
    user_id: str
    last_price: Optional[Decimal]
    purchase_cost: Optional[Decimal]
    current_value: Optional[Decimal]
    portfolio_percentage: Optional[Decimal]
    holding_date: Optional[date]
    source_pdf: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Transaction schemas
class IsraeliStockTransactionBase(IsraeliStockBase):
    transaction_type: str = Field(..., description="Transaction type (BUY, SELL, DIVIDEND)")
    quantity: Decimal = Field(..., description="Number of shares")
    currency: str = Field(default="ILS", description="Currency code")


class IsraeliStockTransactionCreate(IsraeliStockTransactionBase):
    transaction_date: Optional[date] = Field(None, description="Transaction date")
    transaction_time: Optional[time] = Field(None, description="Transaction time")
    price: Optional[Decimal] = Field(None, description="Price per share")
    total_value: Optional[Decimal] = Field(None, description="Total transaction value")
    commission: Optional[Decimal] = Field(None, description="Broker commission")
    tax: Optional[Decimal] = Field(None, description="Tax amount")
    source_pdf: str = Field(..., description="Source PDF filename")
    
    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        allowed_types = ['BUY', 'SELL', 'DIVIDEND', 'FEE', 'SPLIT', 'BONUS']
        if v.upper() not in allowed_types:
            raise ValueError(f'Transaction type must be one of: {allowed_types}')
        return v.upper()


class IsraeliStockTransactionResponse(IsraeliStockTransactionBase):
    id: int
    user_id: str
    transaction_date: Optional[date]
    transaction_time: Optional[time]
    price: Optional[Decimal]
    total_value: Optional[Decimal]
    commission: Optional[Decimal]
    tax: Optional[Decimal]
    source_pdf: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Dividend schemas
class IsraeliDividendBase(IsraeliStockBase):
    payment_date: date = Field(..., description="Dividend payment date")
    amount: Decimal = Field(..., description="Dividend amount received")
    currency: str = Field(default="ILS", description="Currency code")


class IsraeliDividendCreate(IsraeliDividendBase):
    tax: Optional[Decimal] = Field(None, description="Tax withheld")
    source_pdf: str = Field(..., description="Source PDF filename")


class IsraeliDividendResponse(IsraeliDividendBase):
    id: int
    user_id: str
    tax: Optional[Decimal]
    source_pdf: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Summary schemas
class IsraeliStockSummaryResponse(IsraeliStockBase):
    id: int
    user_id: str
    
    # Holdings summary
    total_quantity: Decimal
    average_purchase_price: Optional[Decimal]
    total_purchase_cost: Decimal
    current_market_value: Decimal
    unrealized_gain_loss: Decimal
    unrealized_gain_loss_percent: Decimal
    
    # Transaction summary
    total_buy_quantity: Decimal
    total_sell_quantity: Decimal
    total_buy_value: Decimal
    total_sell_value: Decimal
    total_commission: Decimal
    total_tax: Decimal
    realized_gain_loss: Decimal
    
    # Dividend summary
    total_dividends_received: Decimal
    dividend_tax_withheld: Decimal
    net_dividends: Decimal
    
    # Metadata
    first_transaction_date: Optional[date]
    last_transaction_date: Optional[date]
    last_updated: datetime
    
    class Config:
        from_attributes = True


# API Request/Response schemas
class PDFUploadResponse(BaseModel):
    success: bool
    message: str
    pdf_name: Optional[str] = None
    holding_date: Optional[str] = None
    holdings_found: int = 0
    transactions_found: int = 0
    holdings_saved: int = 0
    transactions_saved: int = 0
    dividends_found: int = 0


class CSVAnalysisResponse(BaseModel):
    success: bool
    message: str
    holdings_found: int = 0
    transactions_found: int = 0
    holdings_saved: int = 0
    transactions_saved: int = 0
    dividends_found: int = 0
    holdings: List[IsraeliStockHoldingResponse] = []
    transactions: List[IsraeliStockTransactionResponse] = []
    dividends: List[IsraeliDividendResponse] = []


class PortfolioSummaryResponse(BaseModel):
    user_id: str
    total_holdings: int
    total_transactions: int
    total_dividends: int
    total_portfolio_value: Decimal
    total_purchase_cost: Decimal
    total_unrealized_gain_loss: Decimal
    total_realized_gain_loss: Decimal
    total_dividends_received: Decimal
    unique_stocks: int
    active_positions: int
    last_updated: datetime


class StockListFilter(BaseModel):
    index_name: Optional[str] = Field(None, description="Filter by index (TA-125 or SME-60)")
    is_active: Optional[bool] = Field(None, description="Filter by active status")
    limit: Optional[int] = Field(100, description="Maximum number of results")
    offset: Optional[int] = Field(0, description="Number of results to skip")


# Error response schemas
class ErrorResponse(BaseModel):
    error: bool = True
    message: str
    details: Optional[str] = None


class ValidationErrorResponse(BaseModel):
    error: bool = True
    message: str = "Validation error"
    details: List[dict]
