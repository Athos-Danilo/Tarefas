import base64
import hashlib
import hmac
import json
import secrets
from datetime import UTC, datetime, timedelta
from io import BytesIO
from typing import Literal

from PIL import Image, ImageOps, UnidentifiedImageError

from dominio.erros import ErroDeDominio

TipoAvatar = Literal["preset", "google", "upload"]

AVATARES_PRESET_OFICIAIS: tuple[str, ...] = (
    "sol-nascente",
    "lua-crescente",
    "cometa-dourado",
    "aurora-boreal",
    "girassol-lume",
    "samambaia-orvalho",
    "lotus-serena",
    "broto-vivo",
    "vagalume-estelar",
    "coruja-noturna",
    "borboleta-aurora",
    "beija-flor-solar",
    "telescopio-celeste",
    "bussola-astral",
    "ampulheta-solar",
    "estrela-guia",
)

FORMATOS_IMAGEM_PERMITIDOS = {"PNG", "JPEG", "WEBP"}
TAMANHO_MAXIMO_AVATAR_BYTES = 2 * 1024 * 1024
DIMENSAO_AVATAR_PX = 256
DURACAO_SESSAO_DESLIZANTE = timedelta(days=7)
TETO_ABSOLUTO_SESSAO = timedelta(days=30)
JANELA_ESTADO_OAUTH = timedelta(minutes=10)
CONFIRMACAO_EXCLUSAO_EXATA = "EXCLUIR"


def gerar_token_aleatorio(nbytes: int = 32) -> str:
    """Gera token URL-safe criptograficamente seguro."""
    return secrets.token_urlsafe(nbytes)


def gerar_hash_sha256(valor: str) -> str:
    """Gera resumo hexadecimal SHA-256 para armazenamento seguro de tokens."""
    return hashlib.sha256(valor.encode("utf-8")).hexdigest()


def gerar_pkce_code_verifier() -> str:
    """Gera verificador PKCE compativel com RFC 7636."""
    return secrets.token_urlsafe(48)


def gerar_pkce_code_challenge(code_verifier: str) -> str:
    """Deriva desafio S256 em Base64 URL-safe sem padding '='."""
    resumo = hashlib.sha256(code_verifier.encode("ascii")).digest()
    return base64.urlsafe_b64encode(resumo).rstrip(b"=").decode("ascii")


def _b64_codificar(dados: bytes) -> str:
    return base64.urlsafe_b64encode(dados).rstrip(b"=").decode("ascii")


def _b64_decodificar(texto: str) -> bytes:
    preenchimento = "=" * ((4 - len(texto) % 4) % 4)
    return base64.urlsafe_b64decode(texto + preenchimento)


def assinar_estado_oauth(
    code_verifier: str,
    segredo: str,
    agora: datetime | None = None,
) -> tuple[str, str]:
    """Cria estado OAuth publico e token assinado contendo o code_verifier PKCE."""
    instante = (agora or datetime.now(UTC)).astimezone(UTC)
    estado = gerar_token_aleatorio(24)
    carga = {
        "estado": estado,
        "verificador": code_verifier,
        "exp": int((instante + JANELA_ESTADO_OAUTH).timestamp()),
    }
    carga_b64 = _b64_codificar(json.dumps(carga, separators=(",", ":")).encode("utf-8"))
    assinatura = hmac.new(
        segredo.encode("utf-8"), carga_b64.encode("ascii"), hashlib.sha256
    ).digest()
    return estado, f"{carga_b64}.{_b64_codificar(assinatura)}"


def validar_estado_oauth(
    estado_recebido: str | None,
    token_assinado: str | None,
    segredo: str,
    agora: datetime | None = None,
) -> str:
    """Valida assinatura HMAC, correspondencia de estado e janela temporal.

    Retorna o code_verifier associado ao fluxo PKCE.
    """
    if not estado_recebido or not token_assinado or "." not in token_assinado:
        raise ErroDeDominio(
            codigo="OAUTH_INVALIDO",
            mensagem="Estado de autenticacao OAuth ausente ou invalido.",
            status_http=401,
        )

    partes = token_assinado.split(".", 1)
    carga_b64, assinatura_b64 = partes[0], partes[1]
    assinatura_esperada = hmac.new(
        segredo.encode("utf-8"),
        carga_b64.encode("ascii"),
        hashlib.sha256,
    ).digest()

    try:
        assinatura_recebida = _b64_decodificar(assinatura_b64)
        if not hmac.compare_digest(assinatura_recebida, assinatura_esperada):
            raise ValueError("Assinatura divergente")
        dados = json.loads(_b64_decodificar(carga_b64).decode("utf-8"))
    except (ValueError, json.JSONDecodeError, UnicodeDecodeError) as falha:
        raise ErroDeDominio(
            codigo="OAUTH_INVALIDO",
            mensagem="Assinatura de estado OAuth invalida.",
            status_http=401,
        ) from falha

    estado_salvo = dados.get("estado")
    verificador = dados.get("verificador")
    expiracao_ts = dados.get("exp")
    if (
        not isinstance(estado_salvo, str)
        or not isinstance(verificador, str)
        or not isinstance(expiracao_ts, int)
    ):
        raise ErroDeDominio(
            codigo="OAUTH_INVALIDO",
            mensagem="Payload de estado OAuth corrompido.",
            status_http=401,
        )

    if not hmac.compare_digest(estado_recebido, estado_salvo):
        raise ErroDeDominio(
            codigo="OAUTH_INVALIDO",
            mensagem="Parametro state divergente no retorno do Google.",
            status_http=401,
        )

    instante_atual = (agora or datetime.now(UTC)).astimezone(UTC)
    if int(instante_atual.timestamp()) > expiracao_ts:
        raise ErroDeDominio(
            codigo="OAUTH_INVALIDO",
            mensagem="Sessao temporaria de autenticacao Google expirada.",
            status_http=401,
        )

    return verificador


def calcular_nova_expiracao_deslizante(
    agora: datetime,
    expiracao_absoluta: datetime,
) -> datetime:
    """Renova sessao por 7 dias sem ultrapassar o teto absoluto de 30 dias."""
    agora_utc = agora.astimezone(UTC)
    absoluta_utc = expiracao_absoluta.astimezone(UTC)
    candidata = agora_utc + DURACAO_SESSAO_DESLIZANTE
    return candidata if candidata <= absoluta_utc else absoluta_utc


def validar_nome_exibicao(nome_bruto: str) -> str:
    """Valida nome de exibicao entre 2 e 60 caracteres conforme D05/D09."""
    nome_limpo = nome_bruto.strip()
    if len(nome_limpo) < 2 or len(nome_limpo) > 60:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O nome de exibicao deve ter entre 2 e 60 caracteres.",
            status_http=422,
            detalhes={"campo": "nome_exibicao"},
        )
    return nome_limpo


def validar_escolha_avatar(
    avatar_tipo: str,
    avatar_id: str | None,
) -> tuple[TipoAvatar, str | None]:
    """Valida tipo de avatar e obrigatoriedade de preset oficial conforme D04/D05."""
    if avatar_tipo == "preset":
        if avatar_id is None or avatar_id not in AVATARES_PRESET_OFICIAIS:
            raise ErroDeDominio(
                codigo="VALIDACAO_INVALIDA",
                mensagem="O avatar preset escolhido nao pertence a colecao oficial.",
                status_http=422,
                detalhes={"campo": "avatar_id"},
            )
        return ("preset", avatar_id)
    if avatar_tipo == "google":
        return ("google", None)
    if avatar_tipo == "upload":
        return ("upload", None)
    raise ErroDeDominio(
        codigo="VALIDACAO_INVALIDA",
        mensagem="Tipo de avatar invalido.",
        status_http=422,
        detalhes={"campo": "avatar_tipo"},
    )


def resolver_url_avatar(
    avatar_tipo: str,
    avatar_id: str | None,
    foto_google_url: str | None,
    avatar_arquivo: str | None,
    versao_cache: int | None = None,
) -> str | None:
    """Resolve URL publica ou protegida do avatar ativo do usuario."""
    if avatar_tipo == "preset" and avatar_id in AVATARES_PRESET_OFICIAIS:
        return f"/assets-3d/avatares/{avatar_id}.png"
    if avatar_tipo == "google":
        return foto_google_url
    if avatar_tipo == "upload" and avatar_arquivo:
        sufixo = f"?v={versao_cache}" if versao_cache is not None else ""
        return f"/api/conta/avatar/atual{sufixo}"
    return None


def processar_imagem_avatar(conteudo: bytes) -> bytes:
    """Valida tamanho/assinatura da imagem, remove EXIF e gera WebP 256x256 centralizado."""
    if len(conteudo) == 0:
        raise ErroDeDominio(
            codigo="FORMATO_IMAGEM_INVALIDO",
            mensagem="Arquivo de imagem vazio.",
            status_http=422,
        )
    if len(conteudo) > TAMANHO_MAXIMO_AVATAR_BYTES:
        raise ErroDeDominio(
            codigo="ARQUIVO_MUITO_GRANDE",
            mensagem="A imagem de avatar deve ter no maximo 2 MB.",
            status_http=413,
            detalhes={"tamanho_maximo_bytes": TAMANHO_MAXIMO_AVATAR_BYTES},
        )

    try:
        with Image.open(BytesIO(conteudo)) as imagem_bruta:
            if imagem_bruta.format not in FORMATOS_IMAGEM_PERMITIDOS:
                raise ErroDeDominio(
                    codigo="FORMATO_IMAGEM_INVALIDO",
                    mensagem="Formato nao suportado. Envie PNG, JPG ou WebP.",
                    status_http=422,
                )
            imagem_bruta.load()
            corrigida = ImageOps.exif_transpose(imagem_bruta)
            modo_destino = "RGBA" if corrigida.mode in ("RGBA", "LA", "P") else "RGB"
            convertida = corrigida.convert(modo_destino)
            recortada = ImageOps.fit(
                convertida,
                (DIMENSAO_AVATAR_PX, DIMENSAO_AVATAR_PX),
                method=Image.Resampling.LANCZOS,
            )
            saida = BytesIO()
            recortada.save(saida, format="WEBP", quality=88, method=6)
            return saida.getvalue()
    except ErroDeDominio:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as falha:
        raise ErroDeDominio(
            codigo="FORMATO_IMAGEM_INVALIDO",
            mensagem="Arquivo invalido ou corrompido. Envie PNG, JPG ou WebP.",
            status_http=422,
        ) from falha
