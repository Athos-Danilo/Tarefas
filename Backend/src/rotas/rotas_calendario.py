from typing import Annotated, cast

from fastapi import APIRouter, Depends, Query

from dominio.calendario import FUSO_PADRAO
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import PrioridadeTarefa, TurnoTarefa
from rotas.dependencias_autenticacao import (
    exigir_workspace_liberado,
    obter_servico_calendario,
)
from rotas.esquemas_calendario import (
    RespostaCalendarioMensal,
    montar_resposta_calendario_mensal,
)
from servicos.servico_autenticacao import ContextoAutenticado
from servicos.servico_calendario import ServicoCalendario

roteador_calendario = APIRouter(prefix="/api/calendario", tags=["Calendario"])

_PRIORIDADES_VALIDAS = {"baixa", "media", "alta", "urgente"}
_TURNOS_VALIDOS = {"manha", "tarde", "noite", "livre"}


def _normalizar_prioridade(valor: str | None) -> PrioridadeTarefa | None:
    if valor is None or not valor.strip():
        return None
    limpo = valor.strip()
    if limpo not in _PRIORIDADES_VALIDAS:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Prioridade informada no filtro do calendario e invalida.",
            status_http=422,
        )
    return cast(PrioridadeTarefa, limpo)


def _normalizar_turno(valor: str | None) -> TurnoTarefa | None:
    if valor is None or not valor.strip():
        return None
    limpo = valor.strip()
    if limpo not in _TURNOS_VALIDOS:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="Turno informado no filtro do calendario e invalido.",
            status_http=422,
        )
    return cast(TurnoTarefa, limpo)


@roteador_calendario.get(
    "/mensal",
    response_model=RespostaCalendarioMensal,
    summary="Consultar prazos e ocorrencias recorrentes na janela mensal",
)
async def consultar_calendario_mensal_rota(
    contexto: Annotated[ContextoAutenticado, Depends(exigir_workspace_liberado)],
    servico: Annotated[ServicoCalendario, Depends(obter_servico_calendario)],
    ano: int | None = Query(default=None, description="Ano da janela mensal"),
    mes: int | None = Query(default=None, description="Mes (1 a 12) da janela mensal"),
    fuso_horario: str = Query(default=FUSO_PADRAO, description="Fuso horario IANA do cliente"),
    prioridade: str | None = Query(default=None, description="Filtro opcional de prioridade"),
    turno: str | None = Query(default=None, description="Filtro opcional de turno"),
) -> RespostaCalendarioMensal:
    resultado = await servico.consultar_mensal(
        contexto.usuario.id,
        ano=ano,
        mes=mes,
        fuso_horario=fuso_horario,
        prioridade=_normalizar_prioridade(prioridade),
        turno=_normalizar_turno(turno),
    )
    return montar_resposta_calendario_mensal(resultado)
