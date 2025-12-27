#!/usr/bin/env python3
"""
Standalone migration script that runs before the FastAPI app starts.
This ensures migrations complete successfully before accepting traffic.
"""
import os
import sys
from pathlib import Path
from alembic.config import Config
from alembic import command

def run_migrations():
    """Run Alembic migrations with proper error handling"""
    try:
        # Get the backend directory (where this script is located)
        backend_dir = Path(__file__).parent.absolute()
        alembic_ini = backend_dir / "alembic.ini"
        
        print(f"Backend directory: {backend_dir}")
        print(f"Looking for alembic.ini at: {alembic_ini}")
        print(f"alembic.ini exists: {alembic_ini.exists()}")
        
        if not alembic_ini.exists():
            print(f"ERROR: alembic.ini not found at {alembic_ini}")
            print(f"Directory contents: {list(backend_dir.iterdir())}")
            sys.exit(1)
        
        # Create Alembic configuration
        alembic_cfg = Config(str(alembic_ini))
        alembic_cfg.set_main_option("script_location", str(backend_dir / "alembic"))
        
        print("Running migrations...")
        command.upgrade(alembic_cfg, "head")
        print("✅ Migrations completed successfully!")
        
        return 0
        
    except Exception as e:
        print(f"❌ Migration failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    sys.exit(run_migrations())
