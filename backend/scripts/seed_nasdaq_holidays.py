"""
Seed script to populate calendar_events table with US market holidays from Nasdaq
"""
import sys
from pathlib import Path

# Add parent directory to path
sys.path.append(str(Path(__file__).parent.parent))

from sqlalchemy.orm import Session
from datetime import date, time
from app.core.database import SessionLocal
from app.models.calendar_event import CalendarEvent, EventType


def seed_nasdaq_holidays():
    """Seed US market holidays for 2025 and 2026"""
    
    db: Session = SessionLocal()
    
    try:
        # 2025 US Market Holidays
        holidays_2025 = [
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "New Year's Day",
                "event_date": date(2025, 1, 1),
                "description": "Market closed for New Year's Day holiday"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Martin Luther King Jr. Day",
                "event_date": date(2025, 1, 20),
                "description": "Market closed for MLK Jr. Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Presidents Day",
                "event_date": date(2025, 2, 17),
                "description": "Market closed for Presidents Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Good Friday",
                "event_date": date(2025, 4, 18),
                "description": "Market closed for Good Friday"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Memorial Day",
                "event_date": date(2025, 5, 26),
                "description": "Market closed for Memorial Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Juneteenth",
                "event_date": date(2025, 6, 19),
                "description": "Market closed for Juneteenth National Independence Day"
            },
            {
                "event_type": EventType.EARLY_CLOSE,
                "market": "US",
                "event_name": "Early Close - Independence Day",
                "event_date": date(2025, 7, 3),
                "early_close_time": time(13, 0),  # 1:00 PM ET
                "description": "Early close at 1:00 PM ET before Independence Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Independence Day",
                "event_date": date(2025, 7, 4),
                "description": "Market closed for Independence Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Labor Day",
                "event_date": date(2025, 9, 1),
                "description": "Market closed for Labor Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Thanksgiving",
                "event_date": date(2025, 11, 27),
                "description": "Market closed for Thanksgiving"
            },
            {
                "event_type": EventType.EARLY_CLOSE,
                "market": "US",
                "event_name": "Early Close - Day After Thanksgiving",
                "event_date": date(2025, 11, 28),
                "early_close_time": time(13, 0),  # 1:00 PM ET
                "description": "Early close at 1:00 PM ET on Black Friday"
            },
            {
                "event_type": EventType.EARLY_CLOSE,
                "market": "US",
                "event_name": "Early Close - Christmas Eve",
                "event_date": date(2025, 12, 24),
                "early_close_time": time(13, 0),  # 1:00 PM ET
                "description": "Early close at 1:00 PM ET on Christmas Eve"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Christmas",
                "event_date": date(2025, 12, 25),
                "description": "Market closed for Christmas Day"
            },
        ]
        
        # 2026 US Market Holidays
        holidays_2026 = [
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "New Year's Day",
                "event_date": date(2026, 1, 1),
                "description": "Market closed for New Year's Day holiday"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Martin Luther King Jr. Day",
                "event_date": date(2026, 1, 19),
                "description": "Market closed for MLK Jr. Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Presidents Day",
                "event_date": date(2026, 2, 16),
                "description": "Market closed for Presidents Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Good Friday",
                "event_date": date(2026, 4, 3),
                "description": "Market closed for Good Friday"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Memorial Day",
                "event_date": date(2026, 5, 25),
                "description": "Market closed for Memorial Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Juneteenth",
                "event_date": date(2026, 6, 19),
                "description": "Market closed for Juneteenth National Independence Day"
            },
            {
                "event_type": EventType.EARLY_CLOSE,
                "market": "US",
                "event_name": "Early Close - Independence Day Observed",
                "event_date": date(2026, 7, 3),
                "early_close_time": time(13, 0),  # 1:00 PM ET
                "description": "Early close at 1:00 PM ET, Independence Day observed"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Labor Day",
                "event_date": date(2026, 9, 7),
                "description": "Market closed for Labor Day"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Thanksgiving",
                "event_date": date(2026, 11, 26),
                "description": "Market closed for Thanksgiving"
            },
            {
                "event_type": EventType.EARLY_CLOSE,
                "market": "US",
                "event_name": "Early Close - Day After Thanksgiving",
                "event_date": date(2026, 11, 27),
                "early_close_time": time(13, 0),  # 1:00 PM ET
                "description": "Early close at 1:00 PM ET on Black Friday"
            },
            {
                "event_type": EventType.EARLY_CLOSE,
                "market": "US",
                "event_name": "Early Close - Christmas Eve",
                "event_date": date(2026, 12, 24),
                "early_close_time": time(13, 0),  # 1:00 PM ET
                "description": "Early close at 1:00 PM ET on Christmas Eve"
            },
            {
                "event_type": EventType.MARKET_CLOSED,
                "market": "US",
                "event_name": "Christmas",
                "event_date": date(2026, 12, 25),
                "description": "Market closed for Christmas Day"
            },
        ]
        
        all_holidays = holidays_2025 + holidays_2026
        
        # Check if events already exist
        existing_count = db.query(CalendarEvent).filter(CalendarEvent.market == "US").count()
        if existing_count > 0:
            print(f"Calendar already has {existing_count} US market events. Skipping seed.")
            return
        
        # Create events
        events_created = 0
        for holiday_data in all_holidays:
            event = CalendarEvent(**holiday_data)
            db.add(event)
            events_created += 1
        
        db.commit()
        print(f"✅ Successfully seeded {events_created} US market holidays (2025-2026)")
        
    except Exception as e:
        print(f"❌ Error seeding calendar events: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    print("Seeding US market holidays from Nasdaq...")
    seed_nasdaq_holidays()
