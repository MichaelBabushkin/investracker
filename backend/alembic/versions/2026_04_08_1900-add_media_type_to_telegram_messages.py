"""add_media_type_to_telegram_messages

Revision ID: e9f0a1b2c3d4
Revises: 321a1ffd1d09
Create Date: 2026-04-08 19:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

revision = 'e9f0a1b2c3d4'
down_revision = '321a1ffd1d09'
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
    if not _column_exists("telegram_messages", "media_type"):
        op.add_column("telegram_messages", sa.Column("media_type", sa.String(20), nullable=True))


def downgrade():
    op.drop_column("telegram_messages", "media_type")
