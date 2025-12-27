"""
Script to manually run Alembic migrations
Can be executed directly or called from admin endpoint
"""
import subprocess
import sys
import os

def run_migrations():
    """Run alembic upgrade head"""
    try:
        # Change to the backend directory (where alembic.ini is located)
        backend_dir = os.path.dirname(os.path.abspath(__file__))
        os.chdir(backend_dir)
        
        print(f"Running migrations from: {os.getcwd()}")
        print("=" * 50)
        
        # Run alembic upgrade head
        result = subprocess.run(
            ["alembic", "upgrade", "head"],
            capture_output=True,
            text=True
        )
        
        print("STDOUT:")
        print(result.stdout)
        
        if result.stderr:
            print("\nSTDERR:")
            print(result.stderr)
        
        if result.returncode == 0:
            print("\n✅ Migrations completed successfully!")
            return True
        else:
            print(f"\n❌ Migrations failed with return code: {result.returncode}")
            return False
            
    except Exception as e:
        print(f"\n❌ Error running migrations: {str(e)}")
        return False

if __name__ == "__main__":
    success = run_migrations()
    sys.exit(0 if success else 1)
