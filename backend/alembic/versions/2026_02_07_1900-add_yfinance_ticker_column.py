"""add_yfinance_ticker_column

Revision ID: a1b2c3d4e5f6
Revises: 44b6171a3e33
Create Date: 2026-02-07 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a1b2c3d4e5f6'
down_revision = '44b6171a3e33'
branch_labels = None
depends_on = None


def upgrade():
    # Add yfinance_ticker column as nullable first
    op.add_column('IsraeliStocks', 
        sa.Column('yfinance_ticker', sa.String(20), nullable=True))
    
    # Populate with symbol + .TA suffix (Israeli stocks on yfinance use .TA)
    op.execute("""
        UPDATE "IsraeliStocks" 
        SET yfinance_ticker = symbol || '.TA'
    """)
    
    # Make it NOT NULL after population
    op.alter_column('IsraeliStocks', 'yfinance_ticker', nullable=False)
    
    # Add index for performance
    op.create_index('ix_israelistocks_yfinance_ticker', 
                    'IsraeliStocks', ['yfinance_ticker'])


def downgrade():
    # Drop index first
    op.drop_index('ix_israelistocks_yfinance_ticker', table_name='IsraeliStocks')
    
    # Drop column
    op.drop_column('IsraeliStocks', 'yfinance_ticker')
