from pathlib import Path

from alembic.config import Config

from alembic import command

RAIZ_BACKEND = Path(__file__).resolve().parents[3]


def _criar_config_alembic(url_banco: str) -> Config:
    caminho_ini = RAIZ_BACKEND / "alembic.ini"
    caminho_scripts = RAIZ_BACKEND / "alembic"
    config = Config(str(caminho_ini))
    config.set_main_option("script_location", str(caminho_scripts))
    config.set_main_option("sqlalchemy.url", url_banco)
    return config


def aplicar_migracoes(url_banco: str, revisao: str = "head") -> None:
    """Executa upgrade do Alembic no banco informado."""
    config = _criar_config_alembic(url_banco)
    command.upgrade(config, revisao)


def reverter_migracoes(url_banco: str, revisao: str = "base") -> None:
    """Executa downgrade do Alembic no banco informado."""
    config = _criar_config_alembic(url_banco)
    command.downgrade(config, revisao)
