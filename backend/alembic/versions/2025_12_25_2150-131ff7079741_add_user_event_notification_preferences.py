"""add_user_event_notification_preferences

Revision ID: 131ff7079741
Revises: 1cacac0c44b0
Create Date: 2025-12-25 21:50:03.004959

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '131ff7079741'
down_revision = '1cacac0c44b0'
branch_labels = None
depends_on = None


def upgrade():
    # Create user_event_notification_preferences table
    op.create_table(
        'user_event_notification_preferences',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('user_id', sa.String(length=255), nullable=False),
        sa.Column('notify_markets', sa.JSON(), nullable=False, server_default='["US", "IL"]'),  # List of markets
        sa.Column('notify_event_types', sa.JSON(), nullable=False, server_default='["MARKET_CLOSED", "EARLY_CLOSE", "EARNINGS", "ECONOMIC_DATA", "FOMC", "HOLIDAY"]'),  # List of event types
        sa.Column('notify_days_before', sa.Integer(), nullable=False, server_default='1'),  # Days before event to notify
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE')
    )
    
    # Create unique index on user_id
    op.create_index('ix_user_event_prefs_user_id', 'user_event_notification_preferences', ['user_id'], unique=True)


def downgrade():
    op.drop_index('ix_user_event_prefs_user_id', table_name='user_event_notification_preferences')
    op.drop_table('user_event_notification_preferences')
