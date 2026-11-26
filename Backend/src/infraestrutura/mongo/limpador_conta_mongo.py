from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from infraestrutura.mongo.indices import (
    COLECAO_DETALHES_TAREFAS,
    COLECAO_EVENTOS_CICLO,
    COLECAO_LAYOUTS_CONSTELACAO,
    COLECAO_PREFERENCIAS_CENARIO,
)


class LimpadorContaMongo:
    """Remove todos os documentos do usuario nas colecoes MongoDB ao excluir a conta."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._banco = banco

    async def remover_dados_usuario(self, usuario_id: str) -> None:
        for nome_colecao in (
            COLECAO_DETALHES_TAREFAS,
            COLECAO_LAYOUTS_CONSTELACAO,
            COLECAO_PREFERENCIAS_CENARIO,
        ):
            await self._banco[nome_colecao].delete_many({"usuario_id": usuario_id})
        await self._banco[COLECAO_EVENTOS_CICLO].delete_many(
            {"$or": [{"usuario_id": usuario_id}, {"autor_usuario_id": usuario_id}]}
        )
