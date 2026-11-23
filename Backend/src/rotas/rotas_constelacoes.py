from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from dominio.constelacoes import PosicaoNoConstelacao, ViewportConstelacao
from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_constelacoes,
)
from rotas.esquemas_constelacoes import (
    RequisicaoSalvarLayoutConstelacao,
    RespostaLayoutConstelacao,
    montar_resposta_layout,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_constelacoes import ServicoConstelacoes

roteador_constelacoes = APIRouter(prefix="/api/constelacoes", tags=["Constelacoes"])


@roteador_constelacoes.get(
    "/{tarefa_raiz_id}/layout",
    response_model=RespostaLayoutConstelacao,
    summary="Carregar coordenadas personalizadas do mapa visual da constelacao",
)
async def obter_layout_constelacao_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoConstelacoes, Depends(obter_servico_constelacoes)],
) -> RespostaLayoutConstelacao:
    layout = await servico.obter_layout(contexto.usuario.id, tarefa_raiz_id)
    return montar_resposta_layout(layout)


@roteador_constelacoes.put(
    "/{tarefa_raiz_id}/layout",
    response_model=RespostaLayoutConstelacao,
    summary="Salvar coordenadas dos nos e viewport do mapa no MongoDB",
)
async def salvar_layout_constelacao_rota(
    tarefa_raiz_id: UUID,
    corpo: RequisicaoSalvarLayoutConstelacao,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoConstelacoes, Depends(obter_servico_constelacoes)],
) -> RespostaLayoutConstelacao:
    nos_dominio = {
        chave: PosicaoNoConstelacao(x=item.x, y=item.y, fixado=item.fixado)
        for chave, item in corpo.nos.items()
    }
    viewport_dominio = ViewportConstelacao(
        zoom=corpo.viewport.zoom,
        centro_x=corpo.viewport.centro_x,
        centro_y=corpo.viewport.centro_y,
    )
    layout = await servico.salvar_layout(
        usuario_id=contexto.usuario.id,
        tarefa_raiz_id=tarefa_raiz_id,
        nos=nos_dominio,
        viewport=viewport_dominio,
    )
    return montar_resposta_layout(layout)


@roteador_constelacoes.delete(
    "/{tarefa_raiz_id}/layout",
    status_code=204,
    summary="Limpar posicoes personalizadas e restaurar organizacao automatica",
)
async def remover_layout_constelacao_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoConstelacoes, Depends(obter_servico_constelacoes)],
) -> Response:
    await servico.remover_layout(contexto.usuario.id, tarefa_raiz_id)
    return Response(status_code=204)
