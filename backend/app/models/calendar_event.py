"""
Calendar Event Model for market holidays, economic events, and other calendar items
"""
from sqlalchemy import Column, Integer, String, Date, Time, Text, DateTime
from sqlalchemy.dialects.postgresql import ENUM
from sqlalchemy.sql import func
import enum
from app.core.database import Base


class EventType(str, enum.Enum):
    """Types of calendar events"""
    MARKET_CLOSED = "MARKET_CLOSED"  # Full market closure (holiday)
    EARLY_CLOSE = "EARLY_CLOSE"      # Early market close
    EARNINGS = "EARNINGS"            # Earnings announcement
    ECONOMIC_DATA = "ECONOMIC_DATA"  # Economic indicators (CPI, jobs, etc.)
    FOMC = "FOMC"                    # Federal Reserve meetings
    HOLIDAY = "HOLIDAY"              # General holiday


class CalendarEvent(Base):
    """
    Calendar events for tracking market closures, economic events, and other important dates
    """
    __tablename__ = "calendar_events"

    id = Column(Integer, primary_key=True, index=True)
    # Use String for event_type in model - the actual ENUM is created by migration
    # This prevents SQLAlchemy from trying to create the type during metadata operations
    event_type = Column(String(50), nullable=False, index=True)
    market = Column(String(10), nullable=False, index=True)  # 'US', 'IL', etc.
    event_name = Column(String(255), nullable=False)
    event_date = Column(Date, nullable=False, index=True)
    early_close_time = Column(Time, nullable=True)  # Only for EARLY_CLOSE events
    description = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    def __repr__(self):
        return f"<CalendarEvent(id={self.id}, type={self.event_type}, market={self.market}, name={self.event_name}, date={self.event_date})>"
