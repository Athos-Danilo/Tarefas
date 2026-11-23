import asyncio
import json
from typing import Any

from pywebpush import WebPushException, webpush

from configuracao.configuracoes import Configuracoes
from contratos.push import InscricaoPushRegistro, ResultadoEnvioPush


class AdaptadorPyWebPush:
    """Adaptador assincrono sobre pywebpush (VAPID) com deteccao de inscricao expirada."""

    def __init__(self, configuracoes: Configuracoes) -> None:
        self._config = configuracoes

    def _enviar_sincrono(
        self,
        inscricao: InscricaoPushRegistro,
        payload_json: str,
    ) -> ResultadoEnvioPush:
        if not self._config.vapid_private_key or not self._config.vapid_public_key:
            return ResultadoEnvioPush(
                sucesso=False,
                expirada=False,
                status_http=503,
                detalhe="Chaves VAPID nao configuradas neste ambiente.",
            )

        subscription_info = {
            "endpoint": inscricao.endpoint,
            "keys": {
                "p256dh": inscricao.chave_p256dh,
                "auth": inscricao.chave_auth,
            },
        }
        try:
            resposta = webpush(
                subscription_info=subscription_info,
                data=payload_json,
                vapid_private_key=self._config.vapid_private_key,
                vapid_claims={"sub": self._config.vapid_subject},
                ttl=3600,
            )
            status = getattr(resposta, "status_code", 201)
            return ResultadoEnvioPush(sucesso=True, expirada=False, status_http=status)
        except WebPushException as exc:
            status = getattr(exc.response, "status_code", None)
            expirada = status in (404, 410)
            return ResultadoEnvioPush(
                sucesso=False,
                expirada=expirada,
                status_http=status,
                detalhe=str(exc),
            )
        except Exception as exc:  # pragma: no cover - falha inesperada de rede/SSL
            return ResultadoEnvioPush(
                sucesso=False,
                expirada=False,
                status_http=None,
                detalhe=str(exc),
            )

    async def enviar(
        self,
        inscricao: InscricaoPushRegistro,
        payload: dict[str, Any],
    ) -> ResultadoEnvioPush:
        payload_json = json.dumps(payload, ensure_ascii=False)
        return await asyncio.to_thread(self._enviar_sincrono, inscricao, payload_json)
