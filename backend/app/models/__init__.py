# This file makes the models directory a Python package
# Import all models so SQLAlchemy can find them

from .user import User

# Israeli Stock Analysis Models
from .israeli_stock_models import (
    IsraeliStock,
    IsraeliStockHolding,
    IsraeliStockTransaction,
    IsraeliDividend,
)
from .pending_transaction import PendingIsraeliTransaction
from .israeli_report import IsraeliReportUpload

# World Stock Analysis Models
from .world_stock_models import (
    WorldStock,
    WorldStockHolding,
    WorldStockTransaction,
    WorldDividend,
    PendingWorldTransaction,
    ExchangeRate
)

# Calendar Events
from .calendar_event import CalendarEvent, EventType

# User Notification Preferences
from .user_event_notification_preferences import UserEventNotificationPreferences

# Education Progress
from .education_progress import EducationProgress

__all__ = [
    "User",
    # Israeli Stock Models
    "IsraeliStock",
    "IsraeliStockHolding",
    "IsraeliStockTransaction", 
    "IsraeliDividend",
    "PendingIsraeliTransaction",
    "IsraeliReportUpload",
    # World Stock Models
    "WorldStock",
    "WorldStockHolding",
    "WorldStockTransaction",
    "WorldDividend",
    "PendingWorldTransaction",
    "ExchangeRate",
    # Calendar & Notifications
    "CalendarEvent",
    "EventType",
    "UserEventNotificationPreferences",
    # Education
    "EducationProgress",
]