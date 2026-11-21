from typing import Annotated, cast

from fastapi import Depends, Request

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import ArmazenamentoAvatar, ProvedorGoogleOAuth
from contratos.persistencia import FabricaSessaoRelacional
from dominio.erros import ErroDeDominio
from infraestrutura.mongo.conexao import GerenciadorMongo
from infraestrutura.mongo.limpador_conta_mongo import LimpadorContaMongo
from infraestrutura.mongo.repositorio_preferencias_mongo import RepositorioPreferenciasMongo
from infraestrutura.postgres.repositorio_sessoes import RepositorioSessoesPostgres
from infraestrutura.postgres.repositorio_usuarios import RepositorioUsuariosPostgres
from servicos.servico_autenticacao import ContextoAutenticado, ServicoAutenticacao
from servicos.servico_conta import ServicoConta

COOKIE_SESSAO = "lume_sessao"
COOKIE_CSRF = "lume_csrf"
COOKIE_OAUTH_ESTADO = "lume_oauth_estado"


def _obter_fabrica_postgres(requisicao: Request) -> FabricaSessaoRelacional:
    fabrica = getattr(requisicao.app.state, "fabrica_postgres", None)
    if fabrica is None:
        raise ErroDeDominio(
            codigo="SERVICO_EXTERNO_INDISPONIVEL",
            mensagem="Banco relacional nao configurado para operacoes de conta.",
            status_http=503,
        )
    return cast(FabricaSessaoRelacional, fabrica)


def obter_configuracoes(requisicao: Request) -> Configuracoes:
    return cast(Configuracoes, requisicao.app.state.configuracoes)


def obter_servico_autenticacao(requisicao: Request) -> ServicoAutenticacao:
    config = obter_configuracoes(requisicao)
    fabrica = _obter_fabrica_postgres(requisicao)
    provedor = cast(ProvedorGoogleOAuth, requisicao.app.state.provedor_google)
    return ServicoAutenticacao(
        configuracoes=config,
        provedor_google=provedor,
        repositorio_usuarios=RepositorioUsuariosPostgres(fabrica),
        repositorio_sessoes=RepositorioSessoesPostgres(fabrica),
    )


def obter_servico_conta(requisicao: Request) -> ServicoConta:
    fabrica = _obter_fabrica_postgres(requisicao)
    armazenamento = cast(ArmazenamentoAvatar, requisicao.app.state.armazenamento_avatar)
    gerenciador_mongo = cast(
        GerenciadorMongo | None,
        getattr(requisicao.app.state, "gerenciador_mongo", None),
    )
    repo_prefs = (
        RepositorioPreferenciasMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    limpador = (
        LimpadorContaMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    return ServicoConta(
        repositorio_usuarios=RepositorioUsuariosPostgres(fabrica),
        armazenamento_avatar=armazenamento,
        repositorio_preferencias=repo_prefs,
        limpador_documental=limpador,
    )


async def exigir_usuario_autenticado(
    requisicao: Request,
    servico: Annotated[ServicoAutenticacao, Depends(obter_servico_autenticacao)],
) -> ContextoAutenticado:
    token_bruto = requisicao.cookies.get(COOKIE_SESSAO)
    return await servico.validar_sessao(token_bruto)


async def exigir_protecao_csrf(
    requisicao: Request,
    contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
    servico: Annotated[ServicoAutenticacao, Depends(obter_servico_autenticacao)],
) -> ContextoAutenticado:
    csrf_cabecalho = requisicao.headers.get("X-CSRF-Token")
    csrf_cookie = requisicao.cookies.get(COOKIE_CSRF)
    servico.validar_csrf(contexto.sessao, csrf_cabecalho, csrf_cookie)
    return contexto
