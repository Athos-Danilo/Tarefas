from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from infraestrutura.postgres.politica_loop import configurar_loop_assincrono_windows


def normalizar_url_postgres(url_conexao: str) -> str:
    """Garante prefixo postgresql+psycopg:// mesmo quando a nuvem fornece postgres:// ou postgresql://."""
    url_limpa = url_conexao.strip()
    if url_limpa.startswith("postgres://"):
        return "postgresql+psycopg://" + url_limpa.removeprefix("postgres://")
    if url_limpa.startswith("postgresql://"):
        return "postgresql+psycopg://" + url_limpa.removeprefix("postgresql://")
    return url_limpa


class FabricaPostgres:
    """Gerencia o engine assincrono e a abertura de sessoes SQLAlchemy para PostgreSQL."""

    def __init__(self, url_conexao: str, timeout_conexao_seg: int = 2) -> None:
        configurar_loop_assincrono_windows()
        self._engine: AsyncEngine = create_async_engine(
            normalizar_url_postgres(url_conexao),
            pool_pre_ping=True,
            connect_args={"connect_timeout": timeout_conexao_seg},
        )
        self._fabrica_sessao: async_sessionmaker[AsyncSession] = async_sessionmaker(
            self._engine,
            expire_on_commit=False,
        )

    @asynccontextmanager
    async def obter_sessao(self) -> AsyncIterator[AsyncSession]:
        async with self._fabrica_sessao() as sessao:
            yield sessao

    async def verificar_conexao(self) -> bool:
        try:
            async with self._engine.connect() as conexao:
                await conexao.execute(text("SELECT 1"))
            return True
        except (SQLAlchemyError, OSError, TimeoutError):
            return False

    async def fechar(self) -> None:
        await self._engine.dispose()
