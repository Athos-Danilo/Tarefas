import asyncio
from collections.abc import Callable
from typing import Any, cast
from urllib.parse import urlencode

import httpx
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import IdentidadeGoogle
from dominio.erros import ErroDeDominio

URL_AUTORIZACAO_GOOGLE = "https://accounts.google.com/o/oauth2/v2/auth"
URL_TROCA_TOKEN_GOOGLE = "https://oauth2.googleapis.com/token"


class ProvedorGoogleOAuthReal:
    """Adaptador oficial para Google OAuth 2.0 (Authorization Code + PKCE)."""

    def __init__(self, configuracoes: Configuracoes) -> None:
        self._config = configuracoes

    def _exigir_credenciais(self) -> tuple[str, str]:
        if not self._config.google_client_id or not self._config.google_client_secret:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Credenciais Google OAuth ainda nao configuradas no servidor.",
                status_http=503,
            )
        return self._config.google_client_id, self._config.google_client_secret

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        client_id, _ = self._exigir_credenciais()
        parametros = {
            "client_id": client_id,
            "redirect_uri": self._config.google_redirect_uri,
            "response_type": "code",
            "scope": "openid email profile",
            "state": state,
            "code_challenge": code_challenge,
            "code_challenge_method": "S256",
            "access_type": "online",
            "prompt": "select_account",
        }
        return f"{URL_AUTORIZACAO_GOOGLE}?{urlencode(parametros)}"

    async def trocar_codigo_por_usuario(
        self,
        codigo: str,
        code_verifier: str,
    ) -> IdentidadeGoogle:
        client_id, client_secret = self._exigir_credenciais()

        try:
            async with httpx.AsyncClient(timeout=10.0) as cliente:
                resposta = await cliente.post(
                    URL_TROCA_TOKEN_GOOGLE,
                    data={
                        "code": codigo,
                        "client_id": client_id,
                        "client_secret": client_secret,
                        "redirect_uri": self._config.google_redirect_uri,
                        "grant_type": "authorization_code",
                        "code_verifier": code_verifier,
                    },
                )
        except httpx.HTTPError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel comunicar com o servico de autenticacao Google.",
                status_http=503,
            ) from falha

        if resposta.status_code != 200:
            raise ErroDeDominio(
                codigo="OAUTH_INVALIDO",
                mensagem="Falha ao validar codigo de autorizacao com o Google.",
                status_http=401,
            )

        dados = resposta.json()
        token_bruto = dados.get("id_token") if isinstance(dados, dict) else None
        if not isinstance(token_bruto, str):
            raise ErroDeDominio(
                codigo="OAUTH_INVALIDO",
                mensagem="Resposta Google sem token de identidade valido.",
                status_http=401,
            )

        try:
            claims = await asyncio.to_thread(
                self._verificar_id_token,
                token_bruto,
                client_id,
            )
        except ValueError as falha:
            raise ErroDeDominio(
                codigo="OAUTH_INVALIDO",
                mensagem="Token de identidade Google invalido ou expirado.",
                status_http=401,
            ) from falha

        sub = str(claims.get("sub", ""))
        email = str(claims.get("email", ""))
        email_verificado = bool(claims.get("email_verified", False))
        nome = str(claims.get("name") or email.split("@")[0] or "Pessoa Usuaria")
        foto = claims.get("picture")
        return IdentidadeGoogle(
            google_sub=sub,
            email=email,
            email_verificado=email_verificado,
            nome_sugerido=nome[:60],
            foto_url=str(foto) if isinstance(foto, str) else None,
        )

    @staticmethod
    def _verificar_id_token(token_bruto: str, client_id: str) -> dict[str, Any]:
        transporte = google_requests.Request()
        verificar_token = cast(
            Callable[[str, object, str], dict[str, Any]],
            google_id_token.verify_oauth2_token,
        )
        return verificar_token(token_bruto, transporte, client_id)
