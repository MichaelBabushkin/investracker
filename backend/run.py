#!/usr/bin/env python3
"""
Simple startup script for the Investracker backend
"""

import sys
import os
from pathlib import Path

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

try:
    import uvicorn
    from app.main import app
    
    if __name__ == "__main__":
        print("Starting Investracker Backend...")
        print("API will be available at: http://localhost:8000")
        print("API Documentation: http://localhost:8000/docs")
        
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
except ImportError as e:
    print(f"Import error: {e}")
    print("Please install required dependencies:")
    print("pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    print(f"Error starting server: {e}")
    sys.exit(1)
