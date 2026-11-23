from datetime import UTC, datetime
from uuid import uuid4

import pytest

from contratos.tarefas import TarefaRegistro
from dominio.calendario import (
    construir_calendario_mensal,
    validar_janela_mensal,
)
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    ConfiguracaoRecorrencia,
    PrioridadeTarefa,
    StatusTarefa,
    TurnoTarefa,
)


def _fabricar_tarefa(
    *,
    titulo: str,
    prazo: datetime | None,
    prioridade: PrioridadeTarefa = "media",
    status: StatusTarefa = "pendente",
    turno: TurnoTarefa = "livre",
    recorrencia: ConfiguracaoRecorrencia | None = None,
) -> TarefaRegistro:
    agora = datetime(2026, 11, 1, 10, 0, tzinfo=UTC)
    return TarefaRegistro(
        id=uuid4(),
        usuario_id=uuid4(),
        tarefa_pai_id=None,
        titulo=titulo,
        prioridade=prioridade,
        status=status,
        turno=turno,
        prazo=prazo,
        profundidade=0,
        ordem_manual=0,
        recorrencia=recorrencia or ConfiguracaoRecorrencia(),
        serie_recorrencia_id=uuid4() if recorrencia else None,
        vezes_reaberta=0,
        concluida_em=agora if status == "concluida" else None,
        criado_em=agora,
        atualizado_em=agora,
    )


def test_validar_janela_mensal_valida_faixas_e_fuso_horario() -> None:
    ano, mes, tz, inicio_utc, fim_utc = validar_janela_mensal(2026, 11, "America/Sao_Paulo")
    assert ano == 2026
    assert mes == 11
    assert tz.key == "America/Sao_Paulo"
    # Novembro 2026 em Sao Paulo (UTC-3) inicia 2026-11-01T03:00Z e termina 2026-12-01T03:00Z
    assert inicio_utc == datetime(2026, 11, 1, 3, 0, tzinfo=UTC)
    assert fim_utc == datetime(2026, 12, 1, 3, 0, tzinfo=UTC)

    for mes_ruim in (0, 13):
        with pytest.raises(ErroDeDominio) as exc_mes:
            validar_janela_mensal(2026, mes_ruim, "UTC")
        assert exc_mes.value.status_http == 422
        assert exc_mes.value.codigo == "JANELA_CALENDARIO_INVALIDA"

    with pytest.raises(ErroDeDominio) as exc_ano:
        validar_janela_mensal(1969, 5, "UTC")
    assert exc_ano.value.status_http == 422
    assert exc_ano.value.codigo == "JANELA_CALENDARIO_INVALIDA"

    with pytest.raises(ErroDeDominio) as exc_fuso:
        validar_janela_mensal(2026, 11, "Fuso/Inexistente")
    assert exc_fuso.value.status_http == 422
    assert exc_fuso.value.codigo == "FUSO_HORARIO_INVALIDO"


def test_calendario_respeita_fuso_na_virada_e_calcula_atraso_e_maior_prioridade() -> None:
    # 2026-12-01 01:30 UTC corresponde a 2026-11-30 22:30 em America/Sao_Paulo (UTC-3)
    prazo_virada = datetime(2026, 12, 1, 1, 30, tzinfo=UTC)
    t_alta = _fabricar_tarefa(
        titulo="Entrega na virada",
        prazo=prazo_virada,
        prioridade="alta",
        status="em_andamento",
        turno="noite",
    )
    t_urgente_atrasada = _fabricar_tarefa(
        titulo="Corrigir bug urgente",
        prazo=datetime(2026, 11, 30, 15, 0, tzinfo=UTC),
        prioridade="urgente",
        status="pendente",
        turno="tarde",
    )
    t_concluida_passada = _fabricar_tarefa(
        titulo="Ja entregue antes",
        prazo=datetime(2026, 11, 10, 14, 0, tzinfo=UTC),
        prioridade="baixa",
        status="concluida",
        turno="manha",
    )

    agora = datetime(2026, 11, 30, 18, 0, tzinfo=UTC)
    res_sp = construir_calendario_mensal(
        [t_alta, t_urgente_atrasada, t_concluida_passada],
        ano=2026,
        mes=11,
        fuso_horario="America/Sao_Paulo",
        agora=agora,
    )

    dias_por_data = {d.data.isoformat(): d for d in res_sp.dias}
    assert "2026-11-30" in dias_por_data
    dia_30 = dias_por_data["2026-11-30"]
    assert dia_30.total_tarefas == 2
    assert dia_30.maior_prioridade == "urgente"
    assert dia_30.tem_atrasada is True
    assert dias_por_data["2026-11-10"].tem_atrasada is False

    res_utc = construir_calendario_mensal(
        [t_alta],
        ano=2026,
        mes=11,
        fuso_horario="UTC",
        agora=agora,
    )
    assert res_utc.dias == ()


def test_calendario_projeta_recorrencias_futuras_e_aplica_filtros() -> None:
    # Toda segunda (1) e quinta (4) a partir de 2026-11-02 (segunda)
    t_semanal = _fabricar_tarefa(
        titulo="Revisao semanal",
        prazo=datetime(2026, 11, 2, 12, 0, tzinfo=UTC),
        prioridade="alta",
        turno="manha",
        recorrencia=ConfiguracaoRecorrencia(tipo="semanal", dias_semana=(1, 4), intervalo=1),
    )
    # Mensal dia 31 vira 28 em fevereiro nao bissexto
    t_mensal = _fabricar_tarefa(
        titulo="Fechamento mensal",
        prazo=datetime(2027, 1, 31, 12, 0, tzinfo=UTC),
        prioridade="urgente",
        turno="tarde",
        recorrencia=ConfiguracaoRecorrencia(tipo="mensal", dia_mes=31, intervalo=1),
    )
    # Recorrente ja concluida nao gera projecoes futuras
    t_concluida = _fabricar_tarefa(
        titulo="Serie encerrada",
        prazo=datetime(2026, 11, 3, 12, 0, tzinfo=UTC),
        status="concluida",
        recorrencia=ConfiguracaoRecorrencia(tipo="diaria", intervalo=1),
    )

    res_nov = construir_calendario_mensal(
        [t_semanal, t_concluida],
        ano=2026,
        mes=11,
        fuso_horario="America/Sao_Paulo",
        agora=datetime(2026, 11, 1, 10, 0, tzinfo=UTC),
    )
    datas_nov = {d.data.isoformat(): d for d in res_nov.dias}
    assert datas_nov["2026-11-02"].tarefas[0].eh_projecao is False
    assert datas_nov["2026-11-05"].tarefas[0].eh_projecao is True
    assert datas_nov["2026-11-09"].tarefas[0].eh_projecao is True
    assert datas_nov["2026-11-05"].tem_recorrente is True
    # Serie encerrada aparece apenas no proprio dia 03 e nao projeta dia 04
    assert "2026-11-03" in datas_nov
    assert "2026-11-04" not in datas_nov

    res_fev = construir_calendario_mensal(
        [t_mensal],
        ano=2027,
        mes=2,
        fuso_horario="America/Sao_Paulo",
        agora=datetime(2027, 1, 15, 10, 0, tzinfo=UTC),
    )
    assert [d.data.isoformat() for d in res_fev.dias] == ["2027-02-28"]
    assert res_fev.dias[0].tarefas[0].eh_projecao is True

    # Filtro de turno e prioridade
    res_filtrado = construir_calendario_mensal(
        [t_semanal, t_mensal],
        ano=2027,
        mes=2,
        fuso_horario="America/Sao_Paulo",
        agora=datetime(2027, 1, 15, 10, 0, tzinfo=UTC),
        prioridade="urgente",
        turno="tarde",
    )
    assert len(res_filtrado.dias) == 1
    assert res_filtrado.dias[0].tarefas[0].titulo == "Fechamento mensal"
