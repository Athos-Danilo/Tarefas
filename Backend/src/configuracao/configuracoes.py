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
    open_meteo_forecast_url: str = "https://api.open-meteo.com/v1/forecast"
    open_meteo_geocoding_url: str = "https://geocoding-api.open-meteo.com/v1/search"
    open_meteo_timeout_segundos: float = 5.0
    clima_cache_ttl_segundos: int = 1200
    clima_cache_stale_segundos: int = 7200
    vapid_public_key: str | None = None
    vapid_private_key: str | None = None
    vapid_subject: str = "mailto:contato@lume.dev"
    token_cron_lembretes: str | None = None

    @property
    def lista_origens_cors(self) -> list[str]:
        return [item.strip() for item in self.origens_cors.split(",") if item.strip()]
