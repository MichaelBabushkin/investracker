"""
Calendar Events API endpoints for market holidays and economic events
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
from datetime import date, datetime
from typing import Optional, List

from app.core.deps import get_db, get_current_user
from app.models.user import User
from app.models.calendar_event import CalendarEvent, EventType
from app.schemas.calendar_event import (
    CalendarEventCreate,
    CalendarEventUpdate,
    CalendarEventResponse,
    CalendarEventList,
    EventTypeEnum
)

router = APIRouter()


@router.get("/events", response_model=CalendarEventList)
def get_calendar_events(
    start_date: Optional[date] = Query(None, description="Filter events from this date"),
    end_date: Optional[date] = Query(None, description="Filter events until this date"),
    market: Optional[str] = Query(None, description="Filter by market (US, IL, etc.)"),
    event_type: Optional[EventTypeEnum] = Query(None, description="Filter by event type"),
    limit: int = Query(100, ge=1, le=1000),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get calendar events with optional filters
    """
    query = db.query(CalendarEvent)
    
    # Apply filters
    filters = []
    if start_date:
        filters.append(CalendarEvent.event_date >= start_date)
    if end_date:
        filters.append(CalendarEvent.event_date <= end_date)
    if market:
        filters.append(CalendarEvent.market == market.upper())
    if event_type:
        filters.append(CalendarEvent.event_type == event_type)
    
    if filters:
        query = query.filter(and_(*filters))
    
    # Get total count
    total = query.count()
    
    # Get paginated results
    events = query.order_by(CalendarEvent.event_date).offset(offset).limit(limit).all()
    
    return CalendarEventList(events=events, total=total)


@router.get("/events/{event_id}", response_model=CalendarEventResponse)
def get_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get a specific calendar event by ID
    """
    event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    return event


@router.post("/events", response_model=CalendarEventResponse)
def create_calendar_event(
    event: CalendarEventCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Create a new calendar event (admin only)
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create calendar events")
    
    db_event = CalendarEvent(
        event_type=event.event_type,
        market=event.market.upper(),
        event_name=event.event_name,
        event_date=event.event_date,
        early_close_time=event.early_close_time,
        description=event.description
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event


@router.put("/events/{event_id}", response_model=CalendarEventResponse)
def update_calendar_event(
    event_id: int,
    event: CalendarEventUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Update a calendar event (admin only)
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update calendar events")
    
    db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    # Update only provided fields
    update_data = event.dict(exclude_unset=True)
    for field, value in update_data.items():
        if field == "market" and value:
            value = value.upper()
        setattr(db_event, field, value)
    
    db.commit()
    db.refresh(db_event)
    
    return db_event


@router.delete("/events/{event_id}")
def delete_calendar_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Delete a calendar event (admin only)
    """
    # Check if user is admin
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can delete calendar events")
    
    db_event = db.query(CalendarEvent).filter(CalendarEvent.id == event_id).first()
    if not db_event:
        raise HTTPException(status_code=404, detail="Calendar event not found")
    
    db.delete(db_event)
    db.commit()
    
    return {"message": "Calendar event deleted successfully"}


@router.get("/upcoming", response_model=List[CalendarEventResponse])
def get_upcoming_events(
    days: int = Query(30, ge=1, le=365, description="Number of days to look ahead"),
    market: Optional[str] = Query(None, description="Filter by market"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get upcoming events within the specified number of days
    """
    from datetime import timedelta
    
    today = date.today()
    end_date = today + timedelta(days=days)
    
    query = db.query(CalendarEvent).filter(
        and_(
            CalendarEvent.event_date >= today,
            CalendarEvent.event_date <= end_date
        )
    )
    
    if market:
        query = query.filter(CalendarEvent.market == market.upper())
    
    events = query.order_by(CalendarEvent.event_date).all()
    return events
