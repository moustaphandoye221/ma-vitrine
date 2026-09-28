"""Storefront settings, product galleries and order status history."""
from alembic import op
import sqlalchemy as sa

revision = '3c91c206be42'
down_revision = '2de1af30b092'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('shops') as batch:
        batch.add_column(sa.Column('surface_theme', sa.String(20), nullable=False, server_default='blanc'))
        batch.add_column(sa.Column('hero_align', sa.String(20), nullable=False, server_default='gauche'))
        batch.add_column(sa.Column('hero_height', sa.String(20), nullable=False, server_default='standard'))
        batch.add_column(sa.Column('card_style', sa.String(20), nullable=False, server_default='doux'))
        batch.add_column(sa.Column('catalog_columns', sa.Integer(), nullable=False, server_default='3'))
    with op.batch_alter_table('products') as batch:
        batch.add_column(sa.Column('gallery_keys', sa.JSON(), nullable=False, server_default='[]'))
    op.create_table('order_events',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('shop_id', sa.String(36), sa.ForeignKey('shops.id'), nullable=False),
        sa.Column('order_id', sa.String(36), sa.ForeignKey('orders.id'), nullable=False),
        sa.Column('status', sa.String(30), nullable=False),
        sa.Column('payment_status', sa.String(20), nullable=False))
    op.create_index('ix_order_events_order_id', 'order_events', ['order_id'])

def downgrade():
    op.drop_index('ix_order_events_order_id', table_name='order_events')
    op.drop_table('order_events')
    with op.batch_alter_table('products') as batch:
        batch.drop_column('gallery_keys')
    with op.batch_alter_table('shops') as batch:
        for column in ('catalog_columns','card_style','hero_height','hero_align','surface_theme'):
            batch.drop_column(column)
