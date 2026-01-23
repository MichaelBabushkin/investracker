"""add_world_stocks_tables

Revision ID: 2026_01_23_1600
Revises: 131ff7079741
Create Date: 2026-01-23 16:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_01_23_1600'
down_revision = '131ff7079741'
branch_labels = None
depends_on = None


def upgrade():
    # First, drop old world stock tables if they exist (from previous incomplete migration)
    op.execute("DROP TABLE IF EXISTS \"WorldStockPerformance\" CASCADE")
    op.execute("DROP TABLE IF EXISTS \"WorldStockDividend\" CASCADE")
    op.execute("DROP TABLE IF EXISTS \"WorldStockTransaction\" CASCADE")
    op.execute("DROP TABLE IF EXISTS \"WorldStockHolding\" CASCADE")
    op.execute("DROP TABLE IF EXISTS \"WorldStockAccount\" CASCADE")
    
    # Create WorldStock table (reference data for world stocks)
    op.create_table(
        'WorldStock',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('ticker', sa.String(length=20), nullable=False),
        sa.Column('exchange', sa.String(length=10), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('sector', sa.String(length=100), nullable=True),
        sa.Column('industry', sa.String(length=100), nullable=True),
        sa.Column('country', sa.String(length=100), nullable=True, server_default='US'),
        sa.Column('currency', sa.String(length=10), nullable=True, server_default='USD'),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('logo_svg', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=True, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_world_stock_ticker', 'WorldStock', ['ticker'], unique=False)
    op.create_index('idx_world_stock_exchange', 'WorldStock', ['exchange'], unique=False)
    op.create_index('idx_world_stock_ticker_exchange', 'WorldStock', ['ticker', 'exchange'], unique=True)
    
    # Create WorldStockHolding table
    op.create_table(
        'WorldStockHolding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('ticker', sa.String(length=20), nullable=False),
        sa.Column('symbol', sa.String(length=50), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('quantity', sa.DECIMAL(precision=18, scale=6), nullable=True),
        sa.Column('last_price', sa.DECIMAL(precision=18, scale=4), nullable=True),
        sa.Column('purchase_cost', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('current_value', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('portfolio_percentage', sa.DECIMAL(precision=5, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True, server_default='USD'),
        sa.Column('exchange_rate', sa.DECIMAL(precision=10, scale=4), nullable=True),
        sa.Column('holding_date', sa.Date(), nullable=True),
        sa.Column('source_pdf', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_world_holding_user', 'WorldStockHolding', ['user_id'], unique=False)
    op.create_index('idx_world_holding_ticker', 'WorldStockHolding', ['ticker'], unique=False)
    op.create_index('idx_world_holding_date', 'WorldStockHolding', ['holding_date'], unique=False)
    op.create_index('idx_world_holding_unique', 'WorldStockHolding', ['user_id', 'ticker', 'source_pdf'], unique=True)
    
    # Create WorldStockTransaction table
    op.create_table(
        'WorldStockTransaction',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('ticker', sa.String(length=20), nullable=False),
        sa.Column('symbol', sa.String(length=50), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('transaction_type', sa.String(length=20), nullable=False),
        sa.Column('transaction_date', sa.Date(), nullable=False),
        sa.Column('transaction_time', sa.String(length=10), nullable=True),
        sa.Column('quantity', sa.DECIMAL(precision=18, scale=6), nullable=True),
        sa.Column('price', sa.DECIMAL(precision=18, scale=4), nullable=True),
        sa.Column('total_value', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('commission', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('tax', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True, server_default='USD'),
        sa.Column('exchange_rate', sa.DECIMAL(precision=10, scale=4), nullable=True),
        sa.Column('source_pdf', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_world_transaction_user', 'WorldStockTransaction', ['user_id'], unique=False)
    op.create_index('idx_world_transaction_ticker', 'WorldStockTransaction', ['ticker'], unique=False)
    op.create_index('idx_world_transaction_date', 'WorldStockTransaction', ['transaction_date'], unique=False)
    op.create_index('idx_world_transaction_type', 'WorldStockTransaction', ['transaction_type'], unique=False)
    
    # Create WorldDividend table
    op.create_table(
        'WorldDividend',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('ticker', sa.String(length=20), nullable=False),
        sa.Column('symbol', sa.String(length=50), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('payment_date', sa.Date(), nullable=False),
        sa.Column('amount', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('tax', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('net_amount', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True, server_default='USD'),
        sa.Column('exchange_rate', sa.DECIMAL(precision=10, scale=4), nullable=True),
        sa.Column('source_pdf', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_world_dividend_user', 'WorldDividend', ['user_id'], unique=False)
    op.create_index('idx_world_dividend_ticker', 'WorldDividend', ['ticker'], unique=False)
    op.create_index('idx_world_dividend_date', 'WorldDividend', ['payment_date'], unique=False)
    
    # Create PendingWorldTransaction table
    op.create_table(
        'PendingWorldTransaction',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('upload_batch_id', sa.String(length=255), nullable=False),
        sa.Column('pdf_filename', sa.String(length=255), nullable=True),
        sa.Column('ticker', sa.String(length=20), nullable=False),
        sa.Column('stock_name', sa.String(length=255), nullable=True),
        sa.Column('transaction_type', sa.String(length=20), nullable=False),
        sa.Column('transaction_date', sa.String(length=50), nullable=True),
        sa.Column('transaction_time', sa.String(length=10), nullable=True),
        sa.Column('quantity', sa.DECIMAL(precision=18, scale=6), nullable=True),
        sa.Column('price', sa.DECIMAL(precision=18, scale=4), nullable=True),
        sa.Column('amount', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('commission', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('tax', sa.DECIMAL(precision=18, scale=2), nullable=True),
        sa.Column('currency', sa.String(length=10), nullable=True, server_default='USD'),
        sa.Column('exchange_rate', sa.DECIMAL(precision=10, scale=4), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=True, server_default='pending'),
        sa.Column('review_notes', sa.Text(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.String(length=255), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    op.create_index('idx_pending_world_user', 'PendingWorldTransaction', ['user_id'], unique=False)
    op.create_index('idx_pending_world_batch', 'PendingWorldTransaction', ['upload_batch_id'], unique=False)
    op.create_index('idx_pending_world_status', 'PendingWorldTransaction', ['status'], unique=False)
    
    # Create ExchangeRate table for currency conversion
    op.create_table(
        'ExchangeRate',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('from_currency', sa.String(length=10), nullable=False),
        sa.Column('to_currency', sa.String(length=10), nullable=False),
        sa.Column('rate', sa.DECIMAL(precision=10, scale=4), nullable=False),
        sa.Column('date', sa.Date(), nullable=False),
        sa.Column('source', sa.String(length=50), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_exchange_rate_currencies', 'ExchangeRate', ['from_currency', 'to_currency'], unique=False)
    op.create_index('idx_exchange_rate_date', 'ExchangeRate', ['date'], unique=False)
    op.create_index('idx_exchange_rate_unique', 'ExchangeRate', ['from_currency', 'to_currency', 'date'], unique=True)


def downgrade():
    # Drop tables in reverse order
    op.drop_index('idx_exchange_rate_unique', table_name='ExchangeRate')
    op.drop_index('idx_exchange_rate_date', table_name='ExchangeRate')
    op.drop_index('idx_exchange_rate_currencies', table_name='ExchangeRate')
    op.drop_table('ExchangeRate')
    
    op.drop_index('idx_pending_world_status', table_name='PendingWorldTransaction')
    op.drop_index('idx_pending_world_batch', table_name='PendingWorldTransaction')
    op.drop_index('idx_pending_world_user', table_name='PendingWorldTransaction')
    op.drop_table('PendingWorldTransaction')
    
    op.drop_index('idx_world_dividend_date', table_name='WorldDividend')
    op.drop_index('idx_world_dividend_ticker', table_name='WorldDividend')
    op.drop_index('idx_world_dividend_user', table_name='WorldDividend')
    op.drop_table('WorldDividend')
    
    op.drop_index('idx_world_transaction_type', table_name='WorldStockTransaction')
    op.drop_index('idx_world_transaction_date', table_name='WorldStockTransaction')
    op.drop_index('idx_world_transaction_ticker', table_name='WorldStockTransaction')
    op.drop_index('idx_world_transaction_user', table_name='WorldStockTransaction')
    op.drop_table('WorldStockTransaction')
    
    op.drop_index('idx_world_holding_unique', table_name='WorldStockHolding')
    op.drop_index('idx_world_holding_date', table_name='WorldStockHolding')
    op.drop_index('idx_world_holding_ticker', table_name='WorldStockHolding')
    op.drop_index('idx_world_holding_user', table_name='WorldStockHolding')
    op.drop_table('WorldStockHolding')
    
    op.drop_index('idx_world_stock_ticker_exchange', table_name='WorldStock')
    op.drop_index('idx_world_stock_exchange', table_name='WorldStock')
    op.drop_index('idx_world_stock_ticker', table_name='WorldStock')
    op.drop_table('WorldStock')
