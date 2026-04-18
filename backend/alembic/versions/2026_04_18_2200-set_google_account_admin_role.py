"""Set mishaba1990@gmail.com Google account to ADMIN role

Revision ID: a1b2c3d4e5f6
Revises: f5a6b7c8d9e0
Create Date: 2026-04-18 22:00:00.000000

The Google SSO flow created a new account for mishaba1990@gmail.com instead
of linking to the existing admin account (different email). This migration
sets that account to ADMIN so the admin panel is accessible via Google login.
"""
from alembic import op
from sqlalchemy.sql import text

revision = 'g6h7i8j9k0l1'
down_revision = 'f5a6b7c8d9e0'
branch_labels = None
depends_on = None


def upgrade():
    op.get_bind().execute(
        text("UPDATE users SET role = 'ADMIN' WHERE email = 'mishaba1990@gmail.com'")
    )


def downgrade():
    op.get_bind().execute(
        text("UPDATE users SET role = 'USER' WHERE email = 'mishaba1990@gmail.com'")
    )
