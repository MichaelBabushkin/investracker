"""
Pydantic schemas for World Stock Analysis API
These schemas are used for request/response validation and serialization
"""
from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict
from datetime import date, datetime, time
from decimal import Decimal


# Account schemas
class WorldStockAccountBase(BaseModel):
    account_number: str = Field(..., description="Broker account number")
    account_alias: Optional[str] = Field(None, description="Account alias/nickname")
    account_type: Optional[str] = Field(None, description="Account type (Individual, Joint, etc)")
    base_currency: str = Field(default="USD", description="Base currency code")
    broker_name: Optional[str] = Field(None, description="Broker name")


class WorldStockAccountCreate(WorldStockAccountBase):
    pass


class WorldStockAccountResponse(WorldStockAccountBase):
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True


# Holding schemas
class WorldStockHoldingBase(BaseModel):
    symbol: str = Field(..., description="Stock trading symbol")
    company_name: Optional[str] = Field(None, description="Company name")
    quantity: Optional[Decimal] = Field(None, description="Number of shares held")
    currency: str = Field(default="USD", description="Currency code")


class WorldStockHoldingCreate(WorldStockHoldingBase):
    avg_entry_price: Optional[Decimal] = Field(None, description="Average entry price per share")
    current_price: Optional[Decimal] = Field(None, description="Current price per share")
    current_value: Optional[Decimal] = Field(None, description="Current market value")
    purchase_cost: Optional[Decimal] = Field(None, description="Total purchase cost/basis")
    unrealized_pl: Optional[Decimal] = Field(None, description="Unrealized profit/loss")
    unrealized_pl_percent: Optional[Decimal] = Field(None, description="Unrealized P/L percentage")
    source_pdf: str = Field(..., description="Source PDF filename")


class WorldStockHoldingResponse(WorldStockHoldingBase):
    id: int
    user_id: str
    account_id: Optional[int]
    avg_entry_price: Optional[Decimal]
    current_price: Optional[Decimal]
    current_value: Optional[Decimal]
    purchase_cost: Optional[Decimal]
    unrealized_pl: Optional[Decimal]
    unrealized_pl_percent: Optional[Decimal]
    source_pdf: str
    last_updated: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True


# Transaction schemas
class WorldStockTransactionBase(BaseModel):
    symbol: str = Field(..., description="Stock trading symbol")
    transaction_date: Optional[date] = Field(None, description="Transaction date")
    transaction_type: Optional[str] = Field(None, description="Transaction type (OPEN, CLOSE, PARTIAL, BUY, SELL)")
    quantity: Optional[Decimal] = Field(None, description="Number of shares")
    currency: str = Field(default="USD", description="Currency code")


class WorldStockTransactionCreate(WorldStockTransactionBase):
    transaction_time: Optional[str] = Field(None, description="Transaction time")
    trade_price: Optional[Decimal] = Field(None, description="Execution price per share")
    close_price: Optional[Decimal] = Field(None, description="Closing price per share")
    proceeds: Optional[Decimal] = Field(None, description="Transaction proceeds")
    commission: Optional[Decimal] = Field(None, description="Commission paid")
    basis: Optional[Decimal] = Field(None, description="Cost basis")
    realized_pl: Optional[Decimal] = Field(None, description="Realized profit/loss")
    mtm_pl: Optional[Decimal] = Field(None, description="Mark-to-market P/L")
    trade_code: Optional[str] = Field(None, description="Trade code (O, C, P)")
    source_pdf: str = Field(..., description="Source PDF filename")
    
    @validator('transaction_type')
    def validate_transaction_type(cls, v):
        if v is None:
            return v
        allowed_types = ['OPEN', 'CLOSE', 'PARTIAL', 'BUY', 'SELL', 'O', 'C', 'P']
        if v.upper() not in allowed_types:
            raise ValueError(f'Transaction type must be one of: {allowed_types}')
        return v.upper()


class WorldStockTransactionResponse(WorldStockTransactionBase):
    id: int
    user_id: str
    account_id: Optional[int]
    transaction_time: Optional[str]
    trade_price: Optional[Decimal]
    close_price: Optional[Decimal]
    proceeds: Optional[Decimal]
    commission: Optional[Decimal]
    basis: Optional[Decimal]
    realized_pl: Optional[Decimal]
    mtm_pl: Optional[Decimal]
    trade_code: Optional[str]
    source_pdf: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Dividend schemas
class WorldStockDividendBase(BaseModel):
    symbol: str = Field(..., description="Stock trading symbol")
    payment_date: Optional[date] = Field(None, description="Dividend payment date")
    amount: Optional[Decimal] = Field(None, description="Gross dividend amount")
    currency: str = Field(default="USD", description="Currency code")


class WorldStockDividendCreate(WorldStockDividendBase):
    isin: Optional[str] = Field(None, description="ISIN code")
    amount_per_share: Optional[Decimal] = Field(None, description="Dividend amount per share")
    withholding_tax: Optional[Decimal] = Field(None, description="Tax withheld")
    net_amount: Optional[Decimal] = Field(None, description="Net amount received")
    dividend_type: Optional[str] = Field(None, description="Dividend type")
    source_pdf: str = Field(..., description="Source PDF filename")


class WorldStockDividendResponse(WorldStockDividendBase):
    id: int
    user_id: str
    account_id: Optional[int]
    isin: Optional[str]
    amount_per_share: Optional[Decimal]
    withholding_tax: Optional[Decimal]
    net_amount: Optional[Decimal]
    dividend_type: Optional[str]
    source_pdf: str
    created_at: datetime
    
    class Config:
        from_attributes = True


# Performance schemas
class WorldStockPerformanceBase(BaseModel):
    report_start_date: Optional[date] = Field(None, description="Report period start date")
    report_end_date: Optional[date] = Field(None, description="Report period end date")


class WorldStockPerformanceCreate(WorldStockPerformanceBase):
    starting_nav: Optional[Decimal] = Field(None, description="Starting net asset value")
    ending_nav: Optional[Decimal] = Field(None, description="Ending net asset value")
    total_deposits: Optional[Decimal] = Field(None, description="Total deposits in period")
    total_withdrawals: Optional[Decimal] = Field(None, description="Total withdrawals in period")
    total_dividends: Optional[Decimal] = Field(None, description="Total dividends received")
    total_withholding_tax: Optional[Decimal] = Field(None, description="Total withholding tax")
    total_commissions: Optional[Decimal] = Field(None, description="Total commissions paid")
    total_fees: Optional[Decimal] = Field(None, description="Total fees paid")
    time_weighted_return: Optional[Decimal] = Field(None, description="Time-weighted rate of return (%)")


class WorldStockPerformanceResponse(WorldStockPerformanceBase):
    id: int
    user_id: str
    account_id: Optional[int]
    starting_nav: Optional[Decimal]
    ending_nav: Optional[Decimal]
    total_deposits: Optional[Decimal]
    total_withdrawals: Optional[Decimal]
    total_dividends: Optional[Decimal]
    total_withholding_tax: Optional[Decimal]
    total_commissions: Optional[Decimal]
    total_fees: Optional[Decimal]
    time_weighted_return: Optional[Decimal]
    created_at: datetime
    
    class Config:
        from_attributes = True


# Upload response
class WorldStockUploadResponse(BaseModel):
    success: bool
    pdf_name: str
    account_number: Optional[str]
    account_id: Optional[int]
    holdings_found: int
    transactions_found: int
    dividends_found: int
    holdings_saved: int
    transactions_saved: int
    dividends_saved: int
    error: Optional[str] = None


# Summary/Dashboard schemas
class WorldStockSummaryResponse(BaseModel):
    total_accounts: int
    total_value: Decimal
    total_unrealized_pl: Decimal
    total_unrealized_pl_percent: Decimal
    total_dividends: Decimal
    total_withholding_tax: Decimal
    total_commissions: Decimal
    holdings_count: int
    transactions_count: int
    dividends_count: int
    
    class Config:
        from_attributes = True


# List responses
class WorldStockAccountListResponse(BaseModel):
    accounts: List[WorldStockAccountResponse]
    total: int


class WorldStockHoldingListResponse(BaseModel):
    holdings: List[WorldStockHoldingResponse]
    total: int
    summary: Optional[Dict] = None


class WorldStockTransactionListResponse(BaseModel):
    transactions: List[WorldStockTransactionResponse]
    total: int
    summary: Optional[Dict] = None


class WorldStockDividendListResponse(BaseModel):
    dividends: List[WorldStockDividendResponse]
    total: int
    summary: Optional[Dict] = None
