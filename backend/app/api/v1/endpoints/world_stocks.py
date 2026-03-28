"""
World Stocks API Endpoints
Handles PDF upload, processing, and analysis for world/US broker stock reports
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
import tempfile
import os
import shutil
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.orm import Session

# WorldStockService and logo crawler service imported within functions to avoid circular imports
from app.core.deps import get_current_user
from app.core.auth import get_admin_user
from app.core.database import engine, get_db
from app.models.user import User
from app.models.world_stock_models import PendingWorldTransaction
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
    broker: str = Query("excellence", description="Broker ID (excellence for Hebrew CSV format, or other US brokers)"),
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload and analyze investment PDF for world/US broker stocks
    - excellence: Hebrew CSV format (Excellence broker)
    - other: English table format (US brokers)
    """
    # Import WorldStockService locally to avoid circular imports
    from app.services.world_stock_service import WorldStockService
    
    if not file.filename.endswith('.pdf'):
        raise HTTPException(status_code=400, detail="File must be a PDF")
    
    # Create temporary file
    temp_dir = tempfile.mkdtemp()
    temp_path = os.path.join(temp_dir, file.filename)
    
    try:
        # Save uploaded file
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        
        # Initialize service with broker parameter
        service = WorldStockService(broker=broker)
        
        # Process PDF
        target_user_id = user_id or current_user.id
        result = service.process_pdf_report(temp_path, target_user_id, broker=broker)
        
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
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get world stock holdings for a user with real-time prices from StockPrices table"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            query = text("""
                SELECT h.id, h.user_id, h.ticker, h.symbol, h.company_name, h.quantity,
                       COALESCE(sp.current_price, h.last_price) as last_price, 
                       h.purchase_cost, 
                       CASE 
                           WHEN sp.current_price IS NOT NULL THEN h.quantity * sp.current_price
                           ELSE h.current_value
                       END as current_value,
                       h.portfolio_percentage,
                       h.currency, h.exchange_rate, 
                       (SELECT MIN(transaction_date) 
                        FROM "world_stock_transactions" 
                        WHERE ticker = h.ticker AND user_id = h.user_id 
                        AND transaction_type IN ('BUY', 'PURCHASE')) as first_purchase_date,
                       h.source_pdf,
                       h.created_at, h.updated_at,
                       CASE 
                           WHEN sp.current_price IS NOT NULL THEN (h.quantity * sp.current_price) - h.purchase_cost
                           ELSE h.unrealized_gain
                       END as unrealized_gain,
                       CASE 
                           WHEN sp.current_price IS NOT NULL AND h.purchase_cost > 0 
                           THEN (((h.quantity * sp.current_price) - h.purchase_cost) / h.purchase_cost) * 100
                           ELSE h.unrealized_gain_pct
                       END as unrealized_gain_pct,
                       h.twr, h.mwr
                FROM "world_stock_holdings" h
                LEFT JOIN "stock_prices" sp ON h.ticker = sp.ticker AND sp.market = 'world'
                WHERE h.user_id = :user_id
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
                    ticker=row[2],
                    symbol=row[3],
                    company_name=row[4],
                    quantity=row[5],
                    last_price=row[6],
                    purchase_cost=row[7],
                    current_value=row[8],
                    portfolio_percentage=row[9],
                    currency=row[10],
                    exchange_rate=row[11],
                    holding_date=row[12],
                    source_pdf=row[13],
                    created_at=row[14],
                    updated_at=row[15],
                    unrealized_gain=row[16],
                    unrealized_gain_pct=row[17],
                    twr=row[18],
                    mwr=row[19]
                ))
            
            return holdings
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving holdings: {str(e)}")


@router.get("/transactions", response_model=List[WorldStockTransactionResponse])
async def get_world_stock_transactions(
    user_id: Optional[str] = None,
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
            
            if symbol:
                filters.append("symbol = :symbol")
                params["symbol"] = symbol
            
            where_clause = " AND ".join(filters)
            
            query = text(f"""
                SELECT id, user_id, ticker, symbol, company_name, transaction_type,
                       transaction_date, transaction_time, quantity, price, total_value,
                       commission, tax, currency, exchange_rate, source_pdf, created_at, updated_at,
                       realized_pl, cost_basis
                FROM "world_stock_transactions"
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
                    ticker=row[2],
                    symbol=row[3],
                    company_name=row[4],
                    transaction_type=row[5],
                    transaction_date=row[6],
                    transaction_time=row[7],
                    quantity=row[8],
                    price=row[9],
                    total_value=row[10],
                    commission=row[11],
                    tax=row[12],
                    currency=row[13],
                    exchange_rate=row[14],
                    source_pdf=row[15],
                    created_at=row[16],
                    updated_at=row[17],
                    realized_pl=row[18],
                    cost_basis=row[19]
                ))
            
            return transactions
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving transactions: {str(e)}")


@router.get("/dividends", response_model=List[WorldStockDividendResponse])
async def get_world_stock_dividends(
    user_id: Optional[str] = None,
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
            
            if symbol:
                filters.append("symbol = :symbol")
                params["symbol"] = symbol
            
            where_clause = " AND ".join(filters)
            
            query = text(f"""
                SELECT id, user_id, ticker, symbol, company_name, payment_date,
                       amount, tax, net_amount, currency, exchange_rate,
                       source_pdf, created_at, updated_at
                FROM "world_dividends"
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
                    ticker=row[2],
                    symbol=row[3],
                    company_name=row[4],
                    payment_date=row[5],
                    total_amount=row[6],  # gross amount
                    amount=row[6],  # same as total_amount for frontend
                    withholding_tax=row[7],  # tax
                    net_amount=row[8],  # amount after tax
                    amount_per_share=None,  # Not stored separately
                    ex_date=None,  # Not in model
                    currency=row[9],
                    exchange_rate=row[10],
                    dividend_type=None,  # Not in model
                    source_pdf=row[11],
                    created_at=row[12],
                    updated_at=row[13]
                ))
            
            return dividends
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dividends: {str(e)}")


@router.get("/summary", response_model=WorldStockSummaryResponse)
async def get_world_stock_summary(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get summary statistics for world stock portfolio"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        from decimal import Decimal
        
        target_user_id = user_id or current_user.id
        params = {"user_id": target_user_id}
        
        with engine.connect() as conn:
            # Get holdings summary with real-time prices
            holdings_query = text("""
                SELECT 
                    COUNT(*) as holdings_count,
                    COALESCE(SUM(
                        CASE WHEN sp.current_price IS NOT NULL 
                             THEN h.quantity * sp.current_price
                             ELSE h.current_value
                        END
                    ), 0) as total_value,
                    COALESCE(SUM(h.purchase_cost), 0) as total_cost
                FROM "world_stock_holdings" h
                LEFT JOIN "stock_prices" sp ON h.ticker = sp.ticker AND sp.market = 'world'
                WHERE h.user_id = :user_id
            """)
            
            holdings_result = conn.execute(holdings_query, params).fetchone()
            
            # Get dividends summary
            dividends_query = text("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_dividends,
                    COALESCE(SUM(tax), 0) as total_tax,
                    COUNT(*) as dividends_count
                FROM "world_dividends"
                WHERE user_id = :user_id
            """)
            
            dividends_result = conn.execute(dividends_query, params).fetchone()
            
            # Get transactions summary including realized P/L
            transactions_query = text("""
                SELECT 
                    COALESCE(SUM(commission), 0) as total_commissions,
                    COUNT(*) as transactions_count,
                    COALESCE(SUM(CASE WHEN transaction_type = 'SELL' THEN realized_pl ELSE 0 END), 0) as total_realized_pl,
                    COALESCE(SUM(CASE WHEN transaction_type = 'SELL' THEN quantity * price - COALESCE(commission, 0) ELSE 0 END), 0) as total_sell_inflow,
                    COALESCE(SUM(CASE WHEN transaction_type = 'CURRENCY_CONVERSION' THEN quantity ELSE 0 END), 0) as total_fx_usd,
                    COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN quantity * price + COALESCE(commission, 0) ELSE 0 END), 0) as total_buy_outflow
                FROM "world_stock_transactions"
                WHERE user_id = :user_id
            """)
            
            transactions_result = conn.execute(transactions_query, params).fetchone()
            
            holdings_count = holdings_result[0] or 0
            total_value = holdings_result[1] or Decimal('0')
            total_cost = holdings_result[2] or Decimal('0')
            
            total_dividends = dividends_result[0] or Decimal('0')
            total_tax = dividends_result[1] or Decimal('0')
            dividends_count = dividends_result[2] or 0
            
            total_commissions = transactions_result[0] or Decimal('0')
            transactions_count = transactions_result[1] or 0
            total_realized_pl = transactions_result[2] or Decimal('0')
            total_sell_inflow = transactions_result[3] or Decimal('0')
            total_fx_usd = transactions_result[4] or Decimal('0')
            total_buy_outflow = transactions_result[5] or Decimal('0')
            
            # Net dividends (after tax)
            net_div_query = text("""
                SELECT COALESCE(SUM(net_amount), 0) FROM "world_dividends" WHERE user_id = :user_id
            """)
            total_net_dividends = conn.execute(net_div_query, params).fetchone()[0] or Decimal('0')
            
            # Capital gains tax withheld (מס עתידי) in ILS
            # quantity > 0 = tax paid, quantity < 0 = tax refunded; net = sum of all
            tax_withheld_query = text("""
                SELECT COALESCE(SUM(quantity), 0)
                FROM "world_stock_transactions"
                WHERE user_id = :user_id AND transaction_type = 'CAPITAL_GAINS_TAX'
            """)
            total_tax_withheld_ils = conn.execute(tax_withheld_query, params).fetchone()[0] or Decimal('0')
            
            # Calculate unrealized P/L
            total_unrealized_pl = total_value - total_cost
            total_unrealized_pl_pct = Decimal('0')
            if total_cost > 0:
                total_unrealized_pl_pct = (total_unrealized_pl / total_cost) * 100
            
            # Cash = FX deposits (USD) - BUY outflows + SELL inflows + net dividends
            # If no FX deposit data, infer deposit = buy outflows (user deposited exactly enough)
            # So available cash = sell net proceeds + net dividends
            if total_fx_usd > 0:
                total_cash = total_fx_usd - total_buy_outflow + total_sell_inflow + total_net_dividends
                if total_cash < 0:
                    total_cash = Decimal('0')
            else:
                # No FX data — cash from completed sells + dividends
                total_cash = total_sell_inflow + total_net_dividends
            
            # Total invested = total cost of current holdings (including commissions)
            total_invested = total_cost
            
            return WorldStockSummaryResponse(
                total_value=total_value,
                total_cost=total_cost,
                total_holdings=holdings_count,
                total_transactions=transactions_count,
                total_dividends=total_dividends,
                total_tax=total_tax,
                total_commissions=total_commissions,
                total_realized_pl=total_realized_pl,
                total_unrealized_pl=total_unrealized_pl,
                total_unrealized_pl_pct=total_unrealized_pl_pct,
                total_cash=total_cash if total_cash > 0 else Decimal('0'),
                total_invested=total_invested,
                total_tax_withheld_ils=total_tax_withheld_ils,
                holdings_count=holdings_count,
                transactions_count=transactions_count,
                dividends_count=dividends_count
            )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating summary: {str(e)}")


@router.get("/portfolio-dashboard")
async def get_portfolio_dashboard(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get combined portfolio data for the dashboard homepage"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        from decimal import Decimal
        
        target_user_id = user_id or current_user.id
        params = {"user_id": target_user_id}
        
        with engine.connect() as conn:
            # Holdings with real-time prices
            holdings_query = text("""
                SELECT h.ticker, h.symbol, h.company_name, h.quantity, 
                       h.purchase_cost,
                       COALESCE(sp.current_price, h.last_price, 0) as current_price,
                       CASE 
                           WHEN sp.current_price IS NOT NULL THEN h.quantity * sp.current_price
                           ELSE h.current_value
                       END as market_value,
                       ws.sector
                FROM "world_stock_holdings" h
                LEFT JOIN "stock_prices" sp ON h.ticker = sp.ticker AND sp.market = 'world'
                LEFT JOIN "world_stocks" ws ON h.ticker = ws.ticker
                WHERE h.user_id = :user_id AND h.quantity > 0
                ORDER BY 
                    CASE WHEN sp.current_price IS NOT NULL THEN h.quantity * sp.current_price ELSE h.current_value END DESC NULLS LAST
            """)
            holdings_rows = conn.execute(holdings_query, params).fetchall()
            
            holdings = []
            total_value = Decimal('0')
            total_cost = Decimal('0')
            sectors = {}
            
            for row in holdings_rows:
                qty = float(row[3] or 0)
                cost = float(row[4] or 0)
                price = float(row[5] or 0)
                value = float(row[6] or 0)
                gain = value - cost
                gain_pct = (gain / cost * 100) if cost > 0 else 0
                sector = row[7] or "Other"
                
                total_value += Decimal(str(value))
                total_cost += Decimal(str(cost))
                sectors[sector] = sectors.get(sector, 0) + value
                
                holdings.append({
                    "symbol": row[1] or row[0],
                    "name": row[2] or row[1] or row[0],
                    "shares": qty,
                    "currentPrice": price,
                    "value": value,
                    "gainLoss": round(gain, 2),
                    "gainLossPercent": round(gain_pct, 1),
                })
            
            # Recent transactions (last 10)
            txn_query = text("""
                SELECT id, ticker, symbol, transaction_type, transaction_date, quantity, price, total_value, commission
                FROM "world_stock_transactions"
                WHERE user_id = :user_id
                ORDER BY transaction_date DESC NULLS LAST, created_at DESC
                LIMIT 10
            """)
            txn_rows = conn.execute(txn_query, params).fetchall()
            
            recent_transactions = []
            for row in txn_rows:
                txn_type = (row[3] or "").upper()
                recent_transactions.append({
                    "id": row[0],
                    "type": txn_type.lower(),
                    "symbol": row[2] or row[1],
                    "shares": float(row[5] or 0),
                    "price": float(row[6] or 0),
                    "date": str(row[4]) if row[4] else None,
                    "total": float(row[7] or 0),
                })
            
            # Realized P/L + commissions
            pl_query = text("""
                SELECT 
                    COALESCE(SUM(CASE WHEN transaction_type = 'SELL' THEN realized_pl ELSE 0 END), 0),
                    COALESCE(SUM(commission), 0)
                FROM "world_stock_transactions"
                WHERE user_id = :user_id
            """)
            pl_row = conn.execute(pl_query, params).fetchone()
            total_realized_pl = float(pl_row[0] or 0)
            total_commissions = float(pl_row[1] or 0)
            
            # Dividends
            div_query = text("""
                SELECT COALESCE(SUM(net_amount), 0) FROM "world_dividends" WHERE user_id = :user_id
            """)
            total_net_dividends = float(conn.execute(div_query, params).fetchone()[0] or 0)
            
            # Cash calculation (same logic as summary endpoint)
            cash_query = text("""
                SELECT
                    COALESCE(SUM(CASE WHEN transaction_type = 'CURRENCY_CONVERSION' THEN quantity ELSE 0 END), 0) as total_fx_usd,
                    COALESCE(SUM(CASE WHEN transaction_type = 'BUY' THEN quantity * price + COALESCE(commission, 0) ELSE 0 END), 0) as total_buy_outflow,
                    COALESCE(SUM(CASE WHEN transaction_type = 'SELL' THEN quantity * price - COALESCE(commission, 0) ELSE 0 END), 0) as total_sell_inflow
                FROM "world_stock_transactions"
                WHERE user_id = :user_id
            """)
            cash_row = conn.execute(cash_query, params).fetchone()
            fx_usd = float(cash_row[0] or 0)
            buy_outflow = float(cash_row[1] or 0)
            sell_inflow = float(cash_row[2] or 0)
            
            if fx_usd > 0:
                total_cash = fx_usd - buy_outflow + sell_inflow + total_net_dividends
                if total_cash < 0:
                    total_cash = 0.0
            else:
                total_cash = sell_inflow + total_net_dividends
            
            # Capital gains tax withheld (מס עתידי) in ILS
            tax_withheld_query = text("""
                SELECT COALESCE(SUM(quantity), 0)
                FROM "world_stock_transactions"
                WHERE user_id = :user_id AND transaction_type = 'CAPITAL_GAINS_TAX'
            """)
            total_tax_withheld_ils = float(conn.execute(tax_withheld_query, params).fetchone()[0] or 0)
            
            total_gain_loss = float(total_value - total_cost) + total_realized_pl
            total_invested = float(total_cost)
            total_val = float(total_value)
            total_portfolio = total_val + total_cash
            
            # Sector allocation
            sector_data = []
            if total_val > 0:
                for sector_name, sector_val in sorted(sectors.items(), key=lambda x: -x[1]):
                    pct = round(sector_val / total_val * 100, 1)
                    if pct > 0:
                        sector_data.append({"name": sector_name, "value": pct})
            
            return {
                "portfolioData": {
                    "totalValue": total_val,
                    "totalCash": round(total_cash, 2),
                    "totalPortfolioValue": round(total_portfolio, 2),
                    "dayChange": 0,  # Would need previous close data
                    "dayChangePercent": 0,
                    "totalGainLoss": round(total_gain_loss, 2),
                    "totalGainLossPercent": round((total_gain_loss / total_invested * 100) if total_invested > 0 else 0, 1),
                    "totalInvested": total_invested,
                    "totalRealizedPL": total_realized_pl,
                    "totalDividends": total_net_dividends,
                    "totalCommissions": total_commissions,
                    "taxWithheldILS": round(total_tax_withheld_ils, 2),
                },
                "holdings": holdings,
                "recentTransactions": recent_transactions[:5],
                "sectorData": sector_data,
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading dashboard: {str(e)}")


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
            check_query = text('SELECT user_id FROM "world_stock_holdings" WHERE id = :id')
            result = conn.execute(check_query, {"id": holding_id}).fetchone()
            
            if not result:
                raise HTTPException(status_code=404, detail="Holding not found")
            
            if result[0] != current_user.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            # Delete holding
            delete_query = text('DELETE FROM "world_stock_holdings" WHERE id = :id')
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


# ==================== Logo Management Endpoints ====================

@router.post("/crawl-logos")
async def crawl_all_stock_logos(
    batch_size: int = Query(5, description="Number of concurrent requests"),
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl logos for all world stocks that don't have them (Admin only)
    
    This is a direct logo fetch from TradingView's S3 bucket.
    For a two-phase approach, use crawl-tradingview-logo-urls first.
    """
    from app.services.world_stock_logo_crawler_service import crawl_all_world_stock_logos
    
    try:
        result = await crawl_all_world_stock_logos(batch_size)
        
        return {
            "success": True,
            "message": f"World stock logo crawling completed",
            "results": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling logos: {str(e)}")


@router.post("/crawl-logo/{ticker}")
async def crawl_single_stock_logo(
    ticker: str,
    exchange: str = Query("NASDAQ", description="Exchange (NASDAQ, NYSE, etc.)"),
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl logo for a specific stock by ticker (Admin only)
    Perfect for admin panel - allows manual logo fetching for individual stocks
    """
    from app.services.world_stock_logo_crawler_service import crawl_logo_for_world_stock
    
    try:
        # First check if stock exists
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT id, ticker, company_name, logo_svg IS NOT NULL as has_logo
                    FROM "world_stocks" 
                    WHERE ticker ILIKE :ticker
                    LIMIT 1
                """),
                {"ticker": ticker}
            )
            stock_info = result.fetchone()
        
        if not stock_info:
            return {
                "success": False,
                "message": f"Stock not found: {ticker}",
                "suggestion": "Try using the exact stock ticker symbol"
            }
        
        stock_id, tick, company_name, had_logo = stock_info
        
        # Attempt to crawl the logo
        success = await crawl_logo_for_world_stock(ticker, exchange)
        
        if success:
            return {
                "success": True,
                "message": f"Logo successfully fetched for {tick} ({company_name})",
                "stock": {
                    "id": stock_id,
                    "ticker": tick,
                    "company_name": company_name,
                    "exchange": exchange,
                    "had_logo_before": had_logo,
                    "has_logo_now": True
                }
            }
        else:
            return {
                "success": False,
                "message": f"Failed to fetch logo for {tick} ({company_name})",
                "stock": {
                    "id": stock_id,
                    "ticker": tick,
                    "company_name": company_name,
                    "exchange": exchange,
                    "had_logo_before": had_logo,
                    "has_logo_now": had_logo
                },
                "suggestion": "Logo may not be available on TradingView for this stock"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling logo: {str(e)}")


@router.post("/crawl-tradingview-logo-urls")
async def crawl_tradingview_logo_urls(
    batch_size: int = Query(5, description="Number of concurrent requests"),
    missing_only: bool = Query(True, description="Only process stocks without logo_url"),
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl TradingView symbol pages for world stocks and extract company logo URLs (Admin only)
    Phase 1: Does not fetch/store SVG content, only the URL reference.
    """
    from app.services.world_stock_logo_crawler_service import WorldStockLogoCrawlerService
    
    try:
        async with WorldStockLogoCrawlerService() as crawler:
            results = await crawler.crawl_tradingview_logo_urls_for_all(
                batch_size=batch_size,
                missing_only=missing_only
            )
        return {
            "success": True,
            "message": "Logo URL crawling completed",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling TradingView logo URLs: {str(e)}")


@router.post("/crawl-tradingview-logo-url/{ticker}")
async def crawl_tradingview_logo_url_for_ticker(
    ticker: str,
    exchange: str = Query("NASDAQ", description="Exchange (NASDAQ, NYSE, etc.)"),
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl TradingView symbol page for a single ticker and update its logo_url (Admin only)
    """
    from app.services.world_stock_logo_crawler_service import WorldStockLogoCrawlerService
    
    try:
        async with WorldStockLogoCrawlerService() as crawler:
            result = await crawler.crawl_tradingview_logo_url_for_ticker(ticker, exchange)
            if not result:
                return {
                    "success": False,
                    "message": f"No logo URL found for ticker {ticker} on {exchange}"
                }
            return {
                "success": True,
                "message": f"Logo URL found for {ticker}",
                "data": result
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling TradingView logo URL: {str(e)}")


@router.post("/fetch-logo-svg-from-url")
async def fetch_logo_svg_from_url_bulk(
    batch_size: int = Query(5, description="Number of concurrent requests"),
    only_missing: bool = Query(True, description="Only process stocks with logo_url but no logo_svg"),
    current_admin: User = Depends(get_admin_user)
):
    """
    For stocks with logo_url set, fetch the SVG and store it into logo_svg (Admin only)
    Phase 2: Processes stocks that already have a logo_url from Phase 1.
    If only_missing=True, process only stocks where logo_svg is NULL/empty.
    """
    from app.services.world_stock_logo_crawler_service import WorldStockLogoCrawlerService
    
    try:
        async with WorldStockLogoCrawlerService() as crawler:
            results = await crawler.populate_logo_svg_from_logo_urls_for_all(
                batch_size=batch_size,
                only_missing=only_missing
            )
        return {
            "success": True,
            "message": "Logo SVG population completed",
            "results": results
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error populating logo_svg from logo_url: {str(e)}")


@router.put("/stocks/{stock_id}/logo")
async def update_stock_logo_manual(
    stock_id: int,
    logo_data: dict,
    current_admin: User = Depends(get_admin_user)
):
    """
    Manually update a world stock's logo with custom SVG content (Admin only)
    Perfect for admin panel when automatic crawling fails

    Body: {"svg_content": "<svg>...</svg>", "logo_url": "https://..."}
    """
    try:
        svg_content = (logo_data.get("svg_content") or "").strip()
        logo_url = (logo_data.get("logo_url") or None)

        if not svg_content:
            raise HTTPException(status_code=400, detail="svg_content is required")

        # Basic SVG validation
        if not (svg_content.startswith("<svg") and svg_content.endswith("</svg>")):
            raise HTTPException(
                status_code=400,
                detail="Invalid SVG format - must start with <svg and end with </svg>"
            )

        with engine.connect() as conn:
            # Check if stock exists
            result = conn.execute(
                text('SELECT ticker, company_name FROM "world_stocks" WHERE id = :id'),
                {"id": stock_id}
            )
            stock_info = result.fetchone()
            if not stock_info:
                raise HTTPException(status_code=404, detail="Stock not found")

            ticker, company_name = stock_info

            # Update the logo fields
            if logo_url:
                result = conn.execute(
                    text('UPDATE "world_stocks" SET logo_url = :url, logo_svg = :svg WHERE id = :id'),
                    {"url": logo_url, "svg": svg_content, "id": stock_id}
                )
            else:
                result = conn.execute(
                    text('UPDATE "world_stocks" SET logo_svg = :svg WHERE id = :id'),
                    {"svg": svg_content, "id": stock_id}
                )

            if result.rowcount and result.rowcount > 0:
                conn.commit()
                return {
                    "success": True,
                    "message": f"Logo successfully updated for {ticker} ({company_name})",
                    "stock": {
                        "id": stock_id,
                        "ticker": ticker,
                        "company_name": company_name,
                        "logo_size": len(svg_content)
                    }
                }
            raise HTTPException(status_code=500, detail="Failed to update logo")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating logo: {str(e)}")


@router.delete("/stocks/{stock_id}/logo")
async def remove_stock_logo(
    stock_id: int,
    current_admin: User = Depends(get_admin_user)
):
    """
    Remove a world stock's logo (set to NULL) (Admin only)
    Useful for admin panel to clean up bad logos
    """
    try:
        with engine.connect() as conn:
            # Check if stock exists
            result = conn.execute(
                text('SELECT ticker, company_name, logo_svg IS NOT NULL as has_logo FROM "world_stocks" WHERE id = :id'),
                {"id": stock_id}
            )
            stock_info = result.fetchone()
            
            if not stock_info:
                raise HTTPException(status_code=404, detail="Stock not found")
            
            ticker, company_name, had_logo = stock_info
            
            if not had_logo:
                return {
                    "success": True,
                    "message": f"Stock {ticker} ({company_name}) already has no logo",
                    "stock": {"id": stock_id, "ticker": ticker, "company_name": company_name}
                }
            
            # Remove the logo
            result = conn.execute(
                text('UPDATE "world_stocks" SET logo_svg = NULL, logo_url = NULL WHERE id = :id'),
                {"id": stock_id}
            )
            
            if result.rowcount > 0:
                conn.commit()
                return {
                    "success": True,
                    "message": f"Logo successfully removed for {ticker} ({company_name})",
                    "stock": {"id": stock_id, "ticker": ticker, "company_name": company_name}
                }
            else:
                raise HTTPException(status_code=500, detail="Failed to remove logo")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error removing logo: {str(e)}")


@router.get("/stocks-without-logos")
async def get_stocks_without_logos(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of world stocks that don't have logos yet
    """
    try:
        async with WorldStockLogoCrawlerService() as crawler:
            stocks = crawler.get_stocks_without_logos()
        
        return {
            "stocks": stocks,
            "count": len(stocks)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stocks: {str(e)}")


@router.get("/stocks-with-logos")
async def get_stocks_with_logos(
    current_user: User = Depends(get_current_user)
):
    """
    Get list of world stocks that have logos
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT id, ticker, company_name, exchange,
                           CASE WHEN logo_svg IS NOT NULL AND logo_svg != '' 
                           THEN true ELSE false END as has_logo
                    FROM "world_stocks" 
                    WHERE is_active = true 
                    AND logo_svg IS NOT NULL 
                    AND logo_svg != ''
                    ORDER BY ticker
                """)
            )
            
            stocks = []
            for row in result:
                stocks.append({
                    'id': row[0],
                    'ticker': row[1],
                    'company_name': row[2],
                    'exchange': row[3],
                    'has_logo': row[4]
                })
        
        return {
            "stocks": stocks,
            "count": len(stocks)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stocks: {str(e)}")


@router.get("/logo-stats")
async def get_logo_statistics(
    current_user: User = Depends(get_current_user)
):
    """
    Get statistics about world stock logo coverage
    """
    try:
        async with WorldStockLogoCrawlerService() as crawler:
            all_stocks = crawler.get_all_stocks()
            missing_urls = crawler.get_stocks_missing_logo_url()
            missing_svgs = crawler.get_stocks_with_logo_url_missing_svg()
            without_logos = crawler.get_stocks_without_logos()
            
            total = len(all_stocks)
            with_urls = total - len(missing_urls)
            with_svgs = total - len(without_logos)
            
            return {
                "total_stocks": total,
                "logo_urls": {
                    "with_url": with_urls,
                    "missing_url": len(missing_urls),
                    "percentage": round(with_urls/total*100, 1) if total > 0 else 0
                },
                "logo_svgs": {
                    "with_svg": with_svgs,
                    "missing_svg": len(without_logos),
                    "percentage": round(with_svgs/total*100, 1) if total > 0 else 0
                },
                "partial_completion": {
                    "has_url_but_no_svg": len(missing_svgs)
                }
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving statistics: {str(e)}")


# ===== PENDING TRANSACTIONS ENDPOINTS =====

def _extract_ticker(ticker_field: str, stock_name: str):
    """Extract actual ticker from stock_name (e.g., 'NKE US' -> 'NKE', 'FORD MOTOR(F)' -> 'F', 'CATERPILLAR(CAT' -> 'CAT')"""
    import re
    actual_ticker = ticker_field
    stock_name_for_display = stock_name
    
    if stock_name:
        name = stock_name.strip()
        if ' US' in name:
            actual_ticker = name.replace(' US', '').strip()
        elif '(' in name and ')' in name:
            # Full paren: "FORD MOTOR(F)" -> ticker="F"
            start = name.rfind('(')
            end = name.rfind(')')
            if start != -1 and end != -1:
                actual_ticker = name[start+1:end]
                stock_name_for_display = name[:start].strip()
        elif '(' in name:
            # Truncated paren (PDF column cutoff): "CATERPILLAR(CAT" -> ticker="CAT"
            start = name.rfind('(')
            candidate = name[start+1:].strip()
            # Validate it looks like a ticker (1-5 uppercase letters)
            if candidate and re.match(r'^[A-Z]{1,5}$', candidate):
                actual_ticker = candidate
                stock_name_for_display = name[:start].strip()
    
    return actual_ticker, stock_name_for_display


def _process_approved_transaction(conn, t, user_id: str, now):
    """Process a single approved transaction into final tables.
    
    Handles BUY, SELL (with realized P/L), DIVIDEND, and CURRENCY_CONVERSION.
    """
    actual_ticker, stock_name_for_display = _extract_ticker(t.ticker, t.stock_name)
    
    if t.transaction_type in ('BUY', 'SELL'):
        quantity = float(t.quantity or 0)
        price = float(t.price or 0)
        buy_commission = float(t.commission or 0) if t.transaction_type == 'BUY' else 0
        cost = quantity * price + buy_commission  # Include buy commission in cost basis
        realized_pl = None
        cost_basis = None
        
        # For SELL, compute realized P/L BEFORE modifying the holding
        if t.transaction_type == 'SELL':
            existing = conn.execute(text("""
                SELECT id, quantity, purchase_cost FROM "world_stock_holdings"
                WHERE user_id = :user_id AND ticker = :ticker
            """), {"user_id": user_id, "ticker": actual_ticker}).fetchone()
            
            if existing and float(existing[1] or 0) > 0:
                avg_cost_per_share = float(existing[2] or 0) / float(existing[1])
                cost_basis = avg_cost_per_share * quantity
                # Use gross proceeds (qty * price), then subtract commission once
                gross_proceeds = quantity * price
                sell_commission = float(t.commission or 0)
                realized_pl = gross_proceeds - cost_basis - sell_commission
        
        # Insert transaction record
        conn.execute(text("""
            INSERT INTO "world_stock_transactions" 
            (user_id, ticker, symbol, company_name, transaction_date, transaction_time,
             transaction_type, quantity, price, total_value, commission, currency, 
             source_pdf, realized_pl, cost_basis, created_at, updated_at)
            VALUES (:user_id, :ticker, :symbol, :company_name, :transaction_date, :transaction_time,
                    :transaction_type, :quantity, :price, :total_value, :commission, :currency, 
                    :source_pdf, :realized_pl, :cost_basis, :created_at, :updated_at)
        """), {
            "user_id": user_id,
            "ticker": actual_ticker,
            "symbol": actual_ticker,
            "company_name": stock_name_for_display,
            "transaction_date": t.transaction_date,
            "transaction_time": t.transaction_time,
            "transaction_type": t.transaction_type,
            "quantity": t.quantity,
            "price": t.price,
            "total_value": t.amount,
            "commission": t.commission,
            "currency": t.currency or "USD",
            "source_pdf": t.pdf_filename,
            "realized_pl": realized_pl,
            "cost_basis": cost_basis,
            "created_at": now,
            "updated_at": now
        })
        
        # Update or create holding
        existing_holding = conn.execute(text("""
            SELECT id, quantity, purchase_cost FROM "world_stock_holdings"
            WHERE user_id = :user_id AND ticker = :ticker
        """), {"user_id": user_id, "ticker": actual_ticker}).fetchone()
        
        if t.transaction_type == 'BUY':
            if existing_holding:
                new_qty = float(existing_holding[1] or 0) + quantity
                new_cost = float(existing_holding[2] or 0) + cost
                conn.execute(text("""
                    UPDATE "world_stock_holdings" 
                    SET quantity = :quantity, purchase_cost = :cost, updated_at = :updated_at
                    WHERE id = :id
                """), {"quantity": new_qty, "cost": new_cost, "updated_at": now, "id": existing_holding[0]})
            else:
                conn.execute(text("""
                    INSERT INTO "world_stock_holdings" 
                    (user_id, ticker, symbol, company_name, quantity, purchase_cost, 
                     current_value, currency, source_pdf, created_at, updated_at)
                    VALUES (:user_id, :ticker, :symbol, :company_name, :quantity, :purchase_cost,
                            :current_value, :currency, :source_pdf, :created_at, :updated_at)
                """), {
                    "user_id": user_id,
                    "ticker": actual_ticker,
                    "symbol": actual_ticker,
                    "company_name": stock_name_for_display,
                    "quantity": quantity,
                    "purchase_cost": cost,
                    "current_value": cost,
                    "currency": t.currency or "USD",
                    "source_pdf": t.pdf_filename,
                    "created_at": now,
                    "updated_at": now
                })
        elif t.transaction_type == 'SELL':
            if existing_holding:
                new_qty = float(existing_holding[1] or 0) - quantity
                if new_qty > 0.001:
                    original_qty = float(existing_holding[1] or 1)
                    new_cost = float(existing_holding[2] or 0) * (new_qty / original_qty)
                    conn.execute(text("""
                        UPDATE "world_stock_holdings" 
                        SET quantity = :quantity, purchase_cost = :cost, updated_at = :updated_at
                        WHERE id = :id
                    """), {"quantity": new_qty, "cost": new_cost, "updated_at": now, "id": existing_holding[0]})
                else:
                    conn.execute(text("""
                        DELETE FROM "world_stock_holdings" WHERE id = :id
                    """), {"id": existing_holding[0]})
    
    elif t.transaction_type == 'DIVIDEND':
        gross_amount = t.amount or 0
        tax_amount = t.tax or 0
        net_amount = gross_amount - tax_amount
        
        conn.execute(text("""
            INSERT INTO "world_dividends" 
            (user_id, ticker, symbol, company_name, payment_date, amount, tax, net_amount, 
             currency, source_pdf, created_at, updated_at)
            VALUES (:user_id, :ticker, :symbol, :company_name, :payment_date, :amount, :tax, :net_amount, 
                    :currency, :source_pdf, :created_at, :updated_at)
        """), {
            "user_id": user_id,
            "ticker": actual_ticker,
            "symbol": actual_ticker,
            "company_name": stock_name_for_display,
            "payment_date": t.transaction_date,
            "amount": t.amount,
            "tax": t.tax,
            "net_amount": net_amount,
            "currency": t.currency or "USD",
            "source_pdf": t.pdf_filename,
            "created_at": now,
            "updated_at": now
        })
    
    elif t.transaction_type == 'CAPITAL_GAINS_TAX':
        # Capital gains tax (מס ששולם) — just store in transactions, no holdings impact
        # quantity = ILS amount of tax actually paid to tax authority
        conn.execute(text("""
            INSERT INTO "world_stock_transactions" 
            (user_id, ticker, symbol, company_name, transaction_date, transaction_time,
             transaction_type, quantity, price, total_value, commission, currency, 
             source_pdf, created_at, updated_at)
            VALUES (:user_id, :ticker, :symbol, :company_name, :transaction_date, :transaction_time,
                    :transaction_type, :quantity, :price, :total_value, :commission, :currency, 
                    :source_pdf, :created_at, :updated_at)
        """), {
            "user_id": user_id,
            "ticker": "TAX",
            "symbol": "TAX",
            "company_name": "Capital Gains Tax (מס ששולם)",
            "transaction_date": t.transaction_date,
            "transaction_time": t.transaction_time,
            "transaction_type": "CAPITAL_GAINS_TAX",
            "quantity": t.quantity,  # positive = tax paid, negative = refunded
            "price": None,
            "total_value": t.amount,  # absolute ILS amount
            "commission": None,
            "currency": "ILS",
            "source_pdf": t.pdf_filename,
            "created_at": now,
            "updated_at": now
        })
    
    elif t.transaction_type == 'CURRENCY_CONVERSION':
        # 1) Store USD inflow in world_stock_transactions
        conn.execute(text("""
            INSERT INTO "world_stock_transactions" 
            (user_id, ticker, symbol, company_name, transaction_date, transaction_time,
             transaction_type, quantity, price, total_value, commission, currency, 
             exchange_rate, source_pdf, created_at, updated_at)
            VALUES (:user_id, :ticker, :symbol, :company_name, :transaction_date, :transaction_time,
                    :transaction_type, :quantity, :price, :total_value, :commission, :currency, 
                    :exchange_rate, :source_pdf, :created_at, :updated_at)
        """), {
            "user_id": user_id,
            "ticker": "USD",
            "symbol": "USD",
            "company_name": "Currency Conversion ILS→USD",
            "transaction_date": t.transaction_date,
            "transaction_time": t.transaction_time,
            "transaction_type": "CURRENCY_CONVERSION",
            "quantity": t.quantity,  # USD amount
            "price": t.price,  # Exchange rate
            "total_value": t.amount,  # ILS amount
            "commission": t.commission,
            "currency": t.currency or "ILS",
            "exchange_rate": t.exchange_rate or t.price,
            "source_pdf": t.pdf_filename,
            "created_at": now,
            "updated_at": now
        })
        
        # 2) Store ILS debit in israeli_stock_transactions so it reduces the ILS balance
        ils_amount = float(t.amount or 0)
        if ils_amount > 0:
            conn.execute(text("""
                INSERT INTO "israeli_stock_transactions"
                (user_id, security_no, symbol, company_name, transaction_type,
                 transaction_date, transaction_time, quantity, price, total_value,
                 commission, tax, currency, source_pdf)
                VALUES (:user_id, :security_no, :symbol, :company_name, :transaction_type,
                        :transaction_date, :transaction_time, :quantity, :price, :total_value,
                        :commission, :tax, :currency, :source_pdf)
            """), {
                "user_id": user_id,
                "security_no": "FX-USD",
                "symbol": "USD",
                "company_name": "המרת מט״ח ILS→USD",
                "transaction_type": "FX_CONVERSION",
                "transaction_date": t.transaction_date,
                "transaction_time": t.transaction_time,
                "quantity": t.quantity,  # USD amount purchased
                "price": t.price,  # Exchange rate
                "total_value": ils_amount,  # ILS amount debited
                "commission": t.commission,
                "tax": None,
                "currency": "ILS",
                "source_pdf": t.pdf_filename,
            })


@router.get("/pending-transactions")
async def get_pending_world_transactions(
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending world stock transactions for review"""
    
    query = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.user_id == str(current_user.id)
    )
    
    if batch_id:
        query = query.filter(PendingWorldTransaction.upload_batch_id == batch_id)
    if status:
        query = query.filter(PendingWorldTransaction.status == status)
    
    transactions = query.order_by(PendingWorldTransaction.created_at.desc()).all()
    
    return {
        "transactions": [
            {
                "id": t.id,
                "upload_batch_id": t.upload_batch_id,
                "pdf_filename": t.pdf_filename,
                "transaction_date": t.transaction_date,
                "transaction_time": t.transaction_time,
                "ticker": t.ticker,
                "stock_name": t.stock_name,
                "world_stock_id": t.world_stock_id,
                "transaction_type": t.transaction_type,
                "quantity": float(t.quantity) if t.quantity else None,
                "price": float(t.price) if t.price else None,
                "amount": float(t.amount) if t.amount else None,
                "commission": float(t.commission) if t.commission else None,
                "tax": float(t.tax) if t.tax else None,
                "currency": t.currency,
                "exchange_rate": float(t.exchange_rate) if t.exchange_rate else None,
                "status": t.status,
                "review_notes": t.review_notes,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
        "count": len(transactions)
    }


@router.get("/pending-transactions/batches")
async def get_pending_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get summary of all pending batches"""
    
    query = text("""
        SELECT 
            upload_batch_id,
            pdf_filename,
            MIN(created_at) as upload_date,
            COUNT(*) as transaction_count,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count,
            SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approved_count,
            SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejected_count
        FROM "pending_world_transactions"
        WHERE user_id = :user_id
        GROUP BY upload_batch_id, pdf_filename
        ORDER BY MIN(created_at) DESC
    """)
    
    with engine.connect() as conn:
        result = conn.execute(query, {"user_id": str(current_user.id)})
        rows = result.fetchall()
        
        batches = []
        for row in rows:
            batches.append({
                "batch_id": row[0],
                "pdf_filename": row[1],
                "upload_date": row[2].isoformat() if row[2] else None,
                "transaction_count": row[3],
                "pending_count": row[4],
                "approved_count": row[5],
                "rejected_count": row[6]
            })
        
        return {
            "batches": batches,
            "count": len(batches)
        }


@router.post("/pending-transactions/{transaction_id}/approve")
async def approve_pending_world_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending world stock transaction and process it"""
    
    transaction = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.id == transaction_id,
        PendingWorldTransaction.user_id == str(current_user.id)
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status not in ("pending", "modified"):
        raise HTTPException(status_code=400, detail=f"Transaction already {transaction.status}")
    
    try:
        from sqlalchemy import text
        
        with engine.connect() as conn:
            now = datetime.now()
            _process_approved_transaction(conn, transaction, str(current_user.id), now)
            conn.commit()
        
        transaction.status = "approved"
        transaction.reviewed_at = datetime.now()
        transaction.reviewed_by = str(current_user.id)
        db.commit()
        
        return {
            "success": True, 
            "message": f"{transaction.transaction_type} transaction approved and processed"
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error processing transaction: {str(e)}")


@router.post("/pending-transactions/batch/{batch_id}/approve-all")
async def approve_all_world_in_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve all pending world stock transactions in a batch"""
    
    transactions = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.upload_batch_id == batch_id,
        PendingWorldTransaction.user_id == str(current_user.id),
        PendingWorldTransaction.status.in_(["pending", "modified"])
    ).all()
    
    if not transactions:
        raise HTTPException(status_code=404, detail="No pending transactions found in this batch")
    
    approved_count = 0
    errors = []
    now = datetime.now()
    
    for t in transactions:
        try:
            with engine.connect() as conn:
                _process_approved_transaction(conn, t, str(current_user.id), now)
                conn.commit()
            
            t.status = "approved"
            t.reviewed_at = datetime.now()
            t.reviewed_by = str(current_user.id)
            approved_count += 1
            
        except Exception as e:
            errors.append(f"Error processing transaction {t.id} ({t.ticker}): {str(e)}")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Approved {approved_count} of {len(transactions)} transactions",
        "approved_count": approved_count,
        "total_count": len(transactions),
        "errors": errors if errors else None
    }


@router.post("/pending-transactions/approve-all-batches")
async def approve_all_world_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve ALL pending world stock transactions for the current user across all batches"""
    
    transactions = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.user_id == str(current_user.id),
        PendingWorldTransaction.status.in_(["pending", "modified"])
    ).all()
    
    if not transactions:
        raise HTTPException(status_code=404, detail="No pending transactions found")
    
    approved_count = 0
    errors = []
    now = datetime.now()
    
    for t in transactions:
        try:
            with engine.connect() as conn:
                _process_approved_transaction(conn, t, str(current_user.id), now)
                conn.commit()
            
            t.status = "approved"
            t.reviewed_at = datetime.now()
            t.reviewed_by = str(current_user.id)
            approved_count += 1
            
        except Exception as e:
            errors.append(f"Error processing transaction {t.id} ({t.ticker}): {str(e)}")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Approved {approved_count} of {len(transactions)} transactions across all batches",
        "approved_count": approved_count,
        "total_count": len(transactions),
        "errors": errors if errors else None
    }


@router.post("/pending-transactions/reject-all-batches")
async def reject_all_world_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject ALL pending world stock transactions for the current user across all batches"""
    
    transactions = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.user_id == str(current_user.id),
        PendingWorldTransaction.status.in_(["pending", "modified"])
    ).all()
    
    rejected_count = len(transactions)
    
    for t in transactions:
        t.status = "rejected"
        t.reviewed_at = datetime.now()
        t.reviewed_by = str(current_user.id)
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Rejected {rejected_count} transactions across all batches",
        "rejected_count": rejected_count
    }


@router.post("/pending-transactions/{transaction_id}/reject")
async def reject_pending_world_transaction(
    transaction_id: int,
    review_notes: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject a pending world stock transaction"""
    
    transaction = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.id == transaction_id,
        PendingWorldTransaction.user_id == str(current_user.id)
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status not in ("pending", "modified"):
        raise HTTPException(status_code=400, detail=f"Transaction already {transaction.status}")
    
    # Update status
    transaction.status = "rejected"
    transaction.review_notes = review_notes
    transaction.reviewed_at = datetime.now()
    transaction.reviewed_by = str(current_user.id)
    db.commit()
    
    return {
        "success": True,
        "message": "Transaction rejected"
    }


@router.put("/pending-transactions/{transaction_id}")
async def update_pending_world_transaction(
    transaction_id: int,
    updates: Dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a pending world stock transaction before approval"""
    
    transaction = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.id == transaction_id,
        PendingWorldTransaction.user_id == str(current_user.id),
        PendingWorldTransaction.status.in_(["pending", "modified"])
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Pending transaction not found")
    
    # Update allowed fields
    allowed_fields = ['ticker', 'stock_name', 'transaction_type', 'transaction_date', 
                      'transaction_time', 'quantity', 'price', 'amount', 'commission', 
                      'tax', 'currency', 'review_notes']
    
    for field, value in updates.items():
        if field in allowed_fields and hasattr(transaction, field):
            setattr(transaction, field, value)
    
    db.commit()
    
    return {
        "success": True,
        "message": "Transaction updated",
        "transaction": {
            "id": transaction.id,
            "ticker": transaction.ticker,
            "stock_name": transaction.stock_name,
            "transaction_type": transaction.transaction_type,
            "quantity": float(transaction.quantity) if transaction.quantity else None,
            "price": float(transaction.price) if transaction.price else None,
            "amount": float(transaction.amount) if transaction.amount else None
        }
    }


@router.delete("/pending-transactions/batch/{batch_id}")
async def delete_pending_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Delete all pending transactions in a batch"""
    
    deleted_count = db.query(PendingWorldTransaction).filter(
        PendingWorldTransaction.upload_batch_id == batch_id,
        PendingWorldTransaction.user_id == str(current_user.id),
        PendingWorldTransaction.status == "pending"
    ).delete()
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Deleted {deleted_count} pending transactions",
        "deleted_count": deleted_count
    }


# ============== Stock Price Endpoints ==============
# NOTE: Static routes must come before dynamic routes to avoid conflicts

@router.get("/stocks/prices")
async def get_multiple_stock_prices(
    tickers: str = Query(..., description="Comma-separated list of tickers"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current price data for multiple stocks
    """
    ticker_list = [t.strip().upper() for t in tickers.split(",")]
    
    result = db.execute(
        text("""
            SELECT ticker, company_name, current_price, previous_close, 
                   price_change, price_change_pct, price_updated_at
            FROM "world_stocks"
            WHERE ticker = ANY(:tickers)
        """),
        {"tickers": ticker_list}
    )
    
    stocks = []
    for row in result.fetchall():
        stocks.append({
            "ticker": row[0],
            "company_name": row[1],
            "current_price": float(row[2]) if row[2] else None,
            "previous_close": float(row[3]) if row[3] else None,
            "price_change": float(row[4]) if row[4] else None,
            "price_change_pct": float(row[5]) if row[5] else None,
            "price_updated_at": row[6].isoformat() if row[6] else None
        })
    
    return {
        "stocks": stocks,
        "requested": len(ticker_list),
        "found": len(stocks)
    }


@router.get("/stocks/{ticker}/price")
async def get_stock_price(
    ticker: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get current price data for a specific stock
    """
    result = db.execute(
        text("""
            SELECT ticker, company_name, current_price, previous_close, 
                   price_change, price_change_pct, day_high, day_low, 
                   volume, market_cap, price_updated_at
            FROM "world_stocks"
            WHERE ticker = :ticker
        """),
        {"ticker": ticker.upper()}
    )
    row = result.fetchone()
    
    if not row:
        raise HTTPException(status_code=404, detail=f"Stock {ticker} not found")
    
    return {
        "ticker": row[0],
        "company_name": row[1],
        "current_price": float(row[2]) if row[2] else None,
        "previous_close": float(row[3]) if row[3] else None,
        "price_change": float(row[4]) if row[4] else None,
        "price_change_pct": float(row[5]) if row[5] else None,
        "day_high": float(row[6]) if row[6] else None,
        "day_low": float(row[7]) if row[7] else None,
        "volume": row[8],
        "market_cap": float(row[9]) if row[9] else None,
        "price_updated_at": row[10].isoformat() if row[10] else None
    }


@router.get("/holdings/with-prices")
async def get_holdings_with_prices(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's holdings with current price data and calculated values from StockPrices table
    """
    result = db.execute(
        text("""
            SELECT h.ticker, h.symbol, h.company_name, h.quantity, 
                   h.purchase_cost, h.current_value, h.last_price,
                   sp.current_price, sp.previous_close, sp.price_change_pct,
                   sp.updated_at as price_updated_at
            FROM "world_stock_holdings" h
            LEFT JOIN "stock_prices" sp ON h.ticker = sp.ticker AND sp.market = 'world'
            WHERE h.user_id = :user_id AND h.quantity > 0
            ORDER BY h.current_value DESC NULLS LAST
        """),
        {"user_id": str(current_user.id)}
    )
    
    holdings = []
    total_value = 0
    total_cost = 0
    
    for row in result.fetchall():
        # Use current_price from StockPrices, fallback to last_price from holding
        current_price = float(row[7]) if row[7] else float(row[6]) if row[6] else None
        quantity = float(row[3]) if row[3] else 0
        market_value = current_price * quantity if current_price else None
        purchase_cost = float(row[4]) if row[4] else 0
        
        gain_loss = (market_value - purchase_cost) if market_value and purchase_cost else None
        gain_loss_pct = ((market_value - purchase_cost) / purchase_cost * 100) if market_value and purchase_cost else None
        
        if market_value:
            total_value += market_value
        if purchase_cost:
            total_cost += purchase_cost
        
        holdings.append({
            "ticker": row[0],
            "symbol": row[1],
            "company_name": row[2],
            "quantity": quantity,
            "purchase_cost": purchase_cost,
            "current_price": current_price,
            "market_value": market_value,
            "gain_loss": gain_loss,
            "gain_loss_pct": gain_loss_pct,
            "day_change_pct": float(row[9]) if row[9] else None,
            "price_updated_at": row[10].isoformat() if row[10] else None
        })
    
    return {
        "holdings": holdings,
        "summary": {
            "total_holdings": len(holdings),
            "total_market_value": total_value,
            "total_cost": total_cost,
            "total_gain_loss": total_value - total_cost if total_value and total_cost else None,
            "total_gain_loss_pct": ((total_value - total_cost) / total_cost * 100) if total_value and total_cost else None
        }
    }


@router.post("/holdings/refresh-returns")
async def refresh_holdings_returns(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh return calculations (TWR, MWR, unrealized gains) for all user holdings
    """
    try:
        from app.services.returns_calculator import ReturnsCalculator
        
        target_user_id = user_id or current_user.id
        
        calculator = ReturnsCalculator(db)
        results = calculator.update_all_user_returns(target_user_id)
        
        return {
            "success": True,
            "message": f"Updated returns for {results['updated']} holdings",
            "updated": results['updated'],
            "failed": results['failed'],
            "errors": results['errors']
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error refreshing returns: {str(e)}"
        )
