"""add OHLV columns to stock_price_history (close already exists)

Revision ID: q1r2s3t4u5v6
Revises: p9q0r1s2t3u4
Create Date: 2026-07-10 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'q1r2s3t4u5v6'
down_revision = 'p9q0r1s2t3u4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('stock_price_history', sa.Column('open_price', sa.DECIMAL(18, 6), nullable=True))
    op.add_column('stock_price_history', sa.Column('high_price', sa.DECIMAL(18, 6), nullable=True))
    op.add_column('stock_price_history', sa.Column('low_price', sa.DECIMAL(18, 6), nullable=True))
    op.add_column('stock_price_history', sa.Column('volume', sa.BigInteger(), nullable=True))


def downgrade():
    op.drop_column('stock_price_history', 'volume')
    op.drop_column('stock_price_history', 'low_price')
    op.drop_column('stock_price_history', 'high_price')
    op.drop_column('stock_price_history', 'open_price')
