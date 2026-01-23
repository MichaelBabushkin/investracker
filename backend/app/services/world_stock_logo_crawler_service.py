"""
Logo Crawler Service for World Stocks
Fetches SVG logos from TradingView and stores them in the database
"""

import asyncio
import aiohttp
import logging
from typing import Optional, List, Dict
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from app.models.world_stock_models import WorldStock
from app.core.database import engine
import re

logger = logging.getLogger(__name__)

class WorldStockLogoCrawlerService:
    """Service for crawling and storing world stock logos"""
    
    def __init__(self):
        self.base_url = "https://s3-symbol-logo.tradingview.com"
        self.session = None
        # Default to NASDAQ, but can be overridden for other exchanges
        self.tv_base_symbol_url = "https://www.tradingview.com/symbols/NASDAQ-{symbol}/"
        
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
    
    def get_logo_url(self, ticker: str) -> str:
        """
        Generate logo URL for a stock based on its ticker
        
        Args:
            ticker: The stock ticker symbol
            
        Returns:
            The complete URL to fetch the SVG logo
        """
        # Convert to lowercase and clean
        clean_ticker = ticker.lower().replace(' ', '-').replace('.', '')
        return f"{self.base_url}/{clean_ticker}--big.svg"
    
    async def fetch_logo_svg(self, ticker: str) -> Optional[str]:
        """
        Fetch SVG logo for a specific stock ticker
        
        Args:
            ticker: The stock ticker to fetch logo for
            
        Returns:
            SVG content as string if successful, None if failed
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")
            
        url = self.get_logo_url(ticker)
        
        try:
            async with self.session.get(url) as response:
                if response.status == 200:
                    content = await response.text()
                    # Validate it's actually SVG content
                    content_stripped = content.strip()
                    if (('<svg' in content_stripped and 
                         '</svg>' in content_stripped and
                         'xmlns="http://www.w3.org/2000/svg"' in content) or
                        ('<!-- by TradingView -->' in content and 
                         '<svg' in content and '</svg>' in content)):
                        
                        # Remove TradingView comment for clean storage
                        clean_content = content.replace('<!-- by TradingView -->', '').strip()
                        
                        logger.info(f"Successfully fetched logo for {ticker}")
                        return clean_content
                    else:
                        logger.warning(f"Invalid SVG content for {ticker}: {content[:100]}...")
                        return None
                else:
                    logger.warning(f"Failed to fetch logo for {ticker}: HTTP {response.status}")
                    return None
                    
        except Exception as e:
            logger.error(f"Error fetching logo for {ticker}: {str(e)}")
            return None

    async def fetch_svg_from_url(self, logo_url: str) -> Optional[str]:
        """
        Fetch SVG content directly from a provided URL and validate it.

        Args:
            logo_url: The URL pointing to an SVG resource.

        Returns:
            SVG content string if valid; None otherwise.
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")

        if not logo_url or not logo_url.lower().endswith('.svg'):
            logger.warning(f"Invalid or non-SVG logo_url provided: {logo_url}")
            return None

        try:
            async with self.session.get(logo_url) as response:
                if response.status != 200:
                    logger.warning(f"Failed to fetch SVG from URL {logo_url}: HTTP {response.status}")
                    return None
                content = await response.text()
                content_stripped = content.strip()
                if (('<svg' in content_stripped and '</svg>' in content_stripped) or
                    ('<!-- by TradingView -->' in content and '<svg' in content and '</svg>' in content)):
                    clean_content = content.replace('<!-- by TradingView -->', '').strip()
                    return clean_content
                logger.warning(f"Content from {logo_url} does not appear to be valid SVG")
                return None
        except Exception as e:
            logger.error(f"Error fetching SVG from URL {logo_url}: {str(e)}")
            return None
    
    def update_stock_logo(self, stock_id: int, svg_content: str, logo_url: Optional[str] = None) -> bool:
        """
        Update stock record with logo SVG content
        
        Args:
            stock_id: The stock ID to update
            svg_content: The SVG content to store
            logo_url: Optional logo URL to store
            
        Returns:
            True if update was successful, False otherwise
        """
        try:
            Session = sessionmaker(bind=engine)
            
            with Session() as session:
                if logo_url:
                    result = session.execute(
                        text('UPDATE "WorldStocks" SET logo_url = :logo_url, logo_svg = :svg_content WHERE id = :stock_id'),
                        {"logo_url": logo_url, "svg_content": svg_content, "stock_id": stock_id}
                    )
                else:
                    result = session.execute(
                        text('UPDATE "WorldStocks" SET logo_svg = :svg_content WHERE id = :stock_id'),
                        {"svg_content": svg_content, "stock_id": stock_id}
                    )
                
                if result.rowcount > 0:
                    session.commit()
                    logger.info(f"Updated logo for world stock ID {stock_id}")
                    return True
                else:
                    logger.warning(f"No world stock found with ID {stock_id}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error updating logo for world stock ID {stock_id}: {str(e)}")
            return False

    def update_stock_logo_url(self, stock_id: int, logo_url: str) -> bool:
        """
        Update only the logo_url field for a stock.

        Args:
            stock_id: The stock ID to update
            logo_url: The TradingView S3 logo URL extracted from symbol page

        Returns:
            True if update was successful, False otherwise
        """
        try:
            Session = sessionmaker(bind=engine)
            with Session() as session:
                result = session.execute(
                    text('UPDATE "WorldStocks" SET logo_url = :url WHERE id = :id'),
                    {"url": logo_url, "id": stock_id}
                )
                if result.rowcount and result.rowcount > 0:
                    session.commit()
                    logger.info(f"Updated logo_url for world stock ID {stock_id}")
                    return True
                logger.warning(f"No world stock found to update logo_url, ID {stock_id}")
                return False
        except Exception as e:
            logger.error(f"Error updating logo_url for world stock ID {stock_id}: {str(e)}")
            return False
    
    def get_stocks_without_logos(self) -> List[Dict]:
        """
        Get all world stocks that don't have logos yet
        
        Returns:
            List of stock dictionaries with id, ticker, company_name, exchange
        """
        try:
            Session = sessionmaker(bind=engine)
            
            with Session() as session:
                result = session.execute(
                    text("""
                        SELECT id, ticker, company_name, exchange 
                        FROM "WorldStocks" 
                        WHERE logo_svg IS NULL OR logo_svg = ''
                        ORDER BY ticker
                    """)
                )
                
                stocks = []
                for row in result:
                    stocks.append({
                        'id': row[0],
                        'ticker': row[1],
                        'company_name': row[2],
                        'exchange': row[3]
                    })
                
                return stocks
                
        except Exception as e:
            logger.error(f"Error fetching world stocks without logos: {str(e)}")
            return []

    def get_stocks_with_logo_url_missing_svg(self) -> List[Dict]:
        """
        Get stocks that have a logo_url set but logo_svg is NULL/empty.

        Returns:
            List of dicts: id, ticker, company_name, logo_url
        """
        try:
            Session = sessionmaker(bind=engine)
            with Session() as session:
                result = session.execute(
                    text("""
                        SELECT id, ticker, company_name, logo_url 
                        FROM "WorldStocks"
                        WHERE logo_url IS NOT NULL AND logo_url <> '' 
                        AND (logo_svg IS NULL OR logo_svg = '')
                        ORDER BY ticker
                    """)
                )
                stocks: List[Dict] = []
                for r in result:
                    stocks.append({
                        'id': r[0], 'ticker': r[1], 'company_name': r[2], 'logo_url': r[3]
                    })
                return stocks
        except Exception as e:
            logger.error(f"Error fetching world stocks with logo_url but missing SVG: {str(e)}")
            return []

    def get_stocks_missing_logo_url(self) -> List[Dict]:
        """Return stocks where logo_url is NULL or empty string."""
        try:
            Session = sessionmaker(bind=engine)
            with Session() as session:
                result = session.execute(
                    text("""
                        SELECT id, ticker, company_name, exchange 
                        FROM "WorldStocks" 
                        WHERE logo_url IS NULL OR logo_url = ''
                        ORDER BY ticker
                    """),
                )
                return [
                    {"id": r[0], "ticker": r[1], "company_name": r[2], "exchange": r[3]}
                    for r in result
                ]
        except Exception as e:
            logger.error(f"Error fetching world stocks missing logo_url: {str(e)}")
            return []

    def get_all_stocks(self) -> List[Dict]:
        """Return all world stocks (id, ticker, company_name, exchange)."""
        try:
            Session = sessionmaker(bind=engine)
            with Session() as session:
                result = session.execute(
                    text('SELECT id, ticker, company_name, exchange FROM "WorldStocks" ORDER BY ticker')
                )
                return [
                    {"id": r[0], "ticker": r[1], "company_name": r[2], "exchange": r[3]}
                    for r in result
                ]
        except Exception as e:
            logger.error(f"Error fetching world stocks list: {str(e)}")
            return []

    async def fetch_tradingview_logo_url(self, ticker: str, exchange: str = "NASDAQ") -> Optional[str]:
        """
        Fetch the TradingView symbol page for a ticker and extract the S3 logo URL.
        
        Args:
            ticker: Stock ticker symbol (e.g., "AAPL")
            exchange: Exchange name (default: "NASDAQ", could be "NYSE", etc.)

        Returns:
            Logo URL if found, None otherwise
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")

        # Format URL based on exchange
        url = f"https://www.tradingview.com/symbols/{exchange}-{ticker.upper().strip()}/"
        
        try:
            async with self.session.get(url, headers={
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
                'Referer': 'https://www.tradingview.com/',
            }) as response:
                if response.status != 200:
                    logger.warning(f"TV page fetch failed for {ticker}: HTTP {response.status}")
                    return None
                html = await response.text()

            # Regex for S3 logo URL ending with --big.svg, exclude '/source/'
            pattern = re.compile(r"https://s3-symbol-logo\.tradingview\.com/(?!source/)[^\"']+--big\.svg", re.IGNORECASE)
            match = pattern.search(html)
            if match:
                logo_url = match.group(0)
                logger.info(f"Found TradingView logo URL for {ticker}: {logo_url}")
                return logo_url

            # Fallback: any s3-symbol-logo URL not containing '/source/'
            alt_pattern = re.compile(r"https://s3-symbol-logo\.tradingview\.com/(?!source/)[^\"']+\.svg", re.IGNORECASE)
            match2 = alt_pattern.search(html)
            if match2:
                logo_url = match2.group(0)
                logger.info(f"Found TradingView logo URL (fallback) for {ticker}: {logo_url}")
                return logo_url

            logger.info(f"No TradingView logo URL found for {ticker}")
            return None
        except Exception as e:
            logger.error(f"Error fetching TradingView page for {ticker}: {str(e)}")
            return None

    async def crawl_tradingview_logo_urls_for_all(self, batch_size: int = 5, missing_only: bool = True) -> Dict[str, int]:
        """
        Crawl TradingView pages to extract logo URLs for world stocks.
        If missing_only=True, only process stocks without a logo_url currently.
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")

        stocks = self.get_stocks_missing_logo_url() if missing_only else self.get_all_stocks()
        if not stocks:
            return {"success": 0, "failed": 0, "total": 0}

        success = 0
        failed = 0
        for i in range(0, len(stocks), batch_size):
            batch = stocks[i:i+batch_size]
            tasks = [asyncio.create_task(self._process_tradingview_logo_url(stock)) for stock in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception) or r is False:
                    failed += 1
                else:
                    success += 1
            if i + batch_size < len(stocks):
                await asyncio.sleep(1.5)
        
        logger.info(f"Logo URL crawling completed: {success} success, {failed} failed")
        return {"success": success, "failed": failed, "total": len(stocks)}

    async def populate_logo_svg_from_logo_urls_for_all(self, batch_size: int = 5, only_missing: bool = True) -> Dict[str, int]:
        """
        For stocks with a stored logo_url, fetch the SVG and store it into logo_svg.

        Args:
            batch_size: concurrency level
            only_missing: if True, process only stocks where logo_svg is NULL/empty

        Returns:
            dict with success/failed/total counts
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")

        targets: List[Dict]
        if only_missing:
            targets = self.get_stocks_with_logo_url_missing_svg()
        else:
            try:
                Session = sessionmaker(bind=engine)
                with Session() as session_db:
                    res = session_db.execute(
                        text("""
                            SELECT id, ticker, company_name, logo_url 
                            FROM "WorldStocks"
                            WHERE logo_url IS NOT NULL AND logo_url <> ''
                            ORDER BY ticker
                        """)
                    )
                    targets = [
                        {'id': r[0], 'ticker': r[1], 'company_name': r[2], 'logo_url': r[3]}
                        for r in res
                    ]
            except Exception as e:
                logger.error(f"Error fetching world stocks with logo_url: {str(e)}")
                targets = []

        if not targets:
            return {"success": 0, "failed": 0, "total": 0}

        success = 0
        failed = 0
        for i in range(0, len(targets), batch_size):
            batch = targets[i:i+batch_size]
            tasks = [asyncio.create_task(self._process_logo_svg_from_url(stock)) for stock in batch]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            for r in results:
                if isinstance(r, Exception) or r is False:
                    failed += 1
                else:
                    success += 1
            if i + batch_size < len(targets):
                await asyncio.sleep(1.0)
        
        logger.info(f"Logo SVG population completed: {success} success, {failed} failed")
        return {"success": success, "failed": failed, "total": len(targets)}

    async def _process_logo_svg_from_url(self, stock: Dict) -> bool:
        """Fetch and save logo_svg from a given stock's logo_url."""
        try:
            stock_id = stock.get('id')
            logo_url = (stock.get('logo_url') or '').strip()
            if not stock_id or not logo_url:
                return False
            svg = await self.fetch_svg_from_url(logo_url)
            if not svg:
                return False
            return self.update_stock_logo(stock_id, svg)
        except Exception as e:
            logger.error(f"Error processing SVG from URL for stock {stock}: {str(e)}")
            return False

    async def _process_tradingview_logo_url(self, stock: Dict) -> bool:
        """Fetch and update logo_url for a single stock using its ticker."""
        try:
            ticker = (stock.get('ticker') or '').strip()
            exchange = (stock.get('exchange') or 'US').strip()
            
            if not ticker:
                logger.warning(f"Stock has no ticker, id={stock.get('id')}")
                return False
            
            # Map exchange codes to TradingView exchange names
            exchange_map = {
                'US': 'NASDAQ',  # Default for US stocks
                'NYSE': 'NYSE',
                'NASDAQ': 'NASDAQ',
                'AMEX': 'AMEX',
                'NYSE ARCA': 'ARCA',
                'BATS': 'BATS',
            }
            
            tv_exchange = exchange_map.get(exchange.upper(), 'NASDAQ')
            
            # Try the stock's exchange first
            url = await self.fetch_tradingview_logo_url(ticker, tv_exchange)
            
            # If failed and exchange wasn't NASDAQ, try NASDAQ as fallback
            if not url and tv_exchange != 'NASDAQ':
                logger.info(f"Trying NASDAQ fallback for {ticker} (original: {tv_exchange})")
                url = await self.fetch_tradingview_logo_url(ticker, 'NASDAQ')
            
            # If still failed and exchange wasn't NYSE, try NYSE as second fallback
            if not url and tv_exchange not in ['NYSE', 'NASDAQ']:
                logger.info(f"Trying NYSE fallback for {ticker} (original: {tv_exchange})")
                url = await self.fetch_tradingview_logo_url(ticker, 'NYSE')
            
            if not url:
                return False
            return self.update_stock_logo_url(stock['id'], url)
        except Exception as e:
            logger.error(f"Error processing TradingView logo URL for {stock}: {str(e)}")
            return False

    async def crawl_tradingview_logo_url_for_ticker(self, ticker: str, exchange: str = "NASDAQ") -> Optional[Dict[str, str]]:
        """
        Crawl TradingView for a single ticker, update its logo_url, and return info.
        
        Args:
            ticker: Stock ticker symbol
            exchange: Exchange name (default: "NASDAQ")
            
        Returns:
            dict with stock_id, ticker, logo_url on success; None on failure.
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")

        try:
            # Lookup stock by ticker
            Session = sessionmaker(bind=engine)
            with Session() as session_db:
                res = session_db.execute(
                    text('SELECT id, ticker, company_name FROM "WorldStocks" WHERE ticker ILIKE :ticker LIMIT 1'),
                    {"ticker": ticker}
                ).fetchone()
                if not res:
                    logger.warning(f"Stock not found for ticker: {ticker}")
                    return None
                stock_id, tick, company_name = res

            url = await self.fetch_tradingview_logo_url(tick, exchange)
            if not url:
                return None
            updated = self.update_stock_logo_url(stock_id, url)
            if not updated:
                return None
            return {"stock_id": stock_id, "ticker": tick, "logo_url": url}
        except Exception as e:
            logger.error(f"Error crawling TV logo URL for {ticker}: {str(e)}")
            return None

    async def crawl_logos_for_all_stocks(self, batch_size: int = 5) -> Dict[str, int]:
        """
        Crawl logos for all world stocks that don't have them
        
        Args:
            batch_size: Number of concurrent requests to make
            
        Returns:
            Dictionary with success/failure counts
        """
        if not self.session:
            raise RuntimeError("WorldStockLogoCrawlerService must be used as async context manager")
            
        stocks = self.get_stocks_without_logos()
        
        if not stocks:
            logger.info("No world stocks need logo updates")
            return {"success": 0, "failed": 0, "total": 0}
        
        logger.info(f"Found {len(stocks)} world stocks that need logos")
        
        success_count = 0
        failed_count = 0
        
        # Process stocks in batches
        for i in range(0, len(stocks), batch_size):
            batch = stocks[i:i + batch_size]
            batch_tasks = []
            
            for stock in batch:
                task = asyncio.create_task(self._process_single_stock(stock))
                batch_tasks.append(task)
            
            results = await asyncio.gather(*batch_tasks, return_exceptions=True)
            
            for result in results:
                if isinstance(result, Exception):
                    logger.error(f"Batch task failed: {result}")
                    failed_count += 1
                elif result:
                    success_count += 1
                else:
                    failed_count += 1
            
            # Small delay between batches
            if i + batch_size < len(stocks):
                await asyncio.sleep(2)
        
        logger.info(f"World stock logo crawling completed: {success_count} success, {failed_count} failed")
        
        return {
            "success": success_count,
            "failed": failed_count,
            "total": len(stocks)
        }

    async def _process_single_stock(self, stock: Dict) -> bool:
        """Process a single stock for logo fetching"""
        try:
            url = self.get_logo_url(stock['ticker'])
            svg_content = await self.fetch_logo_svg(stock['ticker'])
            
            if svg_content:
                success = self.update_stock_logo(stock['id'], svg_content, url)
                if success:
                    logger.info(f"Successfully updated logo for {stock['ticker']} ({stock['company_name']})")
                    return True
                else:
                    logger.error(f"Failed to update database for {stock['ticker']}")
                    return False
            else:
                logger.warning(f"No logo found for {stock['ticker']} ({stock['company_name']})")
                return False
                
        except Exception as e:
            logger.error(f"Error processing {stock['ticker']}: {str(e)}")
            return False


# Convenience functions for easy usage
async def crawl_all_world_stock_logos(batch_size: int = 5) -> Dict[str, int]:
    """
    Crawl logos for all world stocks that don't have them
    
    Args:
        batch_size: Number of concurrent requests
        
    Returns:
        Dictionary with results
    """
    async with WorldStockLogoCrawlerService() as crawler:
        return await crawler.crawl_logos_for_all_stocks(batch_size)


async def crawl_logo_for_world_stock(ticker: str, exchange: str = "NASDAQ") -> bool:
    """
    Crawl logo for a specific world stock
    
    Args:
        ticker: Stock ticker symbol
        exchange: Exchange name
        
    Returns:
        True if successful
    """
    async with WorldStockLogoCrawlerService() as crawler:
        result = await crawler.crawl_tradingview_logo_url_for_ticker(ticker, exchange)
        return result is not None
