#!/opt/homebrew/bin/python3.11
"""
Simple startup script for the Investracker backend
"""

import sys
import os
import logging
from pathlib import Path
from datetime import datetime

# Add the current directory to Python path
current_dir = Path(__file__).parent
sys.path.insert(0, str(current_dir))

# Setup logging to file
log_dir = current_dir / "logs"
log_dir.mkdir(exist_ok=True)
log_file = log_dir / f"backend_{datetime.now().strftime('%Y%m%d')}.log"

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler(sys.stdout)
    ]
)

logger = logging.getLogger(__name__)

try:
    import uvicorn
    from app.main import app
    
    if __name__ == "__main__":
        logger.info("Starting Investracker Backend...")
        logger.info("API will be available at: http://localhost:8000")
        logger.info("API Documentation: http://localhost:8000/docs")
        logger.info(f"Logs being written to: {log_file}")
        
        uvicorn.run(
            "app.main:app",
            host="0.0.0.0",
            port=8000,
            reload=True,
            log_level="info"
        )
        
except ImportError as e:
    logger.error(f"Import error: {e}")
    print("Please install required dependencies:")
    print("pip install -r requirements.txt")
    sys.exit(1)
except Exception as e:
    logger.error(f"Error starting server: {e}")
    sys.exit(1)
