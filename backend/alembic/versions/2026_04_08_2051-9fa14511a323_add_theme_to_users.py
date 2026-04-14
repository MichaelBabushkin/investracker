"""add_theme_to_users

Revision ID: 9fa14511a323
Revises: e9f0a1b2c3d4
Create Date: 2026-04-08 20:51:47.351935

Rewritten to be fully idempotent — all index/column operations use
IF NOT EXISTS / IF EXISTS so it is safe to run regardless of what the
production DB already has.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = '9fa14511a323'
down_revision = 'e9f0a1b2c3d4'
branch_labels = None
depends_on = None


def _indexes(inspector, table):
    return {i['name'] for i in inspector.get_indexes(table)}


def _columns(inspector, table):
    return {c['name'] for c in inspector.get_columns(table)}


def _tables(inspector):
    return set(inspector.get_table_names())


def upgrade():
    conn = op.get_bind()
    insp = sa.inspect(conn)
    tables = _tables(insp)

    # ── Drop stock_prices (will be recreated idempotently by a later migration) ──
    if 'stock_prices' in tables:
        for idx in ['idx_stock_prices_market', 'idx_stock_prices_ticker', 'idx_stock_prices_updated']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS "{idx}"'))
        op.drop_table('stock_prices')

    # ── calendar_events ──
    if 'calendar_events' in tables:
        op.execute(sa.text(
            "CREATE INDEX IF NOT EXISTS ix_calendar_events_id ON calendar_events (id)"
        ))

    # ── education_progress ──
    if 'education_progress' in tables:
        conn.execute(sa.text('DROP INDEX IF EXISTS "ix_EducationProgress_user_id"'))
        op.execute(sa.text(
            "CREATE INDEX IF NOT EXISTS ix_education_progress_user_id ON education_progress (user_id)"
        ))

    # ── exchange_rates ──
    if 'exchange_rates' in tables:
        op.execute(sa.text(
            "CREATE INDEX IF NOT EXISTS ix_exchange_rates_id ON exchange_rates (id)"
        ))

    # ── israeli_dividends ──
    if 'israeli_dividends' in tables:
        for old in ['"ix_IsraeliDividend_id"', '"ix_IsraeliDividend_user_id"']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS {old}'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_dividends_id ON israeli_dividends (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_dividends_user_id ON israeli_dividends (user_id)"))

    # ── israeli_report_uploads ──
    if 'israeli_report_uploads' in tables:
        for old in ['"ix_IsraeliReportUpload_id"', '"ix_IsraeliReportUpload_upload_batch_id"', '"ix_IsraeliReportUpload_user_id"']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS {old}'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_report_uploads_id ON israeli_report_uploads (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_report_uploads_upload_batch_id ON israeli_report_uploads (upload_batch_id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_report_uploads_user_id ON israeli_report_uploads (user_id)"))

    # ── israeli_stock_holdings ──
    if 'israeli_stock_holdings' in tables:
        for old in ['"ix_IsraeliStockHolding_id"', '"ix_IsraeliStockHolding_user_id"']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS {old}'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stock_holdings_id ON israeli_stock_holdings (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stock_holdings_user_id ON israeli_stock_holdings (user_id)"))

    # ── israeli_stock_transactions ──
    if 'israeli_stock_transactions' in tables:
        for old in ['"ix_IsraeliStockTransaction_id"', '"ix_IsraeliStockTransaction_user_id"']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS {old}'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stock_transactions_id ON israeli_stock_transactions (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stock_transactions_user_id ON israeli_stock_transactions (user_id)"))

    # ── israeli_stocks ──
    if 'israeli_stocks' in tables:
        for old in ['"ix_IsraeliStocks_id"', '"ix_IsraeliStocks_security_no"', '"ix_IsraeliStocks_symbol"', '"ix_israelistocks_yfinance_ticker"']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS {old}'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stocks_id ON israeli_stocks (id)"))
        op.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_israeli_stocks_security_no ON israeli_stocks (security_no)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stocks_symbol ON israeli_stocks (symbol)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_israeli_stocks_yfinance_ticker ON israeli_stocks (yfinance_ticker)"))

    # ── pending_israeli_transactions ──
    if 'pending_israeli_transactions' in tables:
        for old in ['"ix_PendingIsraeliTransaction_id"', '"ix_PendingIsraeliTransaction_upload_batch_id"', '"ix_PendingIsraeliTransaction_user_id"']:
            conn.execute(sa.text(f'DROP INDEX IF EXISTS {old}'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_pending_israeli_transactions_id ON pending_israeli_transactions (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_pending_israeli_transactions_upload_batch_id ON pending_israeli_transactions (upload_batch_id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_pending_israeli_transactions_user_id ON pending_israeli_transactions (user_id)"))

    # ── pending_world_transactions ──
    if 'pending_world_transactions' in tables:
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_pending_world_transactions_id ON pending_world_transactions (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_pending_world_transactions_upload_batch_id ON pending_world_transactions (upload_batch_id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_pending_world_transactions_user_id ON pending_world_transactions (user_id)"))

    # ── user_event_notification_preferences ──
    if 'user_event_notification_preferences' in tables:
        conn.execute(sa.text('DROP INDEX IF EXISTS "ix_user_event_prefs_user_id"'))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_user_event_notification_preferences_id ON user_event_notification_preferences (id)"))
        op.execute(sa.text("CREATE UNIQUE INDEX IF NOT EXISTS ix_user_event_notification_preferences_user_id ON user_event_notification_preferences (user_id)"))

    # ── users: add theme column ──
    if 'theme' not in _columns(insp, 'users'):
        op.add_column('users', sa.Column('theme', sa.String(length=50), nullable=True))

    # ── world_dividends ──
    if 'world_dividends' in tables:
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_dividends_id ON world_dividends (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_dividends_user_id ON world_dividends (user_id)"))

    # ── world_stock_holdings ──
    if 'world_stock_holdings' in tables:
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stock_holdings_id ON world_stock_holdings (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stock_holdings_user_id ON world_stock_holdings (user_id)"))

    # ── world_stock_transactions ──
    # NOTE: do NOT drop realized_pl / cost_basis — a later migration re-adds them.
    if 'world_stock_transactions' in tables:
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stock_transactions_id ON world_stock_transactions (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stock_transactions_user_id ON world_stock_transactions (user_id)"))

    # ── world_stocks ──
    if 'world_stocks' in tables:
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stocks_exchange ON world_stocks (exchange)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stocks_id ON world_stocks (id)"))
        op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_world_stocks_ticker ON world_stocks (ticker)"))


def downgrade():
    # Minimal downgrade — just remove the theme column added here.
    conn = op.get_bind()
    insp = sa.inspect(conn)
    if 'theme' in _columns(insp, 'users'):
        op.drop_column('users', 'theme')
