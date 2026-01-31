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
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload and analyze investment PDF for world/US broker stocks
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
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get world stock holdings for a user"""
    try:
        from sqlalchemy import text
        from app.core.database import engine
        
        target_user_id = user_id or current_user.id
        
        with engine.connect() as conn:
            query = text("""
                SELECT id, user_id, ticker, symbol, company_name, quantity,
                       last_price, purchase_cost, current_value, portfolio_percentage,
                       currency, exchange_rate, holding_date, source_pdf,
                       created_at, updated_at
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
                    updated_at=row[15]
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
                       commission, tax, currency, exchange_rate, source_pdf, created_at
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
                    created_at=row[16]
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
                       source_pdf, created_at, created_at as updated_at
                FROM "WorldDividend"
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
                    total_amount=row[6],
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
            # Get holdings summary
            holdings_query = text("""
                SELECT 
                    COUNT(*) as holdings_count,
                    COALESCE(SUM(current_value), 0) as total_value,
                    COALESCE(SUM(purchase_cost), 0) as total_cost
                FROM "WorldStockHolding"
                WHERE user_id = :user_id
            """)
            
            holdings_result = conn.execute(holdings_query, params).fetchone()
            
            # Get dividends summary
            dividends_query = text("""
                SELECT 
                    COALESCE(SUM(amount), 0) as total_dividends,
                    COALESCE(SUM(tax), 0) as total_tax,
                    COUNT(*) as dividends_count
                FROM "WorldDividend"
                WHERE user_id = :user_id
            """)
            
            dividends_result = conn.execute(dividends_query, params).fetchone()
            
            # Get transactions summary
            transactions_query = text("""
                SELECT 
                    COALESCE(SUM(commission), 0) as total_commissions,
                    COUNT(*) as transactions_count
                FROM "WorldStockTransaction"
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
            
            # Calculate unrealized P/L and percentage
            total_unrealized_pl = total_value - total_cost
            if total_cost > 0:
                total_unrealized_pl_percent = (total_unrealized_pl / total_cost) * 100
            else:
                total_unrealized_pl_percent = Decimal('0')
            
            return WorldStockSummaryResponse(
                total_value=total_value,
                total_holdings=holdings_count,
                total_transactions=transactions_count,
                total_dividends=total_dividends,
                total_tax=total_tax,
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
                    FROM "WorldStocks" 
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
                text('SELECT ticker, company_name FROM "WorldStocks" WHERE id = :id'),
                {"id": stock_id}
            )
            stock_info = result.fetchone()
            if not stock_info:
                raise HTTPException(status_code=404, detail="Stock not found")

            ticker, company_name = stock_info

            # Update the logo fields
            if logo_url:
                result = conn.execute(
                    text('UPDATE "WorldStocks" SET logo_url = :url, logo_svg = :svg WHERE id = :id'),
                    {"url": logo_url, "svg": svg_content, "id": stock_id}
                )
            else:
                result = conn.execute(
                    text('UPDATE "WorldStocks" SET logo_svg = :svg WHERE id = :id'),
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
                text('SELECT ticker, company_name, logo_svg IS NOT NULL as has_logo FROM "WorldStocks" WHERE id = :id'),
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
                text('UPDATE "WorldStocks" SET logo_svg = NULL, logo_url = NULL WHERE id = :id'),
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
                    FROM "WorldStocks" 
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
        FROM "PendingWorldTransaction"
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
    
    if transaction.status != "pending":
        raise HTTPException(status_code=400, detail=f"Transaction already {transaction.status}")
    
    # Process transaction into final tables
    try:
        # Import here to avoid circular dependency
        from sqlalchemy import text
        
        with engine.connect() as conn:
            # Based on transaction type, insert into appropriate table
            if transaction.transaction_type in ('BUY', 'SELL'):
                # Insert into WorldStockTransaction
                insert_query = text("""
                    INSERT INTO "WorldStockTransaction" 
                    (user_id, ticker, symbol, transaction_date, transaction_time,
                     transaction_type, quantity, price, commission, currency, source_pdf)
                    VALUES (:user_id, :ticker, :ticker, :transaction_date, :transaction_time,
                            :transaction_type, :quantity, :price, :commission, :currency, :pdf_filename)
                """)
                
                conn.execute(insert_query, {
                    "user_id": str(current_user.id),
                    "ticker": transaction.ticker,
                    "transaction_date": transaction.transaction_date,
                    "transaction_time": transaction.transaction_time,
                    "transaction_type": transaction.transaction_type,
                    "quantity": transaction.quantity,
                    "price": transaction.price,
                    "commission": transaction.commission,
                    "currency": transaction.currency,
                    "pdf_filename": transaction.pdf_filename
                })
                
            elif transaction.transaction_type == 'DIVIDEND':
                # Insert into WorldDividend
                insert_query = text("""
                    INSERT INTO "WorldDividend" 
                    (user_id, ticker, symbol, payment_date, amount, tax, currency, source_pdf)
                    VALUES (:user_id, :ticker, :ticker, :payment_date, :amount, :tax, :currency, :pdf_filename)
                """)
                
                conn.execute(insert_query, {
                    "user_id": str(current_user.id),
                    "ticker": transaction.ticker,
                    "payment_date": transaction.transaction_date,
                    "amount": transaction.amount,
                    "tax": transaction.tax,
                    "currency": transaction.currency,
                    "pdf_filename": transaction.pdf_filename
                })
            
            conn.commit()
        
        # Update status after successful processing
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
        PendingWorldTransaction.status == "pending"
    ).all()
    
    if not transactions:
        raise HTTPException(status_code=404, detail="No pending transactions found in this batch")
    
    approved_count = 0
    errors = []
    
    for t in transactions:
        try:
            with engine.connect() as conn:
                # Based on transaction type, insert into appropriate table
                if t.transaction_type in ('BUY', 'SELL'):
                    insert_query = text("""
                        INSERT INTO "WorldStockTransaction" 
                        (user_id, ticker, symbol, transaction_date, transaction_time,
                         transaction_type, quantity, price, commission, currency, source_pdf)
                        VALUES (:user_id, :ticker, :ticker, :transaction_date, :transaction_time,
                                :transaction_type, :quantity, :price, :commission, :currency, :pdf_filename)
                    """)
                    
                    conn.execute(insert_query, {
                        "user_id": str(current_user.id),
                        "ticker": t.ticker,
                        "transaction_date": t.transaction_date,
                        "transaction_time": t.transaction_time,
                        "transaction_type": t.transaction_type,
                        "quantity": t.quantity,
                        "price": t.price,
                        "commission": t.commission,
                        "currency": t.currency,
                        "pdf_filename": t.pdf_filename
                    })
                    
                elif t.transaction_type == 'DIVIDEND':
                    insert_query = text("""
                        INSERT INTO "WorldDividend" 
                        (user_id, ticker, symbol, payment_date, amount, tax, currency, source_pdf)
                        VALUES (:user_id, :ticker, :ticker, :payment_date, :amount, :tax, :currency, :pdf_filename)
                    """)
                    
                    conn.execute(insert_query, {
                        "user_id": str(current_user.id),
                        "ticker": t.ticker,
                        "payment_date": t.transaction_date,
                        "amount": t.amount,
                        "tax": t.tax,
                        "currency": t.currency,
                        "pdf_filename": t.pdf_filename
                    })
                
                conn.commit()
            
            # Update status after successful processing
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
    
    if transaction.status != "pending":
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
        PendingWorldTransaction.status == "pending"
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
