from typing import Annotated

from fastapi import APIRouter, Depends, File, Response, UploadFile

from configuracao.configuracoes import Configuracoes
from dominio.autenticacao import (
    DIMENSAO_AVATAR_PX,
    TAMANHO_MAXIMO_AVATAR_BYTES,
    resolver_url_avatar,
)
from rotas.dependencias_autenticacao import (
    exigir_protecao_csrf,
    exigir_usuario_autenticado,
    obter_configuracoes,
    obter_servico_conta,
)
from rotas.esquemas_autenticacao import (
    RequisicaoAtualizarPerfil,
    RequisicaoExcluirConta,
    RequisicaoPrimeiroAcesso,
    RespostaAvatarUpload,
    RespostaExcluirConta,
    RespostaPerfil,
    RespostaPrimeiroAcesso,
    montar_usuario_resumo,
)
from rotas.rotas_autenticacao import _limpar_cookies_sessao
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_conta import ServicoConta

roteador_conta = APIRouter(prefix="/api/conta", tags=["Conta"])


@roteador_conta.post(
    "/primeiro-acesso",
    response_model=RespostaPrimeiroAcesso,
    summary="Concluir configuracao de primeiro acesso",
)
async def concluir_primeiro_acesso(
    corpo: RequisicaoPrimeiroAcesso,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoConta, Depends(obter_servico_conta)],
) -> RespostaPrimeiroAcesso:
    usuario, tarefa_guia_id = await servico.concluir_primeiro_acesso(
        usuario_id=contexto.usuario.id,
        nome_exibicao=corpo.nome_exibicao,
        avatar_tipo=corpo.avatar_tipo,
        avatar_id=corpo.avatar_id,
        criar_arvore_guia=corpo.criar_arvore_guia,
    )
    return RespostaPrimeiroAcesso(
        primeiro_acesso_concluido=usuario.primeiro_acesso_concluido,
        arvore_guia_criada=tarefa_guia_id is not None,
        tarefa_guia_id=tarefa_guia_id,
    )


@roteador_conta.get(
    "/perfil",
    response_model=RespostaPerfil,
    summary="Consultar perfil da conta",
)
async def consultar_perfil(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
    servico: Annotated[ServicoConta, Depends(obter_servico_conta)],
) -> RespostaPerfil:
    usuario = await servico.obter_perfil(contexto.usuario.id)
    resumo = montar_usuario_resumo(usuario)
    return RespostaPerfil(**resumo.model_dump())


@roteador_conta.patch(
    "/perfil",
    response_model=RespostaPerfil,
    summary="Atualizar nome e avatar do perfil",
)
async def atualizar_perfil(
    corpo: RequisicaoAtualizarPerfil,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoConta, Depends(obter_servico_conta)],
) -> RespostaPerfil:
    usuario = await servico.atualizar_perfil(
        usuario_id=contexto.usuario.id,
        nome_exibicao=corpo.nome_exibicao,
        avatar_tipo=corpo.avatar_tipo,
        avatar_id=corpo.avatar_id,
    )
    resumo = montar_usuario_resumo(usuario)
    return RespostaPerfil(**resumo.model_dump())


@roteador_conta.post(
    "/avatar",
    response_model=RespostaAvatarUpload,
    summary="Enviar avatar proprio (redimensionado para WebP 256x256)",
)
async def enviar_avatar(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoConta, Depends(obter_servico_conta)],
    arquivo: Annotated[UploadFile, File()],
) -> RespostaAvatarUpload:
    conteudo = await arquivo.read(TAMANHO_MAXIMO_AVATAR_BYTES + 1024)
    usuario = await servico.enviar_avatar(contexto.usuario.id, conteudo)
    avatar_url = (
        resolver_url_avatar(
            avatar_tipo=usuario.avatar_tipo,
            avatar_id=usuario.avatar_id,
            foto_google_url=usuario.foto_google_url,
            avatar_arquivo=usuario.avatar_arquivo,
            versao_cache=int(usuario.atualizado_em.timestamp()),
        )
        or "/api/conta/avatar/atual"
    )
    return RespostaAvatarUpload(
        avatar_tipo="upload",
        avatar_url=avatar_url,
        largura=DIMENSAO_AVATAR_PX,
        altura=DIMENSAO_AVATAR_PX,
    )


@roteador_conta.get(
    "/avatar/atual",
    summary="Baixar avatar personalizado da conta autenticada",
)
async def obter_avatar_atual(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
    servico: Annotated[ServicoConta, Depends(obter_servico_conta)],
) -> Response:
    conteudo = await servico.ler_avatar_atual(contexto.usuario.id)
    return Response(content=conteudo, media_type="image/webp")


@roteador_conta.post(
    "/excluir",
    response_model=RespostaExcluirConta,
    summary="Excluir conta e todos os dados pessoais em definitivo",
)
async def excluir_conta(
    corpo: RequisicaoExcluirConta,
    resposta: Response,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoConta, Depends(obter_servico_conta)],
    config: Annotated[Configuracoes, Depends(obter_configuracoes)],
) -> RespostaExcluirConta:
    await servico.excluir_conta_definitiva(contexto.usuario.id, corpo.confirmacao)
    _limpar_cookies_sessao(resposta, config)
    return RespostaExcluirConta(
        conta_excluida=True,
        mensagem="Conta e todos os dados pessoais removidos em definitivo.",
    )
