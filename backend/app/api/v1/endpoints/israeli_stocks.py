"""
Israeli Stocks API Endpoints
Handles PDF upload, processing, and analysis for Israeli stock investment reports
"""

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, BackgroundTasks
from fastapi.responses import JSONResponse
from typing import List, Dict, Optional
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
from app.core.database import engine
from app.models.user import User

router = APIRouter()

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
                    FROM "IsraeliStocks" 
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
                text('SELECT symbol, name FROM "IsraeliStocks" WHERE id = :id'),
                {"id": stock_id}
            )
            stock_info = result.fetchone()
            if not stock_info:
                raise HTTPException(status_code=404, detail="Stock not found")

            symbol, name = stock_info

            # Update the logo fields
            if logo_url:
                result = conn.execute(
                    text('UPDATE "IsraeliStocks" SET logo_url = :url, logo_svg = :svg WHERE id = :id'),
                    {"url": logo_url, "svg": svg_content, "id": stock_id}
                )
            else:
                result = conn.execute(
                    text('UPDATE "IsraeliStocks" SET logo_svg = :svg WHERE id = :id'),
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
                text('SELECT symbol, name, logo_svg IS NOT NULL as has_logo FROM "IsraeliStocks" WHERE id = :id'),
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
                text('UPDATE "IsraeliStocks" SET logo_svg = NULL WHERE id = :id'),
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
                    FROM "IsraeliStocks" 
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
                            text('SELECT id FROM "IsraeliStocks" WHERE security_no = :security_no'),
                            {"security_no": security_no}
                        )
                        existing = check_result.fetchone()
                        
                        if existing:
                            skipped += 1
                            continue
                        
                        # Insert new stock
                        conn.execute(
                            text('''
                                INSERT INTO "IsraeliStocks" 
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
            result = conn.execute(text('SELECT COUNT(*) FROM "IsraeliStocks"'))
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
