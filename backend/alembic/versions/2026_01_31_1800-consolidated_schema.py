"""consolidated schema - clean 16 table structure

Revision ID: consolidated_v1
Revises: 
Create Date: 2026-01-31 18:00:00.000000

This migration represents the final clean schema with 16 tables:
- users
- IsraeliStocks, IsraeliStockHolding, IsraeliStockTransaction, IsraeliDividend
- IsraeliReportUpload, PendingIsraeliTransaction
- WorldStocks, WorldStockHolding, WorldStockTransaction, WorldDividend
- PendingWorldTransaction, ExchangeRate
- calendar_events, user_event_notification_preferences
- alembic_version (managed by alembic)
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'consolidated_v1'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Check if tables already exist before creating
    # This makes the migration idempotent
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    
    # Create UserRole enum if not exists
    userrole_enum = postgresql.ENUM('ADMIN', 'USER', 'VIEWER', name='userrole', create_type=False)
    userrole_enum.create(conn, checkfirst=True)
    
    # Create event_type enum if not exists
    event_type_enum = postgresql.ENUM('dividend', 'earnings', 'split', 'holiday', 'ex_dividend', 'other', name='event_type', create_type=False)
    event_type_enum.create(conn, checkfirst=True)
    
    # 1. users table
    if 'users' not in existing_tables:
        op.create_table('users',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('email', sa.String(), nullable=False),
            sa.Column('hashed_password', sa.String(), nullable=False),
            sa.Column('full_name', sa.String(), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=True, default=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.Column('role', userrole_enum, nullable=False, server_default='USER'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_users_email'), 'users', ['email'], unique=True)
        op.create_index(op.f('ix_users_id'), 'users', ['id'], unique=False)
    
    # 2. IsraeliStocks table
    if 'IsraeliStocks' not in existing_tables:
        op.create_table('IsraeliStocks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('symbol', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=True),
            sa.Column('sector', sa.String(), nullable=True),
            sa.Column('logo_url', sa.String(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_IsraeliStocks_id'), 'IsraeliStocks', ['id'], unique=False)
        op.create_index(op.f('ix_IsraeliStocks_symbol'), 'IsraeliStocks', ['symbol'], unique=True)
    
    # 3. IsraeliStockHolding table
    if 'IsraeliStockHolding' not in existing_tables:
        op.create_table('IsraeliStockHolding',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('stock_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('average_price', sa.Float(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['stock_id'], ['IsraeliStocks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_IsraeliStockHolding_id'), 'IsraeliStockHolding', ['id'], unique=False)
    
    # 4. IsraeliStockTransaction table
    if 'IsraeliStockTransaction' not in existing_tables:
        op.create_table('IsraeliStockTransaction',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('stock_id', sa.Integer(), nullable=False),
            sa.Column('transaction_type', sa.String(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('commission', sa.Float(), nullable=True, default=0),
            sa.Column('transaction_date', sa.Date(), nullable=False),
            sa.Column('transaction_time', sa.String(), nullable=True),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['stock_id'], ['IsraeliStocks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_IsraeliStockTransaction_id'), 'IsraeliStockTransaction', ['id'], unique=False)
    
    # 5. IsraeliDividend table
    if 'IsraeliDividend' not in existing_tables:
        op.create_table('IsraeliDividend',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('stock_id', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('tax', sa.Float(), nullable=True, default=0),
            sa.Column('payment_date', sa.Date(), nullable=False),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['stock_id'], ['IsraeliStocks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_IsraeliDividend_id'), 'IsraeliDividend', ['id'], unique=False)
    
    # 6. PendingIsraeliTransaction table
    if 'PendingIsraeliTransaction' not in existing_tables:
        op.create_table('PendingIsraeliTransaction',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('report_id', sa.Integer(), nullable=True),
            sa.Column('stock_symbol', sa.String(), nullable=False),
            sa.Column('stock_name', sa.String(), nullable=True),
            sa.Column('transaction_type', sa.String(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('commission', sa.Float(), nullable=True, default=0),
            sa.Column('tax', sa.Float(), nullable=True, default=0),
            sa.Column('transaction_date', sa.Date(), nullable=False),
            sa.Column('transaction_time', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=True, default='pending'),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_PendingIsraeliTransaction_id'), 'PendingIsraeliTransaction', ['id'], unique=False)
    
    # 7. IsraeliReportUpload table
    if 'IsraeliReportUpload' not in existing_tables:
        op.create_table('IsraeliReportUpload',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('filename', sa.String(), nullable=False),
            sa.Column('broker', sa.String(), nullable=True),
            sa.Column('upload_date', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.Column('status', sa.String(), nullable=True, default='pending'),
            sa.Column('transactions_count', sa.Integer(), nullable=True, default=0),
            sa.Column('error_message', sa.String(), nullable=True),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_IsraeliReportUpload_id'), 'IsraeliReportUpload', ['id'], unique=False)
    
    # 8. WorldStocks table
    if 'WorldStocks' not in existing_tables:
        op.create_table('WorldStocks',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('symbol', sa.String(), nullable=False),
            sa.Column('name', sa.String(), nullable=True),
            sa.Column('exchange', sa.String(), nullable=True),
            sa.Column('sector', sa.String(), nullable=True),
            sa.Column('industry', sa.String(), nullable=True),
            sa.Column('country', sa.String(), nullable=True),
            sa.Column('currency', sa.String(), nullable=True),
            sa.Column('logo_url', sa.String(), nullable=True),
            sa.Column('isin', sa.String(), nullable=True),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_WorldStocks_id'), 'WorldStocks', ['id'], unique=False)
        op.create_index(op.f('ix_WorldStocks_symbol'), 'WorldStocks', ['symbol'], unique=True)
    
    # 9. WorldStockHolding table
    if 'WorldStockHolding' not in existing_tables:
        op.create_table('WorldStockHolding',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('stock_id', sa.Integer(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('average_price', sa.Float(), nullable=False),
            sa.Column('currency', sa.String(), nullable=True, default='USD'),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['stock_id'], ['WorldStocks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_WorldStockHolding_id'), 'WorldStockHolding', ['id'], unique=False)
    
    # 10. WorldStockTransaction table
    if 'WorldStockTransaction' not in existing_tables:
        op.create_table('WorldStockTransaction',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('stock_id', sa.Integer(), nullable=False),
            sa.Column('transaction_type', sa.String(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('commission', sa.Float(), nullable=True, default=0),
            sa.Column('currency', sa.String(), nullable=True, default='USD'),
            sa.Column('transaction_date', sa.Date(), nullable=False),
            sa.Column('transaction_time', sa.String(), nullable=True),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['stock_id'], ['WorldStocks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_WorldStockTransaction_id'), 'WorldStockTransaction', ['id'], unique=False)
    
    # 11. WorldDividend table
    if 'WorldDividend' not in existing_tables:
        op.create_table('WorldDividend',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('stock_id', sa.Integer(), nullable=False),
            sa.Column('amount', sa.Float(), nullable=False),
            sa.Column('tax', sa.Float(), nullable=True, default=0),
            sa.Column('currency', sa.String(), nullable=True, default='USD'),
            sa.Column('payment_date', sa.Date(), nullable=False),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['stock_id'], ['WorldStocks.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_WorldDividend_id'), 'WorldDividend', ['id'], unique=False)
    
    # 12. PendingWorldTransaction table
    if 'PendingWorldTransaction' not in existing_tables:
        op.create_table('PendingWorldTransaction',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('report_id', sa.Integer(), nullable=True),
            sa.Column('stock_symbol', sa.String(), nullable=False),
            sa.Column('stock_name', sa.String(), nullable=True),
            sa.Column('world_stock_id', sa.Integer(), nullable=True),
            sa.Column('transaction_type', sa.String(), nullable=False),
            sa.Column('quantity', sa.Float(), nullable=False),
            sa.Column('price', sa.Float(), nullable=False),
            sa.Column('commission', sa.Float(), nullable=True, default=0),
            sa.Column('tax', sa.Float(), nullable=True, default=0),
            sa.Column('currency', sa.String(), nullable=True, default='USD'),
            sa.Column('transaction_date', sa.Date(), nullable=False),
            sa.Column('transaction_time', sa.String(), nullable=True),
            sa.Column('status', sa.String(), nullable=True, default='pending'),
            sa.Column('notes', sa.String(), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['world_stock_id'], ['WorldStocks.id'], ondelete='SET NULL'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_PendingWorldTransaction_id'), 'PendingWorldTransaction', ['id'], unique=False)
    
    # 13. ExchangeRate table
    if 'ExchangeRate' not in existing_tables:
        op.create_table('ExchangeRate',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('from_currency', sa.String(), nullable=False),
            sa.Column('to_currency', sa.String(), nullable=False),
            sa.Column('rate', sa.Float(), nullable=False),
            sa.Column('date', sa.Date(), nullable=False),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_ExchangeRate_id'), 'ExchangeRate', ['id'], unique=False)
    
    # 14. calendar_events table
    if 'calendar_events' not in existing_tables:
        op.create_table('calendar_events',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=True),
            sa.Column('stock_symbol', sa.String(), nullable=True),
            sa.Column('stock_name', sa.String(), nullable=True),
            sa.Column('event_type', event_type_enum, nullable=False),
            sa.Column('event_date', sa.Date(), nullable=False),
            sa.Column('title', sa.String(), nullable=False),
            sa.Column('description', sa.String(), nullable=True),
            sa.Column('is_global', sa.Boolean(), nullable=True, default=False),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_calendar_events_id'), 'calendar_events', ['id'], unique=False)
    
    # 15. user_event_notification_preferences table
    if 'user_event_notification_preferences' not in existing_tables:
        op.create_table('user_event_notification_preferences',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.Integer(), nullable=False),
            sa.Column('event_type', sa.String(), nullable=False),
            sa.Column('email_enabled', sa.Boolean(), nullable=True, default=True),
            sa.Column('push_enabled', sa.Boolean(), nullable=True, default=True),
            sa.Column('days_before', sa.Integer(), nullable=True, default=1),
            sa.Column('created_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.Column('updated_at', sa.DateTime(), nullable=True, server_default=sa.text('now()')),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id')
        )
        op.create_index(op.f('ix_user_event_notification_preferences_id'), 'user_event_notification_preferences', ['id'], unique=False)


def downgrade() -> None:
    # Drop tables in reverse order (respecting foreign keys)
    op.drop_table('user_event_notification_preferences')
    op.drop_table('calendar_events')
    op.drop_table('ExchangeRate')
    op.drop_table('PendingWorldTransaction')
    op.drop_table('WorldDividend')
    op.drop_table('WorldStockTransaction')
    op.drop_table('WorldStockHolding')
    op.drop_table('WorldStocks')
    op.drop_table('IsraeliReportUpload')
    op.drop_table('PendingIsraeliTransaction')
    op.drop_table('IsraeliDividend')
    op.drop_table('IsraeliStockTransaction')
    op.drop_table('IsraeliStockHolding')
    op.drop_table('IsraeliStocks')
    op.drop_table('users')
    
    # Drop enums
    op.execute("DROP TYPE IF EXISTS event_type")
    op.execute("DROP TYPE IF EXISTS userrole")
