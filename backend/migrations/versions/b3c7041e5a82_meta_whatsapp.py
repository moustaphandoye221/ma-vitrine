"""Optional Meta Pixel and WhatsApp contact per shop."""
from alembic import op
import sqlalchemy as sa

revision = 'b3c7041e5a82'
down_revision = '9c842e170b61'
branch_labels = None
depends_on = None

def upgrade():
    with op.batch_alter_table('shops') as batch:
        batch.add_column(sa.Column('meta_pixel_id',sa.String(30)))
        batch.add_column(sa.Column('whatsapp_number',sa.String(15)))

def downgrade():
    with op.batch_alter_table('shops') as batch:
        batch.drop_column('whatsapp_number')
        batch.drop_column('meta_pixel_id')
