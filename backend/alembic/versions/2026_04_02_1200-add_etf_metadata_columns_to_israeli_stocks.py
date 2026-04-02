"""Add ETF metadata columns to israeli_stocks

Revision ID: 2026_04_02_1200
Revises: 2026_03_21_1000
Create Date: 2026-04-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_02_1200'
down_revision = '2026_03_21_1000'
branch_labels = None
depends_on = None


def upgrade():
    op.alter_column('israeli_stocks', 'symbol', type_=sa.String(20), existing_nullable=False)
    op.alter_column('israeli_stocks', 'yfinance_ticker', type_=sa.String(30), existing_nullable=False)
    op.alter_column('israeli_stocks', 'name', type_=sa.String(200), existing_nullable=False)

    op.add_column('israeli_stocks', sa.Column('isin', sa.String(20), nullable=True))
    op.add_column('israeli_stocks', sa.Column('underlying_asset', sa.String(100), nullable=True))
    op.add_column('israeli_stocks', sa.Column('classification', sa.String(200), nullable=True))
    op.add_column('israeli_stocks', sa.Column('fund_trustee', sa.String(200), nullable=True))
    op.add_column('israeli_stocks', sa.Column('management_fee', sa.Numeric(6, 3), nullable=True))
    op.add_column('israeli_stocks', sa.Column('market_cap_k_ils', sa.Numeric(20, 2), nullable=True))


def downgrade():
    op.drop_column('israeli_stocks', 'market_cap_k_ils')
    op.drop_column('israeli_stocks', 'management_fee')
    op.drop_column('israeli_stocks', 'fund_trustee')
    op.drop_column('israeli_stocks', 'classification')
    op.drop_column('israeli_stocks', 'underlying_asset')
    op.drop_column('israeli_stocks', 'isin')

    op.alter_column('israeli_stocks', 'name', type_=sa.String(100), existing_nullable=False)
    op.alter_column('israeli_stocks', 'yfinance_ticker', type_=sa.String(20), existing_nullable=False)
    op.alter_column('israeli_stocks', 'symbol', type_=sa.String(10), existing_nullable=False)
