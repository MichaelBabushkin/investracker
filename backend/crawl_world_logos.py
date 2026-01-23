"""
Script to crawl logos for world stocks from TradingView
Usage: python3 crawl_world_logos.py [options]
"""

import asyncio
import argparse
import logging
import sys
from app.services.world_stock_logo_crawler_service import WorldStockLogoCrawlerService

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)

logger = logging.getLogger(__name__)


async def crawl_logo_urls(batch_size: int = 5, missing_only: bool = True):
    """Crawl TradingView to extract logo URLs for world stocks"""
    print("\n" + "="*80)
    print("🌐 World Stock Logo URL Crawler")
    print("="*80)
    
    async with WorldStockLogoCrawlerService() as crawler:
        print(f"\n📊 Fetching logo URLs from TradingView...")
        print(f"   Batch size: {batch_size}")
        print(f"   Mode: {'Missing only' if missing_only else 'All stocks'}\n")
        
        results = await crawler.crawl_tradingview_logo_urls_for_all(
            batch_size=batch_size,
            missing_only=missing_only
        )
        
        print("\n" + "="*80)
        print("📊 Logo URL Crawl Summary")
        print("="*80)
        print(f"  ✅ Successfully crawled: {results['success']}/{results['total']}")
        print(f"  ❌ Failed: {results['failed']}/{results['total']}")
        print("="*80 + "\n")
        
        return results


async def download_svg_files(batch_size: int = 5, only_missing: bool = True):
    """Download SVG files from stored logo URLs"""
    print("\n" + "="*80)
    print("📥 World Stock Logo SVG Downloader")
    print("="*80)
    
    async with WorldStockLogoCrawlerService() as crawler:
        print(f"\n🔽 Downloading SVG files from logo URLs...")
        print(f"   Batch size: {batch_size}")
        print(f"   Mode: {'Missing SVGs only' if only_missing else 'All with URLs'}\n")
        
        results = await crawler.populate_logo_svg_from_logo_urls_for_all(
            batch_size=batch_size,
            only_missing=only_missing
        )
        
        print("\n" + "="*80)
        print("📊 SVG Download Summary")
        print("="*80)
        print(f"  ✅ Successfully downloaded: {results['success']}/{results['total']}")
        print(f"  ❌ Failed: {results['failed']}/{results['total']}")
        print("="*80 + "\n")
        
        return results


async def crawl_single_ticker(ticker: str, exchange: str = "NASDAQ"):
    """Crawl logo for a single ticker"""
    print("\n" + "="*80)
    print(f"🔍 Crawling logo for {ticker} ({exchange})")
    print("="*80 + "\n")
    
    async with WorldStockLogoCrawlerService() as crawler:
        result = await crawler.crawl_tradingview_logo_url_for_ticker(ticker, exchange)
        
        if result:
            print(f"✅ Success!")
            print(f"   Stock ID: {result['stock_id']}")
            print(f"   Ticker: {result['ticker']}")
            print(f"   Logo URL: {result['logo_url']}\n")
            return True
        else:
            print(f"❌ Failed to crawl logo for {ticker}\n")
            return False


async def show_stats():
    """Show statistics about logo coverage"""
    print("\n" + "="*80)
    print("📊 World Stock Logo Coverage Statistics")
    print("="*80 + "\n")
    
    async with WorldStockLogoCrawlerService() as crawler:
        all_stocks = crawler.get_all_stocks()
        missing_urls = crawler.get_stocks_missing_logo_url()
        missing_svgs = crawler.get_stocks_with_logo_url_missing_svg()
        without_logos = crawler.get_stocks_without_logos()
        
        total = len(all_stocks)
        with_urls = total - len(missing_urls)
        with_svgs = total - len(without_logos)
        
        print(f"Total world stocks: {total}")
        print(f"\nLogo URLs:")
        print(f"  ✅ With logo_url: {with_urls} ({with_urls/total*100:.1f}%)")
        print(f"  ❌ Missing logo_url: {len(missing_urls)} ({len(missing_urls)/total*100:.1f}%)")
        
        print(f"\nLogo SVGs:")
        print(f"  ✅ With logo_svg: {with_svgs} ({with_svgs/total*100:.1f}%)")
        print(f"  ❌ Missing logo_svg: {len(without_logos)} ({len(without_logos)/total*100:.1f}%)")
        
        print(f"\nPartial completion:")
        print(f"  ⚠️  Have URL but no SVG: {len(missing_svgs)}")
        
        print("\n" + "="*80 + "\n")


async def main():
    parser = argparse.ArgumentParser(
        description='Crawl logos for world stocks from TradingView',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Show statistics
  python3 crawl_world_logos.py --stats
  
  # Crawl logo URLs for stocks missing them (Phase 1)
  python3 crawl_world_logos.py --crawl-urls
  
  # Download SVG files for stocks that have URLs (Phase 2)
  python3 crawl_world_logos.py --download-svgs
  
  # Full process: crawl URLs then download SVGs
  python3 crawl_world_logos.py --crawl-urls --download-svgs
  
  # Crawl logo for a specific ticker
  python3 crawl_world_logos.py --ticker AAPL
  
  # Crawl logo for a ticker on a specific exchange
  python3 crawl_world_logos.py --ticker BRK.B --exchange NYSE
  
  # Custom batch size
  python3 crawl_world_logos.py --crawl-urls --batch-size 10
        """
    )
    
    parser.add_argument('--stats', action='store_true',
                       help='Show logo coverage statistics')
    parser.add_argument('--crawl-urls', action='store_true',
                       help='Crawl TradingView to get logo URLs (Phase 1)')
    parser.add_argument('--download-svgs', action='store_true',
                       help='Download SVG files from stored URLs (Phase 2)')
    parser.add_argument('--ticker', type=str,
                       help='Crawl logo for a specific ticker symbol')
    parser.add_argument('--exchange', type=str, default='NASDAQ',
                       help='Exchange for the ticker (default: NASDAQ)')
    parser.add_argument('--batch-size', type=int, default=5,
                       help='Number of concurrent requests (default: 5)')
    parser.add_argument('--all', action='store_true',
                       help='Process all stocks, not just missing ones')
    
    args = parser.parse_args()
    
    # If no arguments, show help
    if len(sys.argv) == 1:
        parser.print_help()
        return
    
    try:
        # Show stats
        if args.stats:
            await show_stats()
        
        # Crawl single ticker
        if args.ticker:
            await crawl_single_ticker(args.ticker, args.exchange)
        
        # Crawl URLs
        if args.crawl_urls:
            await crawl_logo_urls(
                batch_size=args.batch_size,
                missing_only=not args.all
            )
        
        # Download SVGs
        if args.download_svgs:
            await download_svg_files(
                batch_size=args.batch_size,
                only_missing=not args.all
            )
        
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user\n")
        sys.exit(1)
    except Exception as e:
        logger.error(f"Error during crawling: {str(e)}", exc_info=True)
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
