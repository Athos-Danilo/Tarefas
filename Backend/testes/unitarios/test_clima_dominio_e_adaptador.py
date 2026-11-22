import json
import math
from datetime import UTC, datetime, timedelta
from uuid import uuid4

import httpx
import pytest

from configuracao.configuracoes import Configuracoes
from contratos.clima import LeituraClimaExterna, SugestaoCidade
from contratos.persistencia import RepositorioPreferenciasCenario
from dominio.clima import (
    ESTADOS_CLIMATICOS_OFICIAIS,
    arredondar_coordenada,
    construir_preferencias_clima_consentimento,
    mapear_codigo_wmo,
    normalizar_consulta_cidade,
    normalizar_uf_por_regiao,
)
from dominio.erros import ErroDeDominio
from dominio.preferencias_padrao import (
    PreferenciasCenario,
    criar_preferencias_cenario_padrao,
)
from infraestrutura.open_meteo.adaptador_open_meteo import AdaptadorOpenMeteo
from infraestrutura.open_meteo.cache_clima_memoria import CacheClimaMemoria
from servicos.servico_clima import ServicoClima


class _RepositorioPreferenciasMemoria(RepositorioPreferenciasCenario):
    """Duble em memoria do repositorio de preferencias para testes unitarios."""

    def __init__(self) -> None:
        self._dados: dict[str, PreferenciasCenario] = {}

    async def obter_ou_padrao(self, usuario_id: str) -> PreferenciasCenario:
        existente = self._dados.get(usuario_id)
        if existente is not None:
            return existente
        return criar_preferencias_cenario_padrao(usuario_id)

    async def salvar(self, preferencias: PreferenciasCenario) -> None:
        self._dados[preferencias["usuario_id"]] = preferencias

    async def remover_por_usuario(self, usuario_id: str) -> bool:
        return self._dados.pop(usuario_id, None) is not None


class _ProvedorClimaControlado:
    """Duble deterministico de ProvedorClima para testar ServicoClima."""

    def __init__(self) -> None:
        self.chamadas_clima = 0
        self.chamadas_cidades = 0
        self.falhar_clima = False
        self.temperatura_c = 24.5
        self.codigo_wmo = 61
        self.sugestoes: list[SugestaoCidade] = []

    async def buscar_cidades(self, consulta: str, limite: int = 8) -> list[SugestaoCidade]:
        self.chamadas_cidades += 1
        return self.sugestoes[:limite]

    async def consultar_clima_atual(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
    ) -> LeituraClimaExterna:
        self.chamadas_clima += 1
        if self.falhar_clima:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Open-Meteo indisponivel no teste.",
                status_http=503,
            )
        return LeituraClimaExterna(
            temperatura_c=self.temperatura_c,
            codigo_wmo=self.codigo_wmo,
        )


def test_mapeamento_wmo_cobre_cinco_estados_oficiais_e_fallback_seguro() -> None:
    assert set(ESTADOS_CLIMATICOS_OFICIAIS) == {
        "limpo",
        "parcialmente_nublado",
        "nublado",
        "chuvoso",
        "tempestade",
    }

    res_limpo = mapear_codigo_wmo(0)
    assert res_limpo.estado_climatico == "limpo"
    assert res_limpo.descricao == "Céu limpo"

    for cod in (1, 2):
        assert mapear_codigo_wmo(cod).estado_climatico == "parcialmente_nublado"

    for cod in (3, 45, 48):
        assert mapear_codigo_wmo(cod).estado_climatico == "nublado"

    for cod in (51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 71, 73, 75, 77, 80, 81, 85, 86):
        res = mapear_codigo_wmo(cod)
        assert res.estado_climatico == "chuvoso"
        if cod == 61:
            assert res.descricao == "Chuva leve"

    for cod in (82, 95, 96, 99):
        assert mapear_codigo_wmo(cod).estado_climatico == "tempestade"

    for cod_desconhecido in (-1, 42, 999):
        fallback = mapear_codigo_wmo(cod_desconhecido)
        assert fallback.codigo_wmo == cod_desconhecido
        assert fallback.estado_climatico == "limpo"
        assert fallback.descricao == "Condição climática indefinida"


def test_arredondamento_coordenadas_validacoes_uf_e_consentimento() -> None:
    assert arredondar_coordenada(-15.793889, eixo="latitude") == -15.79
    lon_zero = arredondar_coordenada(-0.001, eixo="longitude")
    assert lon_zero == 0.0
    assert math.copysign(1.0, lon_zero) > 0

    for invalido in (-90.1, 90.1, math.nan, math.inf, -math.inf):
        with pytest.raises(ErroDeDominio) as exc:
            arredondar_coordenada(invalido, eixo="latitude")
        assert exc.value.codigo == "VALIDACAO_INVALIDA"
        assert exc.value.status_http == 422

    with pytest.raises(ErroDeDominio) as exc_bool:
        arredondar_coordenada(True, eixo="latitude")  # type: ignore[arg-type]
    assert exc_bool.value.codigo == "VALIDACAO_INVALIDA"

    for invalido in (-180.1, 180.1):
        with pytest.raises(ErroDeDominio) as exc_lon:
            arredondar_coordenada(invalido, eixo="longitude")
        assert exc_lon.value.codigo == "VALIDACAO_INVALIDA"
        assert exc_lon.value.status_http == 422

    assert normalizar_uf_por_regiao("Distrito Federal", "BR") == "DF"
    assert normalizar_uf_por_regiao("São Paulo", "br") == "SP"
    assert normalizar_uf_por_regiao("Rio Grande do Sul", "BR") == "RS"
    assert normalizar_uf_por_regiao("California", "US") == "California"

    assert normalizar_consulta_cidade("  São   Paulo  ") == "São Paulo"
    for consulta_ruim in ("a", " ", "x" * 81):
        with pytest.raises(ErroDeDominio) as exc_q:
            normalizar_consulta_cidade(consulta_ruim)
        assert exc_q.value.codigo == "VALIDACAO_INVALIDA"
        assert exc_q.value.status_http == 422

    pref_manual = construir_preferencias_clima_consentimento(
        habilitado=True,
        modo_localizacao="manual",
        cidade="  Brasília ",
        uf=" df ",
        latitude_aprox=-15.793889,
        longitude_aprox=-47.882778,
    )
    assert pref_manual == {
        "habilitado": True,
        "modo_localizacao": "manual",
        "cidade": "Brasília",
        "uf": "DF",
        "latitude_aprox": -15.79,
        "longitude_aprox": -47.88,
    }

    pref_nav = construir_preferencias_clima_consentimento(
        habilitado=True,
        modo_localizacao="navegador",
        cidade=None,
        uf=None,
        latitude_aprox=-23.55052,
        longitude_aprox=-46.63331,
    )
    assert pref_nav["habilitado"] is True
    assert pref_nav["modo_localizacao"] == "navegador"
    assert pref_nav["cidade"] is None
    assert pref_nav["uf"] is None
    assert pref_nav["latitude_aprox"] == -23.55
    assert pref_nav["longitude_aprox"] == -46.63

    for kwargs_invalidos in (
        {
            "habilitado": True,
            "modo_localizacao": None,
            "latitude_aprox": -15.7,
            "longitude_aprox": -47.8,
        },
        {
            "habilitado": True,
            "modo_localizacao": "navegador",
            "latitude_aprox": None,
            "longitude_aprox": -47.8,
        },
        {
            "habilitado": True,
            "modo_localizacao": "manual",
            "cidade": " ",
            "latitude_aprox": -15.7,
            "longitude_aprox": -47.8,
        },
    ):
        with pytest.raises(ErroDeDominio) as exc_cons:
            construir_preferencias_clima_consentimento(**kwargs_invalidos)  # type: ignore[arg-type]
        assert exc_cons.value.codigo == "VALIDACAO_INVALIDA"
        assert exc_cons.value.status_http == 422

    pref_desligada = construir_preferencias_clima_consentimento(
        habilitado=False,
        modo_localizacao="manual",
        cidade="Brasília",
        uf="DF",
        latitude_aprox=-15.79,
        longitude_aprox=-47.88,
    )
    assert pref_desligada == {
        "habilitado": False,
        "modo_localizacao": None,
        "cidade": None,
        "uf": None,
        "latitude_aprox": None,
        "longitude_aprox": None,
    }


async def test_adaptador_open_meteo_com_mock_transport_sucesso_vazio_e_falhas() -> None:
    config = Configuracoes()
    requisicoes_capturadas: list[httpx.Request] = []

    def handler_sucesso(request: httpx.Request) -> httpx.Response:
        requisicoes_capturadas.append(request)
        if "geocoding-api.open-meteo.com" in str(request.url):
            assert request.url.params["name"] == "Brasilia"
            assert request.url.params["count"] == "8"
            assert request.url.params["language"] == "pt"
            assert request.url.params["format"] == "json"
            itens = [
                {
                    "name": "Brasília",
                    "admin1": "Distrito Federal",
                    "country": "Brasil",
                    "country_code": "BR",
                    "latitude": -15.793889,
                    "longitude": -47.882778,
                }
            ]
            for indice in range(9):
                itens.append(
                    {
                        "name": f"Cidade {indice}",
                        "admin1": "São Paulo",
                        "country": "Brasil",
                        "country_code": "BR",
                        "latitude": -23.5 + indice * 0.01,
                        "longitude": -46.6 + indice * 0.01,
                    }
                )
            return httpx.Response(200, json={"results": itens})

        assert "api.open-meteo.com" in str(request.url)
        assert request.url.params["latitude"] == "-15.79"
        assert request.url.params["longitude"] == "-47.88"
        assert request.url.params["current"] == "temperature_2m,weather_code"
        assert request.url.params["timezone"] == "UTC"
        return httpx.Response(
            200,
            json={"current": {"temperature_2m": 24.54, "weather_code": 61}},
        )

    adaptador = AdaptadorOpenMeteo(
        configuracoes=config,
        transporte_http=httpx.MockTransport(handler_sucesso),
    )
    cidades = await adaptador.buscar_cidades("Brasilia", limite=8)
    assert len(cidades) == 8
    assert cidades[0] == SugestaoCidade(
        cidade="Brasília",
        uf="DF",
        pais="Brasil",
        latitude_aprox=-15.79,
        longitude_aprox=-47.88,
    )
    assert cidades[1].uf == "SP"

    leitura = await adaptador.consultar_clima_atual(-15.79, -47.88)
    assert leitura == LeituraClimaExterna(temperatura_c=24.5, codigo_wmo=61)
    assert len(requisicoes_capturadas) == 2

    adaptador_vazio = AdaptadorOpenMeteo(
        configuracoes=config,
        transporte_http=httpx.MockTransport(lambda _req: httpx.Response(200, json={})),
    )
    assert await adaptador_vazio.buscar_cidades("Inexistente", limite=8) == []

    def _raise_timeout(req: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("tempo esgotado", request=req)

    for transporte_falho in (
        httpx.MockTransport(lambda _req: httpx.Response(500, json={"error": True})),
        httpx.MockTransport(_raise_timeout),
        httpx.MockTransport(lambda _req: httpx.Response(200, content=b"{invalido")),
        httpx.MockTransport(
            lambda _req: httpx.Response(200, content=json.dumps({"current": {}}).encode("utf-8"))
        ),
    ):
        adaptador_erro = AdaptadorOpenMeteo(configuracoes=config, transporte_http=transporte_falho)
        with pytest.raises(ErroDeDominio) as exc_clima:
            await adaptador_erro.consultar_clima_atual(-15.79, -47.88)
        assert exc_clima.value.codigo == "SERVICO_EXTERNO_INDISPONIVEL"
        assert exc_clima.value.status_http == 503


async def test_servico_clima_cache_ttl_fallback_stale_e_privacidade() -> None:
    agora = datetime(2026, 11, 22, 12, 0, tzinfo=UTC)

    def relogio() -> datetime:
        return agora

    repo = _RepositorioPreferenciasMemoria()
    provedor = _ProvedorClimaControlado()
    cache = CacheClimaMemoria()
    servico = ServicoClima(
        provedor_clima=provedor,
        cache_clima=cache,
        repositorio_preferencias=repo,
        ttl_cache_segundos=1200,
        ttl_stale_segundos=7200,
        relogio=relogio,
    )

    uid_a = uuid4()
    uid_b = uuid4()

    # 1. Sem consentimento -> 403 e 0 chamadas ao provedor
    with pytest.raises(ErroDeDominio) as exc_nao_autorizado:
        await servico.consultar_clima_atual(uid_a)
    assert exc_nao_autorizado.value.codigo == "CLIMA_NAO_AUTORIZADO"
    assert exc_nao_autorizado.value.status_http == 403
    assert provedor.chamadas_clima == 0

    # Customiza audio/tutorial para garantir preservacao ao mexer no clima
    prefs_iniciais = await repo.obter_ou_padrao(str(uid_a))
    prefs_iniciais["audio"]["habilitado"] = True
    prefs_iniciais["tutorial"]["status"] = "concluido"
    await repo.salvar(prefs_iniciais)

    # 2. Apos consentimento -> 1a consulta vai no provedor
    await servico.atualizar_consentimento(
        usuario_id=uid_a,
        habilitado=True,
        modo_localizacao="manual",
        cidade="Brasília",
        uf="DF",
        latitude_aprox=-15.791,
        longitude_aprox=-47.884,
    )
    clima_1 = await servico.consultar_clima_atual(uid_a)
    assert clima_1.origem_cache is False
    assert clima_1.codigo_wmo == 61
    assert clima_1.estado_climatico == "chuvoso"
    assert clima_1.descricao == "Chuva leve"
    assert provedor.chamadas_clima == 1

    # 3. +10 min -> hit de cache
    agora = agora + timedelta(minutes=10)
    clima_2 = await servico.consultar_clima_atual(uid_a)
    assert clima_2.origem_cache is True
    assert provedor.chamadas_clima == 1

    # 4. Outro usuario na mesma coordenada arredondada reaproveita cache
    await servico.atualizar_consentimento(
        usuario_id=uid_b,
        habilitado=True,
        modo_localizacao="navegador",
        cidade=None,
        uf=None,
        latitude_aprox=-15.794,
        longitude_aprox=-47.881,
    )
    clima_b = await servico.consultar_clima_atual(uid_b)
    assert clima_b.origem_cache is True
    assert clima_b.cidade is None
    assert provedor.chamadas_clima == 1

    # 5. +25 min (> 20 min, <= 2h stale) com falha do provedor -> fallback stale
    agora = datetime(2026, 11, 22, 12, 25, tzinfo=UTC)
    provedor.falhar_clima = True
    clima_stale = await servico.consultar_clima_atual(uid_a)
    assert clima_stale.origem_cache is True
    assert clima_stale.temperatura_c == 24.5
    assert provedor.chamadas_clima == 2

    # 6. +25 min com provedor recuperado -> atualiza cache
    provedor.falhar_clima = False
    provedor.temperatura_c = 28.0
    provedor.codigo_wmo = 0
    clima_novo = await servico.consultar_clima_atual(uid_a)
    assert clima_novo.origem_cache is False
    assert clima_novo.estado_climatico == "limpo"
    assert clima_novo.temperatura_c == 28.0
    assert provedor.chamadas_clima == 3

    # 7. +3h (> 2h stale) com falha do provedor -> 503 SERVICO_EXTERNO_INDISPONIVEL
    agora = agora + timedelta(hours=3)
    provedor.falhar_clima = True
    with pytest.raises(ErroDeDominio) as exc_expirado:
        await servico.consultar_clima_atual(uid_a)
    assert exc_expirado.value.codigo == "SERVICO_EXTERNO_INDISPONIVEL"
    assert exc_expirado.value.status_http == 503

    # 8. Cache frio + falha -> 503
    cache.limpar()
    with pytest.raises(ErroDeDominio) as exc_frio:
        await servico.consultar_clima_atual(uid_a)
    assert exc_frio.value.codigo == "SERVICO_EXTERNO_INDISPONIVEL"
    assert exc_frio.value.status_http == 503

    # 9. Revogar consentimento apaga localizacao preservando audio/tutorial e bloqueia /atual
    res_rev = await servico.atualizar_consentimento(
        usuario_id=uid_a,
        habilitado=False,
        modo_localizacao="manual",
        cidade="Brasília",
        uf="DF",
        latitude_aprox=-15.79,
        longitude_aprox=-47.88,
    )
    assert res_rev.habilitado is False
    assert res_rev.estado_climatico == "limpo"
    prefs_salvas = await repo.obter_ou_padrao(str(uid_a))
    assert prefs_salvas["clima"] == {
        "habilitado": False,
        "modo_localizacao": None,
        "cidade": None,
        "uf": None,
        "latitude_aprox": None,
        "longitude_aprox": None,
    }
    assert prefs_salvas["audio"]["habilitado"] is True
    assert prefs_salvas["tutorial"]["status"] == "concluido"

    chamadas_antes = provedor.chamadas_clima
    with pytest.raises(ErroDeDominio) as exc_revogado:
        await servico.consultar_clima_atual(uid_a)
    assert exc_revogado.value.codigo == "CLIMA_NAO_AUTORIZADO"
    assert exc_revogado.value.status_http == 403
    assert provedor.chamadas_clima == chamadas_antes
