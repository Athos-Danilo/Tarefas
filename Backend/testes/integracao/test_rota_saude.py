from fastapi import Query
from fastapi.testclient import TestClient

from configuracao.configuracoes import Configuracoes
from dominio.erros import ErroDeDominio
from principal import criar_aplicacao
from rotas.rotas_saude import obter_servico_de_saude
from servicos.servico_de_saude import ServicoDeSaude
from testes.unitarios.test_servico_de_saude import VerificadorEmMemoria


def test_get_api_saude_retorna_contrato_inicial_em_portugues() -> None:
    app = criar_aplicacao(
        configuracoes=Configuracoes(_env_file=None, postgres_url=None, mongo_url=None)
    )
    cliente = TestClient(app)

    resposta = cliente.get("/api/saude")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert set(dados.keys()) == {
        "status",
        "servico",
        "versao",
        "banco_relacional",
        "banco_documental",
        "timestamp",
    }
    assert dados["status"] == "ok"
    assert dados["servico"] == "lume-api"
    assert dados["versao"] == "0.1.0"
    assert dados["banco_relacional"] == "nao_configurado"
    assert dados["banco_documental"] == "nao_configurado"
    assert isinstance(dados["timestamp"], str)
    assert dados["timestamp"].endswith("Z")


def test_get_api_saude_reporta_degradado_quando_dependencia_falha() -> None:
    config_sem_banco = Configuracoes(_env_file=None, postgres_url=None, mongo_url=None)
    app = criar_aplicacao(configuracoes=config_sem_banco)
    servico_degradado = ServicoDeSaude(
        configuracoes=config_sem_banco,
        verificador_relacional=VerificadorEmMemoria("indisponivel"),
        verificador_documental=VerificadorEmMemoria("conectado"),
    )
    app.dependency_overrides[obter_servico_de_saude] = lambda: servico_degradado

    cliente = TestClient(app)
    resposta = cliente.get("/api/saude")

    assert resposta.status_code == 200
    assert resposta.json()["status"] == "degradado"


def test_envelope_de_erro_padronizado_para_erro_de_dominio_e_validacao() -> None:
    app = criar_aplicacao(
        configuracoes=Configuracoes(_env_file=None, postgres_url=None, mongo_url=None)
    )

    @app.get("/api/_teste-dominio")
    async def rota_dominio() -> None:
        raise ErroDeDominio(
            codigo="PROFUNDIDADE_EXCEDIDA",
            mensagem="A arvore permite no maximo 5 niveis.",
            status_http=422,
            detalhes={"profundidade_maxima": 5},
        )

    @app.get("/api/_teste-validacao")
    async def rota_validacao(limite: int = Query(ge=1)) -> dict[str, int]:
        return {"limite": limite}

    cliente = TestClient(app)

    resp_dom = cliente.get("/api/_teste-dominio")
    assert resp_dom.status_code == 422
    assert resp_dom.json() == {
        "erro": {
            "codigo": "PROFUNDIDADE_EXCEDIDA",
            "mensagem": "A arvore permite no maximo 5 niveis.",
            "detalhes": {"profundidade_maxima": 5},
        }
    }

    resp_val = cliente.get("/api/_teste-validacao?limite=0")
    assert resp_val.status_code == 422
    corpo_val = resp_val.json()
    assert corpo_val["erro"]["codigo"] == "VALIDACAO_INVALIDA"
    assert isinstance(corpo_val["erro"]["mensagem"], str)
    assert "campos" in corpo_val["erro"]["detalhes"]
