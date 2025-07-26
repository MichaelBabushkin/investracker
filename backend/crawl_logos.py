#!/usr/bin/env python3
"""
Command-line script to run the logo crawler for Israeli stocks
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

from app.services.logo_crawler_service import LogoCrawlerService, crawl_all_logos, crawl_logo_for_stock


async def main():
    """Main function to run logo crawler"""
    load_dotenv()
    
    print("🚀 Starting Israeli Stock Logo Crawler")
    print("=" * 50)
    
    try:
        # Show stocks without logos first
        async with LogoCrawlerService() as crawler:
            stocks = crawler.get_stocks_without_logos()
            
            if not stocks:
                print("✅ All stocks already have logos!")
                return
            
            print(f"📊 Found {len(stocks)} stocks without logos:")
            for stock in stocks[:10]:  # Show first 10
                print(f"  - {stock['symbol']}: {stock['name']}")
            
            if len(stocks) > 10:
                print(f"  ... and {len(stocks) - 10} more")
            
            print("\n🔄 Starting logo crawling process...")
            
            # Crawl logos with batch size of 3 to be gentle
            result = await crawler.crawl_logos_for_all_stocks(batch_size=3)
            
            print(f"\n📈 Results:")
            print(f"  ✅ Successful: {result['success']}")
            print(f"  ❌ Failed: {result['failed']}")
            print(f"  📊 Total processed: {result['total']}")
            
            if result['success'] > 0:
                print(f"\n🎉 Successfully fetched {result['success']} logos!")
            
            if result['failed'] > 0:
                print(f"\n⚠️  {result['failed']} logos could not be fetched (this is normal for some stocks)")
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return 1
    
    return 0


async def crawl_single_stock(stock_name: str):
    """Crawl logo for a single stock"""
    print(f"🔍 Fetching logo for: {stock_name}")
    
    try:
        success = await crawl_logo_for_stock(stock_name)
        
        if success:
            print(f"✅ Successfully fetched logo for {stock_name}")
        else:
            print(f"❌ Failed to fetch logo for {stock_name}")
            
    except Exception as e:
        print(f"❌ Error: {e}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Single stock mode
        stock_name = " ".join(sys.argv[1:])
        asyncio.run(crawl_single_stock(stock_name))
    else:
        # Crawl all stocks mode
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
