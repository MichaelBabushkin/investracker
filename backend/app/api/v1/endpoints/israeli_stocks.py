"""
API endpoints for Israeli stocks management
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.core.deps import get_db
from app.models.israeli_stock import IsraeliStock
from pydantic import BaseModel

router = APIRouter()

# Pydantic schemas
class IsraeliStockBase(BaseModel):
    name: str
    symbol: str
    security_number: str
    index_name: str = "TA-125"
    is_active: bool = True

class IsraeliStockResponse(IsraeliStockBase):
    id: int
    
    class Config:
        from_attributes = True

class IsraeliStockSearch(BaseModel):
    query: str
    limit: int = 20

@router.get("/", response_model=List[IsraeliStockResponse])
async def get_israeli_stocks(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    search: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """Get list of Israeli stocks with optional search"""
    query = db.query(IsraeliStock)
    
    # Apply search filter if provided
    if search:
        search_term = f"%{search}%"
        query = query.filter(
            or_(
                IsraeliStock.name.ilike(search_term),
                IsraeliStock.symbol.ilike(search_term),
                IsraeliStock.security_number.ilike(search_term)
            )
        )
    
    # Apply active filter
    query = query.filter(IsraeliStock.is_active == True)
    
    stocks = query.offset(skip).limit(limit).all()
    return stocks

@router.get("/search", response_model=List[IsraeliStockResponse])
async def search_israeli_stocks(
    q: str = Query(..., min_length=1),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Search Israeli stocks by name, symbol, or security number"""
    search_term = f"%{q}%"
    
    stocks = db.query(IsraeliStock).filter(
        or_(
            IsraeliStock.name.ilike(search_term),
            IsraeliStock.symbol.ilike(search_term),
            IsraeliStock.security_number.ilike(search_term)
        ),
        IsraeliStock.is_active == True
    ).limit(limit).all()
    
    return stocks

@router.get("/by-symbol/{symbol}", response_model=IsraeliStockResponse)
async def get_israeli_stock_by_symbol(
    symbol: str,
    db: Session = Depends(get_db)
):
    """Get Israeli stock by symbol"""
    stock = db.query(IsraeliStock).filter(
        IsraeliStock.symbol == symbol.upper(),
        IsraeliStock.is_active == True
    ).first()
    
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock with symbol '{symbol}' not found")
    
    return stock

@router.get("/by-security-number/{security_number}", response_model=IsraeliStockResponse)
async def get_israeli_stock_by_security_number(
    security_number: str,
    db: Session = Depends(get_db)
):
    """Get Israeli stock by security number"""
    stock = db.query(IsraeliStock).filter(
        IsraeliStock.security_number == security_number,
        IsraeliStock.is_active == True
    ).first()
    
    if not stock:
        raise HTTPException(status_code=404, detail=f"Stock with security number '{security_number}' not found")
    
    return stock

@router.get("/stats")
async def get_israeli_stocks_stats(db: Session = Depends(get_db)):
    """Get statistics about Israeli stocks"""
    total_stocks = db.query(IsraeliStock).filter(IsraeliStock.is_active == True).count()
    total_inactive = db.query(IsraeliStock).filter(IsraeliStock.is_active == False).count()
    
    return {
        "total_active_stocks": total_stocks,
        "total_inactive_stocks": total_inactive,
        "total_stocks": total_stocks + total_inactive,
        "index_name": "TA-125"
    }
