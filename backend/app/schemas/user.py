from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional
from datetime import datetime
from app.models.enums import UserRole

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
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole = UserRole.USER
    is_active: bool
    is_verified: bool
    phone: Optional[str] = None
    country: Optional[str] = None
    base_currency: str = "USD"
    risk_tolerance: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True
        use_enum_values = True  # This will use the enum value (string) instead of enum name

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

# Admin: Update User Role
class UserRoleUpdate(BaseModel):
    user_id: str
    role: UserRole
    
    @field_validator('role')
    @classmethod
    def validate_role(cls, v):
        if not UserRole.is_valid_role(v.value):
            raise ValueError(f'Invalid role. Must be one of: {UserRole.get_all_roles()}')
        return v

# Admin: User List Response
class UserListResponse(BaseModel):
    id: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    role: UserRole
    is_active: bool
    is_verified: bool
    created_at: datetime
    
    class Config:
        from_attributes = True
    new_password: str = Field(..., min_length=8)
