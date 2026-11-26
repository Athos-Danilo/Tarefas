from configuracao.configuracoes import Configuracoes
from infraestrutura.postgres.conexao import normalizar_url_postgres


def test_normalizar_url_postgres_converte_prefixos_de_nuvem_e_preserva_driver() -> None:
    assert (
        normalizar_url_postgres(
            "postgresql://usuario:senha@ep-demo.us-east-2.aws.neon.tech/neondb?sslmode=require"
        )
        == "postgresql+psycopg://usuario:senha@ep-demo.us-east-2.aws.neon.tech/neondb?sslmode=require"
    )
    assert (
        normalizar_url_postgres("postgres://usuario:senha@host:5432/lume")
        == "postgresql+psycopg://usuario:senha@host:5432/lume"
    )
    assert (
        normalizar_url_postgres("  postgresql+psycopg://u:s@127.0.0.1:5432/lume_dev  ")
        == "postgresql+psycopg://u:s@127.0.0.1:5432/lume_dev"
    )


def test_configuracoes_padrao_possuem_timeouts_de_nuvem() -> None:
    config = Configuracoes()
    assert config.postgres_timeout_segundos == 10
    assert config.mongo_timeout_ms == 10000
