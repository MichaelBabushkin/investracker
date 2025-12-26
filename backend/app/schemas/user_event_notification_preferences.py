"""
Pydantic schemas for User Event Notification Preferences API
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import List


class UserEventNotificationPreferencesBase(BaseModel):
    """Base schema for event notification preferences"""
    notify_markets: List[str] = Field(default=["US", "IL"], description="List of markets to get notifications for")
    notify_event_types: List[str] = Field(
        default=["MARKET_CLOSED", "EARLY_CLOSE", "EARNINGS", "ECONOMIC_DATA", "FOMC", "HOLIDAY"],
        description="List of event types to get notifications for"
    )
    notify_days_before: int = Field(default=1, ge=0, le=30, description="Days before event to send notification")


class UserEventNotificationPreferencesCreate(UserEventNotificationPreferencesBase):
    """Schema for creating notification preferences"""
    pass


class UserEventNotificationPreferencesUpdate(BaseModel):
    """Schema for updating notification preferences"""
    notify_markets: List[str] | None = None
    notify_event_types: List[str] | None = None
    notify_days_before: int | None = Field(None, ge=0, le=30)


class UserEventNotificationPreferencesResponse(UserEventNotificationPreferencesBase):
    """Schema for notification preferences response"""
    id: int
    user_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
