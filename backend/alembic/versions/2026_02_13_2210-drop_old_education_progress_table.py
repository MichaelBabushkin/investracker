"""drop_old_education_progress_table

Revision ID: 2026_02_13_2210
Revises: 2026_02_13_2200
Create Date: 2026-02-13 22:10:00.000000

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '2026_02_13_2210'
down_revision = '2026_02_13_2200'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Drop old table if it exists (with IF EXISTS to avoid errors)
    op.execute('DROP TABLE IF EXISTS education_progress')


def downgrade() -> None:
    # Can't recreate the old table since we're moving to new naming
    pass
