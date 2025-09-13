#!/usr/bin/env python3
"""
Quick logo crawler - fetch logos for first few stocks to test
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

async def crawl_few_logos():
    """Crawl logos for first few stocks"""
    load_dotenv()
    
    print("🚀 Quick Logo Crawler Test")
    print("=" * 40)
    
    try:
        from app.services.logo_crawler_service import LogoCrawlerService
        
        async with LogoCrawlerService() as crawler:
            # Get first 5 stocks without logos
            stocks = crawler.get_stocks_without_logos()[:5]
            
            print(f"📊 Testing with first 5 stocks:")
            for i, stock in enumerate(stocks, 1):
                print(f"  {i}. {stock['symbol']}: {stock['name']}")
            
            print(f"\n🔄 Starting logo crawling...")
            
            success_count = 0
            for i, stock in enumerate(stocks, 1):
                print(f"\n[{i}/5] Processing {stock['symbol']} ({stock['name']})...")
                
                # Try to fetch logo
                svg_content = await crawler.fetch_logo_svg(stock['name'])
                
                if svg_content:
                    # Update database
                    success = crawler.update_stock_logo(stock['id'], svg_content)
                    if success:
                        print(f"  ✅ Success! Saved logo for {stock['symbol']}")
                        success_count += 1
                    else:
                        print(f"  ❌ Failed to save to database for {stock['symbol']}")
                else:
                    print(f"  ⚠️  No logo found for {stock['symbol']}")
                
                # Small delay to be polite
                await asyncio.sleep(1)
            
            print(f"\n🎉 Completed! Successfully crawled {success_count}/5 logos")
            
            if success_count > 0:
                print(f"\n💡 Logos saved! You can now test them in the API.")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(crawl_few_logos())
