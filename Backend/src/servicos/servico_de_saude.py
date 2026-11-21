from collections.abc import Callable
from dataclasses import dataclass
from datetime import UTC, datetime

from configuracao.configuracoes import Configuracoes
from contratos.verificador_saude import (
    EstadoDependencia,
    EstadoGeralSaude,
    VerificadorDeDependencia,
)

RelogioUtc = Callable[[], datetime]


def _agora_utc() -> datetime:
    return datetime.now(UTC)


def _formatar_iso_utc(instante: datetime) -> str:
    instante_utc = instante.astimezone(UTC).replace(microsecond=0)
    return instante_utc.isoformat().replace("+00:00", "Z")


@dataclass(frozen=True, slots=True)
class ResultadoSaude:
    """Retorno de dominio do estado de saude da aplicacao."""

    status: EstadoGeralSaude
    servico: str
    versao: str
    banco_relacional: EstadoDependencia
    banco_documental: EstadoDependencia
    timestamp: str


class ServicoDeSaude:
    """Caso de uso responsavel por agregar o estado de saude dos servicos."""

    def __init__(
        self,
        configuracoes: Configuracoes,
        verificador_relacional: VerificadorDeDependencia,
        verificador_documental: VerificadorDeDependencia,
        relogio: RelogioUtc | None = None,
    ) -> None:
        self._configuracoes = configuracoes
        self._verificador_relacional = verificador_relacional
        self._verificador_documental = verificador_documental
        self._relogio = relogio or _agora_utc

    async def consultar_saude(self) -> ResultadoSaude:
        estado_relacional = await self._verificador_relacional.verificar()
        estado_documental = await self._verificador_documental.verificar()

        alguma_indisponivel = "indisponivel" in (estado_relacional, estado_documental)
        status_geral: EstadoGeralSaude = "degradado" if alguma_indisponivel else "ok"

        return ResultadoSaude(
            status=status_geral,
            servico=self._configuracoes.nome_servico,
            versao=self._configuracoes.versao_api,
            banco_relacional=estado_relacional,
            banco_documental=estado_documental,
            timestamp=_formatar_iso_utc(self._relogio()),
        )
