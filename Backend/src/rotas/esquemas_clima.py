from pydantic import BaseModel

from dominio.clima import EstadoClimatico
from dominio.preferencias_padrao import ModoLocalizacaoClima


class SugestaoCidadeResposta(BaseModel):
    """Sugestao de cidade normalizada com coordenadas aproximadas."""

    cidade: str
    uf: str | None
    pais: str | None
    latitude_aprox: float
    longitude_aprox: float


class RespostaBuscaCidades(BaseModel):
    """Resposta de GET /api/clima/cidades."""

    itens: list[SugestaoCidadeResposta]


class RequisicaoConsentimentoClima(BaseModel):
    """Payload de PUT /api/clima/consentimento."""

    habilitado: bool
    modo_localizacao: ModoLocalizacaoClima | None = None
    cidade: str | None = None
    uf: str | None = None
    latitude_aprox: float | None = None
    longitude_aprox: float | None = None


class RespostaConsentimentoClima(BaseModel):
    """Resposta de PUT /api/clima/consentimento."""

    habilitado: bool
    modo_localizacao: ModoLocalizacaoClima | None
    cidade: str | None
    uf: str | None
    latitude_aprox: float | None
    longitude_aprox: float | None
    estado_climatico: EstadoClimatico


class RespostaClimaAtual(BaseModel):
    """Resposta normalizada de GET /api/clima/atual."""

    habilitado: bool
    cidade: str | None
    uf: str | None
    temperatura_c: float
    codigo_wmo: int
    estado_climatico: EstadoClimatico
    descricao: str
    origem_cache: bool
    atualizado_em: str
