from pydantic_settings import BaseSettings, SettingsConfigDict


class Configuracoes(BaseSettings):
    """Configuracoes da aplicacao carregadas por ambiente sem segredos em codigo."""

    model_config = SettingsConfigDict(
        env_prefix="LUME_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    ambiente: str = "desenvolvimento"
    nome_servico: str = "lume-api"
    versao_api: str = "0.1.0"
    origens_cors: str = "http://localhost:5173,http://127.0.0.1:5173"
    postgres_url: str | None = None
    postgres_teste_url: str | None = None
    mongo_url: str | None = None
    mongo_banco: str = "lume_dev"
    mongo_banco_teste: str = "tarefas_teste"
    google_client_id: str | None = None
    google_client_secret: str | None = None
    google_redirect_uri: str = "http://localhost:5173/api/autenticacao/google/callback"
    segredo_sessao: str = "segredo-desenvolvimento-local-alterar-em-producao-32b"
    cookie_seguro: bool = False
    diretorio_uploads: str = "uploads"

    @property
    def lista_origens_cors(self) -> list[str]:
        return [item.strip() for item in self.origens_cors.split(",") if item.strip()]
