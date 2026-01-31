"""add price columns to stock tables

Revision ID: add_price_columns
Revises: consolidated_v1
Create Date: 2026-01-31 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = 'add_price_columns'
down_revision = 'consolidated_v1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add price columns to WorldStocks
    op.add_column('WorldStocks', sa.Column('current_price', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('WorldStocks', sa.Column('previous_close', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('WorldStocks', sa.Column('price_change', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('WorldStocks', sa.Column('price_change_pct', sa.DECIMAL(8, 4), nullable=True))
    op.add_column('WorldStocks', sa.Column('day_high', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('WorldStocks', sa.Column('day_low', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('WorldStocks', sa.Column('volume', sa.Integer(), nullable=True))
    op.add_column('WorldStocks', sa.Column('market_cap', sa.DECIMAL(20, 2), nullable=True))
    op.add_column('WorldStocks', sa.Column('price_updated_at', sa.DateTime(), nullable=True))
    
    # Add price columns to IsraeliStocks
    op.add_column('IsraeliStocks', sa.Column('current_price', sa.DECIMAL(15, 4), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('previous_close', sa.DECIMAL(15, 4), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('price_change', sa.DECIMAL(15, 4), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('price_change_pct', sa.DECIMAL(8, 4), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('day_high', sa.DECIMAL(15, 4), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('day_low', sa.DECIMAL(15, 4), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('volume', sa.Integer(), nullable=True))
    op.add_column('IsraeliStocks', sa.Column('price_updated_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    # Remove from WorldStocks
    op.drop_column('WorldStocks', 'price_updated_at')
    op.drop_column('WorldStocks', 'market_cap')
    op.drop_column('WorldStocks', 'volume')
    op.drop_column('WorldStocks', 'day_low')
    op.drop_column('WorldStocks', 'day_high')
    op.drop_column('WorldStocks', 'price_change_pct')
    op.drop_column('WorldStocks', 'price_change')
    op.drop_column('WorldStocks', 'previous_close')
    op.drop_column('WorldStocks', 'current_price')
    
    # Remove from IsraeliStocks
    op.drop_column('IsraeliStocks', 'price_updated_at')
    op.drop_column('IsraeliStocks', 'volume')
    op.drop_column('IsraeliStocks', 'day_low')
    op.drop_column('IsraeliStocks', 'day_high')
    op.drop_column('IsraeliStocks', 'price_change_pct')
    op.drop_column('IsraeliStocks', 'price_change')
    op.drop_column('IsraeliStocks', 'previous_close')
    op.drop_column('IsraeliStocks', 'current_price')
