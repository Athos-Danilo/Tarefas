from dataclasses import asdict
from typing import Any

from pymongo import DESCENDING
from pymongo.asynchronous.database import AsyncDatabase

from contratos.tarefas import EventoCicloRegistro
from infraestrutura.mongo.indices import COLECAO_EVENTOS_CICLO


class RepositorioEventosCicloMongo:
    """Adaptador MongoDB para gravacao e leitura de eventos no diario."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._colecao = banco[COLECAO_EVENTOS_CICLO]

    async def registrar(self, evento: EventoCicloRegistro) -> None:
        await self._colecao.insert_one(asdict(evento))

    async def listar_por_raiz(
        self,
        tarefa_raiz_id: str,
        limite: int = 20,
    ) -> list[dict[str, Any]]:
        cursor = (
            self._colecao.find({"tarefa_raiz_id": tarefa_raiz_id})
            .sort("criado_em", DESCENDING)
            .limit(limite)
        )
        itens: list[dict[str, Any]] = []
        async for doc in cursor:
            item = dict(doc)
            if "_id" in item:
                item["evento_id"] = str(item.pop("_id"))
            itens.append(item)
        return itens
