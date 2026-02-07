"""merge_heads

Revision ID: dbe4296900c8
Revises: ef02295b00dd, add_price_columns
Create Date: 2026-02-07 17:50:55.295327

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'dbe4296900c8'
down_revision = ('ef02295b00dd', 'add_price_columns')
branch_labels = None
depends_on = None


def upgrade():
    pass


def downgrade():
    pass
