from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime

# User Registration
class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None

# User Login
class UserLogin(BaseModel):
    email: EmailStr
    password: str

# User Response
class UserResponse(BaseModel):
    id: int
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool
    is_verified: bool
    phone: Optional[str] = None
    country: Optional[str] = None
    base_currency: str = "USD"
    risk_tolerance: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# User Update
class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    country: Optional[str] = None
    base_currency: Optional[str] = None
    risk_tolerance: Optional[str] = None
    investment_goals: Optional[str] = None
    timezone: Optional[str] = None

# Token Response
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int

# Token Refresh
class TokenRefresh(BaseModel):
    refresh_token: str

# Password Reset Request
class PasswordResetRequest(BaseModel):
    email: EmailStr

# Password Reset
class PasswordReset(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)
