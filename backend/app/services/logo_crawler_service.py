"""
Logo Crawler Service for Israeli Stocks
Fetches SVG logos from TradingView and stores them in the database
"""

import asyncio
import aiohttp
import logging
from typing import Optional, List, Dict
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.israeli_stock_models import IsraeliStock
from app.core.database import engine
import json

logger = logging.getLogger(__name__)

class LogoCrawlerService:
    """Service for crawling and storing stock logos"""
    
    def __init__(self):
        self.base_url = "https://s3-symbol-logo.tradingview.com"
        self.session = None
        
    async def __aenter__(self):
        """Async context manager entry"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30),
            headers={
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        )
        return self
        
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit"""
        if self.session:
            await self.session.close()
    
    def get_logo_url(self, stock_name: str) -> str:
        """
        Generate logo URL for a stock based on its name
        
        Args:
            stock_name: The stock name from the database (will be lowercased)
            
        Returns:
            The complete URL to fetch the SVG logo
        """
        # Convert to lowercase and replace spaces with hyphens if needed
        clean_name = stock_name.lower().replace(' ', '-').replace('.', '')
        return f"{self.base_url}/{clean_name}--big.svg"
    
    async def fetch_logo_svg(self, stock_name: str) -> Optional[str]:
        """
        Fetch SVG logo for a specific stock
        
        Args:
            stock_name: The stock name to fetch logo for
            
        Returns:
            SVG content as string if successful, None if failed
        """
        if not self.session:
            raise RuntimeError("LogoCrawlerService must be used as async context manager")
            
        url = self.get_logo_url(stock_name)
        
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    # Validate it's actually SVG content - handle TradingView comments
                    content_stripped = content.strip()
                    if (('<svg' in content_stripped and 
                         '</svg>' in content_stripped and
                         'xmlns="http://www.w3.org/2000/svg"' in content) or
                        # Also check for SVG with TradingView comment
                        ('<!-- by TradingView -->' in content and 
                         '<svg' in content and '</svg>' in content)):
                        
                        # Remove TradingView comment for clean storage
                        clean_content = content.replace('<!-- by TradingView -->', '').strip()
                        
                        logger.info(f"Successfully fetched logo for {stock_name}")
                        return clean_content
                    else:
                        logger.warning(f"Invalid SVG content for {stock_name}: {content[:100]}...")
                        return None
                else:
                    logger.warning(f"Failed to fetch logo for {stock_name}: HTTP {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching logo for {stock_name}: {str(e)}")
            return None
    
    def update_stock_logo(self, stock_id: int, svg_content: str) -> bool:
        """
        Update stock record with logo SVG content
        
        Args:
            stock_id: The stock ID to update
            svg_content: The SVG content to store
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            # Get database connection
            Session = sessionmaker(bind=engine)
            
            with Session() as session:
                # Update the stock record
                result = session.execute(
                    text("UPDATE \"IsraeliStocks\" SET logo_svg = :svg_content WHERE id = :stock_id"),
                    {"svg_content": svg_content, "stock_id": stock_id}
                )
                
                if result.rowcount > 0:
                    session.commit()
                    logger.info(f"Updated logo for stock ID {stock_id}")
                    return True
                else:
                    logger.warning(f"No stock found with ID {stock_id}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error updating logo for stock ID {stock_id}: {str(e)}")
            return False
    
    def get_stocks_without_logos(self) -> List[Dict]:
        """
        Get all stocks that don't have logos yet
        
        Returns:
            List of stock dictionaries with id, name, symbol
        """
        try:
            Session = sessionmaker(bind=engine)
            
            with Session() as session:
                result = session.execute(
                    text("""
                        SELECT id, name, symbol, security_no 
                        FROM "IsraeliStocks" 
                        WHERE logo_svg IS NULL OR logo_svg = ''
                        ORDER BY name
                    """)
                )
                
                stocks = []
                for row in result:
                    stocks.append({
                        'id': row[0],
                        'name': row[1],
                        'symbol': row[2],
                        'security_no': row[3]
                    })
                
                return stocks
                
        except Exception as e:
            logger.error(f"Error fetching stocks without logos: {str(e)}")
            return []
    
    async def crawl_logos_for_all_stocks(self, batch_size: int = 5) -> Dict[str, int]:
        """
        Crawl logos for all stocks that don't have them
        
        Args:
            batch_size: Number of concurrent requests to make
            
        Returns:
            Dictionary with success/failure counts
        """
        if not self.session:
            raise RuntimeError("LogoCrawlerService must be used as async context manager")
            
        stocks = self.get_stocks_without_logos()
        
        if not stocks:
            logger.info("No stocks need logo updates")
            return {"success": 0, "failed": 0, "total": 0}
        
        logger.info(f"Found {len(stocks)} stocks that need logos")
        
        success_count = 0
        failed_count = 0
        
        # Process stocks in batches to avoid overwhelming the server
        for i in range(0, len(stocks), batch_size):
            batch = stocks[i:i + batch_size]
            batch_tasks = []
            
            for stock in batch:
                task = asyncio.create_task(self._process_single_stock(stock))
                batch_tasks.append(task)
            
            # Wait for batch to complete
            results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Batch task failed: {result}")
                    failed_count += 1
                elif result:
                    success_count += 1
                else:
                    failed_count += 1
            
            # Small delay between batches to be polite
            if i + batch_size < len(stocks):
                await asyncio.sleep(2)
        
        logger.info(f"Logo crawling completed: {success_count} success, {failed_count} failed")
        
        return {
            "success": success_count,
            "failed": failed_count,
            "total": len(stocks)
        }
    
    async def _process_single_stock(self, stock: Dict) -> bool:
        """
        Process a single stock for logo fetching
        
        Args:
            stock: Stock dictionary with id, name, symbol
            
        Returns:
            True if successful, False otherwise
        """
        try:
            svg_content = await self.fetch_logo_svg(stock['name'])
            
            if svg_content:
                success = self.update_stock_logo(stock['id'], svg_content)
                if success:
                    logger.info(f"Successfully updated logo for {stock['symbol']} ({stock['name']})")
                    return True
                else:
                    logger.error(f"Failed to update database for {stock['symbol']}")
                    return False
            else:
                logger.warning(f"No logo found for {stock['symbol']} ({stock['name']})")
                return False
                
        except Exception as e:
            logger.error(f"Error processing {stock['symbol']}: {str(e)}")
            return False
    
    async def crawl_logo_for_stock(self, stock_name: str, stock_id: Optional[int] = None) -> bool:
        """
        Crawl logo for a specific stock
        
        Args:
            stock_name: Name of the stock to fetch logo for
            stock_id: Optional stock ID, if not provided will lookup by name
            
        Returns:
            True if successful, False otherwise
        """
        if not self.session:
            raise RuntimeError("LogoCrawlerService must be used as async context manager")
        
        try:
            # If stock_id not provided, look it up
            if stock_id is None:
                Session = sessionmaker(bind=engine)
                
                with Session() as session:
                    result = session.execute(
                        text("SELECT id FROM \"IsraeliStocks\" WHERE name ILIKE :name LIMIT 1"),
                        {"name": f"%{stock_name}%"}
                    )
                    row = result.fetchone()
                    if not row:
                        logger.error(f"Stock not found: {stock_name}")
                        return False
                    stock_id = row[0]
            
            # Fetch and update logo
            svg_content = await self.fetch_logo_svg(stock_name)
            
            if svg_content:
                success = self.update_stock_logo(stock_id, svg_content)
                if success:
                    logger.info(f"Successfully updated logo for {stock_name}")
                    return True
                else:
                    logger.error(f"Failed to update database for {stock_name}")
                    return False
            else:
                logger.warning(f"No logo found for {stock_name}")
                return False
                
        except Exception as e:
            logger.error(f"Error crawling logo for {stock_name}: {str(e)}")
            return False


# Convenience functions for easy usage
async def crawl_all_logos(batch_size: int = 5) -> Dict[str, int]:
    """
    Crawl logos for all stocks that don't have them
    
    Args:
        batch_size: Number of concurrent requests
        
    Returns:
        Dictionary with results
    """
    async with LogoCrawlerService() as crawler:
        return await crawler.crawl_logos_for_all_stocks(batch_size)


async def crawl_logo_for_stock(stock_name: str) -> bool:
    """
    Crawl logo for a specific stock
    
    Args:
        stock_name: Name of the stock
        
    Returns:
        True if successful
    """
    async with LogoCrawlerService() as crawler:
        return await crawler.crawl_logo_for_stock(stock_name)
