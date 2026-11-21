import os
from logging.config import fileConfig

from sqlalchemy import create_engine, pool

from alembic import context
from configuracao.configuracoes import Configuracoes
from infraestrutura.postgres import modelos as _modelos_postgres  # noqa: F401
from infraestrutura.postgres.base import BaseRelacional

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = BaseRelacional.metadata


def _resolver_url_banco() -> str:
    url_configurada = config.get_main_option("sqlalchemy.url")
    if url_configurada:
        return url_configurada
    url_ambiente = os.getenv("LUME_ALEMBIC_URL")
    if url_ambiente:
        return url_ambiente
    url_settings = Configuracoes().postgres_url
    if url_settings:
        return url_settings
    raise RuntimeError(
        "URL do PostgreSQL nao informada para o Alembic "
        "(defina LUME_POSTGRES_URL ou LUME_ALEMBIC_URL)."
    )


def run_migrations_offline() -> None:
    url = _resolver_url_banco()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    engine = create_engine(_resolver_url_banco(), poolclass=pool.NullPool)
    try:
        with engine.connect() as conexao:
            context.configure(connection=conexao, target_metadata=target_metadata)
            with context.begin_transaction():
                context.run_migrations()
    finally:
        engine.dispose()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
