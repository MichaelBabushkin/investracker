"""change_transaction_time_to_string

Revision ID: 2025_11_08_1900
Revises: 2025_10_18_1730
Create Date: 2025-11-08 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2025_11_08_1900'
down_revision = '2025_10_18_1730'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Change transaction_time column from Time to String(20)
    op.alter_column(
        'WorldStockTransaction',
        'transaction_time',
        type_=sa.String(20),
        existing_type=sa.Time(),
        existing_nullable=True
    )


def downgrade() -> None:
    # Revert transaction_time column from String(20) back to Time
    op.alter_column(
        'WorldStockTransaction',
        'transaction_time',
        type_=sa.Time(),
        existing_type=sa.String(20),
        existing_nullable=True
    )
