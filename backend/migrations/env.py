from alembic import context
from app.core.config import settings
from app.infrastructure.database import metadata, make_engine
if context.is_offline_mode():
    context.configure(url=settings().database_url,target_metadata=metadata,literal_binds=True)
    with context.begin_transaction(): context.run_migrations()
else:
    with make_engine(settings().database_url).connect() as connection:
        context.configure(connection=connection,target_metadata=metadata,render_as_batch=True)
        with context.begin_transaction(): context.run_migrations()
