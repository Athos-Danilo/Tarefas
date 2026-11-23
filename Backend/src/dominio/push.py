import hmac
from datetime import UTC, datetime
from typing import Any, Literal
from urllib.parse import urlparse
from uuid import UUID

from dominio.erros import ErroDeDominio

PlataformaPush = Literal["desktop", "android", "ios", "outro"]
StatusLembrete = Literal["pendente", "enviado", "cancelado"]
TipoEventoGrupoPush = Literal["atribuicao", "conclusao"]

MAX_DISPOSITIVOS_PUSH_USUARIO = 10
MAX_LEMBRETES_ATIVOS_TAREFA = 3
MAX_ANTECEDENCIA_MIN = 43200
MAX_ROTULO_DISPOSITIVO = 80
MAX_ENDPOINT_CHARS = 2048

PLATAFORMAS_PUSH_VALIDAS: tuple[PlataformaPush, ...] = ("desktop", "android", "ios", "outro")

_ROTULOS_PADRAO_PLATAFORMA: dict[PlataformaPush, str] = {
    "desktop": "Computador",
    "android": "Android",
    "ios": "iPhone / iPad",
    "outro": "Dispositivo",
}


def validar_endpoint_push(endpoint: str) -> str:
    """Garante endpoint Web Push HTTPS valido e livre de esquemas inseguros."""
    limpo = endpoint.strip()
    if not limpo or len(limpo) > MAX_ENDPOINT_CHARS or any(ch.isspace() for ch in limpo):
        raise ErroDeDominio(
            codigo="ENDPOINT_PUSH_INVALIDO",
            mensagem="O endpoint de notificacao Web Push informado e invalido.",
            status_http=422,
        )

    analise = urlparse(limpo)
    if analise.scheme.lower() != "https" or not analise.netloc:
        raise ErroDeDominio(
            codigo="ENDPOINT_PUSH_INVALIDO",
            mensagem="Somente endpoints HTTPS sao aceitos para inscricoes Web Push.",
            status_http=422,
        )
    return limpo


def validar_chaves_push(p256dh: str, auth: str) -> tuple[str, str]:
    """Valida as chaves criptograficas da assinatura Web Push (p256dh e auth)."""
    chave_p256dh = p256dh.strip()
    chave_auth = auth.strip()
    if (
        len(chave_p256dh) < 8
        or len(chave_auth) < 6
        or any(ch.isspace() for ch in chave_p256dh)
        or any(ch.isspace() for ch in chave_auth)
    ):
        raise ErroDeDominio(
            codigo="CHAVES_PUSH_INVALIDAS",
            mensagem="As chaves criptograficas Web Push (p256dh e auth) sao obrigatorias.",
            status_http=422,
        )
    return chave_p256dh, chave_auth


def validar_plataforma_push(plataforma: str) -> PlataformaPush:
    """Valida a plataforma informada pelo navegador ou dispositivo."""
    normalizada = plataforma.strip().lower()
    if normalizada not in PLATAFORMAS_PUSH_VALIDAS:
        raise ErroDeDominio(
            codigo="PLATAFORMA_PUSH_INVALIDA",
            mensagem="Plataforma de dispositivo Web Push nao reconhecida.",
            status_http=422,
        )
    return normalizada


def validar_rotulo_dispositivo(rotulo: str | None, plataforma: PlataformaPush) -> str:
    """Normaliza o nome amigavel do dispositivo ou aplica rotulo padrao."""
    limpo = (rotulo or "").strip()
    if not limpo:
        return _ROTULOS_PADRAO_PLATAFORMA[plataforma]
    if len(limpo) > MAX_ROTULO_DISPOSITIVO:
        raise ErroDeDominio(
            codigo="ROTULO_DISPOSITIVO_INVALIDO",
            mensagem=(
                f"O rotulo do dispositivo pode ter no maximo {MAX_ROTULO_DISPOSITIVO} caracteres."
            ),
            status_http=422,
        )
    return limpo


def validar_limite_dispositivos(total_atual: int, *, ja_existe_mesmo_endpoint: bool) -> None:
    """Impoe o teto de dispositivos push por usuario quando for um novo aparelho."""
    if not ja_existe_mesmo_endpoint and total_atual >= MAX_DISPOSITIVOS_PUSH_USUARIO:
        raise ErroDeDominio(
            codigo="LIMITE_DISPOSITIVOS_PUSH_ATINGIDO",
            mensagem=(
                f"Limite maximo de {MAX_DISPOSITIVOS_PUSH_USUARIO} dispositivos "
                "notificaveis por conta atingido. Revogue um aparelho antigo para continuar."
            ),
            status_http=409,
        )


def validar_lembrete_entrada(disparar_em: datetime, antecedencia_min: int) -> tuple[datetime, int]:
    """Normaliza instante do lembrete para UTC e valida antecedencia."""
    if antecedencia_min < 0 or antecedencia_min > MAX_ANTECEDENCIA_MIN:
        raise ErroDeDominio(
            codigo="LEMBRETE_INVALIDO",
            mensagem=(
                f"A antecedencia do lembrete deve estar entre 0 e {MAX_ANTECEDENCIA_MIN} minutos."
            ),
            status_http=422,
        )
    instante_utc = (
        disparar_em.replace(tzinfo=UTC)
        if disparar_em.tzinfo is None
        else disparar_em.astimezone(UTC)
    )
    return instante_utc, antecedencia_min


def validar_limite_lembretes_tarefa(total_pendentes_atuais: int) -> None:
    """Impoe o teto D09 de lembretes pendentes simultaneos na mesma tarefa."""
    if total_pendentes_atuais >= MAX_LEMBRETES_ATIVOS_TAREFA:
        raise ErroDeDominio(
            codigo="LIMITE_LEMBRETES_TAREFA_ATINGIDO",
            mensagem=(
                f"Cada tarefa aceita no maximo {MAX_LEMBRETES_ATIVOS_TAREFA} lembretes ativos."
            ),
            status_http=409,
        )


def validar_token_cron_interno(token_esperado: str | None, token_recebido: str | None) -> None:
    """Compara o token interno do cron em tempo constante usando hmac.compare_digest."""
    esperado = (token_esperado or "").strip()
    recebido = (token_recebido or "").strip()
    if not esperado or not recebido:
        raise ErroDeDominio(
            codigo="TOKEN_INTERNO_INVALIDO",
            mensagem="Token interno do cron ausente ou nao autorizado.",
            status_http=401,
        )
    valido = hmac.compare_digest(esperado.encode("utf-8"), recebido.encode("utf-8"))
    if not valido:
        raise ErroDeDominio(
            codigo="TOKEN_INTERNO_INVALIDO",
            mensagem="Token interno do cron invalido.",
            status_http=401,
        )


def montar_payload_notificacao_lembrete(
    tarefa_id: UUID,
    titulo_tarefa: str,
    antecedencia_min: int,
) -> dict[str, Any]:
    """Constroi payload JSON enxuto para notificacao Web Push de lembrete."""
    titulo_curto = titulo_tarefa.strip()[:80]
    corpo = (
        "Sua tarefa esta marcada para agora."
        if antecedencia_min == 0
        else f"Aviso agendado ({antecedencia_min} min antes)."
    )
    return {
        "titulo": f"Lembrete: {titulo_curto}",
        "corpo": corpo,
        "url": f"/jornada?tarefa={tarefa_id}",
        "tag": f"lembrete-{tarefa_id}",
        "tipo": "lembrete_tarefa",
        "tarefa_id": str(tarefa_id),
    }


def montar_payload_notificacao_grupo(
    tipo_evento: TipoEventoGrupoPush,
    tarefa_id: UUID,
    tarefa_raiz_id: UUID,
    titulo_tarefa: str,
    autor_nome: str,
) -> dict[str, Any]:
    """Constroi payload JSON para notificacoes Web Push de Tarefas em Conjunto."""
    titulo_curto = titulo_tarefa.strip()[:80]
    autor_curto = (autor_nome or "Alguem da equipe").strip()[:60]
    url = f"/jornada?tarefa={tarefa_id}&grupo={tarefa_raiz_id}"
    if tipo_evento == "atribuicao":
        return {
            "titulo": "Nova subtarefa atribuida a voce",
            "corpo": f"{autor_curto} atribuiu '{titulo_curto}' a voce em Tarefas em Conjunto.",
            "url": url,
            "tag": f"grupo-atribuicao-{tarefa_id}",
            "tipo": "grupo_atribuicao",
            "tarefa_id": str(tarefa_id),
            "tarefa_raiz_id": str(tarefa_raiz_id),
        }
    return {
        "titulo": "Etapa concluida na equipe",
        "corpo": f"{autor_curto} concluiu '{titulo_curto}'.",
        "url": url,
        "tag": f"grupo-conclusao-{tarefa_id}",
        "tipo": "grupo_conclusao",
        "tarefa_id": str(tarefa_id),
        "tarefa_raiz_id": str(tarefa_raiz_id),
    }
