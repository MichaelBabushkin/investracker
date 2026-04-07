"""add_telegram_tables

Revision ID: 486a9551648c
Revises: 2026_04_03_1100
Create Date: 2026-04-06 23:41:34

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy import text, inspect


# revision identifiers, used by Alembic.
revision: str = '486a9551648c'
down_revision: Union[str, None] = '2026_04_03_1100'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _table_exists(table: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = :t)"),
        {"t": table}
    )
    return result.scalar()


def _index_exists(index: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = :i)"),
        {"i": index}
    )
    return result.scalar()


def upgrade() -> None:
    if not _table_exists('telegram_channels'):
        op.create_table(
            'telegram_channels',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('username', sa.String(length=100), nullable=False),
            sa.Column('title', sa.String(length=255), nullable=True),
            sa.Column('description', sa.Text(), nullable=True),
            sa.Column('logo_url', sa.String(length=500), nullable=True),
            sa.Column('language', sa.String(length=5), nullable=True),
            sa.Column('category', sa.String(length=50), nullable=True),
            sa.Column('is_active', sa.Boolean(), nullable=False),
            sa.Column('subscriber_count', sa.Integer(), nullable=True),
            sa.Column('last_synced_at', sa.DateTime(timezone=True), nullable=True),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('username'),
        )
    if not _index_exists('ix_telegram_channels_id'):
        op.create_index(op.f('ix_telegram_channels_id'), 'telegram_channels', ['id'], unique=False)
    if not _index_exists('ix_telegram_channels_username'):
        op.create_index(op.f('ix_telegram_channels_username'), 'telegram_channels', ['username'], unique=True)

    if not _table_exists('user_telegram_subscriptions'):
        op.create_table(
            'user_telegram_subscriptions',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('user_id', sa.String(length=25), nullable=False),
            sa.Column('channel_id', sa.Integer(), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['channel_id'], ['telegram_channels.id'], ondelete='CASCADE'),
            sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('user_id', 'channel_id', name='uq_user_channel_subscription'),
        )
    if not _index_exists('ix_user_telegram_subscriptions_id'):
        op.create_index(op.f('ix_user_telegram_subscriptions_id'), 'user_telegram_subscriptions', ['id'], unique=False)

    if not _table_exists('telegram_messages'):
        op.create_table(
            'telegram_messages',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('channel_id', sa.Integer(), nullable=False),
            sa.Column('message_id', sa.Integer(), nullable=False),
            sa.Column('text', sa.Text(), nullable=True),
            sa.Column('media_url', sa.String(length=1000), nullable=True),
            sa.Column('posted_at', sa.DateTime(timezone=True), nullable=False),
            sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=True),
            sa.ForeignKeyConstraint(['channel_id'], ['telegram_channels.id'], ondelete='CASCADE'),
            sa.PrimaryKeyConstraint('id'),
            sa.UniqueConstraint('channel_id', 'message_id', name='uq_channel_message'),
        )
    if not _index_exists('ix_telegram_messages_channel_id'):
        op.create_index(op.f('ix_telegram_messages_channel_id'), 'telegram_messages', ['channel_id'], unique=False)
    if not _index_exists('ix_telegram_messages_id'):
        op.create_index(op.f('ix_telegram_messages_id'), 'telegram_messages', ['id'], unique=False)
    if not _index_exists('ix_telegram_messages_posted_at'):
        op.create_index(op.f('ix_telegram_messages_posted_at'), 'telegram_messages', ['posted_at'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_telegram_messages_posted_at'), table_name='telegram_messages')
    op.drop_index(op.f('ix_telegram_messages_id'), table_name='telegram_messages')
    op.drop_index(op.f('ix_telegram_messages_channel_id'), table_name='telegram_messages')
    op.drop_table('telegram_messages')
    op.drop_index(op.f('ix_user_telegram_subscriptions_id'), table_name='user_telegram_subscriptions')
    op.drop_table('user_telegram_subscriptions')
    op.drop_index(op.f('ix_telegram_channels_username'), table_name='telegram_channels')
    op.drop_index(op.f('ix_telegram_channels_id'), table_name='telegram_channels')
    op.drop_table('telegram_channels')
