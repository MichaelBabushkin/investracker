"""add missing realized_pl and cost_basis columns

Revision ID: e4f5a6b7c8d9
Revises: d3e4f5a6b7c8
Create Date: 2026-04-14 14:00:00.000000

Adds realized_pl + cost_basis to world_stock_transactions and
realized_pl to israeli_stock_transactions. Idempotent — skips columns
that already exist (safe to run on Railway where they may be present).
"""
from alembic import op
import sqlalchemy as sa


revision = 'e4f5a6b7c8d9'
down_revision = 'd3e4f5a6b7c8'
branch_labels = None
depends_on = None


def _existing_columns(table_name):
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    return {c['name'] for c in inspector.get_columns(table_name)}


def upgrade() -> None:
    world_cols = _existing_columns('world_stock_transactions')
    if 'realized_pl' not in world_cols:
        op.add_column('world_stock_transactions',
                      sa.Column('realized_pl', sa.DECIMAL(15, 4), nullable=True))
    if 'cost_basis' not in world_cols:
        op.add_column('world_stock_transactions',
                      sa.Column('cost_basis', sa.DECIMAL(15, 4), nullable=True))

    israeli_cols = _existing_columns('israeli_stock_transactions')
    if 'realized_pl' not in israeli_cols:
        op.add_column('israeli_stock_transactions',
                      sa.Column('realized_pl', sa.DECIMAL(15, 4), nullable=True))


def downgrade() -> None:
    op.drop_column('world_stock_transactions', 'cost_basis')
    op.drop_column('world_stock_transactions', 'realized_pl')
    op.drop_column('israeli_stock_transactions', 'realized_pl')
