import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# 1. Import your models and settings
from app.core.config import settings
from app.db.Models import Base # This must import ALL models to track changes

# 2. This is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# 3. Interpret the config file for Python logging.
# This line sets up loggers basically.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# 4. Set the target metadata for 'autogenerate' support
target_metadata = Base.metadata

# 5. We bypass set_main_option to avoid "interpolation" errors with passwords containing '%' (e.g., %40)
# config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = settings.DATABASE_URL
    
    # asyncpg doesn't support 'sslmode' in the connection string.
    if "postgresql+asyncpg" in url and "sslmode=" in url:
        import re
        url = re.sub(r"(\?|&)sslmode=[^&]*", "", url)
        url = url.replace("?&", "?").rstrip("?").rstrip("&")

    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)

    with context.begin_transaction():
        context.run_migrations()


async def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    url = settings.DATABASE_URL
    connect_args = {}
    
    # asyncpg doesn't support 'sslmode' in the connection string.
    if "postgresql+asyncpg" in url and "sslmode=" in url:
        import re
        # If sslmode is require or similar, we enable SSL in connect_args
        if "sslmode=require" in url or "sslmode=verify-full" in url or "sslmode=verify-ca" in url:
            connect_args["ssl"] = True
        
        # Strip sslmode from the URL query string
        url = re.sub(r"(\?|&)sslmode=[^&]*", "", url)
        # Clean up potential trailing '?' or '&'
        url = url.replace("?&", "?").rstrip("?").rstrip("&")

    # We pass the URL directly to async_engine_from_config to avoid '%' interpolation errors
    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        url=url,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args=connect_args
    )

    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)

    await connectable.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    asyncio.run(run_migrations_online())
