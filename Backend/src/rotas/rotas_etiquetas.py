from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, Response

from rotas.dependencias_autenticacao import (
    exigir_workspace_com_csrf,
    exigir_workspace_liberado,
    obter_servico_etiquetas,
)
from rotas.esquemas_tarefas import (
    EtiquetaResposta,
    RequisicaoAtualizarEtiqueta,
    RequisicaoCriarEtiqueta,
    RespostaListaEtiquetas,
    montar_etiqueta_resposta,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_etiquetas import ServicoEtiquetas

roteador_etiquetas = APIRouter(prefix="/api/etiquetas", tags=["Etiquetas"])


@roteador_etiquetas.get(
    "",
    response_model=RespostaListaEtiquetas,
    summary="Listar etiquetas do usuario",
)
async def listar_etiquetas(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoEtiquetas, Depends(obter_servico_etiquetas)],
) -> RespostaListaEtiquetas:
    itens = await servico.listar_etiquetas(contexto.usuario.id)
    return RespostaListaEtiquetas(itens=[montar_etiqueta_resposta(item) for item in itens])


@roteador_etiquetas.post(
    "",
    response_model=EtiquetaResposta,
    status_code=201,
    summary="Criar etiqueta nomeada",
)
async def criar_etiqueta(
    corpo: RequisicaoCriarEtiqueta,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoEtiquetas, Depends(obter_servico_etiquetas)],
) -> EtiquetaResposta:
    criada = await servico.criar_etiqueta(
        contexto.usuario.id,
        nome=corpo.nome,
        cor=corpo.cor,
    )
    return montar_etiqueta_resposta(criada)


@roteador_etiquetas.patch(
    "/{etiqueta_id}",
    response_model=EtiquetaResposta,
    summary="Atualizar nome ou cor de etiqueta",
)
async def atualizar_etiqueta(
    etiqueta_id: UUID,
    corpo: RequisicaoAtualizarEtiqueta,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoEtiquetas, Depends(obter_servico_etiquetas)],
) -> EtiquetaResposta:
    atualizada = await servico.atualizar_etiqueta(
        contexto.usuario.id,
        etiqueta_id,
        nome=corpo.nome,
        cor=corpo.cor,
    )
    return montar_etiqueta_resposta(atualizada)


@roteador_etiquetas.delete(
    "/{etiqueta_id}",
    status_code=204,
    summary="Excluir etiqueta e desvincular das tarefas",
)
async def excluir_etiqueta(
    etiqueta_id: UUID,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_com_csrf)],
    servico: Annotated[ServicoEtiquetas, Depends(obter_servico_etiquetas)],
) -> Response:
    await servico.excluir_etiqueta(contexto.usuario.id, etiqueta_id)
    return Response(status_code=204)
