from dataclasses import asdict
from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from contratos.tarefas import EventoCicloRegistro
from infraestrutura.mongo.indices import COLECAO_EVENTOS_CICLO


class RepositorioEventosCicloMongo:
    """Adaptador MongoDB para gravacao de eventos no diario do usuario."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._colecao = banco[COLECAO_EVENTOS_CICLO]

    async def registrar(self, evento: EventoCicloRegistro) -> None:
        await self._colecao.insert_one(asdict(evento))
