from sqlalchemy import Column, Integer, String, Boolean, DateTime, Text, Enum as SQLEnum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from app.models.enums import UserRole
import uuid
import hashlib

def generate_user_id():
    """Generate a secure hashed user ID"""
    # Generate a UUID and hash it for additional security
    unique_id = str(uuid.uuid4())
    hashed_id = hashlib.sha256(unique_id.encode()).hexdigest()[:16]  # Use first 16 chars for readability
    return f"user_{hashed_id}"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String(25), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=True)
    last_name = Column(String(100), nullable=True)
    role = Column(SQLEnum(UserRole), default=UserRole.USER, nullable=False)
    is_active = Column(Boolean, default=True)
    is_verified = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Profile information
    phone = Column(String(20), nullable=True)
    date_of_birth = Column(DateTime, nullable=True)
    country = Column(String(2), nullable=True)  # ISO country code
    timezone = Column(String(50), default="UTC")
    
    # Preferences
    base_currency = Column(String(3), default="USD")  # ISO currency code
    risk_tolerance = Column(String(20), nullable=True)  # conservative, moderate, aggressive
    investment_goals = Column(Text, nullable=True)
    
    # Relationships
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    report_uploads = relationship("ReportUpload", back_populates="user", cascade="all, delete-orphan")
    event_notification_preferences = relationship("UserEventNotificationPreferences", back_populates="user", uselist=False, cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"
