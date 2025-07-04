from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum

class TransactionTypeEnum(str, Enum):
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

# Transaction Creation
class TransactionCreate(BaseModel):
    portfolio_id: int
    asset_id: Optional[int] = None
    transaction_type: TransactionTypeEnum
    transaction_date: datetime
    settlement_date: Optional[datetime] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: float
    fees: float = 0.0
    currency: str = Field(default="USD", max_length=3)
    description: Optional[str] = None
    broker: Optional[str] = None
    account_number: Optional[str] = None

# Transaction Update
class TransactionUpdate(BaseModel):
    transaction_type: Optional[TransactionTypeEnum] = None
    transaction_date: Optional[datetime] = None
    settlement_date: Optional[datetime] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: Optional[float] = None
    fees: Optional[float] = None
    description: Optional[str] = None

# Transaction Response
class TransactionResponse(BaseModel):
    id: int
    portfolio_id: int
    asset_id: Optional[int] = None
    transaction_type: TransactionTypeEnum
    transaction_date: datetime
    settlement_date: Optional[datetime] = None
    quantity: Optional[float] = None
    price: Optional[float] = None
    amount: float
    fees: float
    currency: str
    description: Optional[str] = None
    broker: Optional[str] = None
    account_number: Optional[str] = None
    created_at: datetime
    
    # Related asset information (if applicable)
    asset_symbol: Optional[str] = None
    asset_name: Optional[str] = None
    
    class Config:
        from_attributes = True
