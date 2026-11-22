from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_grupos,
    obter_servico_tarefas,
)
from rotas.esquemas_autenticacao import formatar_instante_iso_utc
from rotas.esquemas_grupos import (
    AtividadeGrupoResposta,
    IntegrantePainelResposta,
    MembroPreviaResposta,
    RequisicaoAtribuirResponsavel,
    RequisicaoCriarVaga,
    RequisicaoEntrarConvite,
    RequisicaoTransferirLideranca,
    RespostaCompartilharGrupo,
    RespostaEntrarConvite,
    RespostaPainelDesempenhoGrupo,
    RespostaPreviaConvite,
    RespostaRegenerarConvite,
    RespostaSairGrupo,
    RespostaTransferirLideranca,
    ResumoGeralPainelResposta,
    VagaAbertaPainelResposta,
    VagaDisponivelPreviaResposta,
    VagaGrupoResposta,
)
from rotas.esquemas_tarefas import TarefaResposta, montar_tarefa_resposta
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_grupos import ServicoGrupos
from servicos.servico_tarefas import ServicoTarefas

roteador_grupos = APIRouter(tags=["Tarefas em Conjunto"])


@roteador_grupos.get(
    "/api/grupos/convites/{token}",
    response_model=RespostaPreviaConvite,
    summary="Previa segura de convite para Tarefa em Conjunto",
)
async def obter_previa_convite_rota(
    token: str,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaPreviaConvite:
    previa = await servico.obter_previa_convite(contexto.usuario.id, token)
    return RespostaPreviaConvite(
        tarefa_raiz_id=previa.tarefa_raiz_id,
        titulo=previa.titulo,
        lider_nome=previa.lider_nome,
        membros_ativos=[
            MembroPreviaResposta(
                usuario_id=m.usuario_id,
                nome_exibicao=m.nome_exibicao,
                avatar_url=m.avatar_url,
                papel=m.papel,
            )
            for m in previa.membros
        ],
        vagas_disponiveis=[
            VagaDisponivelPreviaResposta(
                id=v.id,
                nome_exibicao=v.nome_exibicao,
                email_opcional=v.email_opcional,
            )
            for v in previa.vagas
            if v.ocupada_por_usuario_id is None
        ],
        ja_e_membro=previa.ja_e_membro,
    )


@roteador_grupos.post(
    "/api/grupos/convites/{token}/entrar",
    response_model=RespostaEntrarConvite,
    summary="Entrar em Tarefa em Conjunto via token de convite",
)
async def entrar_por_convite_rota(
    token: str,
    corpo: RequisicaoEntrarConvite,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaEntrarConvite:
    res = await servico.entrar_por_convite(
        contexto.usuario.id,
        email_usuario=contexto.usuario.email,
        nome_usuario=contexto.usuario.nome_exibicao,
        codigo_token=token,
        vaga_id=corpo.vaga_id,
    )
    return RespostaEntrarConvite(
        tarefa_raiz_id=res.tarefa_raiz_id,
        papel=res.papel,
        vaga_vinculada_id=res.vaga_vinculada_id,
        subtarefas_herdadas=res.subtarefas_herdadas,
        ja_era_membro=res.ja_era_membro,
    )


@roteador_grupos.post(
    "/api/grupos/{tarefa_raiz_id}/compartilhar",
    response_model=RespostaCompartilharGrupo,
    summary="Transformar tarefa-raiz em Tarefa em Conjunto",
)
async def compartilhar_tarefa_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaCompartilharGrupo:
    convite = await servico.compartilhar_tarefa(
        contexto.usuario.id,
        contexto.usuario.nome_exibicao,
        tarefa_raiz_id,
    )
    return RespostaCompartilharGrupo(
        tarefa_raiz_id=tarefa_raiz_id,
        compartilhada=True,
        meu_papel="lider",
        codigo_token=convite.codigo_token,
        link_convite=f"/convites/{convite.codigo_token}",
    )


@roteador_grupos.post(
    "/api/grupos/{tarefa_raiz_id}/vagas",
    response_model=VagaGrupoResposta,
    status_code=201,
    summary="Criar vaga nomeada para pre-atribuicao (exclusivo do Lider)",
)
async def criar_vaga_rota(
    tarefa_raiz_id: UUID,
    corpo: RequisicaoCriarVaga,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> VagaGrupoResposta:
    vaga = await servico.criar_vaga(
        contexto.usuario.id,
        tarefa_raiz_id,
        nome_exibicao=corpo.nome_exibicao,
        email_opcional=corpo.email_opcional,
    )
    return VagaGrupoResposta(
        id=vaga.id,
        tarefa_raiz_id=vaga.tarefa_raiz_id,
        nome_exibicao=vaga.nome_exibicao,
        email_opcional=vaga.email_opcional,
        ocupada_por_usuario_id=vaga.ocupada_por_usuario_id,
        criada_em=formatar_instante_iso_utc(vaga.criada_em),
    )


@roteador_grupos.delete(
    "/api/grupos/{tarefa_raiz_id}/vagas/{vaga_id}",
    status_code=204,
    summary="Remover vaga nomeada limpando atribuicoes (exclusivo do Lider)",
)
async def excluir_vaga_rota(
    tarefa_raiz_id: UUID,
    vaga_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> Response:
    await servico.excluir_vaga(contexto.usuario.id, tarefa_raiz_id, vaga_id)
    return Response(status_code=204)


@roteador_grupos.post(
    "/api/grupos/{tarefa_raiz_id}/convites/regenerar",
    response_model=RespostaRegenerarConvite,
    summary="Gerar novo link de convite invalidando o anterior",
)
async def regenerar_convite_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaRegenerarConvite:
    convite = await servico.regenerar_convite(contexto.usuario.id, tarefa_raiz_id)
    return RespostaRegenerarConvite(
        codigo_token=convite.codigo_token,
        link_convite=f"/convites/{convite.codigo_token}",
        ativo=convite.ativo,
    )


@roteador_grupos.delete(
    "/api/grupos/{tarefa_raiz_id}/convites",
    status_code=204,
    summary="Revogar link de convite ativo sem remover participantes",
)
async def revogar_convites_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> Response:
    await servico.revogar_convites(contexto.usuario.id, tarefa_raiz_id)
    return Response(status_code=204)


@roteador_grupos.get(
    "/api/grupos/{tarefa_raiz_id}/desempenho",
    response_model=RespostaPainelDesempenhoGrupo,
    summary="Consultar painel consolidado de desempenho da equipe",
)
async def obter_desempenho_grupo_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaPainelDesempenhoGrupo:
    completo = await servico.obter_desempenho(contexto.usuario.id, tarefa_raiz_id)
    painel = completo.painel
    return RespostaPainelDesempenhoGrupo(
        tarefa_raiz_id=painel.tarefa_raiz_id,
        titulo=painel.titulo,
        meu_papel=painel.meu_papel,
        link_convite_ativo=painel.link_convite_ativo,
        codigo_token=completo.codigo_token,
        resumo_geral=ResumoGeralPainelResposta(
            total_subtarefas_folha=painel.resumo_geral.total_subtarefas_folha,
            folhas_concluidas=painel.resumo_geral.folhas_concluidas,
            percentual_geral=painel.resumo_geral.percentual_geral,
        ),
        integrantes=[
            IntegrantePainelResposta(
                usuario_id=item.usuario_id,
                nome_exibicao=item.nome_exibicao,
                papel=item.papel,
                avatar_url=item.avatar_url,
                atribuidas=item.atribuidas,
                concluidas=item.concluidas,
                percentual=item.percentual,
            )
            for item in painel.integrantes
        ],
        vagas_abertas=[
            VagaAbertaPainelResposta(
                vaga_id=v.vaga_id,
                nome_exibicao=v.nome_exibicao,
                email_opcional=v.email_opcional,
                atribuidas=v.atribuidas,
            )
            for v in painel.vagas_abertas
        ],
        atividade_recente=[
            AtividadeGrupoResposta(
                evento_id=evt.evento_id,
                autor_nome=evt.autor_nome,
                tipo_evento=evt.tipo_evento,
                resumo=evt.resumo,
                criado_em=formatar_instante_iso_utc(evt.criado_em),
            )
            for evt in completo.atividade_recente
        ],
    )


@roteador_grupos.post(
    "/api/grupos/{tarefa_raiz_id}/transferir-lideranca",
    response_model=RespostaTransferirLideranca,
    summary="Transferir lideranca do projeto para outro integrante",
)
async def transferir_lideranca_rota(
    tarefa_raiz_id: UUID,
    corpo: RequisicaoTransferirLideranca,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaTransferirLideranca:
    await servico.transferir_lideranca(
        contexto.usuario.id,
        contexto.usuario.nome_exibicao,
        tarefa_raiz_id,
        novo_lider_usuario_id=corpo.novo_lider_usuario_id,
    )
    return RespostaTransferirLideranca(
        lideranca_transferida=True,
        novo_lider_usuario_id=corpo.novo_lider_usuario_id,
    )


@roteador_grupos.delete(
    "/api/grupos/{tarefa_raiz_id}/membros/{usuario_id}",
    status_code=204,
    summary="Remover integrante mantendo suas subtarefas como Sem responsavel",
)
async def remover_membro_rota(
    tarefa_raiz_id: UUID,
    usuario_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> Response:
    await servico.remover_membro(
        contexto.usuario.id,
        contexto.usuario.nome_exibicao,
        tarefa_raiz_id,
        membro_usuario_id=usuario_id,
    )
    return Response(status_code=204)


@roteador_grupos.post(
    "/api/grupos/{tarefa_raiz_id}/sair",
    response_model=RespostaSairGrupo,
    summary="Sair de Tarefa em Conjunto preservando subtarefas",
)
async def sair_grupo_rota(
    tarefa_raiz_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
) -> RespostaSairGrupo:
    res = await servico.sair_do_grupo(
        contexto.usuario.id,
        contexto.usuario.nome_exibicao,
        tarefa_raiz_id,
    )
    return RespostaSairGrupo(
        saiu_do_grupo=True,
        subtarefas_desvinculadas=res.subtarefas_desvinculadas,
    )


@roteador_grupos.patch(
    "/api/tarefas/{tarefa_id}/atribuir",
    response_model=TarefaResposta,
    summary="Atribuir integrante ou vaga como responsavel por subtarefa",
)
async def atribuir_responsavel_rota(
    tarefa_id: UUID,
    corpo: RequisicaoAtribuirResponsavel,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico_grupos: Annotated[ServicoGrupos, Depends(obter_servico_grupos)],
    servico_tarefas: Annotated[ServicoTarefas, Depends(obter_servico_tarefas)],
) -> TarefaResposta:
    await servico_grupos.atribuir_responsavel(
        contexto.usuario.id,
        contexto.usuario.nome_exibicao,
        tarefa_id,
        responsavel_usuario_id=corpo.responsavel_usuario_id,
        vaga_responsavel_id=corpo.vaga_responsavel_id,
    )
    completa = await servico_tarefas.obter_tarefa(contexto.usuario.id, tarefa_id)
    return montar_tarefa_resposta(completa.tarefa)
