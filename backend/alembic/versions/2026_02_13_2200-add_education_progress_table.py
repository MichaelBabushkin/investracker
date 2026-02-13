"""add_education_progress_table

Revision ID: 2026_02_13_2200
Revises: 2026_02_07_1930
Create Date: 2026-02-13 22:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSON

# revision identifiers, used by Alembic.
revision = '2026_02_13_2200'
down_revision = '2026_02_07_1930'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create education_progress table
    op.create_table(
        'education_progress',
        sa.Column('user_id', sa.String(25), primary_key=True, index=True),
        sa.Column('completed_topics', JSON, nullable=False, server_default='[]'),
        sa.Column('last_visited_topic', sa.String(100), nullable=True),
        sa.Column('quiz_scores', JSON, nullable=False, server_default='{}'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), onupdate=sa.func.now(), nullable=True)
    )


def downgrade() -> None:
    op.drop_table('education_progress')
