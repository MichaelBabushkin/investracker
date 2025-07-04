from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Any, Optional
from datetime import datetime, date, timedelta

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction, TransactionType
from app.models.asset import Asset
from app.models.holding import Holding

router = APIRouter()

@router.get("/portfolio/{portfolio_id}/overview")
async def get_portfolio_overview(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get portfolio overview analytics"""
    # Verify portfolio belongs to user
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
    
    # Calculate basic metrics
    total_invested = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.transaction_type.in_([TransactionType.BUY, TransactionType.DEPOSIT]))
        .scalar() or 0.0
    )
    
    total_withdrawn = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.transaction_type.in_([TransactionType.SELL, TransactionType.WITHDRAWAL]))
        .scalar() or 0.0
    )
    
    total_dividends = (
        db.query(func.sum(Transaction.amount))
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.transaction_type == TransactionType.DIVIDEND)
        .scalar() or 0.0
    )
    
    total_fees = (
        db.query(func.sum(Transaction.fees))
        .filter(Transaction.portfolio_id == portfolio_id)
        .scalar() or 0.0
    )
    
    # Get holdings count
    active_holdings = (
        db.query(func.count(Holding.id))
        .join(Asset)
        .filter(Asset.portfolio_id == portfolio_id)
        .filter(Holding.quantity > 0)
        .scalar() or 0
    )
    
    # Calculate net invested amount
    net_invested = total_invested - total_withdrawn
    
    return {
        "portfolio_id": portfolio_id,
        "portfolio_name": portfolio.name,
        "base_currency": portfolio.base_currency,
        "total_invested": total_invested,
        "total_withdrawn": total_withdrawn,
        "net_invested": net_invested,
        "total_dividends": total_dividends,
        "total_fees": total_fees,
        "active_holdings": active_holdings,
        "current_value": 0.0,  # TODO: Calculate from current market prices
        "unrealized_gain_loss": 0.0,  # TODO: Calculate from holdings
        "total_return": total_dividends,  # TODO: Add unrealized gains
        "total_return_percent": (total_dividends / net_invested * 100) if net_invested > 0 else 0.0
    }

@router.get("/portfolio/{portfolio_id}/allocation")
async def get_portfolio_allocation(
    portfolio_id: int,
    group_by: str = Query("asset_class", regex="^(asset_class|sector|region)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get portfolio allocation by asset class, sector, or region"""
    # Verify portfolio belongs to user
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
    
    # Get holdings with asset information
    holdings_query = (
        db.query(
            getattr(Asset, group_by).label("category"),
            func.sum(Holding.current_value).label("total_value"),
            func.count(Holding.id).label("holding_count")
        )
        .join(Asset, Holding.asset_id == Asset.id)
        .filter(Asset.portfolio_id == portfolio_id)
        .filter(Holding.quantity > 0)
        .group_by(getattr(Asset, group_by))
        .all()
    )
    
    # Calculate total portfolio value for percentages
    total_value = sum(holding.total_value or 0 for holding in holdings_query)
    
    allocation_data = []
    for holding in holdings_query:
        value = holding.total_value or 0
        allocation_data.append({
            "category": holding.category or "Unknown",
            "value": value,
            "percentage": (value / total_value * 100) if total_value > 0 else 0,
            "holding_count": holding.holding_count
        })
    
    return {
        "portfolio_id": portfolio_id,
        "group_by": group_by,
        "total_value": total_value,
        "allocation": allocation_data
    }

@router.get("/portfolio/{portfolio_id}/performance")
async def get_portfolio_performance(
    portfolio_id: int,
    period: str = Query("1y", regex="^(1m|3m|6m|1y|2y|5y|all)$"),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get portfolio performance over time"""
    # Verify portfolio belongs to user
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
    
    # Calculate date range based on period
    end_date = datetime.now().date()
    if period == "1m":
        start_date = end_date - timedelta(days=30)
    elif period == "3m":
        start_date = end_date - timedelta(days=90)
    elif period == "6m":
        start_date = end_date - timedelta(days=180)
    elif period == "1y":
        start_date = end_date - timedelta(days=365)
    elif period == "2y":
        start_date = end_date - timedelta(days=730)
    elif period == "5y":
        start_date = end_date - timedelta(days=1825)
    else:  # "all"
        start_date = portfolio.created_at.date()
    
    # Get transactions in the period for cash flow analysis
    transactions = (
        db.query(Transaction)
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.transaction_date >= start_date)
        .filter(Transaction.transaction_date <= end_date)
        .order_by(Transaction.transaction_date)
        .all()
    )
    
    # TODO: In a real application, you would:
    # 1. Calculate daily portfolio values
    # 2. Calculate time-weighted returns
    # 3. Calculate benchmark comparisons
    # 4. Calculate risk metrics (volatility, Sharpe ratio, max drawdown)
    
    return {
        "portfolio_id": portfolio_id,
        "period": period,
        "start_date": start_date,
        "end_date": end_date,
        "transaction_count": len(transactions),
        "performance_data": [],  # TODO: Implement performance calculation
        "metrics": {
            "total_return": 0.0,
            "annual_return": 0.0,
            "volatility": 0.0,
            "sharpe_ratio": 0.0,
            "max_drawdown": 0.0
        }
    }

@router.get("/portfolio/{portfolio_id}/dividends")
async def get_dividend_analysis(
    portfolio_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get dividend analysis for portfolio"""
    # Verify portfolio belongs to user
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
    
    # Get dividend transactions
    dividend_transactions = (
        db.query(Transaction)
        .filter(Transaction.portfolio_id == portfolio_id)
        .filter(Transaction.transaction_type == TransactionType.DIVIDEND)
        .order_by(Transaction.transaction_date.desc())
        .all()
    )
    
    # Calculate dividend metrics
    total_dividends = sum(t.amount for t in dividend_transactions)
    
    # Group dividends by month for chart data
    monthly_dividends = {}
    for transaction in dividend_transactions:
        month_key = transaction.transaction_date.strftime("%Y-%m")
        if month_key not in monthly_dividends:
            monthly_dividends[month_key] = 0
        monthly_dividends[month_key] += transaction.amount
    
    # Calculate annual dividend yield (simplified)
    current_portfolio_value = 100000  # TODO: Calculate actual current value
    annual_dividend_yield = (total_dividends / current_portfolio_value * 100) if current_portfolio_value > 0 else 0
    
    return {
        "portfolio_id": portfolio_id,
        "total_dividends": total_dividends,
        "dividend_count": len(dividend_transactions),
        "annual_dividend_yield": annual_dividend_yield,
        "monthly_dividends": [
            {"month": month, "amount": amount}
            for month, amount in sorted(monthly_dividends.items())
        ],
        "recent_dividends": [
            {
                "date": t.transaction_date,
                "amount": t.amount,
                "asset_id": t.asset_id,
                "description": t.description
            }
            for t in dividend_transactions[:10]  # Last 10 dividends
        ]
    }
