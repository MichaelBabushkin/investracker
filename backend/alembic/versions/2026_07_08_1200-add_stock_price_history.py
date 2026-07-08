"""add stock_price_history daily close cache

Revision ID: p9q0r1s2t3u4
Revises: n3o4p5q6r7s8
Create Date: 2026-07-08 12:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'p9q0r1s2t3u4'
down_revision = 'n3o4p5q6r7s8'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'stock_price_history',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('ticker', sa.String(30), nullable=False),
        sa.Column('market', sa.String(20), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('close_price', sa.DECIMAL(18, 6), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('ticker', 'date', name='uq_price_history_ticker_date'),
    )
    op.create_index('idx_price_history_ticker_date', 'stock_price_history', ['ticker', 'date'])
    op.create_index('idx_price_history_market_date', 'stock_price_history', ['market', 'date'])


def downgrade():
    op.drop_table('stock_price_history')
