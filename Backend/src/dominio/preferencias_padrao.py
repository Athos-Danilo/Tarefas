from datetime import UTC, datetime
from typing import Literal, TypedDict

ModoTemporal = Literal["relogio_real", "simulador"]
Qualidade3D = Literal["auto", "alto", "desempenho_2d"]
ModoLocalizacaoClima = Literal["navegador", "manual"]


class PreferenciasClima(TypedDict):
    """Bloco opt-in de clima local dentro de preferencias_cenario."""

    habilitado: bool
    modo_localizacao: ModoLocalizacaoClima | None
    cidade: str | None
    uf: str | None
    latitude_aprox: float | None
    longitude_aprox: float | None


class PreferenciasAudio(TypedDict):
    """Bloco de audio opt-in com volumes independentes."""

    habilitado: bool
    volume_geral: float
    volume_efeitos: float
    volume_ambiente: float


class PreferenciasCenario(TypedDict):
    """Documento de preferencias de cenario persistido no MongoDB."""

    usuario_id: str
    modo_temporal: ModoTemporal
    hora_simulada: str | None
    qualidade_3d: Qualidade3D
    reduzir_movimento: bool
    clima: PreferenciasClima
    audio: PreferenciasAudio
    atualizado_em: datetime


def criar_preferencias_cenario_padrao(
    usuario_id: str,
    agora: datetime | None = None,
) -> PreferenciasCenario:
    """Constroi preferencias iniciais com clima e audio desativados por padrao."""
    instante = (agora or datetime.now(UTC)).astimezone(UTC)
    return {
        "usuario_id": usuario_id,
        "modo_temporal": "relogio_real",
        "hora_simulada": None,
        "qualidade_3d": "auto",
        "reduzir_movimento": False,
        "clima": {
            "habilitado": False,
            "modo_localizacao": None,
            "cidade": None,
            "uf": None,
            "latitude_aprox": None,
            "longitude_aprox": None,
        },
        "audio": {
            "habilitado": False,
            "volume_geral": 0.7,
            "volume_efeitos": 0.8,
            "volume_ambiente": 0.5,
        },
        "atualizado_em": instante,
    }
