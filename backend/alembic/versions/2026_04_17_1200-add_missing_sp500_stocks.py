"""Add 11 missing S&P 500 stocks to world_stocks catalog

Revision ID: f5a6b7c8d9e0
Revises: e4f5a6b7c8d9
Create Date: 2026-04-17 12:00:00.000000

Inserts AAPL, APP, BF-B, BRK-B, CASY, FISV, HOOD, IBKR, LITE, SATS, SNDK
which were present in the S&P 500 but missing from the world_stocks catalog.
Idempotent — uses ON CONFLICT DO NOTHING via INSERT … WHERE NOT EXISTS.
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.sql import text


revision = 'f5a6b7c8d9e0'
down_revision = 'e4f5a6b7c8d9'
branch_labels = None
depends_on = None


STOCKS = [
    ('AAPL',  'Apple Inc.',           'Information Technology', 'NYSE', 'USD', 'US'),
    ('APP',   'AppLovin',             'Information Technology', 'NYSE', 'USD', 'US'),
    ('BF-B',  'Brown–Forman',         'Consumer Staples',       'NYSE', 'USD', 'US'),
    ('BRK-B', 'Berkshire Hathaway',   'Financials',             'NYSE', 'USD', 'US'),
    ('CASY',  "Casey's",              'Consumer Staples',       'NYSE', 'USD', 'US'),
    ('FISV',  'Fiserv',               'Financials',             'NYSE', 'USD', 'US'),
    ('HOOD',  'Robinhood Markets',    'Financials',             'NYSE', 'USD', 'US'),
    ('IBKR',  'Interactive Brokers',  'Financials',             'NYSE', 'USD', 'US'),
    ('LITE',  'Lumentum',             'Information Technology', 'NYSE', 'USD', 'US'),
    ('SATS',  'EchoStar',             'Communication Services', 'NYSE', 'USD', 'US'),
    ('SNDK',  'Sandisk',              'Information Technology', 'NYSE', 'USD', 'US'),
]


def upgrade():
    conn = op.get_bind()
    for ticker, company_name, sector, exchange, currency, country in STOCKS:
        conn.execute(
            text("""
                INSERT INTO world_stocks (ticker, company_name, sector, exchange, currency, country, is_active)
                SELECT :ticker, :company_name, :sector, :exchange, :currency, :country, true
                WHERE NOT EXISTS (SELECT 1 FROM world_stocks WHERE ticker = :ticker)
            """),
            {
                "ticker": ticker,
                "company_name": company_name,
                "sector": sector,
                "exchange": exchange,
                "currency": currency,
                "country": country,
            }
        )


def downgrade():
    conn = op.get_bind()
    tickers = [s[0] for s in STOCKS]
    # Only delete rows that have no associated transactions or holdings
    for ticker in tickers:
        conn.execute(
            text("""
                DELETE FROM world_stocks
                WHERE ticker = :ticker
                  AND NOT EXISTS (SELECT 1 FROM world_stock_transactions WHERE symbol = :ticker)
                  AND NOT EXISTS (SELECT 1 FROM world_stock_holdings  WHERE symbol = :ticker)
            """),
            {"ticker": ticker}
        )
