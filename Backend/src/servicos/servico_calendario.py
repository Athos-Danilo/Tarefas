from collections.abc import Callable
from datetime import UTC, datetime
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from contratos.calendario import RepositorioCalendario
from dominio.calendario import (
    FUSO_PADRAO,
    CalendarioMensalResultado,
    construir_calendario_mensal,
    validar_janela_mensal,
)
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import PrioridadeTarefa, TurnoTarefa


class ServicoCalendario:
    """Casos de uso de consulta mensal de prazos e ocorrencias recorrentes."""

    def __init__(
        self,
        repositorio_calendario: RepositorioCalendario,
        relogio: Callable[[], datetime] | None = None,
    ) -> None:
        self._repositorio = repositorio_calendario
        self._relogio = relogio or (lambda: datetime.now(UTC))

    async def consultar_mensal(
        self,
        usuario_id: UUID,
        *,
        ano: int | None = None,
        mes: int | None = None,
        fuso_horario: str = FUSO_PADRAO,
        prioridade: PrioridadeTarefa | None = None,
        turno: TurnoTarefa | None = None,
    ) -> CalendarioMensalResultado:
        agora_utc = self._relogio().astimezone(UTC)
        fuso_limpo = fuso_horario.strip() or FUSO_PADRAO
        try:
            tz_ref = ZoneInfo(fuso_limpo)
        except (ZoneInfoNotFoundError, ValueError) as falha:
            raise ErroDeDominio(
                codigo="FUSO_HORARIO_INVALIDO",
                mensagem=f"Fuso horario '{fuso_limpo}' nao reconhecido.",
                status_http=422,
            ) from falha

        agora_local = agora_utc.astimezone(tz_ref)
        ano_alvo = ano if ano is not None else agora_local.year
        mes_alvo = mes if mes is not None else agora_local.month

        _, _, _, inicio_utc, fim_exclusivo_utc = validar_janela_mensal(
            ano_alvo,
            mes_alvo,
            fuso_limpo,
        )
        tarefas = await self._repositorio.listar_tarefas_para_janela(
            usuario_id,
            inicio_utc=inicio_utc,
            fim_exclusivo_utc=fim_exclusivo_utc,
            prioridade=prioridade,
            turno=turno,
        )
        return construir_calendario_mensal(
            tarefas,
            ano=ano_alvo,
            mes=mes_alvo,
            fuso_horario=fuso_limpo,
            agora=agora_utc,
            prioridade=prioridade,
            turno=turno,
        )
