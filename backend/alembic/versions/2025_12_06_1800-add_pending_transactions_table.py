"""add pending transactions table

Revision ID: pending_transactions_001
Revises: 
Create Date: 2025-12-06 18:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = 'pending_transactions_001'
down_revision = '2d0c4f7eb166'  # add_user_role_column
branch_labels = None
depends_on = None


def upgrade():
    # Create pending transactions table
    op.create_table(
        'PendingIsraeliTransaction',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(), nullable=False),
        sa.Column('upload_batch_id', sa.String(), nullable=False),  # Group transactions from same PDF
        sa.Column('pdf_filename', sa.String(), nullable=True),
        
        # Transaction details
        sa.Column('transaction_date', sa.String(), nullable=True),
        sa.Column('security_no', sa.String(), nullable=True),
        sa.Column('stock_name', sa.String(), nullable=True),
        sa.Column('transaction_type', sa.String(), nullable=False),  # BUY, SELL, DIVIDEND
        sa.Column('quantity', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('price', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('amount', sa.Numeric(precision=15, scale=4), nullable=True),
        sa.Column('currency', sa.String(), nullable=True),
        
        # Status and review
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),  # pending, approved, rejected, modified
        sa.Column('review_notes', sa.String(), nullable=True),
        sa.Column('reviewed_at', sa.DateTime(), nullable=True),
        sa.Column('reviewed_by', sa.String(), nullable=True),
        
        # Metadata
        sa.Column('raw_data', postgresql.JSON(), nullable=True),  # Store original extracted data
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(), nullable=True),
        
        sa.PrimaryKeyConstraint('id'),
        sa.Index('idx_pending_user_id', 'user_id'),
        sa.Index('idx_pending_batch_id', 'upload_batch_id'),
        sa.Index('idx_pending_status', 'status'),
    )


def downgrade():
    op.drop_table('PendingIsraeliTransaction')
