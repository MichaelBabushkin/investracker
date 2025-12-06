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
    Delete all Israeli stock data for a specific user by email (Admin only)
    
    This removes:
    - Israeli stock holdings
    - Israeli stock transactions
    - Israeli dividends
    
    Does NOT remove:
    - User account
    - World stock data
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
        # Delete Israeli stock data using raw SQL for efficiency
        with engine.connect() as conn:
            # Delete holdings
            holdings_result = conn.execute(
                text('DELETE FROM "IsraeliStockHolding" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            holdings_deleted = holdings_result.rowcount
            
            # Delete transactions
            transactions_result = conn.execute(
                text('DELETE FROM "IsraeliStockTransaction" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            transactions_deleted = transactions_result.rowcount
            
            # Delete dividends
            dividends_result = conn.execute(
                text('DELETE FROM "IsraeliDividend" WHERE user_id = :user_id'),
                {"user_id": user_id}
            )
            dividends_deleted = dividends_result.rowcount
            
            # Commit the transaction
            conn.commit()
        
        return {
            "success": True,
            "message": f"Successfully deleted all Israeli stock data for user {email}",
            "user_id": user_id,
            "user_email": email,
            "deleted": {
                "holdings": holdings_deleted,
                "transactions": transactions_deleted,
                "dividends": dividends_deleted,
                "total": holdings_deleted + transactions_deleted + dividends_deleted
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
