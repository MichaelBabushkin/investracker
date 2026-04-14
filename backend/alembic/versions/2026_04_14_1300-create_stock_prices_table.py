"""create stock_prices table

Revision ID: d3e4f5a6b7c8
Revises: c2d3e4f5a6b7
Create Date: 2026-04-14 13:00:00.000000

Creates the stock_prices table if it doesn't already exist.
The original creation migration (44b6171a3e33) was applied in the chain
but the table is absent from some environments due to a failed FK constraint
in the original migration. This migration is idempotent.
"""
from alembic import op
import sqlalchemy as sa


revision = 'd3e4f5a6b7c8'
down_revision = 'c2d3e4f5a6b7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if 'stock_prices' not in inspector.get_table_names():
        op.create_table(
            'stock_prices',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('ticker', sa.String(20), nullable=False),
            sa.Column('market', sa.String(20), nullable=False, server_default='world'),
            sa.Column('current_price', sa.DECIMAL(18, 4), nullable=True),
            sa.Column('previous_close', sa.DECIMAL(18, 4), nullable=True),
            sa.Column('price_change', sa.DECIMAL(18, 4), nullable=True),
            sa.Column('price_change_pct', sa.DECIMAL(8, 4), nullable=True),
            sa.Column('day_high', sa.DECIMAL(18, 4), nullable=True),
            sa.Column('day_low', sa.DECIMAL(18, 4), nullable=True),
            sa.Column('volume', sa.BigInteger(), nullable=True),
            sa.Column('market_cap', sa.DECIMAL(20, 2), nullable=True),
            sa.Column('updated_at', sa.DateTime(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=False),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_stock_prices_ticker', 'stock_prices', ['ticker'])
        op.create_index('ix_stock_prices_updated_at', 'stock_prices', ['updated_at'])
        op.create_index(
            'uq_stock_prices_ticker_market', 'stock_prices', ['ticker', 'market'], unique=True
        )


def downgrade() -> None:
    op.drop_index('uq_stock_prices_ticker_market', table_name='stock_prices')
    op.drop_index('ix_stock_prices_updated_at', table_name='stock_prices')
    op.drop_index('ix_stock_prices_ticker', table_name='stock_prices')
    op.drop_table('stock_prices')
