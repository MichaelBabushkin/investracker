"""add_israeli_report_uploads_table

Revision ID: b06206cd81a2
Revises: 982a4aab342a
Create Date: 2025-12-13 19:28:21.922806

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'b06206cd81a2'
down_revision = '982a4aab342a'
branch_labels = None
depends_on = None


def upgrade():
    # Create IsraeliReportUpload table
    op.create_table(
        'IsraeliReportUpload',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('filename', sa.String(), nullable=False),
        sa.Column('file_data', sa.LargeBinary(), nullable=False),
        sa.Column('file_size', sa.Integer(), nullable=False),
        sa.Column('broker', sa.String(), nullable=False, server_default='excellence'),
        sa.Column('upload_batch_id', sa.String(), nullable=False),
        sa.Column('upload_date', sa.DateTime(), nullable=False, server_default=sa.text('CURRENT_TIMESTAMP')),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes
    op.create_index('idx_user_upload_date', 'IsraeliReportUpload', ['user_id', 'upload_date'])
    op.create_index('idx_batch_id', 'IsraeliReportUpload', ['upload_batch_id'])
    op.create_index(op.f('ix_IsraeliReportUpload_id'), 'IsraeliReportUpload', ['id'], unique=False)
    op.create_index(op.f('ix_IsraeliReportUpload_user_id'), 'IsraeliReportUpload', ['user_id'], unique=False)
    op.create_index(op.f('ix_IsraeliReportUpload_upload_batch_id'), 'IsraeliReportUpload', ['upload_batch_id'], unique=False)


def downgrade():
    # Drop indexes
    op.drop_index(op.f('ix_IsraeliReportUpload_upload_batch_id'), table_name='IsraeliReportUpload')
    op.drop_index(op.f('ix_IsraeliReportUpload_user_id'), table_name='IsraeliReportUpload')
    op.drop_index(op.f('ix_IsraeliReportUpload_id'), table_name='IsraeliReportUpload')
    op.drop_index('idx_batch_id', table_name='IsraeliReportUpload')
    op.drop_index('idx_user_upload_date', table_name='IsraeliReportUpload')
    
    # Drop table
    op.drop_table('IsraeliReportUpload')
