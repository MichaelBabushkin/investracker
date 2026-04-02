"""Add ETF metadata columns to israeli_stocks

Revision ID: 2026_04_02_1200
Revises: 2026_03_21_1000
Create Date: 2026-04-02 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_02_1200'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Widen existing columns (safe to run even if already widened)
    op.alter_column('israeli_stocks', 'symbol', type_=sa.String(20), existing_nullable=False)
    op.alter_column('israeli_stocks', 'yfinance_ticker', type_=sa.String(30), existing_nullable=False)
    op.alter_column('israeli_stocks', 'name', type_=sa.String(200), existing_nullable=False)

    # Add new columns only if they don't already exist (idempotent for prod)
    from sqlalchemy import inspect
    from alembic import op as _op
    bind = _op.get_bind()
    existing = [c['name'] for c in inspect(bind).get_columns('israeli_stocks')]
    new_cols = [
        ('isin',             sa.Column('isin', sa.String(20), nullable=True)),
        ('underlying_asset', sa.Column('underlying_asset', sa.String(100), nullable=True)),
        ('classification',   sa.Column('classification', sa.String(200), nullable=True)),
        ('fund_trustee',     sa.Column('fund_trustee', sa.String(200), nullable=True)),
        ('management_fee',   sa.Column('management_fee', sa.Numeric(6, 3), nullable=True)),
        ('market_cap_k_ils', sa.Column('market_cap_k_ils', sa.Numeric(20, 2), nullable=True)),
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing:
            op.add_column('israeli_stocks', col_def)


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
