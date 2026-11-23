from collections import defaultdict
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta
from uuid import UUID
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from contratos.tarefas import TarefaRegistro
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    ConfiguracaoRecorrencia,
    PrioridadeTarefa,
    StatusTarefa,
    TurnoTarefa,
)
from dominio.recorrencia import calcular_proxima_ocorrencia, validar_configuracao_recorrencia

ANO_MIN = 1970
ANO_MAX = 2100
FUSO_PADRAO = "America/Sao_Paulo"
MAX_PROJECOES_POR_TAREFA = 400

PESO_PRIORIDADE: dict[PrioridadeTarefa, int] = {
    "baixa": 1,
    "media": 2,
    "alta": 3,
    "urgente": 4,
}


@dataclass(frozen=True)
class ItemCalendarioTarefa:
    """Tarefa real ou ocorrencia projetada exibida em um dia do calendario."""

    id: UUID
    titulo: str
    prioridade: PrioridadeTarefa
    status: StatusTarefa
    turno: TurnoTarefa
    prazo: datetime
    atrasada: bool
    recorrente: bool
    eh_projecao: bool


@dataclass(frozen=True)
class DiaCalendarioResumo:
    """Agregado diario retornado para renderizar indicadores e lista do dia."""

    data: date
    total_tarefas: int
    maior_prioridade: PrioridadeTarefa
    tem_atrasada: bool
    tem_recorrente: bool
    tarefas: tuple[ItemCalendarioTarefa, ...]


@dataclass(frozen=True)
class CalendarioMensalResultado:
    """Resposta completa da janela mensal corrigida para o fuso do cliente."""

    ano: int
    mes: int
    fuso_horario: str
    dias: tuple[DiaCalendarioResumo, ...]


def validar_janela_mensal(
    ano: int,
    mes: int,
    fuso_horario: str,
) -> tuple[int, int, ZoneInfo, datetime, datetime]:
    """Valida ano/mes/fuso IANA e calcula os limites UTC da janela mensal."""
    if ano < ANO_MIN or ano > ANO_MAX or mes < 1 or mes > 12:
        raise ErroDeDominio(
            codigo="JANELA_CALENDARIO_INVALIDA",
            mensagem=f"Informe um ano entre {ANO_MIN} e {ANO_MAX} e mes entre 1 e 12.",
            status_http=422,
        )

    fuso_limpo = fuso_horario.strip()
    if not fuso_limpo:
        raise ErroDeDominio(
            codigo="FUSO_HORARIO_INVALIDO",
            mensagem="Informe um fuso horario IANA valido.",
            status_http=422,
        )
    try:
        tz = ZoneInfo(fuso_limpo)
    except (ZoneInfoNotFoundError, ValueError) as falha:
        raise ErroDeDominio(
            codigo="FUSO_HORARIO_INVALIDO",
            mensagem=f"Fuso horario '{fuso_limpo}' nao reconhecido.",
            status_http=422,
        ) from falha

    inicio_local = datetime(ano, mes, 1, 0, 0, 0, tzinfo=tz)
    prox_ano, prox_mes = (ano + 1, 1) if mes == 12 else (ano, mes + 1)
    fim_local = datetime(prox_ano, prox_mes, 1, 0, 0, 0, tzinfo=tz)
    return ano, mes, tz, inicio_local.astimezone(UTC), fim_local.astimezone(UTC)


def _normalizar_utc(instante: datetime) -> datetime:
    return instante.replace(tzinfo=UTC) if instante.tzinfo is None else instante.astimezone(UTC)


def _avancar_cursor_proximo_da_janela(
    regra: ConfiguracaoRecorrencia,
    prazo_utc: datetime,
    inicio_utc: datetime,
) -> datetime:
    """Salta em multiplos exatos quando o prazo inicial esta muito no passado."""
    dias_atras = (inicio_utc.date() - prazo_utc.date()).days
    if dias_atras <= 7:
        return prazo_utc
    if regra.tipo == "diaria":
        saltos = max(0, (dias_atras // regra.intervalo) - 2)
        return prazo_utc + timedelta(days=saltos * regra.intervalo)
    if regra.tipo == "semanal":
        passo_semanal = 7 * regra.intervalo
        saltos = max(0, (dias_atras // passo_semanal) - 2)
        return prazo_utc + timedelta(days=saltos * passo_semanal)
    return prazo_utc


def _projetar_ocorrencias_futuras(
    tarefa: TarefaRegistro,
    prazo_utc: datetime,
    *,
    tz: ZoneInfo,
    inicio_utc: datetime,
    fim_exclusivo_utc: datetime,
) -> list[tuple[date, ItemCalendarioTarefa]]:
    if tarefa.status == "concluida" or tarefa.recorrencia.tipo == "nenhuma":
        return []

    regra = validar_configuracao_recorrencia(tarefa.recorrencia)
    if regra.tipo == "mensal" and regra.dia_mes is None:
        regra = ConfiguracaoRecorrencia(
            tipo="mensal",
            dia_mes=prazo_utc.day,
            intervalo=regra.intervalo,
        )

    cursor = _avancar_cursor_proximo_da_janela(regra, prazo_utc, inicio_utc)
    saida: list[tuple[date, ItemCalendarioTarefa]] = []
    for _ in range(MAX_PROJECOES_POR_TAREFA):
        proxima = calcular_proxima_ocorrencia(regra, cursor, agora=cursor)
        if proxima is None or proxima >= fim_exclusivo_utc:
            break
        if proxima >= inicio_utc:
            data_local = proxima.astimezone(tz).date()
            saida.append(
                (
                    data_local,
                    ItemCalendarioTarefa(
                        id=tarefa.id,
                        titulo=tarefa.titulo,
                        prioridade=tarefa.prioridade,
                        status="pendente",
                        turno=tarefa.turno,
                        prazo=proxima,
                        atrasada=False,
                        recorrente=True,
                        eh_projecao=True,
                    ),
                )
            )
        cursor = proxima
    return saida


def construir_calendario_mensal(
    tarefas: Sequence[TarefaRegistro],
    *,
    ano: int,
    mes: int,
    fuso_horario: str,
    agora: datetime,
    prioridade: PrioridadeTarefa | None = None,
    turno: TurnoTarefa | None = None,
) -> CalendarioMensalResultado:
    """Agrupa prazos reais e projecoes de recorrencia dentro da janela mensal."""
    ano_ok, mes_ok, tz, inicio_utc, fim_exclusivo_utc = validar_janela_mensal(
        ano,
        mes,
        fuso_horario,
    )
    agora_utc = _normalizar_utc(agora)

    itens_por_dia: dict[date, list[ItemCalendarioTarefa]] = defaultdict(list)
    chaves_vistas: set[tuple[date, UUID]] = set()

    for tarefa in tarefas:
        if prioridade is not None and tarefa.prioridade != prioridade:
            continue
        if turno is not None and tarefa.turno != turno:
            continue
        if tarefa.prazo is None:
            continue

        prazo_utc = _normalizar_utc(tarefa.prazo)
        recorrente = tarefa.recorrencia.tipo != "nenhuma"
        if inicio_utc <= prazo_utc < fim_exclusivo_utc:
            data_local = prazo_utc.astimezone(tz).date()
            atrasada = tarefa.status != "concluida" and prazo_utc < agora_utc
            itens_por_dia[data_local].append(
                ItemCalendarioTarefa(
                    id=tarefa.id,
                    titulo=tarefa.titulo,
                    prioridade=tarefa.prioridade,
                    status=tarefa.status,
                    turno=tarefa.turno,
                    prazo=prazo_utc,
                    atrasada=atrasada,
                    recorrente=recorrente,
                    eh_projecao=False,
                )
            )
            chaves_vistas.add((data_local, tarefa.id))

        for data_proj, item_proj in _projetar_ocorrencias_futuras(
            tarefa,
            prazo_utc,
            tz=tz,
            inicio_utc=inicio_utc,
            fim_exclusivo_utc=fim_exclusivo_utc,
        ):
            if (data_proj, tarefa.id) in chaves_vistas:
                continue
            chaves_vistas.add((data_proj, tarefa.id))
            itens_por_dia[data_proj].append(item_proj)

    dias_ordenados: list[DiaCalendarioResumo] = []
    for data_dia in sorted(itens_por_dia.keys()):
        itens = sorted(
            itens_por_dia[data_dia],
            key=lambda item: (
                item.eh_projecao,
                item.prazo,
                -PESO_PRIORIDADE[item.prioridade],
                item.titulo.lower(),
            ),
        )
        maior = max(itens, key=lambda item: PESO_PRIORIDADE[item.prioridade]).prioridade
        dias_ordenados.append(
            DiaCalendarioResumo(
                data=data_dia,
                total_tarefas=len(itens),
                maior_prioridade=maior,
                tem_atrasada=any(item.atrasada for item in itens),
                tem_recorrente=any(item.recorrente for item in itens),
                tarefas=tuple(itens),
            )
        )

    return CalendarioMensalResultado(
        ano=ano_ok,
        mes=mes_ok,
        fuso_horario=tz.key,
        dias=tuple(dias_ordenados),
    )
