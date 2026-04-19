"""Add indices column to world_stocks, drop phone and zip_code

Revision ID: h7i8j9k0l1m2
Revises: g6h7i8j9k0l1
Create Date: 2026-04-19 19:00:00.000000

Adds a TEXT[] column 'indices' to track which market indices a stock belongs to
(e.g. ['sp500', 'nasdaq100']). Drops unused phone and zip_code columns.
"""
from alembic import op
from sqlalchemy.sql import text

revision = 'h7i8j9k0l1m2'
down_revision = 'g6h7i8j9k0l1'
branch_labels = None
depends_on = None


def upgrade():
    bind = op.get_bind()

    # Add indices column (PostgreSQL TEXT array)
    bind.execute(text(
        "ALTER TABLE world_stocks ADD COLUMN IF NOT EXISTS indices TEXT[] DEFAULT '{}'"
    ))

    # Drop unused columns (safe to drop — never populated in practice)
    try:
        bind.execute(text("ALTER TABLE world_stocks DROP COLUMN IF EXISTS phone"))
    except Exception:
        pass
    try:
        bind.execute(text("ALTER TABLE world_stocks DROP COLUMN IF EXISTS zip_code"))
    except Exception:
        pass


def downgrade():
    bind = op.get_bind()
    bind.execute(text("ALTER TABLE world_stocks DROP COLUMN IF EXISTS indices"))
    bind.execute(text("ALTER TABLE world_stocks ADD COLUMN IF NOT EXISTS phone VARCHAR(50)"))
    bind.execute(text("ALTER TABLE world_stocks ADD COLUMN IF NOT EXISTS zip_code VARCHAR(20)"))
