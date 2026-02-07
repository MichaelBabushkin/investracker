"""add_returns_to_holdings

Revision ID: b7c8d9e0f1g2
Revises: a1b2c3d4e5f6
Create Date: 2026-02-07 19:30:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b7c8d9e0f1g2'
down_revision = 'a1b2c3d4e5f6'
branch_labels = None
depends_on = None


def upgrade():
    # Add return columns to WorldStockHolding
    op.add_column('WorldStockHolding',
        sa.Column('unrealized_gain', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('WorldStockHolding',
        sa.Column('unrealized_gain_pct', sa.DECIMAL(10, 4), nullable=True))
    op.add_column('WorldStockHolding',
        sa.Column('twr', sa.DECIMAL(10, 4), nullable=True))
    op.add_column('WorldStockHolding',
        sa.Column('mwr', sa.DECIMAL(10, 4), nullable=True))
    
    # Add return columns to IsraeliStockHolding
    op.add_column('IsraeliStockHolding',
        sa.Column('unrealized_gain', sa.DECIMAL(18, 4), nullable=True))
    op.add_column('IsraeliStockHolding',
        sa.Column('unrealized_gain_pct', sa.DECIMAL(10, 4), nullable=True))
    op.add_column('IsraeliStockHolding',
        sa.Column('twr', sa.DECIMAL(10, 4), nullable=True))
    op.add_column('IsraeliStockHolding',
        sa.Column('mwr', sa.DECIMAL(10, 4), nullable=True))


def downgrade():
    # Remove from WorldStockHolding
    op.drop_column('WorldStockHolding', 'mwr')
    op.drop_column('WorldStockHolding', 'twr')
    op.drop_column('WorldStockHolding', 'unrealized_gain_pct')
    op.drop_column('WorldStockHolding', 'unrealized_gain')
    
    # Remove from IsraeliStockHolding
    op.drop_column('IsraeliStockHolding', 'mwr')
    op.drop_column('IsraeliStockHolding', 'twr')
    op.drop_column('IsraeliStockHolding', 'unrealized_gain_pct')
    op.drop_column('IsraeliStockHolding', 'unrealized_gain')
