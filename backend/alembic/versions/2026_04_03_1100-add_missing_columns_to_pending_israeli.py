"""Add commission, tax, transaction_time to pending_israeli_transactions

Revision ID: 2026_04_03_1100
Revises: 2026_04_03_1000
Create Date: 2026-04-03 11:00:00.000000

"""
from alembic import op
import sqlalchemy as sa

revision = '2026_04_03_1100'
down_revision = '2026_04_03_1000'
branch_labels = None
depends_on = None


def upgrade():
    from sqlalchemy import inspect
    from alembic import op as _op
    bind = _op.get_bind()
    existing = [c['name'] for c in inspect(bind).get_columns('pending_israeli_transactions')]

    new_cols = [
        ('commission',       sa.Column('commission', sa.Numeric(15, 4), nullable=True)),
        ('tax',              sa.Column('tax', sa.Numeric(15, 4), nullable=True)),
        ('transaction_time', sa.Column('transaction_time', sa.String(), nullable=True)),
    ]
    for col_name, col_def in new_cols:
        if col_name not in existing:
            op.add_column('pending_israeli_transactions', col_def)


def downgrade():
    op.drop_column('pending_israeli_transactions', 'tax')
    op.drop_column('pending_israeli_transactions', 'commission')
    op.drop_column('pending_israeli_transactions', 'transaction_time')
