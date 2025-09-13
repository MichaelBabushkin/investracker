#!/usr/bin/env python3
"""
Simple test for logo crawler - test with one stock first
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

async def test_single_logo():
    """Test fetching a single logo"""
    load_dotenv()
    
    print("🧪 Testing Logo Crawler with HAREL")
    print("=" * 40)
    
    try:
        import aiohttp
        print("✅ aiohttp imported successfully")
        
        from app.services.logo_crawler_service import LogoCrawlerService
        print("✅ LogoCrawlerService imported successfully")
        
        # Test with HAREL (Bank Hapoalim)
        async with LogoCrawlerService() as crawler:
            # Test URL generation
            url = crawler.get_logo_url("HAREL")
            print(f"🔗 Generated URL: {url}")
            
            # Try to fetch the logo
            print("🔍 Fetching logo...")
            svg_content = await crawler.fetch_logo_svg("HAREL")
            
            if svg_content:
                print(f"✅ Successfully fetched logo!")
                print(f"📏 Content length: {len(svg_content)} characters")
                print(f"🏷️  Preview: {svg_content[:100]}...")
                
                # Check how many stocks need logos
                stocks = crawler.get_stocks_without_logos()
                print(f"\n📊 Total stocks without logos: {len(stocks)}")
                
                if stocks:
                    print("📋 First 5 stocks without logos:")
                    for stock in stocks[:5]:
                        print(f"  - {stock['symbol']}: {stock['name']}")
            else:
                print("❌ Failed to fetch logo")
                
    except ImportError as e:
        print(f"❌ Import error: {e}")
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_single_logo())
