"""
Israeli Stocks API Endpoints
Handles PDF upload, processing, and analysis for Israeli stock investment reports
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks, Query
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
from sqlalchemy.orm import Session
import tempfile
import os
import shutil
import csv
from datetime import datetime
from sqlalchemy import create_engine, text

from app.services.israeli_stock_service import IsraeliStockService
from app.services.logo_crawler_service import LogoCrawlerService, crawl_all_logos, crawl_logo_for_stock
from app.core.deps import get_current_user
from app.core.auth import get_admin_user
from app.core.database import engine, get_db
from app.models.user import User
from app.models.pending_transaction import PendingIsraeliTransaction
from app.models.israeli_report import IsraeliReportUpload

router = APIRouter()

@router.get("/test")
async def test_endpoint():
    """Simple test endpoint to verify routing works"""
    return {"status": "ok", "message": "Israeli stocks router is working"}

@router.post("/upload")
async def upload_reports(
    files: List[UploadFile] = File(...),
    broker_id: str = Query("excellence", description="Broker ID (excellence, meitav, ibi, etc.)"),
    current_user: User = Depends(get_current_user)
):
    """
    Unified upload endpoint for all Israeli brokers
    Accepts multiple PDF files and processes them based on broker type
    """
    print(f"DEBUG: Upload endpoint called!")
    print(f"DEBUG: broker_id = {broker_id}")
    print(f"DEBUG: files = {[f.filename for f in files]}")
    print(f"DEBUG: current_user = {current_user.email if current_user else 'None'}")
    
    # Validate broker support
    supported_brokers = ["excellence"]
    if broker_id not in supported_brokers:
        raise HTTPException(
            status_code=400,
            detail=f"Broker '{broker_id}' is not yet supported. Currently supported: {', '.join(supported_brokers)}"
        )
    
    results = []
    
    for file in files:
        if not file.filename.endswith('.pdf'):
            raise HTTPException(
                status_code=400,
                detail=f"File '{file.filename}' must be a PDF"
            )
        
        # Create temporary file
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, file.filename)
        
        try:
            # Save uploaded file
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Initialize service (currently only Excellence)
            service = IsraeliStockService()
            
            # Process PDF
            result = service.analyze_pdf_for_israeli_stocks(temp_path, current_user.id)
            
            if result.get('error'):
                results.append({
                    "message": result.get('message', f"Error: {result['error']}"),
                    "filename": file.filename,
                    "status": "failed",
                    "error": result['error']
                })
            else:
                results.append({
                    "message": result.get('message', 'PDF processed successfully'),
                    "filename": file.filename,
                    "status": "completed",
                    "broker": broker_id,
                    "batch_id": result.get('batch_id'),
                    "total_extracted": result.get('total_extracted', 0),
                    "holdings_found": result.get('holdings_found', 0),
                    "transactions_found": result.get('transactions_found', 0),
                    "dividends_found": result.get('dividends_found', 0),
                    "pending_count": result.get('pending_count', 0),
                    "holding_date": result.get('holding_date')
                })
            
        except Exception as e:
            results.append({
                "message": f"Error processing {file.filename}",
                "filename": file.filename,
                "status": "failed",
                "error": str(e)
            })
        finally:
            # Clean up temp files
            if os.path.exists(temp_dir):
                shutil.rmtree(temp_dir)
    
    return results

@router.post("/upload-pdf")
async def upload_and_analyze_pdf(
    file: UploadFile = File(...),
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload and analyze investment PDF for Israeli stocks
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
        service = IsraeliStockService()
        
        # Process PDF immediately (not in background)
        target_user_id = user_id or current_user.id
        result = service.analyze_pdf_for_israeli_stocks(temp_path, target_user_id)
        
        # Check if duplicate was detected
        if 'error' in result and result['error'] == 'duplicate':
            raise HTTPException(status_code=409, detail=result['message'])
        
        return {
            "message": "PDF processed successfully",
            "filename": file.filename,
            "status": "completed",
            "holdings_found": len(result.get('holdings', [])),
            "holdings_saved": result.get('holdings_saved', 0),
            "transactions_found": len(result.get('transactions', [])),
            "transactions_saved": result.get('transactions_saved', 0),
            "holding_date": result.get('holding_date')
        }
        
    except HTTPException:
        raise  # Re-raise HTTP exceptions (including our 409 duplicate error)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")
    finally:
        # Clean up temp files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

async def process_pdf_background(pdf_path: str, temp_dir: str, user_id: str):
    """Background task to process PDF and save results to database"""
    try:
        service = IsraeliStockService()
        
        # Process PDF
        result = service.analyze_pdf_for_israeli_stocks(pdf_path, user_id)
        
        print(f"PDF processing completed for user {user_id}:")
        print(f"- Holdings found: {len(result.get('holdings', []))}")
        print(f"- Transactions found: {len(result.get('transactions', []))}")
        print(f"- Dividends found: {len(result.get('dividends', []))}")
        
    except Exception as e:
        print(f"Error in background PDF processing: {e}")
    finally:
        # Clean up temp files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@router.get("/holdings")
async def get_israeli_holdings(
    user_id: Optional[str] = None,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get Israeli stock holdings for a user"""
    try:
        service = IsraeliStockService()
        target_user_id = user_id or current_user.id
        
        holdings = service.get_user_holdings(target_user_id, limit)
        
        return {
            "user_id": target_user_id,
            "holdings": holdings,
            "count": len(holdings)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving holdings: {str(e)}")

@router.get("/transactions")
async def get_israeli_transactions(
    user_id: Optional[str] = None,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get Israeli stock transactions for a user"""
    try:
        service = IsraeliStockService()
        target_user_id = user_id or current_user.id
        
        transactions = service.get_user_transactions(target_user_id, limit)
        
        return {
            "user_id": target_user_id,
            "transactions": transactions,
            "count": len(transactions)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving transactions: {str(e)}")

@router.get("/dividends")
async def get_israeli_dividends(
    user_id: Optional[str] = None,
    limit: Optional[int] = 100,
    current_user: User = Depends(get_current_user)
):
    """Get Israeli stock dividends for a user"""
    try:
        service = IsraeliStockService()
        target_user_id = user_id or current_user.id
        
        dividends = service.get_user_dividends(target_user_id, limit)
        
        return {
            "user_id": target_user_id,
            "dividends": dividends,
            "count": len(dividends)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving dividends: {str(e)}")

@router.post("/transactions")
async def create_transaction(
    transaction_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Create a new transaction manually"""
    try:
        service = IsraeliStockService()
        
        # Add user_id to transaction data
        transaction_data['user_id'] = current_user.id
        
        # Create transaction
        transaction_id = service.create_transaction(transaction_data)
        
        return {
            "success": True,
            "transaction_id": transaction_id,
            "message": "Transaction created successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error creating transaction: {str(e)}")

@router.put("/transactions/{transaction_id}")
async def update_transaction(
    transaction_id: int,
    transaction_data: dict,
    current_user: User = Depends(get_current_user)
):
    """Update an existing transaction"""
    try:
        service = IsraeliStockService()
        
        # Update transaction
        success = service.update_transaction(transaction_id, transaction_data, current_user.id)
        
        if success:
            return {
                "success": True,
                "message": "Transaction updated successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Transaction not found or access denied")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating transaction: {str(e)}")

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a transaction"""
    try:
        service = IsraeliStockService()
        
        success = service.delete_transaction(transaction_id, current_user.id)
        
        if success:
            return {
                "success": True,
                "message": "Transaction deleted successfully"
            }
        else:
            raise HTTPException(status_code=404, detail="Transaction not found or access denied")
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting transaction: {str(e)}")

@router.get("/stocks")
async def get_israeli_stocks(
    index_name: Optional[str] = None,
    limit: Optional[int] = None
):
    """Get list of Israeli stocks"""
    try:
        service = IsraeliStockService()
        stocks = service.get_israeli_stocks(index_name, limit)
        
        return {
            "stocks": stocks,
            "count": len(stocks),
            "index_filter": index_name
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stocks: {str(e)}")

@router.get("/search")
async def search_israeli_stocks_catalog(
    q: str = "",
    limit: int = 500,
    current_user: User = Depends(get_current_user)
):
    """Search Israeli stocks catalog by symbol or company name. Empty q returns all."""
    try:
        from sqlalchemy import text
        from app.core.database import engine

        with engine.connect() as conn:
            if q.strip():
                result = conn.execute(text("""
                    SELECT symbol, name as company_name
                    FROM "israeli_stocks"
                    WHERE symbol ILIKE :q OR name ILIKE :q
                    ORDER BY
                        CASE WHEN symbol ILIKE :exact THEN 0 ELSE 1 END,
                        symbol
                    LIMIT :limit
                """), {"q": f"%{q}%", "exact": f"{q}%", "limit": limit})
            else:
                result = conn.execute(text("""
                    SELECT symbol, name as company_name
                    FROM "israeli_stocks"
                    ORDER BY symbol
                    LIMIT :limit
                """), {"limit": limit})

            rows = result.fetchall()
        return [{"symbol": row[0], "company_name": row[1] or ""} for row in rows if row[0]]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error searching stocks: {str(e)}")


@router.get("/summary")
async def get_user_summary(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get summary of user's Israeli stock investments"""
    try:
        service = IsraeliStockService()
        target_user_id = user_id or current_user.id
        
        # Get counts and basic stats
        holdings = service.get_user_holdings(target_user_id, limit=1000)
        transactions = service.get_user_transactions(target_user_id, limit=1000)
        dividends = service.get_user_dividends(target_user_id, limit=1000)
        
        # Calculate summary stats
        total_holdings_value = sum(
            float(h.get('current_value', 0)) for h in holdings
            if h.get('current_value')
        )
        
        total_dividends = sum(
            float(d.get('amount', 0)) for d in dividends
            if d.get('amount')
        )
        
        unique_stocks = len(set(h.get('security_no') for h in holdings))
        
        return {
            "user_id": target_user_id,
            "summary": {
                "total_holdings": len(holdings),
                "unique_stocks": unique_stocks,
                "total_holdings_value": total_holdings_value,
                "total_transactions": len(transactions),
                "total_dividends": len(dividends),
                "total_dividend_amount": total_dividends
            },
            "recent_transactions": transactions[:5],
            "recent_dividends": dividends[:5]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving summary: {str(e)}")


@router.get("/cash-balance")
async def get_cash_balance(
    user_id: Optional[str] = None,
    as_of_date: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Get cash balance for Israeli stock investments
    
    Shows deposits, withdrawals, purchases, sales, and available cash
    """
    try:
        from app.services.cash_balance_service import CashBalanceService
        from app.services.israeli_stock_service import IsraeliStockService
        from datetime import datetime
        
        target_user_id = user_id or current_user.id
        
        # Parse date if provided
        parsed_date = None
        if as_of_date:
            try:
                parsed_date = datetime.fromisoformat(as_of_date).date()
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")
        
        # Get database connection
        israeli_service = IsraeliStockService()
        conn = israeli_service.create_database_connection()
        
        try:
            cash_service = CashBalanceService(conn)
            balance_data = cash_service.calculate_cash_balance(target_user_id, parsed_date)
            
            return {
                "user_id": target_user_id,
                "balance": balance_data
            }
        finally:
            conn.close()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating cash balance: {str(e)}")


@router.get("/cash-flow")
async def get_cash_flow_summary(
    user_id: Optional[str] = None,
    period: str = Query("all", description="Period: all, year, month"),
    current_user: User = Depends(get_current_user)
):
    """Get cash flow summary"""
    try:
        from app.services.cash_balance_service import CashBalanceService
        from app.services.israeli_stock_service import IsraeliStockService
        
        target_user_id = user_id or current_user.id
        
        israeli_service = IsraeliStockService()
        conn = israeli_service.create_database_connection()
        
        try:
            cash_service = CashBalanceService(conn)
            summary = cash_service.get_cash_flow_summary(target_user_id, period)
            
            return {
                "user_id": target_user_id,
                "cash_flow": summary
            }
        finally:
            conn.close()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error calculating cash flow: {str(e)}")


@router.post("/upload-csv")
async def upload_and_analyze_csv(
    background_tasks: BackgroundTasks,
    files: List[UploadFile] = File(...),
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """
    Upload and analyze CSV files for Israeli stocks
    """
    csv_files = []
    temp_dir = tempfile.mkdtemp()
    
    try:
        # Save uploaded CSV files
        for file in files:
            if not file.filename.endswith('.csv'):
                raise HTTPException(status_code=400, detail=f"File {file.filename} must be a CSV")
            
            temp_path = os.path.join(temp_dir, file.filename)
            with open(temp_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            csv_files.append(temp_path)
        
        # Initialize service
        service = IsraeliStockService()
        
        # Process CSV files in background
        background_tasks.add_task(
            process_csv_background,
            csv_files,
            temp_dir,
            user_id or current_user.id
        )
        
        return {
            "message": f"{len(csv_files)} CSV files uploaded successfully and processing started",
            "files": [f.filename for f in files],
            "status": "processing"
        }
        
    except Exception as e:
        # Clean up temp files on error
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)
        raise HTTPException(status_code=500, detail=f"Error processing CSV files: {str(e)}")

async def process_csv_background(csv_files: List[str], temp_dir: str, user_id: str):
    """Background task to process CSV files and save results to database"""
    try:
        service = IsraeliStockService()
        
        # Process CSV files
        result = service.analyze_csv_for_israeli_stocks(csv_files, user_id)
        
        print(f"CSV processing completed for user {user_id}:")
        print(f"- Holdings found: {len(result.get('holdings', []))}")
        print(f"- Transactions found: {len(result.get('transactions', []))}")
        print(f"- Dividends found: {len(result.get('dividends', []))}")
        
    except Exception as e:
        print(f"Error in background CSV processing: {e}")
    finally:
        # Clean up temp files
        if os.path.exists(temp_dir):
            shutil.rmtree(temp_dir)

@router.delete("/holdings/{holding_id}")
async def delete_holding(
    holding_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a specific holding"""
    try:
        service = IsraeliStockService()
        success = service.delete_holding(holding_id, str(current_user.id))
        
        if not success:
            raise HTTPException(status_code=404, detail="Holding not found or access denied")
        
        return {"message": "Holding deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting holding: {str(e)}")

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user)
):
    """Delete a specific transaction"""
    try:
        service = IsraeliStockService()
        success = service.delete_transaction(transaction_id, str(current_user.id))
        
        if not success:
            raise HTTPException(status_code=404, detail="Transaction not found or access denied")
        
        return {"message": "Transaction deleted successfully"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting transaction: {str(e)}")

@router.post("/crawl-logos")
async def crawl_all_stock_logos(
    batch_size: int = 5,
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl logos for all stocks that don't have them (Admin only)
    """
    try:
        result = await crawl_all_logos(batch_size)
        
        return {
            "success": True,
            "message": f"Logo crawling completed",
            "results": result
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling logos: {str(e)}")

@router.post("/crawl-logo/{stock_name}")
async def crawl_single_stock_logo(
    stock_name: str,
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl logo for a specific stock by name (Admin only)
    Perfect for admin panel - allows manual logo fetching for individual stocks
    """
    try:
        # First check if stock exists
        from app.core.database import engine
        
        # Find the stock in database
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT id, symbol, name, logo_svg IS NOT NULL as has_logo
                    FROM "israeli_stocks" 
                    WHERE name ILIKE :name OR symbol ILIKE :symbol
                    LIMIT 1
                """),
                {"name": f"%{stock_name}%", "symbol": f"%{stock_name}%"}
            )
            stock_info = result.fetchone()
        
        if not stock_info:
            return {
                "success": False,
                "message": f"Stock not found: {stock_name}",
                "suggestion": "Try using the exact stock symbol or company name"
            }
        
        stock_id, symbol, name, had_logo = stock_info
        
        # Attempt to crawl the logo
        success = await crawl_logo_for_stock(stock_name)
        
        if success:
            return {
                "success": True,
                "message": f"Logo successfully fetched for {symbol} ({name})",
                "stock": {
                    "id": stock_id,
                    "symbol": symbol,
                    "name": name,
                    "had_logo_before": had_logo,
                    "has_logo_now": True
                }
            }
        else:
            return {
                "success": False,
                "message": f"Failed to fetch logo for {symbol} ({name})",
                "stock": {
                    "id": stock_id,
                    "symbol": symbol,
                    "name": name,
                    "had_logo_before": had_logo,
                    "has_logo_now": had_logo
                },
                "suggestion": "Logo may not be available on TradingView for this stock"
            }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling logo: {str(e)}")

@router.post("/crawl-tradingview-logo-urls")
async def crawl_tradingview_logo_urls(
    batch_size: int = 5,
    missing_only: bool = True,
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl TradingView symbol pages for many stocks and extract the company logo URL (Admin only)
    Does not fetch/store SVG content, only the URL reference.
    """
    try:
        async with LogoCrawlerService() as crawler:
            results = await crawler.crawl_tradingview_logo_urls_for_all(batch_size=batch_size, missing_only=missing_only)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling TradingView logo URLs: {str(e)}")

@router.post("/crawl-tradingview-logo-url/{symbol}")
async def crawl_tradingview_logo_url_for_symbol(
    symbol: str,
    current_admin: User = Depends(get_admin_user)
):
    """
    Crawl TradingView symbol page for a single TASE symbol and update its logo_url (Admin only)
    """
    try:
        async with LogoCrawlerService() as crawler:
            result = await crawler.crawl_tradingview_logo_url_for_symbol(symbol)
            if not result:
                return {"success": False, "message": f"No logo URL found for symbol {symbol}"}
            return {"success": True, "data": result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error crawling TradingView logo URL: {str(e)}")

@router.post("/fetch-logo-svg-from-url")
async def fetch_logo_svg_from_url_bulk(
    batch_size: int = 5,
    only_missing: bool = True,
    current_admin: User = Depends(get_admin_user)
):
    """
    For stocks with logo_url set, fetch the SVG and store it into logo_svg (Admin only)
    If only_missing=True, process only stocks where logo_svg is NULL/empty.
    """
    try:
        async with LogoCrawlerService() as crawler:
            results = await crawler.populate_logo_svg_from_logo_urls_for_all(batch_size=batch_size, only_missing=only_missing)
        return {"success": True, "results": results}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error populating logo_svg from logo_url: {str(e)}")

@router.post("/fetch-logo-svg-from-url/{stock_id}")
async def fetch_logo_svg_from_url_for_stock(
    stock_id: int,
    current_admin: User = Depends(get_admin_user)
):
    """
    Populate logo_svg for a single stock by its ID using stored logo_url (Admin only)
    """
    try:
        async with LogoCrawlerService() as crawler:
            res = await crawler.populate_logo_svg_for_stock_id(stock_id)
            if res is None:
                return {"success": False, "message": "Stock not found or no logo_url"}
            if res is False:
                return {"success": False, "message": "Failed to fetch or store SVG"}
            return {"success": True}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error populating logo_svg: {str(e)}")

@router.put("/stocks/{stock_id}/logo")
async def update_stock_logo_manual(
    stock_id: int,
    logo_data: dict,
    current_admin: User = Depends(get_admin_user)
):
    """
    Manually update a stock's logo with custom SVG content (Admin only)
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

        from app.core.database import engine

        with engine.connect() as conn:
            # Check if stock exists
            result = conn.execute(
                text('SELECT symbol, name FROM "israeli_stocks" WHERE id = :id'),
                {"id": stock_id}
            )
            stock_info = result.fetchone()
            if not stock_info:
                raise HTTPException(status_code=404, detail="Stock not found")

            symbol, name = stock_info

            # Update the logo fields
            if logo_url:
                result = conn.execute(
                    text('UPDATE "israeli_stocks" SET logo_url = :url, logo_svg = :svg WHERE id = :id'),
                    {"url": logo_url, "svg": svg_content, "id": stock_id}
                )
            else:
                result = conn.execute(
                    text('UPDATE "israeli_stocks" SET logo_svg = :svg WHERE id = :id'),
                    {"svg": svg_content, "id": stock_id}
                )

            if result.rowcount and result.rowcount > 0:
                conn.commit()
                return {
                    "success": True,
                    "message": f"Logo successfully updated for {symbol} ({name})",
                    "stock": {
                        "id": stock_id,
                        "symbol": symbol,
                        "name": name,
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
    Remove a stock's logo (set to NULL) (Admin only)
    Useful for admin panel to clean up bad logos
    """
    try:
        from app.core.database import engine
        
        with engine.connect() as conn:
            # Check if stock exists
            result = conn.execute(
                text('SELECT symbol, name, logo_svg IS NOT NULL as has_logo FROM "israeli_stocks" WHERE id = :id'),
                {"id": stock_id}
            )
            stock_info = result.fetchone()
            
            if not stock_info:
                raise HTTPException(status_code=404, detail="Stock not found")
            
            symbol, name, had_logo = stock_info
            
            if not had_logo:
                return {
                    "success": True,
                    "message": f"Stock {symbol} ({name}) already has no logo",
                    "stock": {"id": stock_id, "symbol": symbol, "name": name}
                }
            
            # Remove the logo
            result = conn.execute(
                text('UPDATE "israeli_stocks" SET logo_svg = NULL WHERE id = :id'),
                {"id": stock_id}
            )
            
            if result.rowcount > 0:
                conn.commit()
                return {
                    "success": True,
                    "message": f"Logo successfully removed for {symbol} ({name})",
                    "stock": {"id": stock_id, "symbol": symbol, "name": name}
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
    Get list of stocks that don't have logos yet
    """
    try:
        async with LogoCrawlerService() as crawler:
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
    Get list of stocks that have logos
    """
    try:
        service = IsraeliStockService()
        
        # Get stocks with logos using raw SQL
        with engine.connect() as conn:
            result = conn.execute(
                text("""
                    SELECT id, name, symbol, security_no, 
                           CASE WHEN logo_svg IS NOT NULL AND logo_svg != '' 
                           THEN true ELSE false END as has_logo
                    FROM "israeli_stocks" 
                    WHERE is_active = true 
                    AND logo_svg IS NOT NULL 
                    AND logo_svg != ''
                    ORDER BY name
                """)
            )
            
            stocks = []
            for row in result:
                stocks.append({
                    'id': row[0],
                    'name': row[1],
                    'symbol': row[2],
                    'security_no': row[3],
                    'has_logo': row[4]
                })
        
        return {
            "stocks": stocks,
            "count": len(stocks)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error retrieving stocks with logos: {str(e)}")

@router.post("/import-stocks-from-csv")
async def import_stocks_from_csv(
    current_user: User = Depends(get_admin_user)
):
    """
    Import Israeli stocks from IsraeliStocks.csv file
    Admin only endpoint
    """
    # Get the backend root directory
    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    csv_path = os.path.join(backend_root, "data", "IsraeliStocks.csv")
    
    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"CSV file not found at {csv_path}")
    
    try:
        imported = 0
        skipped = 0
        errors = []
        
        with open(csv_path, 'r', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            
            with engine.connect() as conn:
                for row in reader:
                    try:
                        security_no = row['security_no']
                        symbol = row['symbol']
                        name = row['name']
                        logo_svg = row.get('logo_svg', '')
                        logo_url = row.get('logo_url', '')
                        
                        # Check if stock already exists
                        check_result = conn.execute(
                            text('SELECT id FROM "israeli_stocks" WHERE security_no = :security_no'),
                            {"security_no": security_no}
                        )
                        existing = check_result.fetchone()
                        
                        if existing:
                            skipped += 1
                            continue
                        
                        # Insert new stock
                        conn.execute(
                            text('''
                                INSERT INTO "israeli_stocks" 
                                (name, symbol, security_no, index_name, is_active, logo_svg, logo_url, created_at, updated_at)
                                VALUES (:name, :symbol, :security_no, :index_name, :is_active, :logo_svg, :logo_url, NOW(), NOW())
                            '''),
                            {
                                "name": name.strip(),
                                "symbol": symbol.strip(),
                                "security_no": security_no,
                                "index_name": "TA-125",
                                "is_active": True,
                                "logo_svg": logo_svg if logo_svg else None,
                                "logo_url": logo_url if logo_url else None
                            }
                        )
                        imported += 1
                        
                    except Exception as e:
                        errors.append(f"Error importing {symbol}: {str(e)}")
                        
                conn.commit()
        
        # Count total stocks in database
        with engine.connect() as conn:
            result = conn.execute(text('SELECT COUNT(*) FROM "israeli_stocks"'))
            total_count = result.scalar()
        
        return {
            "message": f"Successfully imported {imported} stocks from CSV",
            "imported": imported,
            "skipped": skipped,
            "total_in_db": total_count,
            "errors": errors if errors else None
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing stocks: {str(e)}")


@router.post("/import-etfs-from-csv")
async def import_etfs_from_csv(
    current_user: User = Depends(get_admin_user)
):
    """
    Import Israeli ETFs from Israelietfs.csv file.
    The file has 2 junk header rows before the real column headers.
    Admin only endpoint.
    """
    import io

    backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))))
    csv_path = os.path.join(backend_root, "data", "Israelietfs.csv")

    if not os.path.exists(csv_path):
        raise HTTPException(status_code=404, detail=f"CSV file not found at {csv_path}")

    try:
        imported = 0
        skipped = 0
        errors = []

        with open(csv_path, 'r', encoding='utf-8-sig') as f:
            lines = f.readlines()

        # Skip first 2 rows (title + date), row index 2 is the real header
        reader = csv.DictReader(io.StringIO(''.join(lines[2:])))

        with engine.connect() as conn:
            for row in reader:
                try:
                    security_no = row.get('Security No', '').strip().lstrip('0')
                    # Column names have trailing spaces in this file
                    symbol = (row.get('Symbol ', '') or row.get('Symbol', '')).strip()
                    name = row.get('Full Name', '').strip()

                    if not security_no or not name:
                        skipped += 1
                        continue

                    # Deduplicate by security_no
                    existing = conn.execute(
                        text('SELECT id FROM "israeli_stocks" WHERE security_no = :security_no'),
                        {"security_no": security_no}
                    ).fetchone()

                    if existing:
                        skipped += 1
                        continue

                    # yfinance uses hyphens, not dots (e.g. MTF-F100.TA not MTF.F100.TA)
                    yf_symbol = symbol.replace('.', '-') if symbol else security_no
                    yfinance_ticker = f"{yf_symbol}.TA"

                    # ETF metadata
                    underlying_asset = row.get('Underlying Asset', '').strip() or None
                    classification = row.get('Classification', '').strip() or None
                    fund_trustee = row.get('Fund Trustee', '').strip() or None
                    isin = row.get('ISIN ', '').strip() or row.get('ISIN', '').strip() or None
                    market_cap_raw = row.get('Market Cap (K ILS)', '').strip()
                    market_cap_k_ils = float(market_cap_raw) if market_cap_raw else None
                    mgmt_fee_raw = row.get('Management Fee (%)', '').strip()
                    management_fee = float(mgmt_fee_raw) if mgmt_fee_raw else None

                    conn.execute(
                        text('''
                            INSERT INTO "israeli_stocks"
                            (name, symbol, security_no, index_name, yfinance_ticker, is_active,
                             isin, underlying_asset, classification, fund_trustee,
                             management_fee, market_cap_k_ils, created_at, updated_at)
                            VALUES (:name, :symbol, :security_no, :index_name, :yfinance_ticker, :is_active,
                                    :isin, :underlying_asset, :classification, :fund_trustee,
                                    :management_fee, :market_cap_k_ils, NOW(), NOW())
                        '''),
                        {
                            "name": name,
                            "symbol": symbol if symbol else None,
                            "security_no": security_no,
                            "index_name": "ETF",
                            "yfinance_ticker": yfinance_ticker,
                            "is_active": True,
                            "isin": isin,
                            "underlying_asset": underlying_asset,
                            "classification": classification,
                            "fund_trustee": fund_trustee,
                            "management_fee": management_fee,
                            "market_cap_k_ils": market_cap_k_ils,
                        }
                    )
                    imported += 1

                except Exception as e:
                    errors.append(f"Error importing {row.get('Full Name', '?')}: {str(e)}")

            conn.commit()

        with engine.connect() as conn:
            total_count = conn.execute(text('SELECT COUNT(*) FROM "israeli_stocks"')).scalar()

        return {
            "message": f"Successfully imported {imported} ETFs from CSV",
            "imported": imported,
            "skipped": skipped,
            "total_in_db": total_count,
            "errors": errors if errors else None
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error importing ETFs: {str(e)}")


# ===== PENDING TRANSACTIONS ENDPOINTS =====

@router.get("/pending-transactions")
async def get_pending_transactions(
    batch_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get pending transactions for review"""
    from sqlalchemy.orm import Session
    from app.core.database import get_db
    
    query = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.user_id == str(current_user.id)
    )
    
    if batch_id:
        query = query.filter(PendingIsraeliTransaction.upload_batch_id == batch_id)
    if status:
        query = query.filter(PendingIsraeliTransaction.status == status)
    
    transactions = query.order_by(PendingIsraeliTransaction.transaction_date.asc()).all()
    
    return {
        "transactions": [
            {
                "id": t.id,
                "upload_batch_id": t.upload_batch_id,
                "pdf_filename": t.pdf_filename,
                "transaction_date": t.transaction_date,
                "transaction_time": t.transaction_time,
                "security_no": t.security_no,
                "stock_name": t.stock_name,
                "transaction_type": t.transaction_type,
                "quantity": float(t.quantity) if t.quantity else None,
                "price": float(t.price) if t.price else None,
                "amount": float(t.amount) if t.amount else None,
                "commission": float(t.commission) if t.commission else None,
                "tax": float(t.tax) if t.tax else None,
                "currency": t.currency,
                "status": t.status,
                "review_notes": t.review_notes,
                "created_at": t.created_at.isoformat() if t.created_at else None,
            }
            for t in transactions
        ],
        "count": len(transactions)
    }


@router.post("/pending-transactions/{transaction_id}/approve")
async def approve_pending_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve a pending transaction and process it"""
    transaction = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.id == transaction_id,
        PendingIsraeliTransaction.user_id == str(current_user.id)
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    if transaction.status not in ("pending", "modified"):
        raise HTTPException(status_code=400, detail=f"Transaction already {transaction.status}")
    
    # Process transaction into final tables
    service = IsraeliStockService()
    try:
        result = service.process_approved_transaction(transaction, str(current_user.id))
        
        # Update status after successful processing
        transaction.status = "approved"
        transaction.reviewed_at = datetime.now()
        transaction.reviewed_by = str(current_user.id)
        db.commit()
        
        return {
            "success": True, 
            "message": result.get('message', "Transaction approved and processed"),
            "result": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing transaction: {str(e)}")


@router.post("/pending-transactions/batch/{batch_id}/approve-all")
async def approve_all_in_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve all pending transactions in a batch"""
    transactions = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.upload_batch_id == batch_id,
        PendingIsraeliTransaction.user_id == str(current_user.id),
        PendingIsraeliTransaction.status.in_(["pending", "modified"])
    ).all()
    
    service = IsraeliStockService()
    approved_count = 0
    errors = []
    
    for t in transactions:
        try:
            # Process each transaction
            result = service.process_approved_transaction(t, str(current_user.id))
            
            # Update status after successful processing
            t.status = "approved"
            t.reviewed_at = datetime.now()
            t.reviewed_by = str(current_user.id)
            approved_count += 1
        except Exception as e:
            errors.append(f"Error processing transaction {t.id}: {str(e)}")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Approved {approved_count} transactions",
        "approved_count": approved_count,
        "errors": errors if errors else None
    }


@router.post("/pending-transactions/approve-all-batches")
async def approve_all_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Approve ALL pending transactions for the current user across all batches"""
    transactions = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.user_id == str(current_user.id),
        PendingIsraeliTransaction.status.in_(["pending", "modified"])
    ).all()
    
    service = IsraeliStockService()
    approved_count = 0
    errors = []
    
    for t in transactions:
        try:
            # Process each transaction
            result = service.process_approved_transaction(t, str(current_user.id))
            
            # Update status after successful processing
            t.status = "approved"
            t.reviewed_at = datetime.now()
            t.reviewed_by = str(current_user.id)
            approved_count += 1
        except Exception as e:
            errors.append(f"Error processing transaction {t.id}: {str(e)}")
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Approved {approved_count} transactions across all batches",
        "approved_count": approved_count,
        "errors": errors if errors else None
    }


@router.post("/pending-transactions/batch/{batch_id}/reject-all")
async def reject_all_in_batch(
    batch_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject all pending transactions in a batch and delete the associated PDF"""
    transactions = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.upload_batch_id == batch_id,
        PendingIsraeliTransaction.user_id == str(current_user.id),
        PendingIsraeliTransaction.status.in_(["pending", "modified"])
    ).all()
    
    rejected_count = len(transactions)
    
    # Delete all pending transactions
    for t in transactions:
        db.delete(t)
    
    # Delete the associated PDF report
    pdf_report = db.query(IsraeliReportUpload).filter(
        IsraeliReportUpload.upload_batch_id == batch_id,
        IsraeliReportUpload.user_id == str(current_user.id)
    ).first()
    
    pdf_deleted = False
    if pdf_report:
        db.delete(pdf_report)
        pdf_deleted = True
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Rejected {rejected_count} transactions" + (" and deleted PDF report" if pdf_deleted else ""),
        "rejected_count": rejected_count,
        "pdf_deleted": pdf_deleted
    }


@router.post("/pending-transactions/reject-all-batches")
async def reject_all_batches(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject ALL pending transactions for the current user across all batches"""
    transactions = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.user_id == str(current_user.id),
        PendingIsraeliTransaction.status.in_(["pending", "modified"])
    ).all()
    
    rejected_count = len(transactions)
    
    # Collect unique batch IDs to find associated PDFs
    batch_ids = set(t.upload_batch_id for t in transactions if t.upload_batch_id)
    
    # Delete all pending transactions
    for t in transactions:
        db.delete(t)
    
    # Delete associated PDF reports
    pdfs_deleted = 0
    for bid in batch_ids:
        pdf_report = db.query(IsraeliReportUpload).filter(
            IsraeliReportUpload.upload_batch_id == bid,
            IsraeliReportUpload.user_id == str(current_user.id)
        ).first()
        if pdf_report:
            db.delete(pdf_report)
            pdfs_deleted += 1
    
    db.commit()
    
    return {
        "success": True,
        "message": f"Rejected {rejected_count} transactions across all batches",
        "rejected_count": rejected_count,
        "pdfs_deleted": pdfs_deleted
    }


@router.delete("/pending-transactions/{transaction_id}")
async def reject_pending_transaction(
    transaction_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Reject/delete a pending transaction"""
    transaction = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.id == transaction_id,
        PendingIsraeliTransaction.user_id == str(current_user.id)
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    db.delete(transaction)
    db.commit()
    
    return {"success": True, "message": "Transaction rejected"}


@router.put("/pending-transactions/{transaction_id}")
async def update_pending_transaction(
    transaction_id: int,
    update_data: dict,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update a pending transaction"""
    transaction = db.query(PendingIsraeliTransaction).filter(
        PendingIsraeliTransaction.id == transaction_id,
        PendingIsraeliTransaction.user_id == str(current_user.id)
    ).first()
    
    if not transaction:
        raise HTTPException(status_code=404, detail="Transaction not found")
    
    # Update allowed fields
    allowed_fields = [
        "transaction_date", "transaction_time", "security_no", "stock_name", "transaction_type",
        "quantity", "price", "amount", "commission", "tax", "currency", "review_notes"
    ]
    
    for field in allowed_fields:
        if field in update_data:
            setattr(transaction, field, update_data[field])
    
    transaction.status = "modified"
    transaction.updated_at = datetime.now()
    db.commit()
    
    return {"success": True, "message": "Transaction updated"}


# ===== REPORT MANAGEMENT ENDPOINTS =====

@router.get("/reports")
async def get_reports(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get list of uploaded PDF reports for the current user"""
    from app.models.israeli_report import IsraeliReportUpload
    
    reports = db.query(IsraeliReportUpload).filter(
        IsraeliReportUpload.user_id == str(current_user.id)
    ).order_by(IsraeliReportUpload.upload_date.desc()).all()
    
    return {
        "reports": [
            {
                "id": r.id,
                "filename": r.filename,
                "file_size": r.file_size,
                "broker": r.broker,
                "upload_batch_id": r.upload_batch_id,
                "upload_date": r.upload_date.isoformat() if r.upload_date else None
            }
            for r in reports
        ]
    }


@router.get("/reports/{report_id}/download")
async def download_report(
    report_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Download a PDF report by ID"""
    from app.models.israeli_report import IsraeliReportUpload
    from fastapi.responses import Response
    
    report = db.query(IsraeliReportUpload).filter(
        IsraeliReportUpload.id == report_id,
        IsraeliReportUpload.user_id == str(current_user.id)
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    return Response(
        content=report.file_data,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={report.filename}"
        }
    )


@router.delete("/reports/{report_id}")
async def delete_report(
    report_id: int,
    delete_transactions: bool = False,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Delete a PDF report by ID
    
    Args:
        report_id: The ID of the report to delete
        delete_transactions: If True, also delete all pending transactions associated with this report
    """
    from app.models.israeli_report import IsraeliReportUpload
    
    # Find the report
    report = db.query(IsraeliReportUpload).filter(
        IsraeliReportUpload.id == report_id,
        IsraeliReportUpload.user_id == str(current_user.id)
    ).first()
    
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    
    batch_id = report.upload_batch_id
    filename = report.filename
    
    # Optionally delete associated pending transactions
    transactions_deleted = 0
    if delete_transactions:
        pending_transactions = db.query(PendingIsraeliTransaction).filter(
            PendingIsraeliTransaction.upload_batch_id == batch_id,
            PendingIsraeliTransaction.user_id == str(current_user.id)
        ).all()
        
        transactions_deleted = len(pending_transactions)
        for transaction in pending_transactions:
            db.delete(transaction)
    
    # Delete the report
    db.delete(report)
    db.commit()
    
    return {
        "success": True,
        "message": f"Report '{filename}' deleted successfully",
        "transactions_deleted": transactions_deleted
    }


@router.post("/holdings/refresh-returns")
async def refresh_israeli_holdings_returns(
    user_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Refresh return calculations (TWR, MWR, unrealized gains) for all Israeli stock holdings
    """
    try:
        from app.services.returns_calculator import ReturnsCalculator
        
        target_user_id = user_id or current_user.id
        
        calculator = ReturnsCalculator(db)
        results = calculator.update_all_user_returns(target_user_id, market='israeli')
        
        return {
            "success": True,
            "message": f"Updated returns for {results['updated']} Israeli holdings",
            "updated": results['updated'],
            "failed": results['failed'],
            "errors": results['errors']
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error refreshing Israeli returns: {str(e)}"
        )


# ── Stock Detail Page Endpoints ───────────────────────────────────────────────

@router.get("/stock/{symbol}/detail")
async def get_israeli_stock_detail(
    symbol: str,
    current_user: User = Depends(get_current_user),
):
    """
    Get rich detail for an Israeli stock: market data (yfinance) + user portfolio context.
    Used by the Stock Detail Page at /stock/il/[symbol].
    symbol is the TA exchange symbol (e.g. TEVA). yfinance ticker = symbol + ".TA"
    """
    from app.services.stock_price_service import get_stock_detail
    from sqlalchemy import text

    symbol = symbol.upper()
    yf_ticker = f"{symbol}.TA"

    # Market data from yfinance
    market_data = get_stock_detail(yf_ticker, is_israeli=True)
    # Override ticker to be just the symbol for frontend consistency
    market_data["ticker"] = symbol
    market_data["yf_ticker"] = yf_ticker

    portfolio = {"held": False, "quantity": 0, "purchase_cost": 0,
                 "avg_cost_per_share": None, "current_value": 0,
                 "unrealized_pl": 0, "unrealized_pl_pct": 0}
    transactions = []
    dividends = []
    logo_url = None

    try:
        with engine.connect() as conn:
            params = {"user_id": current_user.id, "symbol": symbol}

            # Holding
            holding_row = conn.execute(text("""
                SELECT h.quantity, h.purchase_cost, h.current_value, h.last_price,
                       s.logo_url
                FROM israeli_stock_holdings h
                LEFT JOIN israeli_stocks s ON h.symbol = s.symbol
                WHERE h.user_id = :user_id AND h.symbol = :symbol AND h.quantity > 0
                LIMIT 1
            """), params).fetchone()

            if holding_row:
                qty = float(holding_row[0] or 0)
                cost = float(holding_row[1] or 0)
                current_price = market_data["price"]["current"] or float(holding_row[3] or 0)
                current_value = qty * current_price if current_price else float(holding_row[2] or 0)
                unreal_pl = current_value - cost
                unreal_pl_pct = round((unreal_pl / cost * 100), 2) if cost > 0 else 0
                portfolio = {
                    "held": True,
                    "quantity": qty,
                    "purchase_cost": cost,
                    "avg_cost_per_share": round(cost / qty, 4) if qty > 0 else None,
                    "current_value": round(current_value, 2),
                    "unrealized_pl": round(unreal_pl, 2),
                    "unrealized_pl_pct": unreal_pl_pct,
                }
                logo_url = holding_row[4]

            # Catalog logo fallback
            if not logo_url:
                logo_row = conn.execute(text("""
                    SELECT logo_url FROM israeli_stocks WHERE symbol = :symbol LIMIT 1
                """), {"symbol": symbol}).fetchone()
                if logo_row:
                    logo_url = logo_row[0]

            # Transactions
            txn_rows = conn.execute(text("""
                SELECT id, transaction_date, transaction_type, quantity, price,
                       total_value, realized_pl, commission
                FROM israeli_stock_transactions
                WHERE user_id = :user_id AND symbol = :symbol
                ORDER BY transaction_date DESC NULLS LAST, created_at DESC
            """), params).fetchall()
            transactions = [
                {
                    "id": r[0],
                    "date": str(r[1]) if r[1] else None,
                    "type": (r[2] or "").upper(),
                    "quantity": float(r[3] or 0),
                    "price": float(r[4] or 0),
                    "total": float(r[5] or 0),
                    "realized_pl": float(r[6]) if r[6] is not None else None,
                    "commission": float(r[7] or 0),
                }
                for r in txn_rows
            ]

            # Dividends
            div_rows = conn.execute(text("""
                SELECT id, payment_date, ex_dividend_date, net_amount, shares_held
                FROM israeli_stock_dividends
                WHERE user_id = :user_id AND symbol = :symbol
                ORDER BY payment_date DESC NULLS LAST
            """), params).fetchall()
            dividends = [
                {
                    "id": r[0],
                    "payment_date": str(r[1]) if r[1] else None,
                    "ex_dividend_date": str(r[2]) if r[2] else None,
                    "net_amount": float(r[3] or 0),
                    "per_share": round(float(r[3] or 0) / float(r[4]), 4) if r[4] and float(r[4]) > 0 else None,
                }
                for r in div_rows
            ]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"DB error: {str(e)}")

    return {
        **market_data,
        "logo_url": logo_url,
        "portfolio": portfolio,
        "transactions": transactions,
        "dividends": dividends,
    }


@router.get("/stock/{symbol}/history")
async def get_israeli_stock_history(
    symbol: str,
    period: str = "1M",
    current_user: User = Depends(get_current_user),
):
    """
    Get OHLCV price history for an Israeli stock chart.
    period: 1D | 1W | 1M | 3M | 1Y | ALL
    """
    from app.services.stock_price_service import get_stock_history
    yf_ticker = f"{symbol.upper()}.TA"
    return get_stock_history(yf_ticker, period)
