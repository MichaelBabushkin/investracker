"""add realized_pl and cost_basis to world_stock_transactions

Revision ID: a1b2c3d4e5f6
Revises: 2026_02_14_1200
Create Date: 2026-03-21 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '2026_02_14_1200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add realized_pl and cost_basis columns to world_stock_transactions (IF NOT EXISTS — idempotent)
    from sqlalchemy import inspect
    from alembic import op as _op
    bind = _op.get_bind()
    inspector = inspect(bind)
    existing = [c['name'] for c in inspector.get_columns('world_stock_transactions')]
    if 'realized_pl' not in existing:
        op.add_column('world_stock_transactions', sa.Column('realized_pl', sa.DECIMAL(precision=15, scale=4), nullable=True))
    if 'cost_basis' not in existing:
        op.add_column('world_stock_transactions', sa.Column('cost_basis', sa.DECIMAL(precision=15, scale=4), nullable=True))


def downgrade() -> None:
    op.drop_column('world_stock_transactions', 'cost_basis')
    op.drop_column('world_stock_transactions', 'realized_pl')
