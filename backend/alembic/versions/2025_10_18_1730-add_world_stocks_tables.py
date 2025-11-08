"""add_world_stocks_tables

Revision ID: 2025_10_18_1730
Revises: 
Create Date: 2025-10-18 17:30:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '2025_10_18_1730'
down_revision = '20251013_01'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create WorldStockAccount table
    op.create_table(
        'WorldStockAccount',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('account_number', sa.String(length=50), nullable=True),
        sa.Column('account_alias', sa.String(length=100), nullable=True),
        sa.Column('account_type', sa.String(length=50), nullable=True),
        sa.Column('base_currency', sa.String(length=3), nullable=True, server_default='USD'),
        sa.Column('broker_name', sa.String(length=200), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('account_number')
    )
    op.create_index('idx_world_account_user_id', 'WorldStockAccount', ['user_id'])
    op.create_index('idx_world_account_number', 'WorldStockAccount', ['account_number'], unique=True)

    # Create WorldStockHolding table
    op.create_table(
        'WorldStockHolding',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('quantity', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('avg_entry_price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('current_price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('current_value', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('purchase_cost', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('unrealized_pl', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('unrealized_pl_percent', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True, server_default='USD'),
        sa.Column('source_pdf', sa.String(length=500), nullable=True),
        sa.Column('last_updated', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['account_id'], ['WorldStockAccount.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_world_holding_user_id', 'WorldStockHolding', ['user_id'])
    op.create_index('idx_world_holding_symbol', 'WorldStockHolding', ['symbol'])
    op.create_index('idx_world_holding_account_id', 'WorldStockHolding', ['account_id'])

    # Create WorldStockTransaction table
    op.create_table(
        'WorldStockTransaction',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('transaction_date', sa.Date(), nullable=True),
        sa.Column('transaction_time', sa.Time(), nullable=True),
        sa.Column('transaction_type', sa.String(length=20), nullable=True),
        sa.Column('quantity', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('trade_price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('close_price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('proceeds', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('commission', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('basis', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('realized_pl', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('mtm_pl', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('trade_code', sa.String(length=10), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True, server_default='USD'),
        sa.Column('source_pdf', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['account_id'], ['WorldStockAccount.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_world_transaction_user_id', 'WorldStockTransaction', ['user_id'])
    op.create_index('idx_world_transaction_symbol', 'WorldStockTransaction', ['symbol'])
    op.create_index('idx_world_transaction_date', 'WorldStockTransaction', ['transaction_date'])
    op.create_index('idx_world_transaction_account_id', 'WorldStockTransaction', ['account_id'])

    # Create WorldStockDividend table
    op.create_table(
        'WorldStockDividend',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('symbol', sa.String(length=20), nullable=False),
        sa.Column('isin', sa.String(length=20), nullable=True),
        sa.Column('payment_date', sa.Date(), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('amount_per_share', sa.Numeric(precision=15, scale=6), nullable=True),
        sa.Column('withholding_tax', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('net_amount', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('dividend_type', sa.String(length=50), nullable=True),
        sa.Column('currency', sa.String(length=3), nullable=True, server_default='USD'),
        sa.Column('source_pdf', sa.String(length=500), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['account_id'], ['WorldStockAccount.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_world_dividend_user_id', 'WorldStockDividend', ['user_id'])
    op.create_index('idx_world_dividend_symbol', 'WorldStockDividend', ['symbol'])
    op.create_index('idx_world_dividend_date', 'WorldStockDividend', ['payment_date'])
    op.create_index('idx_world_dividend_account_id', 'WorldStockDividend', ['account_id'])

    # Create WorldStockPerformance table
    op.create_table(
        'WorldStockPerformance',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=50), nullable=False),
        sa.Column('account_id', sa.Integer(), nullable=True),
        sa.Column('report_start_date', sa.Date(), nullable=True),
        sa.Column('report_end_date', sa.Date(), nullable=True),
        sa.Column('starting_nav', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('ending_nav', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_deposits', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_withdrawals', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_dividends', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_withholding_tax', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_commissions', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('total_fees', sa.Numeric(precision=15, scale=2), nullable=True),
        sa.Column('time_weighted_return', sa.Numeric(precision=10, scale=4), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.ForeignKeyConstraint(['account_id'], ['WorldStockAccount.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('idx_world_performance_user_id', 'WorldStockPerformance', ['user_id'])
    op.create_index('idx_world_performance_account_id', 'WorldStockPerformance', ['account_id'])


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_index('idx_world_performance_account_id', table_name='WorldStockPerformance')
    op.drop_index('idx_world_performance_user_id', table_name='WorldStockPerformance')
    op.drop_table('WorldStockPerformance')
    
    op.drop_index('idx_world_dividend_account_id', table_name='WorldStockDividend')
    op.drop_index('idx_world_dividend_date', table_name='WorldStockDividend')
    op.drop_index('idx_world_dividend_symbol', table_name='WorldStockDividend')
    op.drop_index('idx_world_dividend_user_id', table_name='WorldStockDividend')
    op.drop_table('WorldStockDividend')
    
    op.drop_index('idx_world_transaction_account_id', table_name='WorldStockTransaction')
    op.drop_index('idx_world_transaction_date', table_name='WorldStockTransaction')
    op.drop_index('idx_world_transaction_symbol', table_name='WorldStockTransaction')
    op.drop_index('idx_world_transaction_user_id', table_name='WorldStockTransaction')
    op.drop_table('WorldStockTransaction')
    
    op.drop_index('idx_world_holding_account_id', table_name='WorldStockHolding')
    op.drop_index('idx_world_holding_symbol', table_name='WorldStockHolding')
    op.drop_index('idx_world_holding_user_id', table_name='WorldStockHolding')
    op.drop_table('WorldStockHolding')
    
    op.drop_index('idx_world_account_number', table_name='WorldStockAccount')
    op.drop_index('idx_world_account_user_id', table_name='WorldStockAccount')
    op.drop_table('WorldStockAccount')
