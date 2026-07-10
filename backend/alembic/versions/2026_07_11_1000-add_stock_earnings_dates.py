"""add stock_earnings_dates cache

Revision ID: r2s3t4u5v6w7
Revises: q1r2s3t4u5v6
Create Date: 2026-07-11 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'r2s3t4u5v6w7'
down_revision = 'q1r2s3t4u5v6'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        'stock_earnings_dates',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('ticker', sa.String(30), nullable=False),
        sa.Column('earnings_date', sa.Date(), nullable=False),
        sa.Column('fetched_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.UniqueConstraint('ticker', 'earnings_date', name='uq_earnings_ticker_date'),
    )
    op.create_index('idx_earnings_ticker', 'stock_earnings_dates', ['ticker'])


def downgrade():
    op.drop_table('stock_earnings_dates')
