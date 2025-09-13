#!/usr/bin/env python3
"""
Test with well-known Israeli companies
"""

import asyncio
import sys
import os
from dotenv import load_dotenv

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

async def test_known_companies():
    """Test with well-known company names"""
    load_dotenv()
    
    print("🚀 Testing Logo Crawler with Known Companies")
    print("=" * 50)
    
    # Test with simplified company names that are more likely to work
    test_companies = [
        "HAREL",
        "TEVA", 
        "NICE",
        "ICL",
        "BEZEQ"
    ]
    
    try:
        from app.services.logo_crawler_service import LogoCrawlerService
        
        async with LogoCrawlerService() as crawler:
            print(f"🔍 Testing {len(test_companies)} well-known companies...")
            
            success_count = 0
            for i, company in enumerate(test_companies, 1):
                print(f"\n[{i}/{len(test_companies)}] Testing {company}...")
                
                # Generate URL and test
                url = crawler.get_logo_url(company)
                print(f"  📡 URL: {url}")
                
                # Try to fetch logo
                svg_content = await crawler.fetch_logo_svg(company)
                
                if svg_content:
                    print(f"  ✅ Success! Fetched {len(svg_content)} characters")
                    success_count += 1
                    
                    # Save a sample to file for inspection
                    with open(f"logo_{company.lower()}.svg", "w", encoding="utf-8") as f:
                        f.write(svg_content)
                    print(f"  💾 Saved to logo_{company.lower()}.svg")
                else:
                    print(f"  ❌ Failed to fetch logo")
                
                # Longer delay between requests to avoid blocking
                await asyncio.sleep(3)
            
            print(f"\n🎉 Results: {success_count}/{len(test_companies)} logos successfully fetched")
            
            if success_count > 0:
                print(f"\n💡 Check the generated SVG files to see the logos!")
                
    except Exception as e:
        print(f"❌ Error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_known_companies())
