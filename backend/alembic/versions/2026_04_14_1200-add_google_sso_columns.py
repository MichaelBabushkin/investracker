"""add_google_sso_columns

Revision ID: a1b2c3d4e5f6
Revises: 9fa14511a323
Create Date: 2026-04-14 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'c2d3e4f5a6b7'
down_revision = '9fa14511a323'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Make hashed_password nullable (Google users have no password)
    op.alter_column('users', 'hashed_password', nullable=True)

    # Add google_id column
    op.add_column('users', sa.Column('google_id', sa.String(255), nullable=True))
    op.create_index('ix_users_google_id', 'users', ['google_id'], unique=True)

    # Add oauth_provider column
    op.add_column('users', sa.Column('oauth_provider', sa.String(50), nullable=True))


def downgrade() -> None:
    op.drop_index('ix_users_google_id', table_name='users')
    op.drop_column('users', 'oauth_provider')
    op.drop_column('users', 'google_id')
    op.alter_column('users', 'hashed_password', nullable=False)
