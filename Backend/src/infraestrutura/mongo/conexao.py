import logging
from typing import Any

import certifi
from pymongo import AsyncMongoClient
from pymongo.asynchronous.database import AsyncDatabase
from pymongo.errors import PyMongoError

from infraestrutura.mongo.indices import garantir_indices_mongo

logger = logging.getLogger(__name__)


def montar_opcoes_cliente_mongo(url: str, timeout_ms: int) -> dict[str, Any]:
    """Monta opcoes de conexao para AsyncMongoClient, habilitando CA certifi em SRV/TLS."""
    url_limpa = url.strip()
    opcoes: dict[str, Any] = {
        "serverSelectionTimeoutMS": timeout_ms,
        "connectTimeoutMS": timeout_ms,
        "socketTimeoutMS": timeout_ms,
        "tz_aware": True,
    }
    url_minuscula = url_limpa.lower()
    if (
        url_minuscula.startswith("mongodb+srv://")
        or "tls=true" in url_minuscula
        or "ssl=true" in url_minuscula
    ):
        opcoes["tlsCAFile"] = certifi.where()
    return opcoes


class GerenciadorMongo:
    """Gerencia o cliente AsyncMongoClient do PyMongo, ping e criacao de indices."""

    def __init__(self, url: str, nome_banco: str, timeout_ms: int = 2000) -> None:
        url_limpa = url.strip()
        opcoes = montar_opcoes_cliente_mongo(url_limpa, timeout_ms)
        self._cliente: AsyncMongoClient[dict[str, Any]] = AsyncMongoClient(
            url_limpa,
            **opcoes,
        )
        self._nome_banco = nome_banco

    def obter_banco(self) -> AsyncDatabase[dict[str, Any]]:
        return self._cliente[self._nome_banco]

    async def verificar_conexao(self) -> bool:
        try:
            await self._cliente.admin.command("ping")
            return True
        except (PyMongoError, OSError, TimeoutError) as exc:
            logger.warning("Falha ao verificar conexao com MongoDB: %s", exc)
            return False

    async def garantir_indices(self) -> None:
        await garantir_indices_mongo(self.obter_banco())

    async def fechar(self) -> None:
        await self._cliente.close()
