"""add_calendar_events_table

Revision ID: 1cacac0c44b0
Revises: 31b6043201ce
Create Date: 2025-12-25 21:33:06.920586

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import ENUM


# revision identifiers, used by Alembic.
revision = '1cacac0c44b0'
down_revision = '31b6043201ce'
branch_labels = None
depends_on = None


def upgrade():
    # Create enum for event types if it doesn't exist
    event_type_enum = ENUM('MARKET_CLOSED', 'EARLY_CLOSE', 'EARNINGS', 'ECONOMIC_DATA', 'FOMC', 'HOLIDAY', name='event_type', create_type=False)
    
    # Try to create the enum type first
    conn = op.get_bind()
    result = conn.execute(sa.text("SELECT 1 FROM pg_type WHERE typname = 'event_type'"))
    if not result.scalar():
        event_type_enum.create(conn, checkfirst=True)
    
    # Create calendar_events table
    op.create_table(
        'calendar_events',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('event_type', event_type_enum, nullable=False),
        sa.Column('market', sa.String(length=10), nullable=False),  # 'US', 'IL', etc.
        sa.Column('event_name', sa.String(length=255), nullable=False),
        sa.Column('event_date', sa.Date(), nullable=False),
        sa.Column('early_close_time', sa.Time(), nullable=True),  # For early close events
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    
    # Create indexes for efficient querying
    op.create_index('ix_calendar_events_event_date', 'calendar_events', ['event_date'])
    op.create_index('ix_calendar_events_market', 'calendar_events', ['market'])
    op.create_index('ix_calendar_events_event_type', 'calendar_events', ['event_type'])


def downgrade():
    op.drop_index('ix_calendar_events_event_type', table_name='calendar_events')
    op.drop_index('ix_calendar_events_market', table_name='calendar_events')
    op.drop_index('ix_calendar_events_event_date', table_name='calendar_events')
    op.drop_table('calendar_events')
    op.execute('DROP TYPE event_type')
