from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime

# Portfolio Creation
class PortfolioCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    base_currency: str = Field(default="USD", max_length=3)

# Portfolio Update
class PortfolioUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    base_currency: Optional[str] = Field(None, max_length=3)
    is_active: Optional[bool] = None

# Portfolio Response
class PortfolioResponse(BaseModel):
    id: int
    user_id: str
    name: str
    description: Optional[str] = None
    base_currency: str
    is_active: bool
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Portfolio metrics (calculated fields)
    total_value: Optional[float] = None
    total_cost: Optional[float] = None
    unrealized_gain_loss: Optional[float] = None
    unrealized_gain_loss_percent: Optional[float] = None
    
    class Config:
        from_attributes = True

# Portfolio Summary (for listings)
class PortfolioSummary(BaseModel):
    id: int
    name: str
    base_currency: str
    total_value: Optional[float] = None
    unrealized_gain_loss: Optional[float] = None
    unrealized_gain_loss_percent: Optional[float] = None
    asset_count: int = 0
    
    class Config:
        from_attributes = True
