from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4
from zoneinfo import ZoneInfo

import pytest

from contratos.foco import SessaoFocoRegistro
from contratos.tarefas import EtiquetaRegistro, TarefaRegistro
from dominio.erros import ErroDeDominio
from dominio.estatisticas import (
    calcular_estatisticas,
    formatar_diario_markdown,
    validar_atualizacao_preferencias,
)
from dominio.modelos_tarefa import (
    ConfiguracaoRecorrencia,
    PrioridadeTarefa,
    StatusTarefa,
    TurnoTarefa,
)
from dominio.preferencias_padrao import criar_preferencias_cenario_padrao


def _fazer_tarefa(
    *,
    titulo: str,
    criado_em: datetime,
    status: StatusTarefa = "pendente",
    concluida_em: datetime | None = None,
    prazo: datetime | None = None,
    prioridade: PrioridadeTarefa = "media",
    turno: TurnoTarefa = "manha",
    profundidade: int = 0,
    tarefa_pai_id: UUID | None = None,
    compartilhada: bool = False,
    vezes_reaberta: int = 0,
    recorrencia_ativa: bool = False,
    serie_recorrencia_id: UUID | None = None,
    etiquetas: tuple[EtiquetaRegistro, ...] = (),
    tarefa_id: UUID | None = None,
) -> TarefaRegistro:
    tid = tarefa_id or uuid4()
    uid = UUID("11111111-1111-4111-8111-111111111111")
    return TarefaRegistro(
        id=tid,
        usuario_id=uid,
        tarefa_pai_id=tarefa_pai_id,
        titulo=titulo,
        prioridade=prioridade,
        status=status,
        turno=turno,
        profundidade=profundidade,
        ordem_manual=1,
        prazo=prazo,
        recorrencia=ConfiguracaoRecorrencia(
            tipo="diaria" if recorrencia_ativa else "nenhuma",
            intervalo=1,
        ),
        serie_recorrencia_id=serie_recorrencia_id,
        vezes_reaberta=vezes_reaberta,
        concluida_em=concluida_em,
        criado_em=criado_em,
        atualizado_em=concluida_em or criado_em,
        etiquetas=etiquetas,
        compartilhada=compartilhada,
    )


def _fazer_sessao(
    *,
    tarefa_id: UUID,
    iniciada_em: datetime,
    duracao_real_seg: int,
    status: str = "concluida",
    titulo: str = "Foco teste",
) -> SessaoFocoRegistro:
    encerrada = iniciada_em + timedelta(seconds=duracao_real_seg)
    return SessaoFocoRegistro(
        id=uuid4(),
        usuario_id=UUID("11111111-1111-4111-8111-111111111111"),
        tarefa_id=tarefa_id,
        tarefa_titulo=titulo,
        duracao_planejada_seg=1500,
        duracao_real_seg=duracao_real_seg,
        iniciada_em=iniciada_em,
        encerrada_em=encerrada,
        status=status,  # type: ignore[arg-type]
    )


def test_calcular_estatisticas_kpis_fuso_sequencias_e_retrabalho() -> None:
    fuso = ZoneInfo("America/Sao_Paulo")
    agora_utc = datetime(2026, 11, 23, 18, 0, tzinfo=UTC)
    etq_fac = EtiquetaRegistro(
        id=UUID("e1000000-0000-4000-8000-000000000001"),
        usuario_id=UUID("11111111-1111-4111-8111-111111111111"),
        nome="Faculdade",
        cor="#1D5C87",
    )
    serie_id = uuid4()

    # 2026-11-23 01:30 UTC corresponde a 2026-11-22 22:30 em Sao Paulo!
    raiz_id = uuid4()
    t1 = _fazer_tarefa(
        tarefa_id=raiz_id,
        titulo="Projeto Web II",
        criado_em=datetime(2026, 11, 21, 13, 0, tzinfo=UTC),
        status="concluida",
        concluida_em=datetime(2026, 11, 21, 19, 0, tzinfo=UTC),  # 6h, dia 21
        prazo=datetime(2026, 11, 22, 0, 0, tzinfo=UTC),  # no prazo
        prioridade="alta",
        turno="manha",
        profundidade=0,
        vezes_reaberta=1,
        etiquetas=(etq_fac,),
    )
    t2 = _fazer_tarefa(
        titulo="Revisar resumo de aula",
        tarefa_pai_id=raiz_id,
        profundidade=1,
        criado_em=datetime(2026, 11, 22, 12, 0, tzinfo=UTC),
        status="concluida",
        concluida_em=datetime(2026, 11, 23, 1, 30, tzinfo=UTC),  # dia 22 em SP (13.5h)
        prazo=datetime(2026, 11, 22, 18, 0, tzinfo=UTC),  # atrasada
        prioridade="media",
        turno="tarde",
        recorrencia_ativa=True,
        serie_recorrencia_id=serie_id,
        etiquetas=(etq_fac,),
    )
    t3 = _fazer_tarefa(
        titulo="  revisar   RESUMO de aula ",
        criado_em=datetime(2026, 11, 23, 13, 0, tzinfo=UTC),
        status="concluida",
        concluida_em=datetime(2026, 11, 23, 15, 0, tzinfo=UTC),  # dia 23 em SP (2h)
        prioridade="urgente",
        turno="noite",
        profundidade=0,
        vezes_reaberta=2,
        recorrencia_ativa=True,
        serie_recorrencia_id=serie_id,
    )
    t4_pendente_grupo = _fazer_tarefa(
        titulo="Tarefa de grupo pendente",
        criado_em=datetime(2026, 11, 23, 14, 0, tzinfo=UTC),
        status="pendente",
        prioridade="baixa",
        turno="livre",
        compartilhada=True,
        recorrencia_ativa=True,
        serie_recorrencia_id=serie_id,
    )

    sessoes = [
        _fazer_sessao(
            tarefa_id=t1.id,
            iniciada_em=datetime(2026, 11, 22, 14, 0, tzinfo=UTC),
            duracao_real_seg=1500,  # 25 min
            status="concluida",
        ),
        _fazer_sessao(
            tarefa_id=t4_pendente_grupo.id,
            iniciada_em=datetime(2026, 11, 23, 14, 30, tzinfo=UTC),
            duracao_real_seg=900,  # 15 min
            status="interrompida",
        ),
    ]

    resumo = calcular_estatisticas(
        tarefas=[t1, t2, t3, t4_pendente_grupo],
        sessoes_foco=sessoes,
        periodo="7d",
        escopo="todas",
        etiqueta_id=None,
        fuso=fuso,
        agora_utc=agora_utc,
    )

    assert resumo["periodo"] == "7d"
    assert resumo["escopo"] == "todas"
    assert len(resumo["serie_temporal"]) == 7
    assert len(resumo["mapa_calor"]) == 7

    kpis = resumo["kpis"]
    assert kpis["total_criadas"] == 4
    assert kpis["total_concluidas"] == 3
    assert kpis["taxa_conclusao_pct"] == 75
    assert kpis["tempo_medio_conclusao_horas"] == 7.2
    assert kpis["pontualidade_pct"] == 50  # t1 no prazo, t2 atrasada, t3 sem prazo
    assert kpis["sequencia_atual_dias"] == 3  # 21, 22, 23 em America/Sao_Paulo
    assert kpis["sequencia_recorde_dias"] == 3
    assert kpis["minutos_foco_totais"] == 40
    assert kpis["taxa_foco_concluido_pct"] == 50

    assert resumo["por_turno"] == {"manha": 1, "tarde": 1, "noite": 1, "livre": 0}
    assert resumo["por_prioridade"] == {"baixa": 0, "media": 1, "alta": 1, "urgente": 1}
    assert resumo["por_etiqueta"] == [
        {
            "etiqueta_id": str(etq_fac.id),
            "nome": "Faculdade",
            "cor": "#1D5C87",
            "concluidas": 2,
        }
    ]
    assert resumo["recorrencias"] == {
        "rotinas_ativas": 1,
        "ocorrencias_cumpridas": 2,
        "taxa_consistencia_pct": 67,
    }
    assert resumo["repeticoes_e_retrabalho"] == {
        "total_reaberturas": 3,
        "tarefas_reabertas_distintas": 2,
        "titulos_mais_repetidos": [
            {
                "titulo_normalizado": "revisar resumo de aula",
                "ocorrencias": 2,
                "concluidas": 2,
            }
        ],
    }
    assert resumo["arvores"] == {
        "constelacoes_concluidas": 2,  # t1 (raiz) + t3 (raiz)
        "profundidade_media": 1.3,  # (2 niveis + 1 nivel + 1 nivel) / 3 = 1.3
    }

    # Escopo pessoal exclui t4_pendente_grupo e sua sessao
    resumo_pessoal = calcular_estatisticas(
        tarefas=[t1, t2, t3, t4_pendente_grupo],
        sessoes_foco=sessoes,
        periodo="7d",
        escopo="pessoais",
        etiqueta_id=None,
        fuso=fuso,
        agora_utc=agora_utc,
    )
    assert resumo_pessoal["kpis"]["total_criadas"] == 3
    assert resumo_pessoal["kpis"]["minutos_foco_totais"] == 25


def test_validar_atualizacao_preferencias_preserva_clima_e_valida_intervalos() -> None:
    agora = datetime(2026, 11, 23, 18, 30, tzinfo=UTC)
    inicial = criar_preferencias_cenario_padrao("usr-1", agora)
    inicial["clima"] = {
        "habilitado": True,
        "modo_localizacao": "manual",
        "cidade": "Curitiba",
        "uf": "PR",
        "latitude_aprox": -25.43,
        "longitude_aprox": -49.27,
    }

    atualizado = validar_atualizacao_preferencias(
        atual=inicial,
        patch={
            "modo_temporal": "simulador",
            "hora_simulada": "19:45",
            "qualidade_3d": "desempenho_2d",
            "reduzir_movimento": True,
            "audio": {
                "habilitado": True,
                "volume_geral": 0.9,
            },
            "tutorial": {
                "status": "concluido",
                "etapa_atual": 6,
            },
        },
        campos_raiz={
            "modo_temporal",
            "hora_simulada",
            "qualidade_3d",
            "reduzir_movimento",
            "audio",
            "tutorial",
        },
        agora=agora,
    )

    assert atualizado["modo_temporal"] == "simulador"
    assert atualizado["hora_simulada"] == "19:45"
    assert atualizado["qualidade_3d"] == "desempenho_2d"
    assert atualizado["reduzir_movimento"] is True
    assert atualizado["audio"] == {
        "habilitado": True,
        "volume_geral": 0.9,
        "volume_efeitos": 0.8,
        "volume_ambiente": 0.5,
    }
    assert atualizado["tutorial"]["status"] == "concluido"
    assert atualizado["tutorial"]["etapa_atual"] == 6
    assert atualizado["clima"]["cidade"] == "Curitiba"

    with pytest.raises(ErroDeDominio) as falha_vol:
        validar_atualizacao_preferencias(
            atual=atualizado,
            patch={"audio": {"volume_geral": 1.4}},
            campos_raiz={"audio"},
            agora=agora,
        )
    assert falha_vol.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_hora:
        validar_atualizacao_preferencias(
            atual=atualizado,
            patch={"hora_simulada": "25:90"},
            campos_raiz={"hora_simulada"},
            agora=agora,
        )
    assert falha_hora.value.status_http == 422

    limpo = validar_atualizacao_preferencias(
        atual=atualizado,
        patch={"modo_temporal": "relogio_real", "hora_simulada": None},
        campos_raiz={"modo_temporal", "hora_simulada"},
        agora=agora,
    )
    assert limpo["hora_simulada"] is None


def test_formatar_diario_markdown_inclui_eventos() -> None:
    md = formatar_diario_markdown(
        eventos=[
            {
                "evento_id": "evt-1",
                "tipo_evento": "cascata_concluida",
                "momento_do_dia": "entardecer",
                "resumo": "Concluiu Projeto com 3 subtarefas.",
                "criado_em": datetime(2026, 11, 23, 21, 5, tzinfo=UTC),
            }
        ],
        fuso=ZoneInfo("America/Sao_Paulo"),
    )
    assert "# Diário do Ciclo - Lume" in md
    assert "Cascata concluída" in md
    assert "Concluiu Projeto com 3 subtarefas." in md
