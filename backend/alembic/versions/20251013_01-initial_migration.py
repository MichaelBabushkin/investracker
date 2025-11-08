"""initial migration

Revision ID: 20251013_01
Revises: 
Create Date: 2025-10-13 00:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '20251013_01'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # This is a placeholder migration representing the existing database state
    # before we started tracking migrations properly
    pass


def downgrade() -> None:
    pass
