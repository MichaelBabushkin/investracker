"""create_stock_prices_table

Revision ID: 44b6171a3e33
Revises: dbe4296900c8
Create Date: 2026-02-07 17:51:05.000208

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '44b6171a3e33'
down_revision = 'dbe4296900c8'
branch_labels = None
depends_on = None


def upgrade():
    # Create StockPrices table for frequently updated price data
    op.create_table(
        'StockPrices',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticker', sa.String(20), nullable=False),
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
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create unique index on ticker for fast lookups
    op.create_index('idx_stock_prices_ticker', 'StockPrices', ['ticker'], unique=True)
    
    # Create index on updated_at for finding stale prices
    op.create_index('idx_stock_prices_updated', 'StockPrices', ['updated_at'])
    
    # Add foreign key constraint to WorldStocks
    op.create_foreign_key(
        'fk_stock_prices_world_stocks',
        'StockPrices', 'WorldStocks',
        ['ticker'], ['ticker'],
        ondelete='CASCADE'
    )


def downgrade():
    op.drop_constraint('fk_stock_prices_world_stocks', 'StockPrices', type_='foreignkey')
    op.drop_index('idx_stock_prices_updated', 'StockPrices')
    op.drop_index('idx_stock_prices_ticker', 'StockPrices')
    op.drop_table('StockPrices')
