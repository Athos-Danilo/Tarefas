from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Body, Depends, Query

from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_foco,
)
from rotas.esquemas_foco import (
    RequisicaoEncerrarSessaoFoco,
    RequisicaoIniciarSessaoFoco,
    RespostaHistoricoFoco,
    RespostaSessaoFocoAtiva,
    RespostaSessaoFocoItem,
    montar_sessao_foco_resposta,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_foco import ServicoFoco

roteador_foco = APIRouter(prefix="/api/foco", tags=["Modo Foco"])


@roteador_foco.get(
    "/sessoes/ativa",
    response_model=RespostaSessaoFocoAtiva,
    summary="Consultar sessao de foco atualmente em andamento",
)
async def obter_sessao_foco_ativa_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoFoco, Depends(obter_servico_foco)],
) -> RespostaSessaoFocoAtiva:
    ativa = await servico.obter_sessao_ativa(contexto.usuario.id)
    return RespostaSessaoFocoAtiva(
        sessao_ativa=montar_sessao_foco_resposta(ativa) if ativa is not None else None
    )


@roteador_foco.post(
    "/sessoes",
    response_model=RespostaSessaoFocoItem,
    status_code=201,
    summary="Iniciar sessao no Modo Foco vinculada a uma tarefa",
)
async def iniciar_sessao_foco_rota(
    corpo: RequisicaoIniciarSessaoFoco,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoFoco, Depends(obter_servico_foco)],
) -> RespostaSessaoFocoItem:
    sessao = await servico.iniciar_sessao(
        usuario_id=contexto.usuario.id,
        tarefa_id=corpo.tarefa_id,
        duracao_planejada_seg=corpo.duracao_planejada_seg,
    )
    return RespostaSessaoFocoItem(sessao=montar_sessao_foco_resposta(sessao))


@roteador_foco.post(
    "/sessoes/{sessao_id}/concluir",
    response_model=RespostaSessaoFocoItem,
    summary="Concluir sessao de foco em andamento registrando evento no diario",
)
async def concluir_sessao_foco_rota(
    sessao_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoFoco, Depends(obter_servico_foco)],
    corpo: Annotated[RequisicaoEncerrarSessaoFoco | None, Body()] = None,
) -> RespostaSessaoFocoItem:
    sessao = await servico.concluir_sessao(
        usuario_id=contexto.usuario.id,
        sessao_id=sessao_id,
        duracao_informada_seg=corpo.duracao_real_seg if corpo is not None else None,
    )
    return RespostaSessaoFocoItem(sessao=montar_sessao_foco_resposta(sessao))


@roteador_foco.post(
    "/sessoes/{sessao_id}/interromper",
    response_model=RespostaSessaoFocoItem,
    summary="Interromper sessao de foco em andamento preservando o tempo real decorrido",
)
async def interromper_sessao_foco_rota(
    sessao_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoFoco, Depends(obter_servico_foco)],
    corpo: Annotated[RequisicaoEncerrarSessaoFoco | None, Body()] = None,
) -> RespostaSessaoFocoItem:
    sessao = await servico.interromper_sessao(
        usuario_id=contexto.usuario.id,
        sessao_id=sessao_id,
        duracao_informada_seg=corpo.duracao_real_seg if corpo is not None else None,
    )
    return RespostaSessaoFocoItem(sessao=montar_sessao_foco_resposta(sessao))


@roteador_foco.get(
    "/sessoes",
    response_model=RespostaHistoricoFoco,
    summary="Listar historico recente de sessoes de foco do usuario",
)
async def listar_historico_foco_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoFoco, Depends(obter_servico_foco)],
    limite: int = Query(default=20, description="Quantidade maxima de sessoes retornadas"),
) -> RespostaHistoricoFoco:
    resultado = await servico.listar_historico(contexto.usuario.id, limite=limite)
    return RespostaHistoricoFoco(
        itens=[montar_sessao_foco_resposta(item) for item in resultado.itens],
        total_segundos_concluidos=resultado.total_segundos_concluidos,
    )
