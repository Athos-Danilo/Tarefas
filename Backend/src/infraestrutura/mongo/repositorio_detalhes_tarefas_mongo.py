from typing import Any, cast

from pymongo.asynchronous.database import AsyncDatabase

from contratos.tarefas import DetalhesTarefaDocumento
from dominio.notas_e_etiquetas import criar_detalhes_tarefa_padrao
from infraestrutura.mongo.indices import (
    COLECAO_DETALHES_TAREFAS,
    COLECAO_LAYOUTS_CONSTELACAO,
)


def _normalizar_documento(
    documento: dict[str, Any] | None,
    usuario_id: str,
    tarefa_id: str,
) -> DetalhesTarefaDocumento:
    if documento is None:
        return cast(
            DetalhesTarefaDocumento,
            criar_detalhes_tarefa_padrao(usuario_id, tarefa_id),
        )
    metadados = documento.get("metadados_visuais")
    blocos = documento.get("notas_em_blocos")
    atualizado = documento.get("atualizado_em")
    return DetalhesTarefaDocumento(
        tarefa_id=tarefa_id,
        usuario_id=usuario_id,
        metadados_visuais=dict(metadados) if isinstance(metadados, dict) else {},
        notas_em_blocos=list(blocos) if isinstance(blocos, list) else [],
        atualizado_em=str(atualizado) if atualizado is not None else None,
    )


class RepositorioDetalhesTarefasMongo:
    """Adaptador MongoDB para detalhes visuais, notas em blocos e limpeza de layouts."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._detalhes = banco[COLECAO_DETALHES_TAREFAS]
        self._layouts = banco[COLECAO_LAYOUTS_CONSTELACAO]

    async def obter_ou_padrao(
        self,
        usuario_id: str,
        tarefa_id: str,
    ) -> DetalhesTarefaDocumento:
        doc = await self._detalhes.find_one(
            {"usuario_id": usuario_id, "tarefa_id": tarefa_id},
            {"_id": 0},
        )
        return _normalizar_documento(doc, usuario_id, tarefa_id)

    async def obter_varios(
        self,
        usuario_id: str,
        tarefa_ids: list[str],
    ) -> dict[str, DetalhesTarefaDocumento]:
        if not tarefa_ids:
            return {}
        cursor = self._detalhes.find(
            {"usuario_id": usuario_id, "tarefa_id": {"$in": tarefa_ids}},
            {"_id": 0},
        )
        resultado: dict[str, DetalhesTarefaDocumento] = {}
        async for doc in cursor:
            tid = str(doc.get("tarefa_id", ""))
            if tid:
                resultado[tid] = _normalizar_documento(doc, usuario_id, tid)
        return resultado

    async def salvar(self, documento: DetalhesTarefaDocumento) -> None:
        await self._detalhes.replace_one(
            {"tarefa_id": documento["tarefa_id"]},
            dict(documento),
            upsert=True,
        )

    async def transferir_dono_por_tarefas(
        self,
        dono_anterior_id: str,
        novo_dono_id: str,
        tarefa_ids: list[str],
    ) -> None:
        if not tarefa_ids:
            return
        await self._detalhes.update_many(
            {"usuario_id": dono_anterior_id, "tarefa_id": {"$in": tarefa_ids}},
            {"$set": {"usuario_id": novo_dono_id}},
        )

    async def remover_por_tarefas(self, usuario_id: str, tarefa_ids: list[str]) -> None:
        if not tarefa_ids:
            return
        await self._detalhes.delete_many(
            {"usuario_id": usuario_id, "tarefa_id": {"$in": tarefa_ids}}
        )

    async def remover_layouts_raizes(self, usuario_id: str, raiz_ids: list[str]) -> None:
        if not raiz_ids:
            return
        await self._layouts.delete_many(
            {"usuario_id": usuario_id, "tarefa_raiz_id": {"$in": raiz_ids}}
        )
