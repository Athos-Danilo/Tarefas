from uuid import UUID

from pydantic import BaseModel, Field

from dominio.constelacoes import LayoutConstelacao
from rotas.esquemas_autenticacao import formatar_instante_iso_utc


class PosicaoNoLayoutSchema(BaseModel):
    """Posicao bidimensional salva de um no no Mapa Visual."""

    x: float
    y: float
    fixado: bool = True


class ViewportConstelacaoSchema(BaseModel):
    """Nivel de zoom e centro do canvas do mapa."""

    zoom: float = 1.0
    centro_x: float = 0.0
    centro_y: float = 0.0


class RequisicaoSalvarLayoutConstelacao(BaseModel):
    """Payload de PUT /api/constelacoes/{tarefa_raiz_id}/layout."""

    nos: dict[str, PosicaoNoLayoutSchema] = Field(default_factory=dict)
    viewport: ViewportConstelacaoSchema = Field(default_factory=ViewportConstelacaoSchema)


class RespostaLayoutConstelacao(BaseModel):
    """Resposta de GET e PUT /api/constelacoes/{tarefa_raiz_id}/layout."""

    tarefa_raiz_id: UUID
    nos: dict[str, PosicaoNoLayoutSchema]
    viewport: ViewportConstelacaoSchema
    atualizado_em: str | None


def montar_resposta_layout(layout: LayoutConstelacao) -> RespostaLayoutConstelacao:
    """Converte o agregado de dominio para o contrato JSON da API."""
    return RespostaLayoutConstelacao(
        tarefa_raiz_id=UUID(layout.tarefa_raiz_id),
        nos={
            chave: PosicaoNoLayoutSchema(x=pos.x, y=pos.y, fixado=pos.fixado)
            for chave, pos in layout.nos.items()
        },
        viewport=ViewportConstelacaoSchema(
            zoom=layout.viewport.zoom,
            centro_x=layout.viewport.centro_x,
            centro_y=layout.viewport.centro_y,
        ),
        atualizado_em=(
            formatar_instante_iso_utc(layout.atualizado_em)
            if layout.atualizado_em is not None
            else None
        ),
    )
