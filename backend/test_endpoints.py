#!/usr/bin/env python3
"""
Test script to verify Israeli stock endpoints are working
"""

import os
import sys
import requests
import json

# Add the app directory to Python path
sys.path.append(os.path.dirname(__file__))

def test_endpoints():
    """Test the Israeli stock endpoints"""
    base_url = "http://localhost:8000/api/v1/israeli-stocks"
    
    print("🧪 Testing Israeli Stock Endpoints")
    print("=" * 50)
    
    # Test endpoints without authentication first
    endpoints = [
        ("GET", "/stocks", "Get Israeli stocks list"),
        ("GET", "/holdings", "Get holdings (should return empty without auth)"),
        ("GET", "/transactions", "Get transactions (should return empty without auth)"),
        ("GET", "/dividends", "Get dividends (should return empty without auth)")
    ]
    
    for method, endpoint, description in endpoints:
        try:
            url = f"{base_url}{endpoint}"
            print(f"\n📡 {method} {url}")
            print(f"   {description}")
            
            if method == "GET":
                response = requests.get(url, timeout=5)
            
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, dict) and 'count' in data:
                    print(f"   Count: {data.get('count', 0)}")
                elif isinstance(data, list):
                    print(f"   Count: {len(data)}")
                else:
                    print(f"   Response: {type(data)}")
                print("   ✅ SUCCESS")
            else:
                print(f"   Error: {response.text}")
                print("   ❌ FAILED")
                
        except requests.exceptions.RequestException as e:
            print(f"   Connection Error: {e}")
            print("   ⚠️  Backend may not be running")
        except Exception as e:
            print(f"   Error: {e}")
            print("   ❌ FAILED")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")
    print("\nNote: To test with authentication, you need to:")
    print("1. Register a user")
    print("2. Login to get an access token")
    print("3. Include the token in Authorization header")

if __name__ == "__main__":
    test_endpoints()
