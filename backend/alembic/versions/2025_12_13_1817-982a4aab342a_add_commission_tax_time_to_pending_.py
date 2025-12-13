"""add_commission_tax_time_to_pending_transactions

Revision ID: 982a4aab342a
Revises: pending_transactions_001
Create Date: 2025-12-13 18:17:02.886710

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '982a4aab342a'
down_revision = 'pending_transactions_001'
branch_labels = None
depends_on = None


def upgrade():
    # Add transaction_time, commission, and tax columns to PendingIsraeliTransaction
    op.add_column('PendingIsraeliTransaction', 
                  sa.Column('transaction_time', sa.String(), nullable=True))
    op.add_column('PendingIsraeliTransaction', 
                  sa.Column('commission', sa.Numeric(precision=15, scale=4), nullable=True))
    op.add_column('PendingIsraeliTransaction', 
                  sa.Column('tax', sa.Numeric(precision=15, scale=4), nullable=True))


def downgrade():
    # Remove the added columns
    op.drop_column('PendingIsraeliTransaction', 'tax')
    op.drop_column('PendingIsraeliTransaction', 'commission')
    op.drop_column('PendingIsraeliTransaction', 'transaction_time')
