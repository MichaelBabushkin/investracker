"""rename_and_enrich_world_stock_table

Revision ID: 2026_01_23_2100
Revises: 2026_01_23_1600
Create Date: 2026-01-23 21:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '2026_01_23_2100'
down_revision = '2026_01_23_1600'
branch_labels = None
depends_on = None


def upgrade():
    # Add new enrichment columns to WorldStock
    op.add_column('WorldStock', sa.Column('website', sa.String(length=255), nullable=True))
    op.add_column('WorldStock', sa.Column('full_time_employees', sa.Integer(), nullable=True))
    op.add_column('WorldStock', sa.Column('business_summary', sa.Text(), nullable=True))
    op.add_column('WorldStock', sa.Column('phone', sa.String(length=50), nullable=True))
    op.add_column('WorldStock', sa.Column('address', sa.String(length=255), nullable=True))
    op.add_column('WorldStock', sa.Column('city', sa.String(length=100), nullable=True))
    op.add_column('WorldStock', sa.Column('state', sa.String(length=50), nullable=True))
    op.add_column('WorldStock', sa.Column('zip_code', sa.String(length=20), nullable=True))
    
    # Rename table to WorldStocks (plural)
    op.rename_table('WorldStock', 'WorldStocks')


def downgrade():
    # Rename back to singular
    op.rename_table('WorldStocks', 'WorldStock')
    
    # Remove enrichment columns
    op.drop_column('WorldStock', 'zip_code')
    op.drop_column('WorldStock', 'state')
    op.drop_column('WorldStock', 'city')
    op.drop_column('WorldStock', 'address')
    op.drop_column('WorldStock', 'phone')
    op.drop_column('WorldStock', 'business_summary')
    op.drop_column('WorldStock', 'full_time_employees')
    op.drop_column('WorldStock', 'website')
