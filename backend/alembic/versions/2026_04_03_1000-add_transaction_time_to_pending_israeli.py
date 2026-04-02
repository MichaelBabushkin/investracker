"""Add transaction_time to pending_israeli_transactions

Revision ID: 2026_04_03_1000
Revises: 2026_04_02_1200
Create Date: 2026-04-03 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_03_1000'
down_revision = '2026_04_02_1200'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    from alembic import op as _op
    bind = _op.get_bind()
    existing = [c['name'] for c in inspect(bind).get_columns('pending_israeli_transactions')]
    if 'transaction_time' not in existing:
        op.add_column('pending_israeli_transactions', sa.Column('transaction_time', sa.String(), nullable=True))


def downgrade():
    op.drop_column('pending_israeli_transactions', 'transaction_time')
