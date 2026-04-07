"""categories_json

Revision ID: 7f430f9ded13
Revises: 2026_04_07_1200
Create Date: 2026-04-07 20:06:13.440206

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text
import json


# revision identifiers, used by Alembic.
revision = '7f430f9ded13'
down_revision = '2026_04_07_1200'
branch_labels = None
depends_on = None


def _column_exists(table: str, column: str) -> bool:
    conn = op.get_bind()
    result = conn.execute(
        text("SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = :t AND column_name = :c)"),
        {"t": table, "c": column}
    )
    return result.scalar()


def upgrade():
    conn = op.get_bind()

    # 1. Add 'categories' column if missing
    if not _column_exists("telegram_channels", "categories"):
        op.add_column("telegram_channels", sa.Column("categories", sa.JSON(), nullable=True))

    # 2. Migrate data from 'category' → 'categories' (only if 'category' still exists)
    if _column_exists("telegram_channels", "category"):
        result = conn.execute(sa.text("SELECT id, category FROM telegram_channels"))
        for row in result:
            categories = json.dumps([row.category] if row.category else ["general"])
            conn.execute(
                sa.text("UPDATE telegram_channels SET categories = :categories WHERE id = :id"),
                {"categories": categories, "id": row.id}
            )
        # 3. Drop old 'category' column
        with op.batch_alter_table("telegram_channels") as batch_op:
            batch_op.drop_column("category")


def downgrade():
    with op.batch_alter_table("telegram_channels") as batch_op:
        batch_op.add_column(sa.Column("category", sa.String(50), server_default="general"))
    
    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT id, categories FROM telegram_channels"))
    import json
    for row in result:
        cats = json.loads(row.categories) if row.categories else []
        category = cats[0] if cats else "general"
        connection.execute(
            sa.text("UPDATE telegram_channels SET category = :cat WHERE id = :id"),
            {"cat": category, "id": row.id}
        )
        
    with op.batch_alter_table("telegram_channels") as batch_op:
        batch_op.drop_column("categories")
