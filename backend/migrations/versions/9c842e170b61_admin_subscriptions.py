"""Admin-managed subscription records; billing is not automated."""
from alembic import op
import sqlalchemy as sa

revision = '9c842e170b61'
down_revision = '3c91c206be42'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('subscriptions',
        sa.Column('id', sa.String(36), primary_key=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('shop_id', sa.String(36), sa.ForeignKey('shops.id'), nullable=False, unique=True),
        sa.Column('plan', sa.String(20), nullable=False),
        sa.Column('billing_cycle', sa.String(20), nullable=False),
        sa.Column('status', sa.String(20), nullable=False),
        sa.Column('expires_at', sa.DateTime(timezone=True)),
        sa.Column('note', sa.String(500), nullable=False),
        sa.CheckConstraint("plan IN ('decouverte','boutique','studio')"),
        sa.CheckConstraint("billing_cycle IN ('none','monthly','annual')"),
        sa.CheckConstraint("status IN ('active','trial','past_due','canceled')"))

def downgrade():
    op.drop_table('subscriptions')
