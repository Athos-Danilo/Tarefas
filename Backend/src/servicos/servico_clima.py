from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime
from uuid import UUID

from pymongo.errors import PyMongoError

from contratos.clima import (
    CacheClima,
    EntradaCacheClima,
    ProvedorClima,
    SugestaoCidade,
)
from contratos.persistencia import RepositorioPreferenciasCenario
from dominio.clima import (
    MAX_SUGESTOES_CIDADES,
    EstadoClimatico,
    arredondar_coordenada,
    construir_preferencias_clima_consentimento,
    mapear_codigo_wmo,
    normalizar_consulta_cidade,
)
from dominio.erros import ErroDeDominio
from dominio.preferencias_padrao import ModoLocalizacaoClima, PreferenciasCenario


@dataclass(frozen=True)
class ResultadoConsentimentoClima:
    """Resultado consolidado da gravacao de consentimento de clima."""

    habilitado: bool
    modo_localizacao: ModoLocalizacaoClima | None
    cidade: str | None
    uf: str | None
    latitude_aprox: float | None
    longitude_aprox: float | None
    estado_climatico: EstadoClimatico = "limpo"


@dataclass(frozen=True)
class ClimaAtualResposta:
    """Leitura climatica normalizada para exibicao e simulacao de atmosfera."""

    habilitado: bool
    cidade: str | None
    uf: str | None
    temperatura_c: float
    codigo_wmo: int
    estado_climatico: EstadoClimatico
    descricao: str
    origem_cache: bool
    atualizado_em: datetime


class ServicoClima:
    """Casos de uso de busca de cidades, consentimento opt-in e clima com cache."""

    def __init__(
        self,
        provedor_clima: ProvedorClima,
        cache_clima: CacheClima,
        repositorio_preferencias: RepositorioPreferenciasCenario | None,
        ttl_cache_segundos: int = 1200,
        ttl_stale_segundos: int = 7200,
        relogio: Callable[[], datetime] | None = None,
    ) -> None:
        self._provedor = provedor_clima
        self._cache = cache_clima
        self._preferencias = repositorio_preferencias
        self._ttl_cache = max(60, ttl_cache_segundos)
        self._ttl_stale = max(self._ttl_cache, ttl_stale_segundos)
        self._relogio = relogio or (lambda: datetime.now(UTC))

    def _agora(self) -> datetime:
        return self._relogio().astimezone(UTC)

    async def _obter_preferencias_seguro(
        self,
        usuario_id: UUID,
    ) -> PreferenciasCenario:
        assert self._preferencias is not None
        try:
            return await self._preferencias.obter_ou_padrao(str(usuario_id))
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel acessar as preferencias de clima.",
                status_http=503,
            ) from falha

    async def buscar_cidades(self, consulta: str) -> list[SugestaoCidade]:
        consulta_limpa = normalizar_consulta_cidade(consulta)
        sugestoes = await self._provedor.buscar_cidades(
            consulta_limpa,
            limite=MAX_SUGESTOES_CIDADES,
        )
        return sugestoes[:MAX_SUGESTOES_CIDADES]

    async def atualizar_consentimento(
        self,
        usuario_id: UUID,
        *,
        habilitado: bool,
        modo_localizacao: str | None = None,
        cidade: str | None = None,
        uf: str | None = None,
        latitude_aprox: float | None = None,
        longitude_aprox: float | None = None,
    ) -> ResultadoConsentimentoClima:
        bloco_clima = construir_preferencias_clima_consentimento(
            habilitado=habilitado,
            modo_localizacao=modo_localizacao,
            cidade=cidade,
            uf=uf,
            latitude_aprox=latitude_aprox,
            longitude_aprox=longitude_aprox,
        )
        if self._preferencias is None:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Armazenamento de preferencias indisponivel no momento.",
                status_http=503,
            )

        preferencias = await self._obter_preferencias_seguro(usuario_id)
        agora = self._agora()
        preferencias["clima"] = bloco_clima
        preferencias["atualizado_em"] = agora

        try:
            await self._preferencias.salvar(preferencias)
        except PyMongoError as falha:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Nao foi possivel salvar o consentimento de clima.",
                status_http=503,
            ) from falha

        return ResultadoConsentimentoClima(
            habilitado=bloco_clima["habilitado"],
            modo_localizacao=bloco_clima["modo_localizacao"],
            cidade=bloco_clima["cidade"],
            uf=bloco_clima["uf"],
            latitude_aprox=bloco_clima["latitude_aprox"],
            longitude_aprox=bloco_clima["longitude_aprox"],
            estado_climatico="limpo",
        )

    async def consultar_clima_atual(self, usuario_id: UUID) -> ClimaAtualResposta:
        if self._preferencias is None:
            raise ErroDeDominio(
                codigo="CLIMA_NAO_AUTORIZADO",
                mensagem="Ative o clima local antes de consultar a previsao atual.",
                status_http=403,
            )

        preferencias = await self._obter_preferencias_seguro(usuario_id)
        clima_pref = preferencias["clima"]
        lat_bruta = clima_pref["latitude_aprox"]
        lon_bruta = clima_pref["longitude_aprox"]

        if not clima_pref["habilitado"] or lat_bruta is None or lon_bruta is None:
            raise ErroDeDominio(
                codigo="CLIMA_NAO_AUTORIZADO",
                mensagem="O clima local nao foi autorizado pelo usuario.",
                status_http=403,
            )

        latitude = arredondar_coordenada(lat_bruta, eixo="latitude")
        longitude = arredondar_coordenada(lon_bruta, eixo="longitude")
        cidade = clima_pref["cidade"]
        uf = clima_pref["uf"]
        agora = self._agora()

        entrada = self._cache.obter(latitude, longitude)
        if entrada is not None:
            idade_segundos = (agora - entrada.atualizado_em).total_seconds()
            if idade_segundos <= self._ttl_cache:
                return self._montar_resposta_clima(
                    cidade=cidade,
                    uf=uf,
                    temperatura_c=entrada.temperatura_c,
                    codigo_wmo=entrada.codigo_wmo,
                    origem_cache=True,
                    atualizado_em=entrada.atualizado_em,
                )

        try:
            leitura = await self._provedor.consultar_clima_atual(latitude, longitude)
        except ErroDeDominio as falha:
            if (
                falha.codigo == "SERVICO_EXTERNO_INDISPONIVEL"
                and entrada is not None
                and (agora - entrada.atualizado_em).total_seconds() <= self._ttl_stale
            ):
                return self._montar_resposta_clima(
                    cidade=cidade,
                    uf=uf,
                    temperatura_c=entrada.temperatura_c,
                    codigo_wmo=entrada.codigo_wmo,
                    origem_cache=True,
                    atualizado_em=entrada.atualizado_em,
                )
            raise

        nova_entrada = EntradaCacheClima(
            temperatura_c=leitura.temperatura_c,
            codigo_wmo=leitura.codigo_wmo,
            atualizado_em=agora,
        )
        self._cache.salvar(latitude, longitude, nova_entrada)
        return self._montar_resposta_clima(
            cidade=cidade,
            uf=uf,
            temperatura_c=leitura.temperatura_c,
            codigo_wmo=leitura.codigo_wmo,
            origem_cache=False,
            atualizado_em=agora,
        )

    @staticmethod
    def _montar_resposta_clima(
        *,
        cidade: str | None,
        uf: str | None,
        temperatura_c: float,
        codigo_wmo: int,
        origem_cache: bool,
        atualizado_em: datetime,
    ) -> ClimaAtualResposta:
        wmo = mapear_codigo_wmo(codigo_wmo)
        return ClimaAtualResposta(
            habilitado=True,
            cidade=cidade,
            uf=uf,
            temperatura_c=temperatura_c,
            codigo_wmo=codigo_wmo,
            estado_climatico=wmo.estado_climatico,
            descricao=wmo.descricao,
            origem_cache=origem_cache,
            atualizado_em=atualizado_em,
        )
