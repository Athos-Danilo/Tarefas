from typing import Annotated, cast

from fastapi import Depends, Request

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import ArmazenamentoAvatar, ProvedorGoogleOAuth
from contratos.clima import CacheClima, ProvedorClima
from contratos.persistencia import FabricaSessaoRelacional
from contratos.tarefas import ArmazenamentoDesfazerCascata
from dominio.erros import ErroDeDominio
from infraestrutura.mongo.conexao import GerenciadorMongo
from infraestrutura.mongo.limpador_conta_mongo import LimpadorContaMongo
from infraestrutura.mongo.repositorio_detalhes_tarefas_mongo import (
    RepositorioDetalhesTarefasMongo,
)
from infraestrutura.mongo.repositorio_eventos_ciclo_mongo import RepositorioEventosCicloMongo
from infraestrutura.mongo.repositorio_layouts_constelacao_mongo import (
    RepositorioLayoutsConstelacaoMongo,
)
from infraestrutura.mongo.repositorio_preferencias_mongo import RepositorioPreferenciasMongo
from infraestrutura.postgres.repositorio_etiquetas import RepositorioEtiquetasPostgres
from infraestrutura.postgres.repositorio_foco import RepositorioSessoesFocoPostgres
from infraestrutura.postgres.repositorio_grupos import RepositorioGruposPostgres
from infraestrutura.postgres.repositorio_sessoes import RepositorioSessoesPostgres
from infraestrutura.postgres.repositorio_tarefas import RepositorioTarefasPostgres
from infraestrutura.postgres.repositorio_usuarios import RepositorioUsuariosPostgres
from servicos.servico_autenticacao import ContextoAutenticado, ServicoAutenticacao
from servicos.servico_clima import ServicoClima
from servicos.servico_constelacoes import ServicoConstelacoes
from servicos.servico_conta import ServicoConta
from servicos.servico_etiquetas import ServicoEtiquetas
from servicos.servico_foco import ServicoFoco
from servicos.servico_grupos import ServicoGrupos
from servicos.servico_tarefas import ServicoTarefas

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


async def exigir_workspace_liberado(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_usuario_autenticado)],
) -> ContextoAutenticado:
    if not contexto.usuario.primeiro_acesso_concluido:
        raise ErroDeDominio(
            codigo="PRIMEIRO_ACESSO_PENDENTE",
            mensagem="Conclua o primeiro acesso antes de utilizar o workspace.",
            status_http=403,
        )
    return contexto


async def exigir_workspace_com_csrf(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_protecao_csrf)],
) -> ContextoAutenticado:
    if not contexto.usuario.primeiro_acesso_concluido:
        raise ErroDeDominio(
            codigo="PRIMEIRO_ACESSO_PENDENTE",
            mensagem="Conclua o primeiro acesso antes de utilizar o workspace.",
            status_http=403,
        )
    return contexto


def obter_servico_etiquetas(requisicao: Request) -> ServicoEtiquetas:
    fabrica = _obter_fabrica_postgres(requisicao)
    return ServicoEtiquetas(RepositorioEtiquetasPostgres(fabrica))


def obter_servico_tarefas(requisicao: Request) -> ServicoTarefas:
    fabrica = _obter_fabrica_postgres(requisicao)
    gerenciador_mongo = cast(
        GerenciadorMongo | None,
        getattr(requisicao.app.state, "gerenciador_mongo", None),
    )
    repo_detalhes = (
        RepositorioDetalhesTarefasMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    repo_eventos = (
        RepositorioEventosCicloMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    armazenamento_desfazer = cast(
        ArmazenamentoDesfazerCascata,
        requisicao.app.state.armazenamento_desfazer,
    )
    return ServicoTarefas(
        repositorio_tarefas=RepositorioTarefasPostgres(fabrica),
        repositorio_etiquetas=RepositorioEtiquetasPostgres(fabrica),
        repositorio_detalhes=repo_detalhes,
        repositorio_eventos=repo_eventos,
        armazenamento_desfazer=armazenamento_desfazer,
        repositorio_grupos=RepositorioGruposPostgres(fabrica),
    )


def obter_servico_grupos(requisicao: Request) -> ServicoGrupos:
    fabrica = _obter_fabrica_postgres(requisicao)
    gerenciador_mongo = cast(
        GerenciadorMongo | None,
        getattr(requisicao.app.state, "gerenciador_mongo", None),
    )
    repo_eventos = (
        RepositorioEventosCicloMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    repo_detalhes = (
        RepositorioDetalhesTarefasMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    return ServicoGrupos(
        repositorio_grupos=RepositorioGruposPostgres(fabrica),
        repositorio_eventos=repo_eventos,
        repositorio_detalhes=repo_detalhes,
    )


def obter_servico_clima(requisicao: Request) -> ServicoClima:
    config = obter_configuracoes(requisicao)
    provedor = cast(ProvedorClima, requisicao.app.state.provedor_clima)
    cache = cast(CacheClima, requisicao.app.state.cache_clima)
    gerenciador_mongo = cast(
        GerenciadorMongo | None,
        getattr(requisicao.app.state, "gerenciador_mongo", None),
    )
    repo_preferencias = (
        RepositorioPreferenciasMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    return ServicoClima(
        provedor_clima=provedor,
        cache_clima=cache,
        repositorio_preferencias=repo_preferencias,
        ttl_cache_segundos=config.clima_cache_ttl_segundos,
        ttl_stale_segundos=config.clima_cache_stale_segundos,
    )


def obter_servico_constelacoes(requisicao: Request) -> ServicoConstelacoes:
    fabrica = _obter_fabrica_postgres(requisicao)
    gerenciador_mongo = cast(
        GerenciadorMongo | None,
        getattr(requisicao.app.state, "gerenciador_mongo", None),
    )
    repo_layouts = (
        RepositorioLayoutsConstelacaoMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    return ServicoConstelacoes(
        repositorio_grupos=RepositorioGruposPostgres(fabrica),
        repositorio_layouts=repo_layouts,
        repositorio_tarefas=RepositorioTarefasPostgres(fabrica),
    )


def obter_servico_foco(requisicao: Request) -> ServicoFoco:
    fabrica = _obter_fabrica_postgres(requisicao)
    gerenciador_mongo = cast(
        GerenciadorMongo | None,
        getattr(requisicao.app.state, "gerenciador_mongo", None),
    )
    repo_eventos = (
        RepositorioEventosCicloMongo(gerenciador_mongo.obter_banco())
        if gerenciador_mongo is not None
        else None
    )
    return ServicoFoco(
        repositorio_foco=RepositorioSessoesFocoPostgres(fabrica),
        repositorio_grupos=RepositorioGruposPostgres(fabrica),
        repositorio_eventos=repo_eventos,
    )
