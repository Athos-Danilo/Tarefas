import math
import unicodedata
from dataclasses import dataclass
from typing import Literal, cast

from dominio.erros import ErroDeDominio
from dominio.preferencias_padrao import ModoLocalizacaoClima, PreferenciasClima

EstadoClimatico = Literal[
    "limpo",
    "parcialmente_nublado",
    "nublado",
    "chuvoso",
    "tempestade",
]

ESTADOS_CLIMATICOS_OFICIAIS: tuple[EstadoClimatico, ...] = (
    "limpo",
    "parcialmente_nublado",
    "nublado",
    "chuvoso",
    "tempestade",
)

MAX_SUGESTOES_CIDADES = 8
MIN_TAMANHO_BUSCA_CIDADE = 2
MAX_TAMANHO_BUSCA_CIDADE = 80
MAX_TAMANHO_CIDADE = 80
MAX_TAMANHO_UF = 40


@dataclass(frozen=True)
class ResultadoWmo:
    """Resultado normalizado do mapeamento de um codigo climatico WMO."""

    codigo_wmo: int
    estado_climatico: EstadoClimatico
    descricao: str


MAPA_WMO_CLIMA: dict[int, tuple[EstadoClimatico, str]] = {
    0: ("limpo", "Céu limpo"),
    1: ("parcialmente_nublado", "Predominantemente limpo"),
    2: ("parcialmente_nublado", "Parcialmente nublado"),
    3: ("nublado", "Encoberto"),
    45: ("nublado", "Neblina"),
    48: ("nublado", "Neblina intensa"),
    51: ("chuvoso", "Garoa leve"),
    53: ("chuvoso", "Garoa moderada"),
    55: ("chuvoso", "Garoa intensa"),
    56: ("chuvoso", "Garoa gelada leve"),
    57: ("chuvoso", "Garoa gelada intensa"),
    61: ("chuvoso", "Chuva leve"),
    63: ("chuvoso", "Chuva moderada"),
    65: ("chuvoso", "Chuva forte"),
    66: ("chuvoso", "Chuva congelante leve"),
    67: ("chuvoso", "Chuva congelante forte"),
    71: ("chuvoso", "Neve leve"),
    73: ("chuvoso", "Neve moderada"),
    75: ("chuvoso", "Neve intensa"),
    77: ("chuvoso", "Grãos de neve"),
    80: ("chuvoso", "Pancadas leves de chuva"),
    81: ("chuvoso", "Pancadas moderadas de chuva"),
    82: ("tempestade", "Pancadas violentas de chuva"),
    85: ("chuvoso", "Pancadas leves de neve"),
    86: ("chuvoso", "Pancadas fortes de neve"),
    95: ("tempestade", "Tempestade com trovoadas"),
    96: ("tempestade", "Tempestade com granizo leve"),
    99: ("tempestade", "Tempestade com granizo forte"),
}

MAPA_ESTADOS_BRASIL_UF: dict[str, str] = {
    "acre": "AC",
    "alagoas": "AL",
    "amapa": "AP",
    "amazonas": "AM",
    "bahia": "BA",
    "ceara": "CE",
    "distrito federal": "DF",
    "espirito santo": "ES",
    "goias": "GO",
    "maranhao": "MA",
    "mato grosso": "MT",
    "mato grosso do sul": "MS",
    "minas gerais": "MG",
    "para": "PA",
    "paraiba": "PB",
    "parana": "PR",
    "pernambuco": "PE",
    "piaui": "PI",
    "rio de janeiro": "RJ",
    "rio grande do norte": "RN",
    "rio grande do sul": "RS",
    "rondonia": "RO",
    "roraima": "RR",
    "santa catarina": "SC",
    "sao paulo": "SP",
    "sergipe": "SE",
    "tocantins": "TO",
}


def mapear_codigo_wmo(codigo_wmo: int) -> ResultadoWmo:
    """Traduz codigo WMO para um dos 5 estados climaticos oficiais com fallback seguro."""
    entrada = MAPA_WMO_CLIMA.get(codigo_wmo)
    if entrada is None:
        return ResultadoWmo(
            codigo_wmo=codigo_wmo,
            estado_climatico="limpo",
            descricao="Condição climática indefinida",
        )
    estado, descricao = entrada
    return ResultadoWmo(
        codigo_wmo=codigo_wmo,
        estado_climatico=estado,
        descricao=descricao,
    )


def arredondar_coordenada(valor: float, *, eixo: Literal["latitude", "longitude"]) -> float:
    """Valida limites geograficos e arredonda coordenada para 2 casas decimais (~1 km)."""
    if isinstance(valor, bool) or not isinstance(valor, int | float):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem=f"Coordenada de {eixo} invalida.",
            status_http=422,
        )
    numero = float(valor)
    if not math.isfinite(numero):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem=f"Coordenada de {eixo} deve ser finita.",
            status_http=422,
        )

    limite_min, limite_max = (-90.0, 90.0) if eixo == "latitude" else (-180.0, 180.0)
    if numero < limite_min or numero > limite_max:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem=f"Coordenada de {eixo} fora do intervalo permitido.",
            status_http=422,
        )

    arredondado = round(numero, 2)
    return 0.0 if arredondado == 0.0 else arredondado


def normalizar_consulta_cidade(consulta: str) -> str:
    """Normaliza espacos e valida tamanho da busca textual de cidade."""
    texto = " ".join(consulta.split())
    if len(texto) < MIN_TAMANHO_BUSCA_CIDADE or len(texto) > MAX_TAMANHO_BUSCA_CIDADE:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem=(
                f"A busca de cidade deve ter entre {MIN_TAMANHO_BUSCA_CIDADE} "
                f"e {MAX_TAMANHO_BUSCA_CIDADE} caracteres."
            ),
            status_http=422,
        )
    return texto


def _remover_acentos_minusculo(texto: str) -> str:
    decomposicao = unicodedata.normalize("NFKD", texto)
    return "".join(ch for ch in decomposicao if not unicodedata.combining(ch)).lower()


def normalizar_uf_por_regiao(
    admin1: str | None,
    codigo_pais: str | None = None,
) -> str | None:
    """Converte nomes de estados brasileiros em sigla UF de 2 letras ou preserva regiao."""
    if admin1 is None:
        return None
    limpo = " ".join(admin1.split())
    if not limpo:
        return None

    pais_norm = (codigo_pais or "").strip().upper()
    if pais_norm == "BR":
        if len(limpo) == 2 and limpo.isalpha():
            return limpo.upper()
        sigla = MAPA_ESTADOS_BRASIL_UF.get(_remover_acentos_minusculo(limpo))
        if sigla is not None:
            return sigla

    return limpo[:MAX_TAMANHO_UF]


def construir_preferencias_clima_consentimento(
    *,
    habilitado: bool,
    modo_localizacao: str | None = None,
    cidade: str | None = None,
    uf: str | None = None,
    latitude_aprox: float | None = None,
    longitude_aprox: float | None = None,
) -> PreferenciasClima:
    """Constroi bloco clima garantindo opt-in explicito e limpeza imediata ao desativar."""
    if not habilitado:
        return {
            "habilitado": False,
            "modo_localizacao": None,
            "cidade": None,
            "uf": None,
            "latitude_aprox": None,
            "longitude_aprox": None,
        }

    if modo_localizacao not in ("navegador", "manual"):
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Modo de localizacao deve ser 'navegador' ou 'manual'.",
            status_http=422,
        )

    if latitude_aprox is None or longitude_aprox is None:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Informe latitude_aprox e longitude_aprox para ativar o clima local.",
            status_http=422,
        )

    lat_arredondada = arredondar_coordenada(latitude_aprox, eixo="latitude")
    lon_arredondada = arredondar_coordenada(longitude_aprox, eixo="longitude")

    cidade_limpa = " ".join(cidade.split())[:MAX_TAMANHO_CIDADE] if cidade else ""
    if modo_localizacao == "manual" and not cidade_limpa:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Informe o nome da cidade ao escolher selecao manual.",
            status_http=422,
        )

    uf_limpa = " ".join(uf.split())[:MAX_TAMANHO_UF] if uf else ""
    if uf_limpa and len(uf_limpa) == 2 and uf_limpa.isalpha():
        uf_limpa = uf_limpa.upper()

    return {
        "habilitado": True,
        "modo_localizacao": cast(ModoLocalizacaoClima, modo_localizacao),
        "cidade": cidade_limpa or None,
        "uf": uf_limpa or None,
        "latitude_aprox": lat_arredondada,
        "longitude_aprox": lon_arredondada,
    }
