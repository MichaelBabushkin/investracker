"""
World Stocks API Endpoints
Handles PDF upload, processing, and analysis for world/US broker stock reports
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import tempfile
import os
import shutil
from datetime import datetime

from app.services.world_stock_service import WorldStockService
from app.core.deps import get_current_user
from app.models.user import User
from app.schemas.world_stock_schemas import (
    WorldStockAccountResponse,
    WorldStockHoldingResponse,
    WorldStockTransactionResponse,
    WorldStockDividendResponse,
    WorldStockUploadResponse,
    WorldStockSummaryResponse
)

router = APIRouter()

@router.post("/upload-pdf", response_model=WorldStockUploadResponse)
async def upload_and_analyze_world_stock_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload and analyze investment PDF for world/US broker stocks
    """
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Initialize service
        service = WorldStockService()
        
        # Process PDF
        target_user_id = user_id or current_user.id
        result = service.process_pdf_report(temp_path, target_user_id)
        
        return WorldStockUploadResponse(**result)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        # Clean up temp files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)


@router.get("/accounts", response_model=List[WorldStockAccountResponse])
async def get_world_stock_accounts(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all world stock accounts for a user"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            query = text("""
                SELECT id, user_id, account_number, account_alias, account_type,
                       base_currency, broker_name, created_at, updated_at
                FROM "WorldStockAccount"
                WHERE user_id = :user_id
                ORDER BY created_at DESC
            """)
            
            result = conn.execute(query, {"user_id": target_user_id})
            rows = result.fetchall()
            
            accounts = []
            for row in rows:
                accounts.append(WorldStockAccountResponse(
                    id=row[0],
                    user_id=row[1],
                    account_number=row[2],
                    account_alias=row[3],
                    account_type=row[4],
                    base_currency=row[5],
                    broker_name=row[6],
                    created_at=row[7],
                    updated_at=row[8]
                ))
            
            return accounts
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving accounts: {str(e)}")


@router.get("/holdings", response_model=List[WorldStockHoldingResponse])
async def get_world_stock_holdings(
    user_id: Optional[str] = None,
    account_id: Optional[int] = None,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get world stock holdings for a user"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            if account_id:
                query = text("""
                    SELECT id, user_id, account_id, symbol, company_name, quantity,
                           avg_entry_price, current_price, current_value, purchase_cost,
                           unrealized_pl, unrealized_pl_percent, currency, source_pdf,
                           last_updated, created_at
                    FROM "WorldStockHolding"
                    WHERE user_id = :user_id AND account_id = :account_id
                    ORDER BY current_value DESC NULLS LAST
                    LIMIT :limit
                """)
                result = conn.execute(query, {
                    "user_id": target_user_id,
                    "account_id": account_id,
                    "limit": limit
                })
            else:
                query = text("""
                    SELECT id, user_id, account_id, symbol, company_name, quantity,
                           avg_entry_price, current_price, current_value, purchase_cost,
                           unrealized_pl, unrealized_pl_percent, currency, source_pdf,
                           last_updated, created_at
                    FROM "WorldStockHolding"
                    WHERE user_id = :user_id
                    ORDER BY current_value DESC NULLS LAST
                    LIMIT :limit
                """)
                result = conn.execute(query, {
                    "user_id": target_user_id,
                    "limit": limit
                })
            
            rows = result.fetchall()
            
            holdings = []
            for row in rows:
                holdings.append(WorldStockHoldingResponse(
                    id=row[0],
                    user_id=row[1],
                    account_id=row[2],
                    symbol=row[3],
                    company_name=row[4],
                    quantity=row[5],
                    avg_entry_price=row[6],
                    current_price=row[7],
                    current_value=row[8],
                    purchase_cost=row[9],
                    unrealized_pl=row[10],
                    unrealized_pl_percent=row[11],
                    currency=row[12],
                    source_pdf=row[13],
                    last_updated=row[14],
                    created_at=row[15]
                ))
            
            return holdings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving holdings: {str(e)}")


@router.get("/transactions", response_model=List[WorldStockTransactionResponse])
async def get_world_stock_transactions(
    user_id: Optional[str] = None,
    account_id: Optional[int] = None,
    symbol: Optional[str] = None,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get world stock transactions for a user"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            filters = ["user_id = :user_id"]
            params = {"user_id": target_user_id, "limit": limit}
            
            if account_id:
                filters.append("account_id = :account_id")
                params["account_id"] = account_id
            
            if symbol:
                filters.append("symbol = :symbol")
                params["symbol"] = symbol
            
            where_clause = " AND ".join(filters)
            
            query = text(f"""
                SELECT id, user_id, account_id, symbol, transaction_date, transaction_time,
                       transaction_type, quantity, trade_price, close_price, proceeds,
                       commission, basis, realized_pl, mtm_pl, trade_code, currency,
                       source_pdf, created_at
                FROM "WorldStockTransaction"
                WHERE {where_clause}
                ORDER BY transaction_date DESC NULLS LAST, created_at DESC
                LIMIT :limit
            """)
            
            result = conn.execute(query, params)
            rows = result.fetchall()
            
            transactions = []
            for row in rows:
                transactions.append(WorldStockTransactionResponse(
                    id=row[0],
                    user_id=row[1],
                    account_id=row[2],
                    symbol=row[3],
                    transaction_date=row[4],
                    transaction_time=row[5],
                    transaction_type=row[6],
                    quantity=row[7],
                    trade_price=row[8],
                    close_price=row[9],
                    proceeds=row[10],
                    commission=row[11],
                    basis=row[12],
                    realized_pl=row[13],
                    mtm_pl=row[14],
                    trade_code=row[15],
                    currency=row[16],
                    source_pdf=row[17],
                    created_at=row[18]
                ))
            
            return transactions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving transactions: {str(e)}")


@router.get("/dividends", response_model=List[WorldStockDividendResponse])
async def get_world_stock_dividends(
    user_id: Optional[str] = None,
    account_id: Optional[int] = None,
    symbol: Optional[str] = None,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get world stock dividends for a user"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            filters = ["user_id = :user_id"]
            params = {"user_id": target_user_id, "limit": limit}
            
            if account_id:
                filters.append("account_id = :account_id")
                params["account_id"] = account_id
            
            if symbol:
                filters.append("symbol = :symbol")
                params["symbol"] = symbol
            
            where_clause = " AND ".join(filters)
            
            query = text(f"""
                SELECT id, user_id, account_id, symbol, isin, payment_date, amount,
                       amount_per_share, withholding_tax, net_amount, dividend_type,
                       currency, source_pdf, created_at
                FROM "WorldStockDividend"
                WHERE {where_clause}
                ORDER BY payment_date DESC NULLS LAST, created_at DESC
                LIMIT :limit
            """)
            
            result = conn.execute(query, params)
            rows = result.fetchall()
            
            dividends = []
            for row in rows:
                dividends.append(WorldStockDividendResponse(
                    id=row[0],
                    user_id=row[1],
                    account_id=row[2],
                    symbol=row[3],
                    isin=row[4],
                    payment_date=row[5],
                    amount=row[6],
                    amount_per_share=row[7],
                    withholding_tax=row[8],
                    net_amount=row[9],
                    dividend_type=row[10],
                    currency=row[11],
                    source_pdf=row[12],
                    created_at=row[13]
                ))
            
            return dividends
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dividends: {str(e)}")


@router.get("/summary", response_model=WorldStockSummaryResponse)
async def get_world_stock_summary(
    user_id: Optional[str] = None,
    account_id: Optional[int] = None,
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics for world stock portfolio"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        from decimal import Decimal
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            # Build account filter
            account_filter = ""
            params = {"user_id": target_user_id}
            
            if account_id:
                account_filter = " AND account_id = :account_id"
                params["account_id"] = account_id
            
            # Get holdings summary
            holdings_query = text(f"""
                SELECT 
                    COUNT(DISTINCT account_id) as total_accounts,
                    COUNT(*) as holdings_count,
                    COALESCE(SUM(current_value), 0) as total_value,
                    COALESCE(SUM(unrealized_pl), 0) as total_unrealized_pl
                FROM "WorldStockHolding"
                WHERE user_id = :user_id{account_filter}
            """)
            
            holdings_result = conn.execute(holdings_query, params).fetchone()
            
            # Get dividends summary
            dividends_query = text(f"""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_dividends,
                    COALESCE(SUM(withholding_tax), 0) as total_withholding_tax,
                    COUNT(*) as dividends_count
                FROM "WorldStockDividend"
                WHERE user_id = :user_id{account_filter}
            """)
            
            dividends_result = conn.execute(dividends_query, params).fetchone()
            
            # Get transactions summary
            transactions_query = text(f"""
                SELECT 
                    COALESCE(SUM(commission), 0) as total_commissions,
                    COUNT(*) as transactions_count
                FROM "WorldStockTransaction"
                WHERE user_id = :user_id{account_filter}
            """)
            
            transactions_result = conn.execute(transactions_query, params).fetchone()
            
            total_accounts = holdings_result[0] or 0
            holdings_count = holdings_result[1] or 0
            total_value = holdings_result[2] or Decimal('0')
            total_unrealized_pl = holdings_result[3] or Decimal('0')
            
            total_dividends = dividends_result[0] or Decimal('0')
            total_withholding_tax = dividends_result[1] or Decimal('0')
            dividends_count = dividends_result[2] or 0
            
            total_commissions = transactions_result[0] or Decimal('0')
            transactions_count = transactions_result[1] or 0
            
            # Calculate percentage
            if total_value > 0:
                total_unrealized_pl_percent = (total_unrealized_pl / (total_value - total_unrealized_pl)) * 100
            else:
                total_unrealized_pl_percent = Decimal('0')
            
            return WorldStockSummaryResponse(
                total_accounts=total_accounts,
                total_value=total_value,
                total_unrealized_pl=total_unrealized_pl,
                total_unrealized_pl_percent=total_unrealized_pl_percent,
                total_dividends=total_dividends,
                total_withholding_tax=total_withholding_tax,
                total_commissions=total_commissions,
                holdings_count=holdings_count,
                transactions_count=transactions_count,
                dividends_count=dividends_count
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating summary: {str(e)}")


@router.delete("/holdings/{holding_id}")
async def delete_world_stock_holding(
    holding_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a world stock holding"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        with engine.begin() as conn:
            # Check ownership
            check_query = text('SELECT user_id FROM "WorldStockHolding" WHERE id = :id')
            result = conn.execute(check_query, {"id": holding_id}).fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Holding not found")
            
            if result[0] != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Delete holding
            delete_query = text('DELETE FROM "WorldStockHolding" WHERE id = :id')
            conn.execute(delete_query, {"id": holding_id})
            
            return {"success": True, "message": "Holding deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting holding: {str(e)}")


@router.delete("/accounts/{account_id}")
async def delete_world_stock_account(
    account_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a world stock account and all associated data"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        with engine.begin() as conn:
            # Check ownership
            check_query = text('SELECT user_id FROM "WorldStockAccount" WHERE id = :id')
            result = conn.execute(check_query, {"id": account_id}).fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Account not found")
            
            if result[0] != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Delete account (CASCADE will delete related data)
            delete_query = text('DELETE FROM "WorldStockAccount" WHERE id = :id')
            conn.execute(delete_query, {"id": account_id})
            
            return {"success": True, "message": "Account and all associated data deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting account: {str(e)}")
