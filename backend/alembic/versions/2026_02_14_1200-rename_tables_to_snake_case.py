"""rename all PascalCase tables to snake_case

Standardize database table naming convention.
All 14 PascalCase tables renamed to snake_case with plural form,
matching PostgreSQL conventions and the 4 tables that were already
snake_case (users, calendar_events, user_event_notification_preferences).

Revision ID: 2026_02_14_1200
Revises: 2026_02_13_2210
Create Date: 2026-02-14 12:00:00.000000

"""
from alembic import op

# revision identifiers, used by Alembic.
revision = '2026_02_14_1200'
down_revision = '2026_02_13_2210'
branch_labels = None
depends_on = None

# Mapping: old PascalCase name -> new snake_case name
TABLE_RENAMES = [
    ("EducationProgress", "education_progress"),
    ("ExchangeRate", "exchange_rates"),
    ("IsraeliDividend", "israeli_dividends"),
    ("IsraeliReportUpload", "israeli_report_uploads"),
    ("IsraeliStockHolding", "israeli_stock_holdings"),
    ("IsraeliStockTransaction", "israeli_stock_transactions"),
    ("IsraeliStocks", "israeli_stocks"),
    ("PendingIsraeliTransaction", "pending_israeli_transactions"),
    ("PendingWorldTransaction", "pending_world_transactions"),
    ("StockPrices", "stock_prices"),
    ("WorldDividend", "world_dividends"),
    ("WorldStockHolding", "world_stock_holdings"),
    ("WorldStockTransaction", "world_stock_transactions"),
    ("WorldStocks", "world_stocks"),
]


def upgrade() -> None:
    for old_name, new_name in TABLE_RENAMES:
        op.rename_table(old_name, new_name)


def downgrade() -> None:
    for old_name, new_name in reversed(TABLE_RENAMES):
        op.rename_table(new_name, old_name)
