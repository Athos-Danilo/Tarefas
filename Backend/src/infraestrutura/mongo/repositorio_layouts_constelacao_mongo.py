from datetime import UTC, datetime
from typing import Any

from pymongo.asynchronous.database import AsyncDatabase

from contratos.constelacoes import RepositorioLayoutsConstelacao
from dominio.constelacoes import (
    LayoutConstelacao,
    PosicaoNoConstelacao,
    ViewportConstelacao,
)
from infraestrutura.mongo.indices import COLECAO_LAYOUTS_CONSTELACAO


def _normalizar_instante(valor: Any) -> datetime | None:
    if isinstance(valor, datetime):
        return valor.replace(tzinfo=UTC) if valor.tzinfo is None else valor.astimezone(UTC)
    return None


class RepositorioLayoutsConstelacaoMongo(RepositorioLayoutsConstelacao):
    """Adaptador MongoDB para a colecao layouts_constelacao."""

    def __init__(self, banco: AsyncDatabase[dict[str, Any]]) -> None:
        self._colecao = banco[COLECAO_LAYOUTS_CONSTELACAO]

    async def obter(self, usuario_id: str, tarefa_raiz_id: str) -> LayoutConstelacao | None:
        doc = await self._colecao.find_one(
            {"usuario_id": usuario_id, "tarefa_raiz_id": tarefa_raiz_id}
        )
        if doc is None:
            return None

        nos_brutos = doc.get("nos", {})
        nos: dict[str, PosicaoNoConstelacao] = {}
        if isinstance(nos_brutos, dict):
            for chave, item in nos_brutos.items():
                if isinstance(chave, str) and isinstance(item, dict):
                    nos[chave] = PosicaoNoConstelacao(
                        x=float(item.get("x", 0.0)),
                        y=float(item.get("y", 0.0)),
                        fixado=bool(item.get("fixado", True)),
                    )

        vp_bruto = doc.get("viewport", {})
        if not isinstance(vp_bruto, dict):
            vp_bruto = {}
        viewport = ViewportConstelacao(
            zoom=float(vp_bruto.get("zoom", 1.0)),
            centro_x=float(vp_bruto.get("centro_x", 0.0)),
            centro_y=float(vp_bruto.get("centro_y", 0.0)),
        )

        return LayoutConstelacao(
            usuario_id=usuario_id,
            tarefa_raiz_id=tarefa_raiz_id,
            nos=nos,
            viewport=viewport,
            atualizado_em=_normalizar_instante(doc.get("atualizado_em")),
        )

    async def salvar(self, layout: LayoutConstelacao) -> None:
        atualizado = layout.atualizado_em or datetime.now(UTC)
        documento: dict[str, Any] = {
            "usuario_id": layout.usuario_id,
            "tarefa_raiz_id": layout.tarefa_raiz_id,
            "nos": {
                chave: {
                    "x": pos.x,
                    "y": pos.y,
                    "fixado": pos.fixado,
                }
                for chave, pos in layout.nos.items()
            },
            "viewport": {
                "zoom": layout.viewport.zoom,
                "centro_x": layout.viewport.centro_x,
                "centro_y": layout.viewport.centro_y,
            },
            "atualizado_em": atualizado.astimezone(UTC),
        }
        await self._colecao.replace_one(
            {"usuario_id": layout.usuario_id, "tarefa_raiz_id": layout.tarefa_raiz_id},
            documento,
            upsert=True,
        )

    async def remover(self, usuario_id: str, tarefa_raiz_id: str) -> bool:
        resultado = await self._colecao.delete_one(
            {"usuario_id": usuario_id, "tarefa_raiz_id": tarefa_raiz_id}
        )
        return resultado.deleted_count > 0
