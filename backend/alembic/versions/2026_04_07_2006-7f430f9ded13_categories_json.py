"""categories_json

Revision ID: 7f430f9ded13
Revises: 2026_04_07_1200
Create Date: 2026-04-07 20:06:13.440206

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '7f430f9ded13'
down_revision = '2026_04_07_1200'
branch_labels = None
depends_on = None


import json

def upgrade():
    # 1. Add new column 'categories'
    op.add_column("telegram_channels", sa.Column("categories", sa.JSON(), nullable=True))
    
    # 2. Migrate existing data
    connection = op.get_bind()
    result = connection.execute(sa.text("SELECT id, category FROM telegram_channels"))
    for row in result:
        categories = json.dumps([row.category] if row.category else ["general"])
        connection.execute(
            sa.text("UPDATE telegram_channels SET categories = :categories WHERE id = :id"),
            {"categories": categories, "id": row.id}
        )
    
    # 3. Drop old 'category' column safely
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
