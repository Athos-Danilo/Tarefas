import math
from typing import Any

import httpx

from configuracao.configuracoes import Configuracoes
from contratos.clima import LeituraClimaExterna, SugestaoCidade
from dominio.clima import (
    MAX_SUGESTOES_CIDADES,
    arredondar_coordenada,
    normalizar_uf_por_regiao,
)
from dominio.erros import ErroDeDominio


class AdaptadorOpenMeteo:
    """Adaptador HTTP gratuito para geocoding e previsao atual via Open-Meteo."""

    def __init__(
        self,
        configuracoes: Configuracoes,
        transporte_http: httpx.AsyncBaseTransport | None = None,
    ) -> None:
        self._config = configuracoes
        self._transporte = transporte_http

    async def _requisitar_json(
        self,
        url: str,
        params: dict[str, str | int],
    ) -> dict[str, Any]:
        try:
            async with httpx.AsyncClient(
                timeout=self._config.open_meteo_timeout_segundos,
                transport=self._transporte,
            ) as cliente:
                resposta = await cliente.get(url, params=params)
        except httpx.HTTPError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel consultar o servico climatico Open-Meteo.",
                status_http=503,
            ) from falha

        if resposta.status_code != 200:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="O servico climatico Open-Meteo retornou resposta indisponivel.",
                status_http=503,
            )

        try:
            dados = resposta.json()
        except ValueError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Resposta invalida recebida do servico climatico Open-Meteo.",
                status_http=503,
            ) from falha

        if not isinstance(dados, dict):
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Formato inesperado recebido do servico climatico Open-Meteo.",
                status_http=503,
            )
        return dados

    async def buscar_cidades(
        self,
        consulta: str,
        limite: int = MAX_SUGESTOES_CIDADES,
    ) -> list[SugestaoCidade]:
        limite_efetivo = max(1, min(limite, MAX_SUGESTOES_CIDADES))
        dados = await self._requisitar_json(
            self._config.open_meteo_geocoding_url,
            params={
                "name": consulta,
                "count": limite_efetivo,
                "language": "pt",
                "format": "json",
            },
        )
        brutos = dados.get("results")
        if not isinstance(brutos, list):
            return []

        sugestoes: list[SugestaoCidade] = []
        for item in brutos:
            if not isinstance(item, dict):
                continue
            sugestao = self._converter_sugestao_cidade(item)
            if sugestao is None:
                continue
            sugestoes.append(sugestao)
            if len(sugestoes) >= limite_efetivo:
                break
        return sugestoes

    @staticmethod
    def _converter_sugestao_cidade(item: dict[str, Any]) -> SugestaoCidade | None:
        nome_bruto = item.get("name")
        lat_bruta = item.get("latitude")
        lon_bruta = item.get("longitude")
        if not isinstance(nome_bruto, str) or not nome_bruto.strip():
            return None
        if isinstance(lat_bruta, bool) or not isinstance(lat_bruta, int | float):
            return None
        if isinstance(lon_bruta, bool) or not isinstance(lon_bruta, int | float):
            return None
        try:
            lat = arredondar_coordenada(float(lat_bruta), eixo="latitude")
            lon = arredondar_coordenada(float(lon_bruta), eixo="longitude")
        except ErroDeDominio:
            return None

        admin1 = item.get("admin1")
        codigo_pais = item.get("country_code")
        pais = item.get("country")
        return SugestaoCidade(
            cidade=" ".join(nome_bruto.split()),
            uf=normalizar_uf_por_regiao(
                admin1 if isinstance(admin1, str) else None,
                codigo_pais if isinstance(codigo_pais, str) else None,
            ),
            pais=" ".join(pais.split()) if isinstance(pais, str) and pais.strip() else None,
            latitude_aprox=lat,
            longitude_aprox=lon,
        )

    async def consultar_clima_atual(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
    ) -> LeituraClimaExterna:
        dados = await self._requisitar_json(
            self._config.open_meteo_forecast_url,
            params={
                "latitude": f"{latitude_aprox:.2f}",
                "longitude": f"{longitude_aprox:.2f}",
                "current": "temperature_2m,weather_code",
                "timezone": "UTC",
            },
        )
        atual = dados.get("current")
        if not isinstance(atual, dict):
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Payload de clima atual ausente na resposta do Open-Meteo.",
                status_http=503,
            )

        temp_bruta = atual.get("temperature_2m")
        cod_bruto = atual.get("weather_code")
        if (
            isinstance(temp_bruta, bool)
            or not isinstance(temp_bruta, int | float)
            or not math.isfinite(float(temp_bruta))
            or isinstance(cod_bruto, bool)
            or not isinstance(cod_bruto, int)
        ):
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Campos climaticos invalidos retornados pelo Open-Meteo.",
                status_http=503,
            )

        return LeituraClimaExterna(
            temperatura_c=round(float(temp_bruta), 1),
            codigo_wmo=cod_bruto,
        )
