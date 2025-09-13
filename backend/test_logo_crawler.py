"""
Test script for the logo crawler service
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

async def test_logo_crawler():
    """Test the logo crawler service"""
    load_dotenv()
    
    print("🧪 Testing Logo Crawler Service")
    print("=" * 40)
    
    try:
        from app.services.logo_crawler_service import LogoCrawlerService
        
        # Test URL generation
        async with LogoCrawlerService() as crawler:
            test_name = "HAREL"
            url = crawler.get_logo_url(test_name)
            print(f"📍 Test URL for '{test_name}': {url}")
            
            # Test fetching a single logo
            print(f"\n🔍 Testing logo fetch for {test_name}...")
            svg_content = await crawler.fetch_logo_svg(test_name)
            
            if svg_content:
                print(f"✅ Successfully fetched SVG logo")
                print(f"📏 Content length: {len(svg_content)} characters")
                print(f"🏷️  Starts with: {svg_content[:50]}...")
                print(f"🏁 Ends with: ...{svg_content[-50:]}")
                
                # Check if it's valid SVG
                if svg_content.strip().startswith('<svg') and svg_content.strip().endswith('</svg>'):
                    print("✅ Valid SVG format confirmed")
                else:
                    print("⚠️  SVG format validation failed")
            else:
                print(f"❌ Failed to fetch logo for {test_name}")
            
            # Test database connection
            print(f"\n🗄️  Testing database connection...")
            stocks = crawler.get_stocks_without_logos()
            print(f"📊 Found {len(stocks)} stocks without logos")
            
            if stocks:
                print("📋 First few stocks without logos:")
                for stock in stocks[:5]:
                    print(f"  - {stock['symbol']}: {stock['name']}")
    
    except ImportError as e:
        print(f"❌ Import error: {e}")
        print("💡 Make sure you're running from the backend directory")
    except Exception as e:
        print(f"❌ Error during test: {e}")


if __name__ == "__main__":
    asyncio.run(test_logo_crawler())
