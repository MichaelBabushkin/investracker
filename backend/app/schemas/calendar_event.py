"""
Pydantic schemas for Calendar Events API
"""
from pydantic import BaseModel, Field
from datetime import date, time, datetime
from typing import Optional
from enum import Enum


class EventTypeEnum(str, Enum):
    """Event type enumeration"""
    MARKET_CLOSED = "MARKET_CLOSED"
    EARLY_CLOSE = "EARLY_CLOSE"
    EARNINGS = "EARNINGS"
    ECONOMIC_DATA = "ECONOMIC_DATA"
    FOMC = "FOMC"
    HOLIDAY = "HOLIDAY"


class CalendarEventBase(BaseModel):
    """Base schema for calendar events"""
    event_type: EventTypeEnum
    market: str = Field(..., max_length=10, description="Market identifier (e.g., 'US', 'IL')")
    event_name: str = Field(..., max_length=255)
    event_date: date
    early_close_time: Optional[time] = Field(None, description="For early close events, the closing time")
    description: Optional[str] = None


class CalendarEventCreate(CalendarEventBase):
    """Schema for creating a calendar event"""
    pass


class CalendarEventUpdate(BaseModel):
    """Schema for updating a calendar event"""
    event_type: Optional[EventTypeEnum] = None
    market: Optional[str] = Field(None, max_length=10)
    event_name: Optional[str] = Field(None, max_length=255)
    event_date: Optional[date] = None
    early_close_time: Optional[time] = None
    description: Optional[str] = None


class CalendarEventResponse(CalendarEventBase):
    """Schema for calendar event response"""
    id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class CalendarEventList(BaseModel):
    """Schema for list of calendar events"""
    events: list[CalendarEventResponse]
    total: int
