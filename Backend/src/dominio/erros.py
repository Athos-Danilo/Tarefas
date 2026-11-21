from typing import Any


class ErroDeDominio(Exception):
    """Excecao base de regras de negocio traduzida para o envelope padrao da API."""

    def __init__(
        self,
        codigo: str,
        mensagem: str,
        status_http: int = 400,
        detalhes: dict[str, Any] | None = None,
    ) -> None:
        super().__init__(mensagem)
        self.codigo = codigo
        self.mensagem = mensagem
        self.status_http = status_http
        self.detalhes = detalhes
