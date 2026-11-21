from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from configuracao.configuracoes import Configuracoes
from contratos.verificador_saude import VerificadorDeDependencia
from dominio.erros import ErroDeDominio
from infraestrutura.verificadores_iniciais import VerificadorAindaNaoConfigurado
from rotas.esquemas_saude import DetalheErro, EnvelopeErro
from rotas.rotas_saude import roteador_saude


def criar_aplicacao(
    configuracoes: Configuracoes | None = None,
    verificador_relacional: VerificadorDeDependencia | None = None,
    verificador_documental: VerificadorDeDependencia | None = None,
) -> FastAPI:
    """Fabrica da aplicacao FastAPI com injecao explicita de configuracao e portas."""
    config = configuracoes or Configuracoes()
    aplicacao = FastAPI(
        title="Lume API",
        description="API do gerenciador de tarefas pessoais Lume (Horizonte Vivo).",
        version=config.versao_api,
    )

    aplicacao.state.configuracoes = config
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
    return aplicacao


app = criar_aplicacao()
