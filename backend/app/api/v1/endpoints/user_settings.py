"""
User Settings API endpoints for notification preferences and profile settings
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.user_event_notification_preferences import UserEventNotificationPreferences
from app.schemas.user_event_notification_preferences import (
    UserEventNotificationPreferencesCreate,
    UserEventNotificationPreferencesUpdate,
    UserEventNotificationPreferencesResponse
)

router = APIRouter()


@router.get("/notification-preferences", response_model=UserEventNotificationPreferencesResponse)
def get_notification_preferences(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get user's event notification preferences
    Creates default preferences if none exist
    """
    prefs = db.query(UserEventNotificationPreferences).filter(
        UserEventNotificationPreferences.user_id == current_user.id
    ).first()
    
    # Create default preferences if they don't exist
    if not prefs:
        prefs = UserEventNotificationPreferences(
            user_id=current_user.id,
            notify_markets=["US", "IL"],
            notify_event_types=["MARKET_CLOSED", "EARLY_CLOSE", "EARNINGS", "ECONOMIC_DATA", "FOMC", "HOLIDAY"],
            notify_days_before=1
        )
        db.add(prefs)
        db.commit()
        db.refresh(prefs)
    
    return prefs


@router.put("/notification-preferences", response_model=UserEventNotificationPreferencesResponse)
def update_notification_preferences(
    preferences: UserEventNotificationPreferencesUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update user's event notification preferences
    """
    prefs = db.query(UserEventNotificationPreferences).filter(
        UserEventNotificationPreferences.user_id == current_user.id
    ).first()
    
    # Create if doesn't exist
    if not prefs:
        prefs = UserEventNotificationPreferences(
            user_id=current_user.id,
            notify_markets=["US", "IL"],
            notify_event_types=["MARKET_CLOSED", "EARLY_CLOSE", "EARNINGS", "ECONOMIC_DATA", "FOMC", "HOLIDAY"],
            notify_days_before=1
        )
        db.add(prefs)
    
    # Update only provided fields
    update_data = preferences.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(prefs, field, value)
    
    db.commit()
    db.refresh(prefs)
    
    return prefs


@router.post("/notification-preferences", response_model=UserEventNotificationPreferencesResponse)
def create_notification_preferences(
    preferences: UserEventNotificationPreferencesCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create user's event notification preferences
    """
    # Check if already exists
    existing = db.query(UserEventNotificationPreferences).filter(
        UserEventNotificationPreferences.user_id == current_user.id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Notification preferences already exist. Use PUT to update.")
    
    prefs = UserEventNotificationPreferences(
        user_id=current_user.id,
        **preferences.dict()
    )
    
    db.add(prefs)
    db.commit()
    db.refresh(prefs)
    
    return prefs
