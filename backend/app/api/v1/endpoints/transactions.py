from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime, date

from app.core.database import get_db
from app.core.auth import get_current_active_user
from app.models.user import User
from app.models.portfolio import Portfolio
from app.models.transaction import Transaction
from app.models.asset import Asset
from app.schemas.transaction import TransactionCreate, TransactionUpdate, TransactionResponse

router = APIRouter()

@router.post("/", response_model=TransactionResponse)
async def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Create a new transaction"""
    # Verify portfolio belongs to current user
    portfolio = (
        db.query(Portfolio)
        .filter(Portfolio.id == transaction_data.portfolio_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not portfolio:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Portfolio not found"
        )
    
    # Verify asset exists if provided
    if transaction_data.asset_id:
        asset = (
            db.query(Asset)
            .filter(Asset.id == transaction_data.asset_id)
            .filter(Asset.portfolio_id == transaction_data.portfolio_id)
            .first()
        )
        
        if not asset:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Asset not found in this portfolio"
            )
    
    # Create transaction
    db_transaction = Transaction(
        portfolio_id=transaction_data.portfolio_id,
        asset_id=transaction_data.asset_id,
        transaction_type=transaction_data.transaction_type,
        transaction_date=transaction_data.transaction_date,
        settlement_date=transaction_data.settlement_date,
        quantity=transaction_data.quantity,
        price=transaction_data.price,
        amount=transaction_data.amount,
        fees=transaction_data.fees,
        currency=transaction_data.currency,
        description=transaction_data.description,
        broker=transaction_data.broker,
        account_number=transaction_data.account_number
    )
    
    db.add(db_transaction)
    db.commit()
    db.refresh(db_transaction)
    
    return db_transaction

@router.get("/", response_model=List[TransactionResponse])
async def get_transactions(
    portfolio_id: Optional[int] = Query(None),
    asset_id: Optional[int] = Query(None),
    transaction_type: Optional[str] = Query(None),
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, le=1000),
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get transactions with optional filters"""
    query = db.query(Transaction).join(Portfolio).filter(Portfolio.user_id == current_user.id)
    
    # Apply filters
    if portfolio_id:
        query = query.filter(Transaction.portfolio_id == portfolio_id)
    
    if asset_id:
        query = query.filter(Transaction.asset_id == asset_id)
    
    if transaction_type:
        query = query.filter(Transaction.transaction_type == transaction_type)
    
    if start_date:
        query = query.filter(Transaction.transaction_date >= start_date)
    
    if end_date:
        query = query.filter(Transaction.transaction_date <= end_date)
    
    transactions = (
        query
        .order_by(Transaction.transaction_date.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )
    
    return transactions

@router.get("/{transaction_id}", response_model=TransactionResponse)
async def get_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Get a specific transaction"""
    transaction = (
        db.query(Transaction)
        .join(Portfolio)
        .filter(Transaction.id == transaction_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    return transaction

@router.put("/{transaction_id}", response_model=TransactionResponse)
async def update_transaction(
    transaction_id: int,
    transaction_update: TransactionUpdate,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Update a transaction"""
    transaction = (
        db.query(Transaction)
        .join(Portfolio)
        .filter(Transaction.id == transaction_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    # Update transaction fields
    for field, value in transaction_update.dict(exclude_unset=True).items():
        setattr(transaction, field, value)
    
    db.commit()
    db.refresh(transaction)
    
    return transaction

@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_active_user),
    db: Session = Depends(get_db)
):
    """Delete a transaction"""
    transaction = (
        db.query(Transaction)
        .join(Portfolio)
        .filter(Transaction.id == transaction_id)
        .filter(Portfolio.user_id == current_user.id)
        .first()
    )
    
    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )
    
    db.delete(transaction)
    db.commit()
    
    return {"message": "Transaction deleted successfully"}
