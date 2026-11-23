from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Header, Response

from rotas.dependencias_autenticacao import (
    exigir_protecao_csrf,
    exigir_usuario_autenticado,
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_push,
)
from rotas.esquemas_push import (
    DispositivoPushResposta,
    LembreteDetalhadoResposta,
    RequisicaoAtualizarLembrete,
    RequisicaoCriarLembrete,
    RequisicaoRegistrarDispositivoPush,
    RespostaChavePublicaPush,
    RespostaDisparoLembretesCron,
    RespostaListarDispositivosPush,
    RespostaListarLembretesTarefa,
    montar_dispositivo_push_resposta,
    montar_lembrete_detalhado_resposta,
    montar_resumo_disparo_resposta,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_push import ServicoPush

roteador_push = APIRouter(prefix="/api/push", tags=["Web Push e Dispositivos"])
roteador_lembretes = APIRouter(tags=["Lembretes"])
roteador_interno = APIRouter(prefix="/api/interno", tags=["Uso Interno / Cron"])


@roteador_push.get(
    "/chave-publica",
    response_model=RespostaChavePublicaPush,
    summary="Obter chave publica VAPID em Base64 URL-safe",
)
async def obter_chave_publica_push(
    _contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> RespostaChavePublicaPush:
    chave, habilitado = servico.obter_chave_publica()
    return RespostaChavePublicaPush(chave_publica=chave, habilitado=habilitado)


@roteador_push.get(
    "/dispositivos",
    response_model=RespostaListarDispositivosPush,
    summary="Listar dispositivos Web Push ativos da conta",
)
async def listar_dispositivos_push(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> RespostaListarDispositivosPush:
    itens = await servico.listar_dispositivos(contexto.usuario.id)
    return RespostaListarDispositivosPush(
        itens=[montar_dispositivo_push_resposta(item) for item in itens]
    )


@roteador_push.post(
    "/dispositivos",
    response_model=DispositivoPushResposta,
    status_code=201,
    summary="Registrar ou atualizar dispositivo para Web Push VAPID",
)
async def registrar_dispositivo_push(
    corpo: RequisicaoRegistrarDispositivoPush,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> DispositivoPushResposta:
    criado = await servico.registrar_dispositivo(
        contexto.usuario.id,
        endpoint=corpo.endpoint,
        chave_p256dh=corpo.chaves.p256dh,
        chave_auth=corpo.chaves.auth,
        rotulo_dispositivo=corpo.rotulo_dispositivo,
        plataforma=corpo.plataforma,
    )
    return montar_dispositivo_push_resposta(criado)


@roteador_push.delete(
    "/dispositivos/{dispositivo_id}",
    status_code=204,
    summary="Revogar dispositivo Web Push imediatamente",
)
async def revogar_dispositivo_push(
    dispositivo_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> Response:
    await servico.revogar_dispositivo(contexto.usuario.id, dispositivo_id)
    return Response(status_code=204)


@roteador_lembretes.get(
    "/api/tarefas/{tarefa_id}/lembretes",
    response_model=RespostaListarLembretesTarefa,
    summary="Listar lembretes agendados de uma tarefa",
)
async def listar_lembretes_tarefa(
    tarefa_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> RespostaListarLembretesTarefa:
    itens = await servico.listar_lembretes_tarefa(contexto.usuario.id, tarefa_id)
    return RespostaListarLembretesTarefa(
        itens=[montar_lembrete_detalhado_resposta(item) for item in itens]
    )


@roteador_lembretes.post(
    "/api/tarefas/{tarefa_id}/lembretes",
    response_model=LembreteDetalhadoResposta,
    status_code=201,
    summary="Criar lembrete para uma tarefa (ate 3 ativos por tarefa)",
)
async def criar_lembrete_tarefa(
    tarefa_id: UUID,
    corpo: RequisicaoCriarLembrete,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> LembreteDetalhadoResposta:
    criado = await servico.criar_lembrete(
        contexto.usuario.id,
        tarefa_id,
        disparar_em=corpo.disparar_em,
        antecedencia_min=corpo.antecedencia_min,
    )
    return montar_lembrete_detalhado_resposta(criado)


@roteador_lembretes.patch(
    "/api/lembretes/{lembrete_id}",
    response_model=LembreteDetalhadoResposta,
    summary="Atualizar horario ou antecedencia de um lembrete pendente",
)
async def atualizar_lembrete_rota(
    lembrete_id: UUID,
    corpo: RequisicaoAtualizarLembrete,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> LembreteDetalhadoResposta:
    atualizado = await servico.atualizar_lembrete(
        contexto.usuario.id,
        lembrete_id,
        disparar_em=corpo.disparar_em,
        antecedencia_min=corpo.antecedencia_min,
    )
    return montar_lembrete_detalhado_resposta(atualizado)


@roteador_lembretes.delete(
    "/api/lembretes/{lembrete_id}",
    status_code=204,
    summary="Cancelar um lembrete pendente",
)
async def cancelar_lembrete_rota(
    lembrete_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
) -> Response:
    await servico.cancelar_lembrete(contexto.usuario.id, lembrete_id)
    return Response(status_code=204)


@roteador_interno.post(
    "/disparar-lembretes",
    response_model=RespostaDisparoLembretesCron,
    summary="Varredura interna de lembretes vencidos por cron (X-Token-Interno)",
)
async def disparar_lembretes_cron(
    servico: Annotated[ServicoPush, Depends(obter_servico_push)],
    x_token_interno: Annotated[str | None, Header(alias="X-Token-Interno")] = None,
) -> RespostaDisparoLembretesCron:
    resumo = await servico.disparar_lembretes_pendentes(token_cron_recebido=x_token_interno)
    return montar_resumo_disparo_resposta(resumo)
