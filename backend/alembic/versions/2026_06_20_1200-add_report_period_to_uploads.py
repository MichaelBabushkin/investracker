"""add report_period to israeli_report_uploads

Revision ID: n3o4p5q6r7s8
Revises: h7i8j9k0l1m2
Create Date: 2026-06-20 12:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 'n3o4p5q6r7s8'
down_revision = 'h7i8j9k0l1m2'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('israeli_report_uploads',
        sa.Column('report_period_start', sa.Date(), nullable=True))
    op.add_column('israeli_report_uploads',
        sa.Column('report_period_end', sa.Date(), nullable=True))


def downgrade():
    op.drop_column('israeli_report_uploads', 'report_period_end')
    op.drop_column('israeli_report_uploads', 'report_period_start')
