"""add_views_forwards_has_media_to_telegram_messages

Revision ID: 321a1ffd1d09
Revises: 7f430f9ded13
Create Date: 2026-04-08 16:51:10.600426

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '321a1ffd1d09'
down_revision = '7f430f9ded13'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name=:t AND column_name=:c)"),
        {"t": table, "c": column}
    )
    return result.scalar()


def upgrade():
    if not _column_exists("telegram_messages", "has_media"):
        op.add_column("telegram_messages", sa.Column("has_media", sa.Boolean(), nullable=True, server_default="false"))
    if not _column_exists("telegram_messages", "views"):
        op.add_column("telegram_messages", sa.Column("views", sa.Integer(), nullable=True))
    if not _column_exists("telegram_messages", "forwards"):
        op.add_column("telegram_messages", sa.Column("forwards", sa.Integer(), nullable=True))


def downgrade():
    op.drop_column("telegram_messages", "forwards")
    op.drop_column("telegram_messages", "views")
    op.drop_column("telegram_messages", "has_media")
