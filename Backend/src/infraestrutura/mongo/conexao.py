from typing import Any

from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from infraestrutura.mongo.indices import garantir_indices_mongo


class GerenciadorMongo:
    """Gerencia o cliente AsyncMongoClient do PyMongo, ping e criacao de indices."""

    def __init__(self, url: str, nome_banco: str, timeout_ms: int = 2000) -> None:
        self._cliente: AsyncMongoClient[dict[str, Any]] = AsyncMongoClient(
            url,
            serverSelectionTimeoutMS=timeout_ms,
            connectTimeoutMS=timeout_ms,
            socketTimeoutMS=timeout_ms,
            tz_aware=True,
        )
        self._nome_banco = nome_banco

    def obter_banco(self) -> AsyncDatabase[dict[str, Any]]:
        return self._cliente[self._nome_banco]

    async def verificar_conexao(self) -> bool:
        try:
            await self._cliente.admin.command("ping")
            return True
        except (PyMongoError, OSError, TimeoutError):
            return False

    async def garantir_indices(self) -> None:
        await garantir_indices_mongo(self.obter_banco())

    async def fechar(self) -> None:
        await self._cliente.close()
