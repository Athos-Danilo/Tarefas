from uuid import UUID

from pydantic import BaseModel

from dominio.calendario import CalendarioMensalResultado, DiaCalendarioResumo, ItemCalendarioTarefa
from dominio.modelos_tarefa import PrioridadeTarefa, StatusTarefa, TurnoTarefa
from rotas.esquemas_autenticacao import formatar_instante_iso_utc


class ItemCalendarioResposta(BaseModel):
    """Tarefa real ou ocorrencia recorrente exibida em um dia do calendario."""

    id: UUID
    titulo: str
    prioridade: PrioridadeTarefa
    status: StatusTarefa
    turno: TurnoTarefa
    prazo: str
    atrasada: bool
    recorrente: bool
    eh_projecao: bool


class DiaCalendarioResposta(BaseModel):
    """Agregado diario de prazos e prioridades."""

    data: str
    total_tarefas: int
    maior_prioridade: PrioridadeTarefa
    tem_atrasada: bool
    tem_recorrente: bool
    tarefas: list[ItemCalendarioResposta]


class RespostaCalendarioMensal(BaseModel):
    """Resposta de GET /api/calendario/mensal."""

    ano: int
    mes: int
    fuso_horario: str
    dias: list[DiaCalendarioResposta]


def _montar_item(item: ItemCalendarioTarefa) -> ItemCalendarioResposta:
    return ItemCalendarioResposta(
        id=item.id,
        titulo=item.titulo,
        prioridade=item.prioridade,
        status=item.status,
        turno=item.turno,
        prazo=formatar_instante_iso_utc(item.prazo),
        atrasada=item.atrasada,
        recorrente=item.recorrente,
        eh_projecao=item.eh_projecao,
    )


def _montar_dia(dia: DiaCalendarioResumo) -> DiaCalendarioResposta:
    return DiaCalendarioResposta(
        data=dia.data.isoformat(),
        total_tarefas=dia.total_tarefas,
        maior_prioridade=dia.maior_prioridade,
        tem_atrasada=dia.tem_atrasada,
        tem_recorrente=dia.tem_recorrente,
        tarefas=[_montar_item(item) for item in dia.tarefas],
    )


def montar_resposta_calendario_mensal(
    resultado: CalendarioMensalResultado,
) -> RespostaCalendarioMensal:
    """Converte o resultado do dominio para o contrato JSON de GET /api/calendario/mensal."""
    return RespostaCalendarioMensal(
        ano=resultado.ano,
        mes=resultado.mes,
        fuso_horario=resultado.fuso_horario,
        dias=[_montar_dia(dia) for dia in resultado.dias],
    )
