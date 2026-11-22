from dataclasses import dataclass
from datetime import datetime
from typing import Protocol


@dataclass(frozen=True)
class SugestaoCidade:
    """Sugestao normalizada de cidade retornada pela busca de geocoding."""

    cidade: str
    uf: str | None
    pais: str | None
    latitude_aprox: float
    longitude_aprox: float


@dataclass(frozen=True)
class LeituraClimaExterna:
    """Dados climaticos brutos obtidos do provedor externo."""

    temperatura_c: float
    codigo_wmo: int


@dataclass(frozen=True)
class EntradaCacheClima:
    """Entrada armazenada em cache por coordenada aproximada."""

    temperatura_c: float
    codigo_wmo: int
    atualizado_em: datetime


class ProvedorClima(Protocol):
    """Porta abstrata para consulta externa de cidades e clima atual."""

    async def buscar_cidades(self, consulta: str, limite: int = 8) -> list[SugestaoCidade]:
        """Consulta cidades compativeis retornando coordenadas arredondadas."""
        ...

    async def consultar_clima_atual(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
    ) -> LeituraClimaExterna:
        """Consulta temperatura e codigo WMO atuais para coordenadas aproximadas."""
        ...


class CacheClima(Protocol):
    """Porta abstrata para cache de leituras climaticas por coordenada aproximada."""

    def obter(self, latitude_aprox: float, longitude_aprox: float) -> EntradaCacheClima | None:
        """Retorna entrada em cache quando existente."""
        ...

    def salvar(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
        entrada: EntradaCacheClima,
    ) -> None:
        """Armazena leitura climatica associada ao par aproximado."""
        ...

    def limpar(self) -> None:
        """Remove todas as entradas em cache."""
        ...
