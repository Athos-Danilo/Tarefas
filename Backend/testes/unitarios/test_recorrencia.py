from datetime import UTC, datetime
from uuid import uuid4

import pytest

from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import ConfiguracaoRecorrencia, NoTarefa
from dominio.recorrencia import (
    calcular_proxima_ocorrencia,
    criar_especificacao_proxima_ocorrencia,
    dia_semana_lume,
    gerar_proximas_ocorrencias,
    validar_configuracao_recorrencia,
)


def test_dia_semana_lume_segue_domingo_zero_ate_sabado_seis() -> None:
    assert dia_semana_lume(datetime(2026, 11, 22, 9, 0, tzinfo=UTC).date()) == 0
    assert dia_semana_lume(datetime(2026, 11, 23, 9, 0, tzinfo=UTC).date()) == 1
    assert dia_semana_lume(datetime(2026, 11, 24, 9, 0, tzinfo=UTC).date()) == 2
    assert dia_semana_lume(datetime(2026, 11, 27, 9, 0, tzinfo=UTC).date()) == 5
    assert dia_semana_lume(datetime(2026, 11, 28, 9, 0, tzinfo=UTC).date()) == 6


def test_validar_configuracao_recorrencia_e_rejeicoes() -> None:
    limpa = validar_configuracao_recorrencia(
        ConfiguracaoRecorrencia(tipo="nenhuma", dias_semana=(2, 5), dia_mes=15, intervalo=4)
    )
    assert limpa == ConfiguracaoRecorrencia(
        tipo="nenhuma", dias_semana=(), dia_mes=None, intervalo=1
    )

    diaria_ok = validar_configuracao_recorrencia(
        ConfiguracaoRecorrencia(tipo="diaria", intervalo=3, dias_semana=(1,), dia_mes=10)
    )
    assert diaria_ok == ConfiguracaoRecorrencia(
        tipo="diaria", dias_semana=(), dia_mes=None, intervalo=3
    )

    semanal_ok = validar_configuracao_recorrencia(
        ConfiguracaoRecorrencia(tipo="semanal", dias_semana=(5, 2, 5), intervalo=1)
    )
    assert semanal_ok.dias_semana == (2, 5)

    for config_invalida in (
        ConfiguracaoRecorrencia(tipo="diaria", intervalo=0),
        ConfiguracaoRecorrencia(tipo="diaria", intervalo=366),
        ConfiguracaoRecorrencia(tipo="semanal", dias_semana=()),
        ConfiguracaoRecorrencia(tipo="semanal", dias_semana=(-1, 2)),
        ConfiguracaoRecorrencia(tipo="semanal", dias_semana=(2, 7)),
        ConfiguracaoRecorrencia(tipo="mensal", dia_mes=0),
        ConfiguracaoRecorrencia(tipo="mensal", dia_mes=32),
    ):
        with pytest.raises(ErroDeDominio) as falha:
            validar_configuracao_recorrencia(config_invalida)
        assert falha.value.codigo == "VALIDACAO_INVALIDA"
        assert falha.value.status_http == 422


def test_recorrencia_nenhuma_e_diaria_em_dia_adiantada_e_atrasada() -> None:
    ref = datetime(2026, 11, 21, 9, 30, tzinfo=UTC)
    assert (
        calcular_proxima_ocorrencia(ConfiguracaoRecorrencia(tipo="nenhuma"), ref, agora=ref) is None
    )

    diaria = ConfiguracaoRecorrencia(tipo="diaria", intervalo=1)
    assert calcular_proxima_ocorrencia(diaria, ref, agora=ref) == datetime(
        2026, 11, 22, 9, 30, tzinfo=UTC
    )
    # Concluida adiantada preserva referencia + intervalo
    assert calcular_proxima_ocorrencia(
        diaria, ref, agora=datetime(2026, 11, 18, 12, 0, tzinfo=UTC)
    ) == datetime(2026, 11, 22, 9, 30, tzinfo=UTC)
    # Concluida atrasada calcula a partir de agora (nunca no passado)
    assert calcular_proxima_ocorrencia(
        diaria, ref, agora=datetime(2026, 11, 25, 20, 15, tzinfo=UTC)
    ) == datetime(2026, 11, 26, 9, 30, tzinfo=UTC)

    a_cada_tres = ConfiguracaoRecorrencia(tipo="diaria", intervalo=3)
    assert calcular_proxima_ocorrencia(a_cada_tres, ref, agora=ref) == datetime(
        2026, 11, 24, 9, 30, tzinfo=UTC
    )


def test_recorrencia_semanal_dias_escolhidos_virada_e_atraso() -> None:
    config = ConfiguracaoRecorrencia(tipo="semanal", dias_semana=(2, 5))

    # Terca (2026-11-17) -> Sexta (2026-11-20)
    terca = datetime(2026, 11, 17, 18, 0, tzinfo=UTC)
    sexta = calcular_proxima_ocorrencia(config, terca, agora=terca)
    assert sexta == datetime(2026, 11, 20, 18, 0, tzinfo=UTC)

    # Sexta (2026-11-20) -> Terca seguinte (2026-11-24)
    prox_terca = calcular_proxima_ocorrencia(config, sexta, agora=sexta)
    assert prox_terca == datetime(2026, 11, 24, 18, 0, tzinfo=UTC)

    # Dia unico [0] (domingo -> proximo domingo)
    domingo = datetime(2026, 11, 22, 8, 0, tzinfo=UTC)
    assert calcular_proxima_ocorrencia(
        ConfiguracaoRecorrencia(tipo="semanal", dias_semana=(0,)),
        domingo,
        agora=domingo,
    ) == datetime(2026, 11, 29, 8, 0, tzinfo=UTC)

    # Virada de ano (quinta 2026-12-31 -> sexta 2027-01-01)
    quinta_virada = datetime(2026, 12, 31, 10, 0, tzinfo=UTC)
    assert calcular_proxima_ocorrencia(config, quinta_virada, agora=quinta_virada) == datetime(
        2027, 1, 1, 10, 0, tzinfo=UTC
    )

    # Conclusao atrasada: ref em 2026-11-10 (terca), agora 2026-11-18 (quarta) -> 2026-11-20
    assert calcular_proxima_ocorrencia(
        config,
        datetime(2026, 11, 10, 14, 0, tzinfo=UTC),
        agora=datetime(2026, 11, 18, 16, 0, tzinfo=UTC),
    ) == datetime(2026, 11, 20, 14, 0, tzinfo=UTC)


def test_recorrencia_mensal_meses_curtos_bissexto_virada_e_atraso() -> None:
    mensal_31 = ConfiguracaoRecorrencia(tipo="mensal", dia_mes=31)
    assert calcular_proxima_ocorrencia(
        mensal_31,
        datetime(2026, 1, 31, 9, 0, tzinfo=UTC),
        agora=datetime(2026, 1, 31, 9, 0, tzinfo=UTC),
    ) == datetime(2026, 2, 28, 9, 0, tzinfo=UTC)

    # Ano bissexto 2028
    assert calcular_proxima_ocorrencia(
        mensal_31,
        datetime(2028, 1, 31, 9, 0, tzinfo=UTC),
        agora=datetime(2028, 1, 31, 9, 0, tzinfo=UTC),
    ) == datetime(2028, 2, 29, 9, 0, tzinfo=UTC)

    assert calcular_proxima_ocorrencia(
        mensal_31,
        datetime(2026, 3, 31, 9, 0, tzinfo=UTC),
        agora=datetime(2026, 3, 31, 9, 0, tzinfo=UTC),
    ) == datetime(2026, 4, 30, 9, 0, tzinfo=UTC)

    # Preserva dia_mes=31 apos mes curto
    assert calcular_proxima_ocorrencia(
        mensal_31,
        datetime(2026, 2, 28, 9, 0, tzinfo=UTC),
        agora=datetime(2026, 2, 28, 9, 0, tzinfo=UTC),
    ) == datetime(2026, 3, 31, 9, 0, tzinfo=UTC)

    # Virada de ano
    assert calcular_proxima_ocorrencia(
        ConfiguracaoRecorrencia(tipo="mensal", dia_mes=15),
        datetime(2026, 12, 15, 19, 0, tzinfo=UTC),
        agora=datetime(2026, 12, 15, 19, 0, tzinfo=UTC),
    ) == datetime(2027, 1, 15, 19, 0, tzinfo=UTC)

    # Atrasada antes do dia_mes no mes atual
    assert calcular_proxima_ocorrencia(
        ConfiguracaoRecorrencia(tipo="mensal", dia_mes=25),
        datetime(2026, 10, 25, 12, 0, tzinfo=UTC),
        agora=datetime(2026, 11, 10, 12, 0, tzinfo=UTC),
    ) == datetime(2026, 11, 25, 12, 0, tzinfo=UTC)

    # Atrasada depois do dia_mes no mes atual -> avanca para dezembro
    assert calcular_proxima_ocorrencia(
        ConfiguracaoRecorrencia(tipo="mensal", dia_mes=5),
        datetime(2026, 10, 5, 12, 0, tzinfo=UTC),
        agora=datetime(2026, 11, 10, 12, 0, tzinfo=UTC),
    ) == datetime(2026, 12, 5, 12, 0, tzinfo=UTC)


def test_geracao_serie_e_especificacao_proxima_ocorrencia() -> None:
    serie = gerar_proximas_ocorrencias(
        ConfiguracaoRecorrencia(tipo="mensal", dia_mes=31),
        datetime(2026, 1, 31, 8, 0, tzinfo=UTC),
        quantidade=3,
        agora=datetime(2026, 1, 31, 8, 0, tzinfo=UTC),
    )
    assert serie == (
        datetime(2026, 2, 28, 8, 0, tzinfo=UTC),
        datetime(2026, 3, 31, 8, 0, tzinfo=UTC),
        datetime(2026, 4, 30, 8, 0, tzinfo=UTC),
    )

    serie_id = uuid4()
    tarefa_sem_prazo = NoTarefa(
        id=uuid4(),
        titulo="Estudar algoritmos",
        prioridade="alta",
        turno="noite",
        profundidade=2,
        prazo=None,
        recorrencia=ConfiguracaoRecorrencia(tipo="diaria"),
        serie_recorrencia_id=serie_id,
    )
    agora = datetime(2026, 11, 21, 20, 0, tzinfo=UTC)
    espec = criar_especificacao_proxima_ocorrencia(tarefa_sem_prazo, agora=agora)
    assert espec is not None
    assert espec.titulo == "Estudar algoritmos"
    assert espec.proximo_prazo == datetime(2026, 11, 22, 20, 0, tzinfo=UTC)
    assert espec.serie_recorrencia_id == serie_id

    tarefa_unica = NoTarefa(
        id=uuid4(),
        titulo="Unica",
        recorrencia=ConfiguracaoRecorrencia(tipo="nenhuma"),
    )
    assert criar_especificacao_proxima_ocorrencia(tarefa_unica, agora=agora) is None
