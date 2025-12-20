"""add unique constraint and cascade delete to israeli report upload

Revision ID: 31b6043201ce
Revises: b06206cd81a2
Create Date: 2025-12-20 16:01:07.259184

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '31b6043201ce'
down_revision = 'b06206cd81a2'
branch_labels = None
depends_on = None


def upgrade():
    # First, clean up duplicate PDFs (keep only the most recent upload for each user+filename combo)
    op.execute("""
        DELETE FROM "IsraeliReportUpload"
        WHERE id NOT IN (
            SELECT MAX(id)
            FROM "IsraeliReportUpload"
            GROUP BY user_id, filename
        )
    """)
    
    # Add foreign key constraint with CASCADE delete
    op.create_foreign_key(
        'fk_israeli_report_upload_user_id',
        'IsraeliReportUpload', 
        'users',
        ['user_id'], 
        ['id'],
        ondelete='CASCADE'
    )
    
    # Add unique constraint to prevent duplicate uploads (same user + filename)
    op.create_unique_constraint(
        'uq_user_filename',
        'IsraeliReportUpload',
        ['user_id', 'filename']
    )


def downgrade():
    # Remove unique constraint
    op.drop_constraint('uq_user_filename', 'IsraeliReportUpload', type_='unique')
    
    # Remove foreign key constraint
    op.drop_constraint('fk_israeli_report_upload_user_id', 'IsraeliReportUpload', type_='foreignkey')
