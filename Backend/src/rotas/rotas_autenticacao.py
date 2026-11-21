from typing import Annotated

from fastapi import APIRouter, Depends, Query, Request, Response
from fastapi.responses import RedirectResponse

from configuracao.configuracoes import Configuracoes
from rotas.dependencias_autenticacao import (
    COOKIE_CSRF,
    COOKIE_OAUTH_ESTADO,
    COOKIE_SESSAO,
    exigir_protecao_csrf,
    exigir_usuario_autenticado,
    obter_configuracoes,
    obter_servico_autenticacao,
)
from rotas.esquemas_autenticacao import (
    RespostaSairTodos,
    RespostaSessao,
    SessaoResumo,
    formatar_instante_iso_utc,
    montar_usuario_resumo,
)
from servicos.servico_autenticacao import ContextoAutenticado, ServicoAutenticacao

roteador_autenticacao = APIRouter(prefix="/api/autenticacao", tags=["Autenticacao"])
IDADE_MAXIMA_COOKIE_SESSAO_SEG = 7 * 24 * 60 * 60


def _limpar_cookies_sessao(resposta: Response, config: Configuracoes) -> None:
    resposta.delete_cookie(
        key=COOKIE_SESSAO,
        path="/",
        httponly=True,
        samesite="lax",
        secure=config.cookie_seguro,
    )
    resposta.delete_cookie(
        key=COOKIE_CSRF,
        path="/",
        httponly=False,
        samesite="lax",
        secure=config.cookie_seguro,
    )


@roteador_autenticacao.get("/google/iniciar", summary="Iniciar login com Google OAuth")
async def iniciar_login_google(
    servico: Annotated[ServicoAutenticacao, Depends(obter_servico_autenticacao)],
    config: Annotated[Configuracoes, Depends(obter_configuracoes)],
) -> RedirectResponse:
    url_autorizacao, token_estado = servico.iniciar_login()
    resposta = RedirectResponse(url=url_autorizacao, status_code=302)
    resposta.set_cookie(
        key=COOKIE_OAUTH_ESTADO,
        value=token_estado,
        max_age=600,
        httponly=True,
        samesite="lax",
        secure=config.cookie_seguro,
        path="/",
    )
    return resposta


@roteador_autenticacao.get("/google/callback", summary="Callback do Google OAuth 2.0")
async def callback_login_google(
    requisicao: Request,
    servico: Annotated[ServicoAutenticacao, Depends(obter_servico_autenticacao)],
    config: Annotated[Configuracoes, Depends(obter_configuracoes)],
    code: Annotated[str | None, Query()] = None,
    state: Annotated[str | None, Query()] = None,
) -> RedirectResponse:
    token_assinado = requisicao.cookies.get(COOKIE_OAUTH_ESTADO)
    resultado = await servico.concluir_callback(
        codigo=code,
        estado_recebido=state,
        token_assinado=token_assinado,
    )
    resposta = RedirectResponse(url=resultado.redirecionar_para, status_code=302)
    resposta.delete_cookie(key=COOKIE_OAUTH_ESTADO, path="/")
    resposta.set_cookie(
        key=COOKIE_SESSAO,
        value=resultado.token_sessao_bruto,
        max_age=IDADE_MAXIMA_COOKIE_SESSAO_SEG,
        httponly=True,
        samesite="lax",
        secure=config.cookie_seguro,
        path="/",
    )
    resposta.set_cookie(
        key=COOKIE_CSRF,
        value=resultado.token_csrf_bruto,
        max_age=IDADE_MAXIMA_COOKIE_SESSAO_SEG,
        httponly=False,
        samesite="lax",
        secure=config.cookie_seguro,
        path="/",
    )
    return resposta


@roteador_autenticacao.get(
    "/sessao",
    response_model=RespostaSessao,
    summary="Consultar sessao autenticada",
)
async def consultar_sessao(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
) -> RespostaSessao:
    return RespostaSessao(
        autenticado=True,
        usuario=montar_usuario_resumo(contexto.usuario),
        sessao=SessaoResumo(
            expira_em=formatar_instante_iso_utc(contexto.sessao.expira_em),
            expiracao_absoluta_em=formatar_instante_iso_utc(contexto.sessao.expiracao_absoluta_em),
        ),
    )


@roteador_autenticacao.post("/sair", status_code=204, summary="Encerrar sessao atual")
async def sair_sessao_atual(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoAutenticacao, Depends(obter_servico_autenticacao)],
    config: Annotated[Configuracoes, Depends(obter_configuracoes)],
) -> Response:
    await servico.sair(contexto.sessao.id)
    resposta = Response(status_code=204)
    _limpar_cookies_sessao(resposta, config)
    return resposta


@roteador_autenticacao.post(
    "/sair-todos",
    response_model=RespostaSairTodos,
    summary="Revogar todas as sessoes da conta",
)
async def sair_todas_sessoes(
    resposta: Response,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
    servico: Annotated[ServicoAutenticacao, Depends(obter_servico_autenticacao)],
    config: Annotated[Configuracoes, Depends(obter_configuracoes)],
) -> RespostaSairTodos:
    total = await servico.sair_todos(contexto.usuario.id)
    _limpar_cookies_sessao(resposta, config)
    return RespostaSairTodos(sessoes_revogadas=total)
