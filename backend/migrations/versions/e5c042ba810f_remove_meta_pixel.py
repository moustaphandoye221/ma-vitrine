"""Remove Meta Pixel setting after product scope was reduced to WhatsApp."""
from alembic import op
import sqlalchemy as sa

revision='e5c042ba810f'
down_revision='b3c7041e5a82'
branch_labels=None
depends_on=None

def upgrade():
    with op.batch_alter_table('shops') as batch:
        batch.drop_column('meta_pixel_id')

def downgrade():
    with op.batch_alter_table('shops') as batch:
        batch.add_column(sa.Column('meta_pixel_id',sa.String(30)))
