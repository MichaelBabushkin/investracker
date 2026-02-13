"""
Admin API endpoints for user and system management
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import List, Optional
from datetime import datetime
import subprocess
import os

from app.core.database import get_db, engine
from app.core.auth import get_admin_user
from app.models.user import User
from app.models.enums import UserRole
from app.schemas.user import UserListResponse, UserRoleUpdate, UserResponse

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=List[UserListResponse])
def list_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    role: Optional[UserRole] = None,
    is_active: Optional[bool] = None,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    List all users in the system (Admin only)
    
    - **skip**: Number of records to skip (pagination)
    - **limit**: Maximum number of records to return
    - **role**: Filter by user role
    - **is_active**: Filter by active status
    """
    query = db.query(User)
    
    # Apply filters
    if role:
        query = query.filter(User.role == role)
    if is_active is not None:
        query = query.filter(User.is_active == is_active)
    
    # Execute query with pagination
    users = query.offset(skip).limit(limit).all()
    
    return users


@router.get("/users/{user_id}", response_model=UserResponse)
def get_user_details(
    user_id: str,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed information about a specific user (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user


@router.put("/users/{user_id}/role", response_model=UserResponse)
def update_user_role(
    user_id: str,
    role_update: UserRoleUpdate,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Update a user's role (Admin only)
    
    - Admins can change any user's role
    - Cannot demote yourself from admin (safety measure)
    """
    # Prevent admin from demoting themselves
    if user_id == current_admin.id and role_update.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot demote yourself from admin role"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Update role
    user.role = role_update.role
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return user


@router.put("/users/{user_id}/activate", response_model=UserResponse)
def activate_user(
    user_id: str,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Activate a user account (Admin only)
    """
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = True
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return user


@router.put("/users/{user_id}/deactivate", response_model=UserResponse)
def deactivate_user(
    user_id: str,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Deactivate a user account (Admin only)
    
    - Cannot deactivate your own account (safety measure)
    """
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot deactivate your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    user.is_active = False
    user.updated_at = datetime.utcnow()
    
    db.commit()
    db.refresh(user)
    
    return user


@router.delete("/users/{user_id}")
def delete_user(
    user_id: str,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Permanently delete a user account (Admin only)
    
    - Cannot delete your own account (safety measure)
    - This action is irreversible
    """
    if user_id == current_admin.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    user = db.query(User).filter(User.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    db.delete(user)
    db.commit()
    
    return {"message": f"User {user.email} has been permanently deleted"}


@router.get("/stats")
def get_system_stats(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get system statistics (Admin only)
    """
    total_users = db.query(User).count()
    active_users = db.query(User).filter(User.is_active == True).count()
    admin_users = db.query(User).filter(User.role == UserRole.ADMIN).count()
    regular_users = db.query(User).filter(User.role == UserRole.USER).count()
    viewer_users = db.query(User).filter(User.role == UserRole.VIEWER).count()
    verified_users = db.query(User).filter(User.is_verified == True).count()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "inactive_users": total_users - active_users,
        "verified_users": verified_users,
        "unverified_users": total_users - verified_users,
        "users_by_role": {
            "admin": admin_users,
            "user": regular_users,
            "viewer": viewer_users
        }
    }


@router.delete("/users/{email}/stock-data")
def reset_user_stock_data(
    email: str,
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Delete all stock data for a specific user by email (Admin only)
    
    This removes:
    - Israeli stock holdings, transactions, and dividends
    - World stock holdings, transactions, and dividends
    - Pending transactions (for review) from both portfolios
    - Uploaded PDF reports
    
    Does NOT remove:
    - User account
    - Portfolios
    """
    # Find user by email
    user = db.query(User).filter(User.email == email).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with email '{email}' not found"
        )
    
    user_id = str(user.id)
    
    try:
        # Delete stock data using raw SQL for efficiency
        with engine.connect() as conn:
            # Delete Israeli pending transactions first (foreign key to upload_batch_id)
            israeli_pending_result = conn.execute(
                text('DELETE FROM "PendingIsraeliTransaction" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            israeli_pending_deleted = israeli_pending_result.rowcount
            
            # Delete World pending transactions
            world_pending_result = conn.execute(
                text('DELETE FROM "PendingWorldTransaction" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            world_pending_deleted = world_pending_result.rowcount
            
            # Delete uploaded PDF reports (will cascade delete due to foreign key, but doing explicitly for count)
            reports_result = conn.execute(
                text('DELETE FROM "IsraeliReportUpload" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            reports_deleted = reports_result.rowcount
            
            # Delete Israeli holdings
            israeli_holdings_result = conn.execute(
                text('DELETE FROM "IsraeliStockHolding" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            israeli_holdings_deleted = israeli_holdings_result.rowcount
            
            # Delete Israeli transactions
            israeli_transactions_result = conn.execute(
                text('DELETE FROM "IsraeliStockTransaction" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            israeli_transactions_deleted = israeli_transactions_result.rowcount
            
            # Delete Israeli dividends
            israeli_dividends_result = conn.execute(
                text('DELETE FROM "IsraeliDividend" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            israeli_dividends_deleted = israeli_dividends_result.rowcount
            
            # Delete World holdings
            world_holdings_result = conn.execute(
                text('DELETE FROM "WorldStockHolding" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            world_holdings_deleted = world_holdings_result.rowcount
            
            # Delete World transactions
            world_transactions_result = conn.execute(
                text('DELETE FROM "WorldStockTransaction" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            world_transactions_deleted = world_transactions_result.rowcount
            
            # Delete World dividends
            world_dividends_result = conn.execute(
                text('DELETE FROM "WorldDividend" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            world_dividends_deleted = world_dividends_result.rowcount
            
            # Commit the transaction
            conn.commit()
        
        total_deleted = (
            israeli_holdings_deleted + israeli_transactions_deleted + israeli_dividends_deleted +
            world_holdings_deleted + world_transactions_deleted + world_dividends_deleted +
            israeli_pending_deleted + world_pending_deleted + reports_deleted
        )
        
        return {
            "success": True,
            "message": f"Successfully deleted all stock data for user {email}",
            "user_id": user_id,
            "user_email": email,
            "deleted": {
                "israeli": {
                    "holdings": israeli_holdings_deleted,
                    "transactions": israeli_transactions_deleted,
                    "dividends": israeli_dividends_deleted,
                    "pending": israeli_pending_deleted,
                },
                "world": {
                    "holdings": world_holdings_deleted,
                    "transactions": world_transactions_deleted,
                    "dividends": world_dividends_deleted,
                    "pending": world_pending_deleted,
                },
                "uploaded_reports": reports_deleted,
                "total": total_deleted
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting stock data: {str(e)}"
        )


@router.post("/run-migrations")
async def run_migrations(current_admin: User = Depends(get_admin_user)):
    """
    Run database migrations (alembic upgrade head)
    Admin only endpoint - use this to apply pending database migrations
    """
    try:
        # Get the backend directory (parent of app directory)
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        
        # Run alembic upgrade head
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        return {
            "success": result.returncode == 0,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "return_code": result.returncode,
            "message": "Migration completed successfully" if result.returncode == 0 else "Migration failed"
        }
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_408_REQUEST_TIMEOUT,
            detail="Migration timed out after 60 seconds"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running migrations: {str(e)}"
        )


@router.post("/seed-calendar-events")
async def seed_calendar_events(
    market: str = Query("US", description="Market to seed (US, IL, etc.)"),
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Seed calendar events for specified market
    Admin only endpoint - populates calendar_events table with market holidays
    """
    try:
        from app.models.calendar_event import CalendarEvent, EventType
        from datetime import date, time
        
        market = market.upper()
        
        # Check if events already exist for this market
        existing_count = db.query(CalendarEvent).filter(CalendarEvent.market == market).count()
        if existing_count > 0:
            return {
                "success": False,
                "message": f"Calendar already has {existing_count} events for {market} market. Delete existing events first if you want to re-seed.",
                "existing_count": existing_count
            }
        
        events_created = 0
        
        if market == "US":
            # 2025 US Market Holidays
            us_holidays_2025 = [
                {"event_type": EventType.MARKET_CLOSED, "event_name": "New Year's Day", "event_date": date(2025, 1, 1), "description": "Market closed for New Year's Day holiday"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Martin Luther King Jr. Day", "event_date": date(2025, 1, 20), "description": "Market closed for MLK Jr. Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Presidents Day", "event_date": date(2025, 2, 17), "description": "Market closed for Presidents Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Good Friday", "event_date": date(2025, 4, 18), "description": "Market closed for Good Friday"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Memorial Day", "event_date": date(2025, 5, 26), "description": "Market closed for Memorial Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Juneteenth", "event_date": date(2025, 6, 19), "description": "Market closed for Juneteenth National Independence Day"},
                {"event_type": EventType.EARLY_CLOSE, "event_name": "Early Close - Independence Day", "event_date": date(2025, 7, 3), "early_close_time": time(13, 0), "description": "Early close at 1:00 PM ET before Independence Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Independence Day", "event_date": date(2025, 7, 4), "description": "Market closed for Independence Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Labor Day", "event_date": date(2025, 9, 1), "description": "Market closed for Labor Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Thanksgiving", "event_date": date(2025, 11, 27), "description": "Market closed for Thanksgiving"},
                {"event_type": EventType.EARLY_CLOSE, "event_name": "Early Close - Day After Thanksgiving", "event_date": date(2025, 11, 28), "early_close_time": time(13, 0), "description": "Early close at 1:00 PM ET on Black Friday"},
                {"event_type": EventType.EARLY_CLOSE, "event_name": "Early Close - Christmas Eve", "event_date": date(2025, 12, 24), "early_close_time": time(13, 0), "description": "Early close at 1:00 PM ET on Christmas Eve"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Christmas", "event_date": date(2025, 12, 25), "description": "Market closed for Christmas Day"},
            ]
            
            # 2026 US Market Holidays
            us_holidays_2026 = [
                {"event_type": EventType.MARKET_CLOSED, "event_name": "New Year's Day", "event_date": date(2026, 1, 1), "description": "Market closed for New Year's Day holiday"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Martin Luther King Jr. Day", "event_date": date(2026, 1, 19), "description": "Market closed for MLK Jr. Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Presidents Day", "event_date": date(2026, 2, 16), "description": "Market closed for Presidents Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Good Friday", "event_date": date(2026, 4, 3), "description": "Market closed for Good Friday"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Memorial Day", "event_date": date(2026, 5, 25), "description": "Market closed for Memorial Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Juneteenth", "event_date": date(2026, 6, 19), "description": "Market closed for Juneteenth National Independence Day"},
                {"event_type": EventType.EARLY_CLOSE, "event_name": "Early Close - Independence Day Observed", "event_date": date(2026, 7, 3), "early_close_time": time(13, 0), "description": "Early close at 1:00 PM ET, Independence Day observed"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Labor Day", "event_date": date(2026, 9, 7), "description": "Market closed for Labor Day"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Thanksgiving", "event_date": date(2026, 11, 26), "description": "Market closed for Thanksgiving"},
                {"event_type": EventType.EARLY_CLOSE, "event_name": "Early Close - Day After Thanksgiving", "event_date": date(2026, 11, 27), "early_close_time": time(13, 0), "description": "Early close at 1:00 PM ET on Black Friday"},
                {"event_type": EventType.EARLY_CLOSE, "event_name": "Early Close - Christmas Eve", "event_date": date(2026, 12, 24), "early_close_time": time(13, 0), "description": "Early close at 1:00 PM ET on Christmas Eve"},
                {"event_type": EventType.MARKET_CLOSED, "event_name": "Christmas", "event_date": date(2026, 12, 25), "description": "Market closed for Christmas Day"},
            ]
            
            all_holidays = us_holidays_2025 + us_holidays_2026
            
            for holiday_data in all_holidays:
                event = CalendarEvent(market=market, **holiday_data)
                db.add(event)
                events_created += 1
            
            db.commit()
            
            return {
                "success": True,
                "message": f"Successfully seeded {events_created} events for {market} market (2025-2026)",
                "events_created": events_created,
                "market": market,
                "years": "2025-2026"
            }
        
        else:
            return {
                "success": False,
                "message": f"Market '{market}' is not yet supported. Currently supported: US",
                "supported_markets": ["US"]
            }
    
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error seeding calendar events: {str(e)}"
        )


@router.post("/run-migrations")
def run_migrations(
    current_admin: User = Depends(get_admin_user)
):
    """
    Manually trigger Alembic migrations (Admin only)
    Useful for Railway deployments where migrations don't auto-run
    """
    try:
        # Get the backend directory (where alembic.ini is located)
        # Go up from app/api/v1/endpoints to the backend root
        backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
        
        # Log the directory for debugging
        print(f"Backend directory: {backend_dir}")
        print(f"Files in backend dir: {os.listdir(backend_dir)}")
        
        # Run alembic upgrade head from the backend directory
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            cwd=backend_dir,
            capture_output=True,
            text=True,
            timeout=60
        )
        
        return {
            "success": result.returncode == 0,
            "return_code": result.returncode,
            "stdout": result.stdout,
            "stderr": result.stderr,
            "backend_dir": backend_dir,
            "message": "Migrations completed successfully" if result.returncode == 0 else "Migrations failed"
        }
    
    except subprocess.TimeoutExpired:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Migration command timed out after 60 seconds"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error running migrations: {str(e)}"
        )


# ============== Stock Price Management ==============

@router.post("/prices/refresh-active")
def refresh_active_stock_prices(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger price update for stocks in user holdings (Admin only)
    This updates Tier 1 stocks (actively held by users)
    """
    from app.services.stock_price_service import StockPriceService
    
    service = StockPriceService(db)
    tickers = service.get_active_tickers()
    
    if not tickers:
        return {
            "message": "No active holdings found",
            "updated": 0,
            "failed": 0
        }
    
    updated, failed = service.update_world_stock_prices(tickers)
    holdings_updated = service.update_holdings_values()
    
    return {
        "message": f"Updated prices for {len(tickers)} active stocks",
        "tickers_processed": len(tickers),
        "updated": updated,
        "failed": failed,
        "holdings_recalculated": holdings_updated
    }


@router.post("/prices/refresh-catalog")
def refresh_catalog_stock_prices(
    limit: int = Query(500, ge=1, le=2000),
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Manually trigger price update for catalog stocks (Admin only)
    Updates stocks not refreshed in the last 24 hours
    """
    from app.services.stock_price_service import StockPriceService
    
    service = StockPriceService(db)
    tickers = service.get_stale_catalog_tickers(hours=24, limit=limit)
    
    if not tickers:
        return {
            "message": "All catalog stocks are up to date",
            "updated": 0,
            "failed": 0
        }
    
    updated, failed = service.update_world_stock_prices(tickers)
    
    return {
        "message": f"Updated prices for {len(tickers)} catalog stocks",
        "tickers_processed": len(tickers),
        "updated": updated,
        "failed": failed
    }


@router.get("/prices/stats")
def get_price_stats(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get statistics about price data freshness (Admin only)
    """
    from app.services.stock_price_service import StockPriceService
    
    service = StockPriceService(db)
    stats = service.get_price_stats()
    
    return {
        "total_stocks": stats["total_stocks"],
        "stocks_with_price": stats["stocks_with_price"],
        "stocks_without_price": stats["total_stocks"] - stats["stocks_with_price"],
        "fresh_15_minutes": stats["fresh_15m"],
        "fresh_24_hours": stats["fresh_24h"],
        "stale_24_hours": stats["total_stocks"] - stats["fresh_24h"],
        "oldest_update": stats["oldest_update"].isoformat() if stats["oldest_update"] else None,
        "newest_update": stats["newest_update"].isoformat() if stats["newest_update"] else None
    }


@router.get("/prices/stats/detailed")
def get_detailed_price_stats(
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Get detailed statistics about price data for both markets
    """
    from app.services.stock_price_service import StockPriceService
    
    # World stocks stats
    world_result = db.execute(text("""
        SELECT 
            COUNT(DISTINCT ws.ticker) as total_stocks,
            COUNT(DISTINCT CASE WHEN sp.current_price IS NOT NULL THEN ws.ticker END) as with_price,
            COUNT(DISTINCT CASE WHEN sp.updated_at > NOW() - INTERVAL '15 minutes' THEN ws.ticker END) as fresh_15m,
            COUNT(DISTINCT CASE WHEN sp.updated_at > NOW() - INTERVAL '1 hour' THEN ws.ticker END) as fresh_1h,
            COUNT(DISTINCT CASE WHEN sp.updated_at > NOW() - INTERVAL '24 hours' THEN ws.ticker END) as fresh_24h,
            COUNT(DISTINCT CASE WHEN wsh.ticker IS NOT NULL THEN ws.ticker END) as in_holdings,
            MIN(sp.updated_at) as oldest_update,
            MAX(sp.updated_at) as newest_update
        FROM "WorldStocks" ws
        LEFT JOIN "StockPrices" sp ON ws.ticker = sp.ticker AND sp.market = 'world'
        LEFT JOIN "WorldStockHolding" wsh ON ws.ticker = wsh.ticker AND wsh.quantity > 0
    """))
    world_row = world_result.fetchone()
    
    # Israeli stocks stats
    israeli_result = db.execute(text("""
        SELECT 
            COUNT(DISTINCT is2.symbol) as total_stocks,
            COUNT(DISTINCT CASE WHEN sp.current_price IS NOT NULL THEN is2.symbol END) as with_price,
            COUNT(DISTINCT CASE WHEN sp.updated_at > NOW() - INTERVAL '15 minutes' THEN is2.symbol END) as fresh_15m,
            COUNT(DISTINCT CASE WHEN sp.updated_at > NOW() - INTERVAL '1 hour' THEN is2.symbol END) as fresh_1h,
            COUNT(DISTINCT CASE WHEN sp.updated_at > NOW() - INTERVAL '24 hours' THEN is2.symbol END) as fresh_24h,
            COUNT(DISTINCT CASE WHEN ish.symbol IS NOT NULL THEN is2.symbol END) as in_holdings,
            MIN(sp.updated_at) as oldest_update,
            MAX(sp.updated_at) as newest_update
        FROM "IsraeliStocks" is2
        LEFT JOIN "StockPrices" sp ON is2.symbol = sp.ticker AND sp.market = 'israeli'
        LEFT JOIN "IsraeliStockHolding" ish ON is2.symbol = ish.symbol AND ish.quantity > 0
    """))
    israeli_row = israeli_result.fetchone()
    
    return {
        "world": {
            "total_stocks": world_row[0] or 0,
            "stocks_with_price": world_row[1] or 0,
            "stocks_without_price": (world_row[0] or 0) - (world_row[1] or 0),
            "fresh_15_minutes": world_row[2] or 0,
            "fresh_1_hour": world_row[3] or 0,
            "fresh_24_hours": world_row[4] or 0,
            "stale_24_hours": (world_row[0] or 0) - (world_row[4] or 0),
            "in_holdings": world_row[5] or 0,
            "oldest_update": world_row[6].isoformat() if world_row[6] else None,
            "newest_update": world_row[7].isoformat() if world_row[7] else None
        },
        "israeli": {
            "total_stocks": israeli_row[0] or 0,
            "stocks_with_price": israeli_row[1] or 0,
            "stocks_without_price": (israeli_row[0] or 0) - (israeli_row[1] or 0),
            "fresh_15_minutes": israeli_row[2] or 0,
            "fresh_1_hour": israeli_row[3] or 0,
            "fresh_24_hours": israeli_row[4] or 0,
            "stale_24_hours": (israeli_row[0] or 0) - (israeli_row[4] or 0),
            "in_holdings": israeli_row[5] or 0,
            "oldest_update": israeli_row[6].isoformat() if israeli_row[6] else None,
            "newest_update": israeli_row[7].isoformat() if israeli_row[7] else None
        }
    }


@router.post("/prices/refresh/{market}")
def refresh_market_prices(
    market: str,
    limit: int = Query(100, ge=1, le=500),
    force: bool = Query(False, description="Force update even if recently updated"),
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Refresh prices for specific market (world or israeli)
    """
    if market not in ['world', 'israeli']:
        raise HTTPException(status_code=400, detail="Market must be 'world' or 'israeli'")
    
    from app.services.stock_price_service import StockPriceService
    
    service = StockPriceService(db)
    
    # Get stale tickers
    hours = 0 if force else 24
    tickers = service.get_stale_catalog_tickers(hours=hours, limit=limit, market=market)
    
    if not tickers:
        return {
            "message": f"All {market} stocks are up to date",
            "market": market,
            "updated": 0,
            "failed": 0
        }
    
    updated, failed = service.update_world_stock_prices(tickers, market=market)
    
    # Update holdings values
    if updated > 0:
        holdings_updated = service.update_holdings_values(market=market)
    else:
        holdings_updated = 0
    
    return {
        "message": f"Updated {updated} {market} stock prices",
        "market": market,
        "tickers_processed": len(tickers),
        "updated": updated,
        "failed": failed,
        "holdings_recalculated": holdings_updated
    }


@router.post("/prices/refresh-single/{ticker}")
def refresh_single_stock_price(
    ticker: str,
    market: str = Query("world", regex="^(world|israeli)$"),
    current_admin: User = Depends(get_admin_user),
    db: Session = Depends(get_db)
):
    """
    Refresh price for a single stock
    """
    from app.services.stock_price_service import StockPriceService
    
    service = StockPriceService(db)
    updated, failed = service.update_world_stock_prices([ticker], market=market)
    
    if updated > 0:
        service.update_holdings_values(market=market)
        return {
            "message": f"Successfully updated {ticker}",
            "ticker": ticker,
            "market": market,
            "success": True
        }
    else:
        return {
            "message": f"Failed to update {ticker}",
            "ticker": ticker,
            "market": market,
            "success": False,
            "error": "Price fetch failed or ticker not found"
        }
