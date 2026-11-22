from collections.abc import AsyncIterator
from contextlib import asynccontextmanager, suppress

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import ProvedorGoogleOAuth
from contratos.verificador_saude import VerificadorDeDependencia
from dominio.erros import ErroDeDominio
from infraestrutura.armazenamento_avatar import ArmazenamentoAvatarLocal
from infraestrutura.armazenamento_desfazer import ArmazenamentoDesfazerMemoria
from infraestrutura.google.provedor_google_oauth import ProvedorGoogleOAuthReal
from infraestrutura.mongo.conexao import GerenciadorMongo
from infraestrutura.mongo.verificador_mongo import VerificadorMongo
from infraestrutura.postgres.conexao import FabricaPostgres
from infraestrutura.postgres.politica_loop import configurar_loop_assincrono_windows
from infraestrutura.postgres.verificador_postgres import VerificadorPostgres
from infraestrutura.verificadores_iniciais import VerificadorAindaNaoConfigurado
from rotas.esquemas_saude import DetalheErro, EnvelopeErro
from rotas.rotas_autenticacao import roteador_autenticacao
from rotas.rotas_conta import roteador_conta
from rotas.rotas_etiquetas import roteador_etiquetas
from rotas.rotas_exportacao import roteador_exportacao
from rotas.rotas_grupos import roteador_grupos
from rotas.rotas_saude import roteador_saude
from rotas.rotas_tarefas import roteador_tarefas


def criar_aplicacao(
    configuracoes: Configuracoes | None = None,
    verificador_relacional: VerificadorDeDependencia | None = None,
    verificador_documental: VerificadorDeDependencia | None = None,
    provedor_google: ProvedorGoogleOAuth | None = None,
) -> FastAPI:
    """Fabrica da aplicacao FastAPI com injecao explicita e ciclo de vida dos bancos."""
    configurar_loop_assincrono_windows()
    config = configuracoes or Configuracoes()

    @asynccontextmanager
    async def ciclo_de_vida(app: FastAPI) -> AsyncIterator[None]:
        fabrica_pg: FabricaPostgres | None = None
        gerenciador_mongo: GerenciadorMongo | None = None

        if verificador_relacional is None and config.postgres_url:
            fabrica_pg = FabricaPostgres(config.postgres_url)
            app.state.fabrica_postgres = fabrica_pg
            app.state.verificador_relacional = VerificadorPostgres(fabrica_pg)

        if verificador_documental is None and config.mongo_url:
            gerenciador_mongo = GerenciadorMongo(config.mongo_url, config.mongo_banco)
            app.state.gerenciador_mongo = gerenciador_mongo
            app.state.verificador_documental = VerificadorMongo(gerenciador_mongo)
            # Permite /api/saude reportar "indisponivel" sem travar a inicializacao.
            with suppress(PyMongoError, OSError, TimeoutError):
                await gerenciador_mongo.garantir_indices()

        try:
            yield
        finally:
            if gerenciador_mongo is not None:
                await gerenciador_mongo.fechar()
            if fabrica_pg is not None:
                await fabrica_pg.fechar()

    aplicacao = FastAPI(
        title="Lume API",
        description="API do gerenciador de tarefas pessoais Lume (Horizonte Vivo).",
        version=config.versao_api,
        lifespan=ciclo_de_vida,
    )

    aplicacao.state.configuracoes = config
    aplicacao.state.fabrica_postgres = None
    aplicacao.state.gerenciador_mongo = None
    aplicacao.state.provedor_google = provedor_google or ProvedorGoogleOAuthReal(config)
    aplicacao.state.armazenamento_avatar = ArmazenamentoAvatarLocal(config.diretorio_uploads)
    aplicacao.state.armazenamento_desfazer = ArmazenamentoDesfazerMemoria()
    aplicacao.state.verificador_relacional = (
        verificador_relacional or VerificadorAindaNaoConfigurado()
    )
    aplicacao.state.verificador_documental = (
        verificador_documental or VerificadorAindaNaoConfigurado()
    )

    aplicacao.add_middleware(
        CORSMiddleware,
        allow_origins=config.lista_origens_cors,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @aplicacao.exception_handler(ErroDeDominio)
    async def tratar_erro_de_dominio(
        _requisicao: Request,
        erro: ErroDeDominio,
    ) -> JSONResponse:
        envelope = EnvelopeErro(
            erro=DetalheErro(
                codigo=erro.codigo,
                mensagem=erro.mensagem,
                detalhes=erro.detalhes,
            )
        )
        return JSONResponse(status_code=erro.status_http, content=envelope.model_dump())

    @aplicacao.exception_handler(RequestValidationError)
    async def tratar_erro_de_validacao(
        _requisicao: Request,
        erro: RequestValidationError,
    ) -> JSONResponse:
        campos = [
            {
                "local": [str(parte) for parte in falha.get("loc", ())],
                "mensagem": str(falha.get("msg", "")),
                "tipo": str(falha.get("type", "")),
            }
            for falha in erro.errors()
        ]
        envelope = EnvelopeErro(
            erro=DetalheErro(
                codigo="VALIDACAO_INVALIDA",
                mensagem="Os dados enviados na requisicao sao invalidos.",
                detalhes={"campos": campos},
            )
        )
        return JSONResponse(status_code=422, content=envelope.model_dump())

    aplicacao.include_router(roteador_saude)
    aplicacao.include_router(roteador_autenticacao)
    aplicacao.include_router(roteador_conta)
    aplicacao.include_router(roteador_etiquetas)
    aplicacao.include_router(roteador_tarefas)
    aplicacao.include_router(roteador_grupos)
    aplicacao.include_router(roteador_exportacao)
    return aplicacao


app = criar_aplicacao()
