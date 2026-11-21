from uuid import uuid4

from fastapi.testclient import TestClient

from configuracao.configuracoes import Configuracoes
from infraestrutura.mongo.conexao import GerenciadorMongo
from infraestrutura.mongo.indices import (
    COLECAO_DETALHES_TAREFAS,
    COLECAO_EVENTOS_CICLO,
    COLECAO_LAYOUTS_CONSTELACAO,
    COLECAO_PREFERENCIAS_CENARIO,
)
from infraestrutura.mongo.repositorio_preferencias_mongo import RepositorioPreferenciasMongo
from infraestrutura.mongo.verificador_mongo import VerificadorMongo
from infraestrutura.postgres.migracoes import aplicar_migracoes
from principal import criar_aplicacao


async def test_mongo_garante_indices_nas_quatro_colecoes(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.mongo_url is not None
    gerenciador = GerenciadorMongo(
        url=configuracoes_teste.mongo_url,
        nome_banco=configuracoes_teste.mongo_banco_teste,
    )
    try:
        assert await gerenciador.verificar_conexao() is True
        await gerenciador.garantir_indices()

        banco = gerenciador.obter_banco()
        indices_detalhes = await banco[COLECAO_DETALHES_TAREFAS].index_information()
        indices_layouts = await banco[COLECAO_LAYOUTS_CONSTELACAO].index_information()
        indices_eventos = await banco[COLECAO_EVENTOS_CICLO].index_information()
        indices_preferencias = await banco[COLECAO_PREFERENCIAS_CENARIO].index_information()

        assert "uq_detalhes_tarefa_id" in indices_detalhes
        assert "uq_layout_usuario_raiz" in indices_layouts
        assert "ix_eventos_usuario_criado_em" in indices_eventos
        assert "uq_preferencias_usuario_id" in indices_preferencias
    finally:
        await gerenciador.fechar()


async def test_repositorio_preferencias_mongo_fallback_salvar_e_remover(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.mongo_url is not None
    gerenciador = GerenciadorMongo(
        url=configuracoes_teste.mongo_url,
        nome_banco=configuracoes_teste.mongo_banco_teste,
    )
    usuario_id = str(uuid4())
    try:
        await gerenciador.garantir_indices()
        repositorio = RepositorioPreferenciasMongo(gerenciador.obter_banco())

        padrao = await repositorio.obter_ou_padrao(usuario_id)
        assert padrao["usuario_id"] == usuario_id
        assert padrao["clima"]["habilitado"] is False
        assert padrao["audio"]["habilitado"] is False

        padrao["modo_temporal"] = "simulador"
        padrao["hora_simulada"] = "18:15"
        padrao["clima"] = {
            "habilitado": True,
            "modo_localizacao": "manual",
            "cidade": "Brasilia",
            "uf": "DF",
            "latitude_aprox": -15.79,
            "longitude_aprox": -47.88,
        }
        await repositorio.salvar(padrao)

        padrao["hora_simulada"] = "20:45"
        await repositorio.salvar(padrao)

        colecao = gerenciador.obter_banco()[COLECAO_PREFERENCIAS_CENARIO]
        assert await colecao.count_documents({"usuario_id": usuario_id}) == 1

        lido = await repositorio.obter_ou_padrao(usuario_id)
        assert lido["modo_temporal"] == "simulador"
        assert lido["hora_simulada"] == "20:45"
        assert lido["clima"]["habilitado"] is True
        assert lido["clima"]["cidade"] == "Brasilia"

        removido = await repositorio.remover_por_usuario(usuario_id)
        assert removido is True
        assert await colecao.count_documents({"usuario_id": usuario_id}) == 0

        pos_remocao = await repositorio.obter_ou_padrao(usuario_id)
        assert pos_remocao["clima"]["habilitado"] is False
    finally:
        await gerenciador.obter_banco()[COLECAO_PREFERENCIAS_CENARIO].delete_many(
            {"usuario_id": usuario_id}
        )
        await gerenciador.fechar()


async def test_verificador_mongo_reporta_conectado_e_indisponivel(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.mongo_url is not None
    gerenciador_ok = GerenciadorMongo(
        url=configuracoes_teste.mongo_url,
        nome_banco=configuracoes_teste.mongo_banco_teste,
    )
    gerenciador_ruim = GerenciadorMongo(
        url="mongodb://127.0.0.1:27999",
        nome_banco=configuracoes_teste.mongo_banco_teste,
        timeout_ms=250,
    )
    try:
        assert await VerificadorMongo(gerenciador_ok).verificar() == "conectado"
        assert await VerificadorMongo(gerenciador_ruim).verificar() == "indisponivel"
    finally:
        await gerenciador_ok.fechar()
        await gerenciador_ruim.fechar()


def test_api_saude_reporta_bancos_conectados_com_lifespan_real(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    app = criar_aplicacao(configuracoes=configuracoes_teste)
    with TestClient(app) as cliente:
        resposta = cliente.get("/api/saude")

    assert resposta.status_code == 200
    dados = resposta.json()
    assert dados["status"] == "ok"
    assert dados["banco_relacional"] == "conectado"
    assert dados["banco_documental"] == "conectado"
