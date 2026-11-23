from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Query

from dominio.modelos_tarefa import (
    EstrategiaExclusao,
    PrioridadeTarefa,
    StatusTarefa,
    TurnoTarefa,
)
from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_tarefas,
)
from rotas.esquemas_autenticacao import formatar_instante_iso_utc
from rotas.esquemas_tarefas import (
    AncestralResumoResposta,
    DetalhesTarefaResposta,
    LembreteResposta,
    ProximaOcorrenciaResumo,
    RequisicaoAtualizarTarefa,
    RequisicaoConcluirTarefa,
    RequisicaoCriarTarefa,
    RequisicaoDesfazerCascata,
    RequisicaoMoverTarefa,
    RequisicaoReabrirTarefa,
    RequisicaoReordenarIrmas,
    RequisicaoSalvarDetalhes,
    RespostaConcluirTarefa,
    RespostaCriarTarefa,
    RespostaDesfazerCascata,
    RespostaDetalheTarefaCompleta,
    RespostaExcluirTarefa,
    RespostaListarTarefas,
    RespostaMoverTarefa,
    RespostaReabrirTarefa,
    RespostaReordenarIrmas,
    TarefaResposta,
    TotaisTarefasResposta,
    montar_tarefa_resposta,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_tarefas import FormatoListagem, ServicoTarefas

roteador_tarefas = APIRouter(prefix="/api/tarefas", tags=["Tarefas"])


@roteador_tarefas.get(
    "",
    response_model=RespostaListarTarefas,
    summary="Listar tarefas em arvore ou lista plana com filtros",
)
async def listar_tarefas(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
    turno: Annotated[TurnoTarefa | None, Query()] = None,
    status: Annotated[StatusTarefa | None, Query()] = None,
    prioridade: Annotated[PrioridadeTarefa | None, Query()] = None,
    etiqueta_id: Annotated[UUID | None, Query()] = None,
    busca: Annotated[str | None, Query()] = None,
    incluir_concluidas: Annotated[bool, Query()] = True,
    formato: Annotated[FormatoListagem, Query()] = "arvore",
) -> RespostaListarTarefas:
    resultado = await servico.listar_tarefas(
        contexto.usuario.id,
        turno=turno,
        status=status,
        prioridade=prioridade,
        etiqueta_id=etiqueta_id,
        busca=busca,
        incluir_concluidas=incluir_concluidas,
        formato=formato,
    )
    return RespostaListarTarefas(
        itens=[montar_tarefa_resposta(item) for item in resultado.itens],
        totais=TotaisTarefasResposta(
            ativas=resultado.ativas,
            concluidas=resultado.concluidas,
            limite_ativas=resultado.limite_ativas,
        ),
    )


@roteador_tarefas.post(
    "",
    response_model=RespostaCriarTarefa,
    status_code=201,
    summary="Criar tarefa raiz ou subtarefa",
)
async def criar_tarefa(
    corpo: RequisicaoCriarTarefa,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaCriarTarefa:
    resultado = await servico.criar_tarefa(
        contexto.usuario.id,
        titulo=corpo.titulo,
        tarefa_pai_id=corpo.tarefa_pai_id,
        prioridade=corpo.prioridade,
        status=corpo.status,
        turno=corpo.turno,
        prazo=corpo.prazo,
        recorrencia=corpo.recorrencia.para_dominio() if corpo.recorrencia else None,
        etiqueta_ids=corpo.etiqueta_ids,
    )
    return RespostaCriarTarefa(
        tarefa=montar_tarefa_resposta(resultado.tarefa),
        ancestrais_atualizados=[
            AncestralResumoResposta(
                id=anc.registro.id,
                status=anc.registro.status,
                percentual_conclusao=anc.metricas.percentual_conclusao,
                total_folhas=anc.metricas.total_folhas,
                folhas_concluidas=anc.metricas.folhas_concluidas,
                tem_filha_urgente_aberta=anc.metricas.tem_filha_urgente_aberta,
            )
            for anc in resultado.ancestrais_atualizados
        ],
    )


@roteador_tarefas.post(
    "/desfazer-cascata",
    response_model=RespostaDesfazerCascata,
    summary="Desfazer conclusao em cascata dentro do prazo de 15s",
)
async def desfazer_cascata(
    corpo: RequisicaoDesfazerCascata,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaDesfazerCascata:
    resultado = await servico.desfazer_cascata(
        contexto.usuario.id,
        token_desfazer=corpo.token_desfazer,
    )
    return RespostaDesfazerCascata(
        restaurados=resultado.restaurados,
        tarefa_id=resultado.tarefa_id,
    )


@roteador_tarefas.patch(
    "/reordenar",
    response_model=RespostaReordenarIrmas,
    summary="Reordenar manualmente tarefas irmas no mesmo nivel",
)
async def reordenar_irmas(
    corpo: RequisicaoReordenarIrmas,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaReordenarIrmas:
    atualizadas = await servico.reordenar_irmas(
        contexto.usuario.id,
        tarefa_pai_id=corpo.tarefa_pai_id,
        ordenacao=[(item.tarefa_id, item.ordem_manual) for item in corpo.ordenacao],
    )
    return RespostaReordenarIrmas(atualizadas=atualizadas)


@roteador_tarefas.get(
    "/{tarefa_id}",
    response_model=RespostaDetalheTarefaCompleta,
    summary="Obter tarefa com subarvore completa, detalhes e lembretes",
)
async def obter_tarefa(
    tarefa_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaDetalheTarefaCompleta:
    completo = await servico.obter_tarefa(contexto.usuario.id, tarefa_id)
    return RespostaDetalheTarefaCompleta(
        tarefa=montar_tarefa_resposta(completo.tarefa),
        detalhes=DetalhesTarefaResposta(**completo.detalhes),
        lembretes=[
            LembreteResposta(
                id=lem.id,
                disparar_em=formatar_instante_iso_utc(lem.disparar_em),
                antecedencia_min=lem.antecedencia_min,
                status=lem.status,
            )
            for lem in completo.lembretes
        ],
    )


@roteador_tarefas.patch(
    "/{tarefa_id}",
    response_model=TarefaResposta,
    summary="Atualizar atributos editaveis de uma tarefa",
)
async def atualizar_tarefa(
    tarefa_id: UUID,
    corpo: RequisicaoAtualizarTarefa,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> TarefaResposta:
    atualizada = await servico.atualizar_tarefa(
        contexto.usuario.id,
        tarefa_id,
        campos_presentes=set(corpo.model_fields_set),
        titulo=corpo.titulo,
        prioridade=corpo.prioridade,
        status=corpo.status,
        turno=corpo.turno,
        prazo=corpo.prazo,
        recorrencia=corpo.recorrencia.para_dominio() if corpo.recorrencia else None,
        etiqueta_ids=corpo.etiqueta_ids,
    )
    return montar_tarefa_resposta(atualizada)


@roteador_tarefas.post(
    "/{tarefa_id}/concluir",
    response_model=RespostaConcluirTarefa,
    summary="Concluir tarefa (com cascata e recorrencia automatica)",
)
async def concluir_tarefa_rota(
    tarefa_id: UUID,
    corpo: RequisicaoConcluirTarefa,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaConcluirTarefa:
    resultado = await servico.concluir_tarefa(
        contexto.usuario.id,
        tarefa_id,
        confirmar_cascata=corpo.confirmar_cascata,
        ator_nome=contexto.usuario.nome_exibicao,
    )
    prox = resultado.proxima_ocorrencia
    return RespostaConcluirTarefa(
        tarefa_id=resultado.tarefa_id,
        nos_concluidos=list(resultado.nos_concluidos),
        ancestrais_atualizados=list(resultado.ancestrais_atualizados),
        token_desfazer=resultado.token_desfazer,
        expira_em=formatar_instante_iso_utc(resultado.expira_em) if resultado.expira_em else None,
        proxima_ocorrencia=(
            ProximaOcorrenciaResumo(
                id=prox.id,
                prazo=formatar_instante_iso_utc(prox.prazo) if prox.prazo else None,
                serie_recorrencia_id=prox.serie_recorrencia_id,
            )
            if prox is not None
            else None
        ),
    )


@roteador_tarefas.post(
    "/{tarefa_id}/reabrir",
    response_model=RespostaReabrirTarefa,
    summary="Reabrir tarefa concluida propagando para ancestrais concluido",
)
async def reabrir_tarefa_rota(
    tarefa_id: UUID,
    corpo: RequisicaoReabrirTarefa,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaReabrirTarefa:
    resultado = await servico.reabrir_tarefa(
        contexto.usuario.id,
        tarefa_id,
        status_destino=corpo.status_destino,
    )
    return RespostaReabrirTarefa(
        tarefa_id=resultado.tarefa_id,
        status=resultado.status,
        nos_reabertos=list(resultado.nos_reabertos),
        ancestrais_reabertos=list(resultado.ancestrais_reabertos),
    )


@roteador_tarefas.post(
    "/{tarefa_id}/mover",
    response_model=RespostaMoverTarefa,
    summary="Mover subarvore ou promover subtarefa a raiz",
)
async def mover_tarefa_rota(
    tarefa_id: UUID,
    corpo: RequisicaoMoverTarefa,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> RespostaMoverTarefa:
    resultado = await servico.mover_tarefa(
        contexto.usuario.id,
        tarefa_id,
        novo_pai_id=corpo.novo_pai_id,
        nova_ordem=corpo.nova_ordem,
    )
    return RespostaMoverTarefa(
        tarefa=montar_tarefa_resposta(resultado.tarefa),
        ancestrais_concluidos=list(resultado.ancestrais_concluidos),
        ancestrais_reabertos=list(resultado.ancestrais_reabertos),
    )


@roteador_tarefas.delete(
    "/{tarefa_id}",
    response_model=RespostaExcluirTarefa,
    summary="Excluir tarefa simples, em cascata ou promovendo filhas diretas",
)
async def excluir_tarefa_rota(
    tarefa_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
    estrategia: Annotated[EstrategiaExclusao | None, Query()] = None,
) -> RespostaExcluirTarefa:
    resultado = await servico.excluir_tarefa(
        contexto.usuario.id,
        tarefa_id,
        estrategia=estrategia,
    )
    return RespostaExcluirTarefa(
        estrategia_aplicada=resultado.estrategia_aplicada,
        tarefas_removidas=resultado.tarefas_removidas,
        filhas_promovidas=resultado.filhas_promovidas,
    )


@roteador_tarefas.get(
    "/{tarefa_id}/detalhes",
    response_model=DetalhesTarefaResposta,
    summary="Ler metadados visuais e notas ricas em blocos no MongoDB",
)
async def obter_detalhes_tarefa(
    tarefa_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> DetalhesTarefaResposta:
    detalhes = await servico.obter_detalhes(contexto.usuario.id, tarefa_id)
    return DetalhesTarefaResposta(**detalhes)


@roteador_tarefas.put(
    "/{tarefa_id}/detalhes",
    response_model=DetalhesTarefaResposta,
    summary="Salvar metadados visuais e notas ricas em blocos no MongoDB",
)
async def salvar_detalhes_tarefa(
    tarefa_id: UUID,
    corpo: RequisicaoSalvarDetalhes,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> DetalhesTarefaResposta:
    detalhes = await servico.salvar_detalhes(
        contexto.usuario.id,
        tarefa_id,
        metadados_visuais=corpo.metadados_visuais,
        notas_em_blocos=corpo.notas_em_blocos,
    )
    return DetalhesTarefaResposta(**detalhes)
