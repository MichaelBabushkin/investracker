from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.schemas.portfolio import PortfolioCreate, PortfolioUpdate, PortfolioResponse, PortfolioSummary

router = APIRouter()

@router.post("/", response_model=PortfolioResponse)
async def create_portfolio(
    portfolio_data: PortfolioCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new portfolio"""
    db_portfolio = Portfolio(
        user_id=current_user.id,
        name=portfolio_data.name,
        description=portfolio_data.description,
        base_currency=portfolio_data.base_currency
    )
    
    db.add(db_portfolio)
    db.commit()
    db.refresh(db_portfolio)
    
    return db_portfolio

@router.get("/", response_model=List[PortfolioSummary])
async def get_portfolios(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=100),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get user's portfolios"""
    portfolios = (
        db.query(Portfolio)
        .filter(Portfolio.user_id == current_user.id)
        .filter(Portfolio.is_active == True)
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    # Calculate summary data for each portfolio
    portfolio_summaries = []
    for portfolio in portfolios:
        # In a real application, you would calculate these metrics
        # For now, we'll return basic information
        summary = PortfolioSummary(
            id=portfolio.id,
            name=portfolio.name,
            base_currency=portfolio.base_currency,
            total_value=0.0,  # TODO: Calculate from holdings
            unrealized_gain_loss=0.0,  # TODO: Calculate from holdings
            unrealized_gain_loss_percent=0.0,  # TODO: Calculate from holdings
            asset_count=len(portfolio.assets)  # TODO: Calculate from assets
        )
        portfolio_summaries.append(summary)
    
    return portfolio_summaries

@router.get("/{portfolio_id}", response_model=PortfolioResponse)
async def get_portfolio(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific portfolio"""
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    return portfolio

@router.put("/{portfolio_id}", response_model=PortfolioResponse)
async def update_portfolio(
    portfolio_id: int,
    portfolio_update: PortfolioUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a portfolio"""
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Update portfolio fields
    for field, value in portfolio_update.dict(exclude_unset=True).items():
        setattr(portfolio, field, value)
    
    db.commit()
    db.refresh(portfolio)
    
    return portfolio

@router.delete("/{portfolio_id}")
async def delete_portfolio(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a portfolio (soft delete by setting is_active=False)"""
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == portfolio_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Soft delete
    portfolio.is_active = False
    db.commit()
    
    return {"message": "Portfolio deleted successfully"}
