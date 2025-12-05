"""
Check the current migration status and database schema
Run this to verify if migrations have been applied
"""
import os
from sqlalchemy import create_engine, text, inspect
from app.core.config import settings

def check_migration_status():
    """Check current migration status in the database"""
    engine = create_engine(settings.DATABASE_URL)
    
    print("=" * 80)
    print("CHECKING MIGRATION STATUS")
    print("=" * 80)
    print(f"\nConnecting to: {settings.DATABASE_URL.split('@')[1] if '@' in settings.DATABASE_URL else 'local'}\n")
    
    with engine.connect() as conn:
        # Check alembic version
        print("📋 Current Alembic Version:")
        try:
            result = conn.execute(text("SELECT version_num FROM alembic_version"))
            version = result.fetchone()
            if version:
                print(f"   ✓ {version[0]}")
            else:
                print("   ✗ No migration has been applied yet!")
        except Exception as e:
            print(f"   ✗ Error: {e}")
            print("   ℹ️  alembic_version table doesn't exist - migrations never ran")
        
        # Check if users table has role column
        print("\n👤 Users Table Schema:")
        try:
            inspector = inspect(engine)
            columns = inspector.get_columns('users')
            
            has_role = False
            for col in columns:
                if col['name'] == 'role':
                    has_role = True
                    print(f"   ✓ role column exists: {col['type']}")
                    break
            
            if not has_role:
                print("   ✗ role column NOT found!")
                print("\n   All columns in users table:")
                for col in columns:
                    print(f"      - {col['name']}: {col['type']}")
        except Exception as e:
            print(f"   ✗ Error checking users table: {e}")
        
        # Check all tables
        print("\n📊 All Tables in Database:")
        try:
            inspector = inspect(engine)
            tables = inspector.get_table_names()
            for table in sorted(tables):
                print(f"   - {table}")
        except Exception as e:
            print(f"   ✗ Error listing tables: {e}")
    
    print("\n" + "=" * 80)

if __name__ == "__main__":
    check_migration_status()
