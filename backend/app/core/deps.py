"""
Dependencies for API endpoints
"""

from typing import Generator, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from jose import JWTError, jwt
from datetime import datetime

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.user import User

# Security
security = HTTPBearer()

def get_db() -> Generator:
    """
    Get database session
    """
    try:
        db = SessionLocal()
        yield db
    finally:
        db.close()

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user from JWT token.
    For Israeli stocks demo, we'll make this optional and create a demo user if needed.
    """
    if not credentials:
        # For demo purposes, return a demo user
        return get_or_create_demo_user(db)
    
    try:
        # Decode JWT token
        payload = jwt.decode(
            credentials.credentials, 
            settings.SECRET_KEY, 
            algorithms=[settings.ALGORITHM]
        )
        user_id: int = payload.get("sub")
        if user_id is None:
            return get_or_create_demo_user(db)
            
    except JWTError:
        return get_or_create_demo_user(db)
    
    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if user is None:
        return get_or_create_demo_user(db)
        
    return user

def get_or_create_demo_user(db: Session) -> User:
    """
    Get or create a demo user for testing Israeli stocks functionality
    """
    demo_email = "demo@israelistocks.com"
    
    # Try to find existing demo user
    demo_user = db.query(User).filter(User.email == demo_email).first()
    
    if not demo_user:
        # Create demo user
        demo_user = User(
            email=demo_email,
            hashed_password="demo_password_hash",  # Demo password
            first_name="Demo",
            last_name="User",
            is_active=True,
            is_verified=True
        )
        db.add(demo_user)
        db.commit()
        db.refresh(demo_user)
    
    return demo_user

def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current active user
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    return current_user

def get_current_verified_user(current_user: User = Depends(get_current_user)) -> User:
    """
    Get current verified user
    """
    if not current_user.is_verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User not verified"
        )
    return current_user
