"""fix_prod_missing_columns

Adds any columns that exist in the SQLAlchemy models but may be missing on prod
due to the DB being initialised via create_all() instead of proper migrations.

All operations are idempotent (IF NOT EXISTS checks).

Revision ID: 2026_04_07_1200
Revises: 486a9551648c
Create Date: 2026-04-07 12:00:00
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect, text


revision: str = '2026_04_07_1200'
down_revision: Union[str, None] = '486a9551648c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _existing_columns(table: str) -> set:
    conn = op.get_bind()
    return {row[0] for row in conn.execute(
        text("SELECT column_name FROM information_schema.columns WHERE table_name = :t"),
        {"t": table}
    )}


def _add_if_missing(table: str, column: str, col_def):
    if column not in _existing_columns(table):
        op.add_column(table, sa.Column(column, col_def, nullable=True))


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"),
        {"t": table}
    )
    return result.scalar()


def upgrade() -> None:
    # ── world_stock_holdings ──────────────────────────────────────────────────
    if _table_exists("world_stock_holdings"):
        _add_if_missing("world_stock_holdings", "ticker",               sa.String(20))
        _add_if_missing("world_stock_holdings", "symbol",               sa.String(50))
        _add_if_missing("world_stock_holdings", "company_name",         sa.String(255))
        _add_if_missing("world_stock_holdings", "quantity",             sa.DECIMAL(18, 6))
        _add_if_missing("world_stock_holdings", "last_price",           sa.DECIMAL(18, 4))
        _add_if_missing("world_stock_holdings", "purchase_cost",        sa.DECIMAL(18, 2))
        _add_if_missing("world_stock_holdings", "current_value",        sa.DECIMAL(18, 2))
        _add_if_missing("world_stock_holdings", "portfolio_percentage", sa.DECIMAL(5, 2))
        _add_if_missing("world_stock_holdings", "currency",             sa.String(10))
        _add_if_missing("world_stock_holdings", "exchange_rate",        sa.DECIMAL(10, 4))
        _add_if_missing("world_stock_holdings", "holding_date",         sa.Date())
        _add_if_missing("world_stock_holdings", "unrealized_gain",      sa.DECIMAL(18, 4))
        _add_if_missing("world_stock_holdings", "unrealized_gain_pct",  sa.DECIMAL(10, 4))
        _add_if_missing("world_stock_holdings", "twr",                  sa.DECIMAL(10, 4))
        _add_if_missing("world_stock_holdings", "mwr",                  sa.DECIMAL(10, 4))
        _add_if_missing("world_stock_holdings", "source_pdf",           sa.String(255))
        _add_if_missing("world_stock_holdings", "created_at",           sa.DateTime())
        _add_if_missing("world_stock_holdings", "updated_at",           sa.DateTime())

    # ── world_stock_transactions ──────────────────────────────────────────────
    if _table_exists("world_stock_transactions"):
        _add_if_missing("world_stock_transactions", "ticker",           sa.String(20))
        _add_if_missing("world_stock_transactions", "symbol",           sa.String(50))
        _add_if_missing("world_stock_transactions", "company_name",     sa.String(255))
        _add_if_missing("world_stock_transactions", "transaction_type", sa.String(20))
        _add_if_missing("world_stock_transactions", "transaction_date", sa.Date())
        _add_if_missing("world_stock_transactions", "transaction_time", sa.String(10))
        _add_if_missing("world_stock_transactions", "quantity",         sa.DECIMAL(18, 6))
        _add_if_missing("world_stock_transactions", "price",            sa.DECIMAL(18, 4))
        _add_if_missing("world_stock_transactions", "total_value",      sa.DECIMAL(18, 2))
        _add_if_missing("world_stock_transactions", "commission",       sa.DECIMAL(18, 2))
        _add_if_missing("world_stock_transactions", "tax",              sa.DECIMAL(18, 2))
        _add_if_missing("world_stock_transactions", "currency",         sa.String(10))
        _add_if_missing("world_stock_transactions", "exchange_rate",    sa.DECIMAL(10, 4))
        _add_if_missing("world_stock_transactions", "source_pdf",       sa.String(255))
        _add_if_missing("world_stock_transactions", "realized_pl",      sa.DECIMAL(15, 4))
        _add_if_missing("world_stock_transactions", "cost_basis",       sa.DECIMAL(15, 4))
        _add_if_missing("world_stock_transactions", "created_at",       sa.DateTime())
        _add_if_missing("world_stock_transactions", "updated_at",       sa.DateTime())

    # ── world_dividends ───────────────────────────────────────────────────────
    if _table_exists("world_dividends"):
        _add_if_missing("world_dividends", "ticker",        sa.String(20))
        _add_if_missing("world_dividends", "symbol",        sa.String(50))
        _add_if_missing("world_dividends", "company_name",  sa.String(255))
        _add_if_missing("world_dividends", "payment_date",  sa.Date())
        _add_if_missing("world_dividends", "amount",        sa.DECIMAL(18, 4))
        _add_if_missing("world_dividends", "tax",           sa.DECIMAL(18, 4))
        _add_if_missing("world_dividends", "net_amount",    sa.DECIMAL(18, 4))
        _add_if_missing("world_dividends", "currency",      sa.String(10))
        _add_if_missing("world_dividends", "exchange_rate", sa.DECIMAL(10, 4))
        _add_if_missing("world_dividends", "source_pdf",    sa.String(255))
        _add_if_missing("world_dividends", "created_at",    sa.DateTime())
        _add_if_missing("world_dividends", "updated_at",    sa.DateTime())

    # ── stock_prices — ensure it exists (may be missing on some prod setups) ──
    if not _table_exists("stock_prices"):
        op.create_table(
            'stock_prices',
            sa.Column('id',           sa.Integer(),     nullable=False),
            sa.Column('ticker',       sa.String(20),    nullable=False),
            sa.Column('market',       sa.String(20),    nullable=True),
            sa.Column('current_price',sa.DECIMAL(18,4), nullable=True),
            sa.Column('last_price',   sa.DECIMAL(18,4), nullable=True),
            sa.Column('updated_at',   sa.DateTime(),    nullable=True),
            sa.Column('created_at',   sa.DateTime(),    nullable=True),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('idx_stock_prices_ticker', 'stock_prices', ['ticker'])
        op.create_index('idx_stock_prices_market', 'stock_prices', ['market'])


def downgrade() -> None:
    pass  # intentionally a no-op — this migration only adds columns, safe to leave
