"""add storage_key to report uploads + make file_data nullable

Revision ID: s3t4u5v6w7x8
Revises: r2s3t4u5v6w7
Create Date: 2026-07-22 10:00:00
"""
from alembic import op
import sqlalchemy as sa

revision = 's3t4u5v6w7x8'
down_revision = 'r2s3t4u5v6w7'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('israeli_report_uploads', sa.Column('storage_key', sa.String(), nullable=True))
    # PDF bytes now live in R2 (storage_key) OR inline (file_data); neither is mandatory
    op.alter_column('israeli_report_uploads', 'file_data',
                    existing_type=sa.LargeBinary(), nullable=True)


def downgrade():
    op.alter_column('israeli_report_uploads', 'file_data',
                    existing_type=sa.LargeBinary(), nullable=False)
    op.drop_column('israeli_report_uploads', 'storage_key')
