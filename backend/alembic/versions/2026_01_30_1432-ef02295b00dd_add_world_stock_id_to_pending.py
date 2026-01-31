"""add_world_stock_id_to_pending

Revision ID: ef02295b00dd
Revises: 2026_01_23_2100
Create Date: 2026-01-30 14:32:05.300489

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'ef02295b00dd'
down_revision = '2026_01_23_2100'
branch_labels = None
depends_on = None


def upgrade():
    # Add world_stock_id column to PendingWorldTransaction
    op.add_column('PendingWorldTransaction', 
                  sa.Column('world_stock_id', sa.Integer(), nullable=True))
    # Add foreign key constraint
    op.create_foreign_key(
        'fk_pending_world_transaction_world_stock',
        'PendingWorldTransaction', 'WorldStocks',
        ['world_stock_id'], ['id'],
        ondelete='SET NULL'
    )


def downgrade():
    # Remove foreign key and column
    op.drop_constraint('fk_pending_world_transaction_world_stock', 'PendingWorldTransaction', type_='foreignkey')
    op.drop_column('PendingWorldTransaction', 'world_stock_id')
