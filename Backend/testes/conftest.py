from urllib.parse import urlparse

import pytest

from configuracao.configuracoes import Configuracoes
from infraestrutura.postgres.politica_loop import configurar_loop_assincrono_windows

configurar_loop_assincrono_windows()


def _extrair_nome_banco(url: str) -> str:
    return urlparse(url).path.lstrip("/")


@pytest.fixture(scope="session")
def configuracoes_teste() -> Configuracoes:
    """Fornece configuracoes apontando estritamente para os bancos de teste isolados."""
    base = Configuracoes()
    assert base.postgres_teste_url, (
        "LUME_POSTGRES_TESTE_URL nao configurado para os testes de integracao."
    )
    assert base.mongo_url, "LUME_MONGO_URL nao configurado para os testes de integracao."

    nome_pg = _extrair_nome_banco(base.postgres_teste_url)
    assert nome_pg.endswith("_teste"), (
        f"Guarda de seguranca: banco relacional de teste '{nome_pg}' precisa terminar com '_teste'."
    )
    assert base.mongo_banco_teste.endswith("_teste"), (
        f"Guarda de seguranca: banco Mongo de teste '{base.mongo_banco_teste}' "
        "precisa terminar com '_teste'."
    )

    return Configuracoes(
        _env_file=None,
        ambiente="teste",
        nome_servico=base.nome_servico,
        versao_api=base.versao_api,
        origens_cors=base.origens_cors,
        postgres_url=base.postgres_teste_url,
        postgres_teste_url=base.postgres_teste_url,
        mongo_url=base.mongo_url,
        mongo_banco=base.mongo_banco_teste,
        mongo_banco_teste=base.mongo_banco_teste,
    )
