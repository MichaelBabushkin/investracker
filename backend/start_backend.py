#!/usr/bin/env python3
"""
Quick script to start the backend server and verify it's working
"""

import os
import sys
import subprocess
import time
import requests

def start_backend():
    """Start the backend server"""
    backend_dir = os.path.dirname(__file__)
    
    print("🚀 Starting Investracker Backend Server...")
    print(f"Backend directory: {backend_dir}")
    
    try:
        # Start the server
        process = subprocess.Popen(
            [sys.executable, "run.py"],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        print("⏳ Waiting for server to start...")
        time.sleep(3)
        
        # Test if server is running
        try:
            response = requests.get("http://localhost:8000/docs", timeout=5)
            if response.status_code == 200:
                print("✅ Backend server is running!")
                print("📋 API Documentation: http://localhost:8000/docs")
                print("🇮🇱 Israeli Stocks API: http://localhost:8000/api/v1/israeli-stocks/")
                print("\n📝 Available endpoints:")
                print("   - POST /api/v1/israeli-stocks/upload-pdf")
                print("   - GET  /api/v1/israeli-stocks/holdings")
                print("   - GET  /api/v1/israeli-stocks/transactions")
                print("   - GET  /api/v1/israeli-stocks/dividends")
                print("   - GET  /api/v1/israeli-stocks/stocks")
                
                print("\n🌐 Frontend Integration:")
                print("   1. Start the frontend: cd ../frontend && npm run dev")
                print("   2. Visit: http://localhost:3000/israeli-stocks")
                print("   3. Upload PDF files to test the system")
                
                return True
            else:
                print(f"❌ Server responded with status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Could not connect to server: {e}")
            return False
            
    except Exception as e:
        print(f"❌ Failed to start server: {e}")
        return False

if __name__ == "__main__":
    if start_backend():
        print("\n✅ Backend is ready for frontend integration!")
        input("\nPress Enter to stop the server...")
    else:
        print("\n❌ Backend startup failed. Check the errors above.")
