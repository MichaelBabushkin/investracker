"""
User Event Notification Preferences Model
"""
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.core.database import Base


class UserEventNotificationPreferences(Base):
    """
    User preferences for calendar event notifications
    Stores which markets and event types the user wants to be notified about
    """
    __tablename__ = "user_event_notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(255), ForeignKey('users.id', ondelete='CASCADE'), nullable=False, unique=True, index=True)
    notify_markets = Column(JSON, nullable=False, default=["US", "IL"])  # List of market codes
    notify_event_types = Column(JSON, nullable=False, default=["MARKET_CLOSED", "EARLY_CLOSE", "EARNINGS", "ECONOMIC_DATA", "FOMC", "HOLIDAY"])
    notify_days_before = Column(Integer, nullable=False, default=1)  # Days before event to send notification
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    # Relationship
    user = relationship("User", back_populates="event_notification_preferences")

    def __repr__(self):
        return f"<UserEventNotificationPreferences(user_id={self.user_id}, markets={self.notify_markets}, types={self.notify_event_types})>"
