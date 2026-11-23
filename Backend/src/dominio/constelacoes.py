import math
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

from dominio.erros import ErroDeDominio

MAX_NOS_LAYOUT = 250
COORDENADA_MIN = -50000.0
COORDENADA_MAX = 50000.0
ZOOM_MIN = 0.2
ZOOM_MAX = 3.0


@dataclass(frozen=True)
class PosicaoNoConstelacao:
    """Coordenada bidimensional salva para um no da arvore no mapa visual."""

    x: float
    y: float
    fixado: bool = True


@dataclass(frozen=True)
class ViewportConstelacao:
    """Estado de zoom e centro do canvas visual no frontend."""

    zoom: float = 1.0
    centro_x: float = 0.0
    centro_y: float = 0.0


@dataclass(frozen=True)
class LayoutConstelacao:
    """Layout completo persistido por usuario e tarefa raiz no MongoDB."""

    usuario_id: str
    tarefa_raiz_id: str
    nos: dict[str, PosicaoNoConstelacao]
    viewport: ViewportConstelacao
    atualizado_em: datetime | None = None


def criar_layout_padrao(usuario_id: str, tarefa_raiz_id: str) -> LayoutConstelacao:
    """Devolve estrutura vazia padrao para organizacao automatica no cliente."""
    return LayoutConstelacao(
        usuario_id=usuario_id,
        tarefa_raiz_id=tarefa_raiz_id,
        nos={},
        viewport=ViewportConstelacao(zoom=1.0, centro_x=0.0, centro_y=0.0),
        atualizado_em=None,
    )


def _validar_numero_finito(
    valor: float,
    minimo: float,
    maximo: float,
    codigo: str,
    mensagem: str,
) -> float:
    numero = float(valor)
    if not math.isfinite(numero) or numero < minimo or numero > maximo:
        raise ErroDeDominio(codigo=codigo, mensagem=mensagem, status_http=422)
    return numero


def validar_e_normalizar_layout_constelacao(
    *,
    usuario_id: str,
    tarefa_raiz_id: UUID,
    nos_brutos: Mapping[str, PosicaoNoConstelacao],
    viewport: ViewportConstelacao,
    atualizado_em: datetime,
    ids_permitidos: set[str] | None = None,
) -> LayoutConstelacao:
    """Valida limites geometricos, UUIDs dos nos e viewport do layout."""
    if len(nos_brutos) > MAX_NOS_LAYOUT:
        raise ErroDeDominio(
            codigo="LIMITE_NOS_LAYOUT_EXCEDIDO",
            mensagem=f"O layout aceita no maximo {MAX_NOS_LAYOUT} nos por arvore.",
            status_http=422,
        )

    zoom_ok = _validar_numero_finito(
        viewport.zoom,
        ZOOM_MIN,
        ZOOM_MAX,
        "VIEWPORT_INVALIDO",
        f"Zoom do mapa deve estar entre {ZOOM_MIN} e {ZOOM_MAX}.",
    )
    centro_x_ok = _validar_numero_finito(
        viewport.centro_x,
        COORDENADA_MIN,
        COORDENADA_MAX,
        "VIEWPORT_INVALIDO",
        "Centro X do viewport fora dos limites permitidos.",
    )
    centro_y_ok = _validar_numero_finito(
        viewport.centro_y,
        COORDENADA_MIN,
        COORDENADA_MAX,
        "VIEWPORT_INVALIDO",
        "Centro Y do viewport fora dos limites permitidos.",
    )

    nos_normalizados: dict[str, PosicaoNoConstelacao] = {}
    for chave_bruta, pos in nos_brutos.items():
        try:
            chave_uuid = str(UUID(chave_bruta))
        except ValueError as falha:
            raise ErroDeDominio(
                codigo="ID_NO_LAYOUT_INVALIDO",
                mensagem="Cada chave do mapa de posicoes deve ser um UUID valido.",
                status_http=422,
            ) from falha

        x_ok = _validar_numero_finito(
            pos.x,
            COORDENADA_MIN,
            COORDENADA_MAX,
            "COORDENADA_LAYOUT_INVALIDA",
            "Coordenada X do no fora dos limites permitidos.",
        )
        y_ok = _validar_numero_finito(
            pos.y,
            COORDENADA_MIN,
            COORDENADA_MAX,
            "COORDENADA_LAYOUT_INVALIDA",
            "Coordenada Y do no fora dos limites permitidos.",
        )
        if ids_permitidos is not None and chave_uuid not in ids_permitidos:
            continue
        nos_normalizados[chave_uuid] = PosicaoNoConstelacao(
            x=x_ok,
            y=y_ok,
            fixado=bool(pos.fixado),
        )

    return LayoutConstelacao(
        usuario_id=usuario_id,
        tarefa_raiz_id=str(tarefa_raiz_id),
        nos=nos_normalizados,
        viewport=ViewportConstelacao(
            zoom=zoom_ok,
            centro_x=centro_x_ok,
            centro_y=centro_y_ok,
        ),
        atualizado_em=atualizado_em,
    )


def filtrar_nos_constelacao_existentes(
    layout: LayoutConstelacao,
    ids_permitidos: set[str],
) -> LayoutConstelacao:
    """Remove nos orfaos cujo registro ja foi excluido do PostgreSQL."""
    nos_filtrados = {chave: pos for chave, pos in layout.nos.items() if chave in ids_permitidos}
    if len(nos_filtrados) == len(layout.nos):
        return layout
    return LayoutConstelacao(
        usuario_id=layout.usuario_id,
        tarefa_raiz_id=layout.tarefa_raiz_id,
        nos=nos_filtrados,
        viewport=layout.viewport,
        atualizado_em=layout.atualizado_em,
    )
