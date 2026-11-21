from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest

from dominio.arvore_tarefas import (
    calcular_metricas_arvore,
    concluir_tarefa,
    desfazer_conclusao_cascata,
    mover_tarefa,
    planejar_exclusao_tarefa,
    reabrir_tarefa,
    validar_criacao_no,
    validar_integridade_arvore,
)
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import (
    MAX_FILHAS_DIRETAS,
    MAX_TAREFAS_ATIVAS_USUARIO,
    MAX_TAREFAS_TOTAIS_USUARIO,
    NoTarefa,
    PrioridadeTarefa,
    StatusTarefa,
    normalizar_titulo_para_repeticao,
    validar_limites_criacao_usuario,
    validar_titulo_tarefa,
)


def _no(
    titulo: str = "Tarefa",
    *,
    tarefa_pai_id=None,
    prioridade: PrioridadeTarefa = "media",
    status: StatusTarefa = "pendente",
    profundidade: int = 1,
    ordem_manual: int = 1,
    vezes_reaberta: int = 0,
    concluida_em: datetime | None = None,
) -> NoTarefa:
    return NoTarefa(
        id=uuid4(),
        titulo=titulo,
        tarefa_pai_id=tarefa_pai_id,
        prioridade=prioridade,
        status=status,
        profundidade=profundidade,
        ordem_manual=ordem_manual,
        vezes_reaberta=vezes_reaberta,
        concluida_em=concluida_em,
    )


def test_validacao_titulo_limites_usuario_e_normalizacao() -> None:
    assert validar_titulo_tarefa("  Revisar   API  ") == "Revisar   API"
    assert (
        normalizar_titulo_para_repeticao("  Revisar   Resumo   de Aula ")
        == "revisar resumo de aula"
    )

    with pytest.raises(ErroDeDominio) as falha_vazio:
        validar_titulo_tarefa("   ")
    assert falha_vazio.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_vazio.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_longo:
        validar_titulo_tarefa("a" * 141)
    assert falha_longo.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_longo.value.status_http == 422

    validar_limites_criacao_usuario(
        total_ativas_usuario=MAX_TAREFAS_ATIVAS_USUARIO - 1,
        total_geral_usuario=MAX_TAREFAS_TOTAIS_USUARIO - 1,
        status_inicial="pendente",
    )
    # Com 500 ativas, ainda pode criar tarefa ja concluida se total < 2000
    validar_limites_criacao_usuario(
        total_ativas_usuario=MAX_TAREFAS_ATIVAS_USUARIO,
        total_geral_usuario=MAX_TAREFAS_TOTAIS_USUARIO - 1,
        status_inicial="concluida",
    )

    with pytest.raises(ErroDeDominio) as falha_ativas:
        validar_limites_criacao_usuario(
            total_ativas_usuario=MAX_TAREFAS_ATIVAS_USUARIO,
            total_geral_usuario=MAX_TAREFAS_ATIVAS_USUARIO,
            status_inicial="pendente",
        )
    assert falha_ativas.value.codigo == "LIMITE_TAREFAS_EXCEDIDO"
    assert falha_ativas.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_total:
        validar_limites_criacao_usuario(
            total_ativas_usuario=10,
            total_geral_usuario=MAX_TAREFAS_TOTAIS_USUARIO,
            status_inicial="concluida",
        )
    assert falha_total.value.codigo == "LIMITE_TAREFAS_EXCEDIDO"
    assert falha_total.value.status_http == 422


def test_criacao_respeita_cinco_niveis_cinquenta_filhas_e_pai_inexistente() -> None:
    n1 = _no("N1", profundidade=1, status="concluida")
    n2 = _no("N2", tarefa_pai_id=n1.id, profundidade=2, status="concluida")
    n3 = _no("N3", tarefa_pai_id=n2.id, profundidade=3, status="pendente")
    n4 = _no("N4", tarefa_pai_id=n3.id, profundidade=4, status="pendente")
    n5 = _no("N5", tarefa_pai_id=n4.id, profundidade=5, status="pendente")
    nos = [n1, n2, n3, n4, n5]

    titulo_limpo, profundidade, reabrir = validar_criacao_no(
        nos,
        titulo="  Nova filha sob N2  ",
        tarefa_pai_id=n2.id,
        total_ativas_usuario=5,
        total_geral_usuario=5,
        status_inicial="pendente",
    )
    assert titulo_limpo == "Nova filha sob N2"
    assert profundidade == 3
    assert set(reabrir) == {n1.id, n2.id}

    with pytest.raises(ErroDeDominio) as falha_prof:
        validar_criacao_no(
            nos,
            titulo="Nivel 6",
            tarefa_pai_id=n5.id,
            total_ativas_usuario=5,
            total_geral_usuario=5,
        )
    assert falha_prof.value.codigo == "PROFUNDIDADE_EXCEDIDA"
    assert falha_prof.value.status_http == 422
    assert falha_prof.value.detalhes == {"profundidade_maxima": 5, "profundidade_resultante": 6}

    with pytest.raises(ErroDeDominio) as falha_pai:
        validar_criacao_no(
            nos,
            titulo="Orfa",
            tarefa_pai_id=uuid4(),
            total_ativas_usuario=5,
            total_geral_usuario=5,
        )
    assert falha_pai.value.codigo == "TAREFA_NAO_ENCONTRADA"
    assert falha_pai.value.status_http == 404

    raiz = _no("Pai lotado", profundidade=1)
    filhas = [
        _no(f"F{idx}", tarefa_pai_id=raiz.id, profundidade=2, ordem_manual=idx + 1)
        for idx in range(MAX_FILHAS_DIRETAS)
    ]
    with pytest.raises(ErroDeDominio) as falha_filhas:
        validar_criacao_no(
            [raiz, *filhas],
            titulo="Filha 51",
            tarefa_pai_id=raiz.id,
            total_ativas_usuario=51,
            total_geral_usuario=51,
        )
    assert falha_filhas.value.codigo == "LIMITE_FILHAS_EXCEDIDO"
    assert falha_filhas.value.status_http == 422


def test_integridade_arvore_detecta_ciclos_pai_ausente_e_profundidade() -> None:
    auto = _no("Auto", profundidade=1)
    auto_ciclico = NoTarefa(
        id=auto.id,
        titulo=auto.titulo,
        tarefa_pai_id=auto.id,
        profundidade=1,
    )
    with pytest.raises(ErroDeDominio) as falha_auto:
        validar_integridade_arvore([auto_ciclico])
    assert falha_auto.value.codigo == "CICLO_DETECTADO"
    assert falha_auto.value.status_http == 409

    id_a, id_b, id_c = uuid4(), uuid4(), uuid4()
    ciclo_indireto = [
        NoTarefa(id=id_a, titulo="A", tarefa_pai_id=id_c, profundidade=1),
        NoTarefa(id=id_b, titulo="B", tarefa_pai_id=id_a, profundidade=2),
        NoTarefa(id=id_c, titulo="C", tarefa_pai_id=id_b, profundidade=3),
    ]
    with pytest.raises(ErroDeDominio) as falha_ciclo:
        validar_integridade_arvore(ciclo_indireto)
    assert falha_ciclo.value.codigo == "CICLO_DETECTADO"

    orfa = _no("Orfa", tarefa_pai_id=uuid4(), profundidade=2)
    with pytest.raises(ErroDeDominio) as falha_pai:
        validar_integridade_arvore([orfa])
    assert falha_pai.value.codigo == "TAREFA_NAO_ENCONTRADA"

    n1 = _no("N1", profundidade=1)
    n2 = _no("N2", tarefa_pai_id=n1.id, profundidade=2)
    n3 = _no("N3", tarefa_pai_id=n2.id, profundidade=3)
    n4 = _no("N4", tarefa_pai_id=n3.id, profundidade=4)
    n5 = _no("N5", tarefa_pai_id=n4.id, profundidade=5)
    n6 = _no("N6", tarefa_pai_id=n5.id, profundidade=5)
    with pytest.raises(ErroDeDominio) as falha_n6:
        validar_integridade_arvore([n1, n2, n3, n4, n5, n6])
    assert falha_n6.value.codigo == "PROFUNDIDADE_EXCEDIDA"


def test_metricas_por_folhas_e_alerta_independente_de_filha_urgente() -> None:
    folha_aberta = _no("Folha aberta", status="pendente", prioridade="urgente")
    folha_fechada = _no("Folha fechada", status="concluida", prioridade="baixa")

    raiz = _no("Raiz", profundidade=1, prioridade="media", status="em_andamento")
    ramo_a = _no("Ramo A", tarefa_pai_id=raiz.id, profundidade=2, prioridade="baixa")
    ramo_b = _no("Ramo B", tarefa_pai_id=raiz.id, profundidade=2, prioridade="alta")
    folha_a1 = _no("A1", tarefa_pai_id=ramo_a.id, profundidade=3, status="concluida")
    sub_a2 = _no("A2", tarefa_pai_id=ramo_a.id, profundidade=3, status="em_andamento")
    bisneta_urgente = _no(
        "Bisneta urgente",
        tarefa_pai_id=sub_a2.id,
        profundidade=4,
        prioridade="urgente",
        status="pendente",
    )
    folha_a2_feita = _no(
        "A2 feita",
        tarefa_pai_id=sub_a2.id,
        profundidade=4,
        status="concluida",
    )
    folha_b1 = _no(
        "B1",
        tarefa_pai_id=ramo_b.id,
        profundidade=3,
        status="concluida",
        prioridade="urgente",
    )

    nos = [
        folha_aberta,
        folha_fechada,
        raiz,
        ramo_a,
        ramo_b,
        folha_a1,
        sub_a2,
        bisneta_urgente,
        folha_a2_feita,
        folha_b1,
    ]
    metricas = calcular_metricas_arvore(nos)

    assert metricas[folha_aberta.id].total_folhas == 1
    assert metricas[folha_aberta.id].folhas_concluidas == 0
    assert metricas[folha_aberta.id].percentual_conclusao == 0
    assert metricas[folha_aberta.id].tem_filha_urgente_aberta is False

    assert metricas[folha_fechada.id].percentual_conclusao == 100

    # Folhas da raiz: folha_a1 (C), bisneta_urgente (A), folha_a2_feita (C), folha_b1 (C) -> 75%
    assert metricas[raiz.id].total_folhas == 4
    assert metricas[raiz.id].folhas_concluidas == 3
    assert metricas[raiz.id].percentual_conclusao == 75
    assert metricas[raiz.id].tem_filha_urgente_aberta is True
    assert metricas[ramo_a.id].tem_filha_urgente_aberta is True
    assert metricas[sub_a2.id].tem_filha_urgente_aberta is True
    assert metricas[ramo_b.id].tem_filha_urgente_aberta is False
    assert metricas[bisneta_urgente.id].tem_filha_urgente_aberta is False

    # Ao concluir a bisneta urgente, alerta desaparece e raiz fecha em 100%
    agora = datetime(2026, 11, 21, 18, 0, tzinfo=UTC)
    res_conclusao = concluir_tarefa(nos, bisneta_urgente.id, agora=agora)
    metricas_pos = calcular_metricas_arvore(res_conclusao.nos_atualizados)
    assert metricas_pos[raiz.id].percentual_conclusao == 100
    assert metricas_pos[raiz.id].tem_filha_urgente_aberta is False


def test_conclusao_bottom_up_cinco_niveis_e_cascata_com_desfazer() -> None:
    n1 = _no("N1", profundidade=1, status="em_andamento")
    n2 = _no("N2", tarefa_pai_id=n1.id, profundidade=2, status="em_andamento")
    n3 = _no("N3", tarefa_pai_id=n2.id, profundidade=3, status="pendente")
    n4 = _no("N4", tarefa_pai_id=n3.id, profundidade=4, status="em_andamento")
    n5 = _no("N5", tarefa_pai_id=n4.id, profundidade=5, status="pendente")
    cadeia = [n1, n2, n3, n4, n5]
    t0 = datetime(2026, 11, 21, 14, 0, tzinfo=UTC)

    res_bottom_up = concluir_tarefa(cadeia, n5.id, agora=t0)
    mapa_pos = {n.id: n for n in res_bottom_up.nos_atualizados}
    assert res_bottom_up.nos_concluidos == (n5.id,)
    assert set(res_bottom_up.ancestrais_atualizados) == {n4.id, n3.id, n2.id, n1.id}
    assert all(mapa_pos[nid].status == "concluida" for nid in mapa_pos)
    assert res_bottom_up.registro_desfazer is not None
    assert (
        res_bottom_up.registro_desfazer.expira_em - res_bottom_up.registro_desfazer.criado_em
    ) == timedelta(seconds=15)

    # Idempotencia ao concluir folha ja concluida
    res_idem = concluir_tarefa(res_bottom_up.nos_atualizados, n5.id, agora=t0)
    assert res_idem.nos_concluidos == ()
    assert res_idem.ancestrais_atualizados == ()
    assert res_idem.registro_desfazer is None

    # Cascata top-down exige confirmacao quando ha descendentes em aberto
    with pytest.raises(ErroDeDominio) as falha_confirmacao:
        concluir_tarefa(cadeia, n2.id, confirmar_cascata=False, agora=t0)
    assert falha_confirmacao.value.codigo == "CONFIRMACAO_CASCATA_OBRIGATORIA"
    assert falha_confirmacao.value.status_http == 409
    assert falha_confirmacao.value.detalhes == {"descendentes_em_aberto": 3}

    res_cascata = concluir_tarefa(cadeia, n2.id, confirmar_cascata=True, agora=t0)
    assert set(res_cascata.nos_concluidos) == {n2.id, n3.id, n4.id, n5.id}
    assert res_cascata.ancestrais_atualizados == (n1.id,)
    registro = res_cascata.registro_desfazer
    assert registro is not None

    # Desfazer dentro de 15s restaura exatamente status e concluida_em sem contar reabertura
    res_desfazer = desfazer_conclusao_cascata(
        res_cascata.nos_atualizados,
        registro,
        agora=t0 + timedelta(seconds=14),
    )
    mapa_restaurado = {n.id: n for n in res_desfazer.nos_atualizados}
    assert mapa_restaurado[n1.id].status == "em_andamento"
    assert mapa_restaurado[n2.id].status == "em_andamento"
    assert mapa_restaurado[n3.id].status == "pendente"
    assert mapa_restaurado[n4.id].status == "em_andamento"
    assert mapa_restaurado[n5.id].status == "pendente"
    assert all(mapa_restaurado[nid].concluida_em is None for nid in mapa_restaurado)
    assert all(mapa_restaurado[nid].vezes_reaberta == 0 for nid in mapa_restaurado)
    assert res_desfazer.registro_atualizado.consumido is True

    # Reutilizar registro consumido ou usar apos 15s falha com DESFAZER_EXPIRADO
    with pytest.raises(ErroDeDominio) as falha_consumido:
        desfazer_conclusao_cascata(
            res_desfazer.nos_atualizados,
            res_desfazer.registro_atualizado,
            agora=t0 + timedelta(seconds=14),
        )
    assert falha_consumido.value.codigo == "DESFAZER_EXPIRADO"
    assert falha_consumido.value.status_http == 409

    with pytest.raises(ErroDeDominio) as falha_expirado:
        desfazer_conclusao_cascata(
            res_cascata.nos_atualizados,
            registro,
            agora=t0 + timedelta(seconds=16),
        )
    assert falha_expirado.value.codigo == "DESFAZER_EXPIRADO"
    assert falha_expirado.value.status_http == 409


def test_reabertura_ascendente_e_rastreio_de_vezes_reaberta() -> None:
    t0 = datetime(2026, 11, 21, 10, 0, tzinfo=UTC)
    raiz = _no("Raiz", profundidade=1, status="concluida", concluida_em=t0)
    filha = _no(
        "Filha",
        tarefa_pai_id=raiz.id,
        profundidade=2,
        status="concluida",
        concluida_em=t0,
    )
    neta_feita = _no(
        "Neta feita",
        tarefa_pai_id=filha.id,
        profundidade=3,
        status="concluida",
        concluida_em=t0,
    )
    neta_outra = _no(
        "Neta outra",
        tarefa_pai_id=filha.id,
        profundidade=3,
        status="concluida",
        concluida_em=t0,
    )
    nos = [raiz, filha, neta_feita, neta_outra]

    res1 = reabrir_tarefa(nos, neta_feita.id, status_destino="pendente")
    mapa1 = {n.id: n for n in res1.nos_atualizados}
    assert res1.nos_reabertos == (neta_feita.id,)
    assert set(res1.ancestrais_reabertos) == {filha.id, raiz.id}
    assert mapa1[neta_feita.id].status == "pendente"
    assert mapa1[neta_feita.id].vezes_reaberta == 1
    assert mapa1[neta_feita.id].concluida_em is None
    assert mapa1[filha.id].status == "em_andamento"
    assert mapa1[filha.id].vezes_reaberta == 1
    assert mapa1[raiz.id].status == "em_andamento"
    assert mapa1[raiz.id].vezes_reaberta == 1
    assert mapa1[neta_outra.id].status == "concluida"
    assert mapa1[neta_outra.id].vezes_reaberta == 0

    # Reabrir segunda neta enquanto filha e raiz ja estao abertas incrementa apenas a neta
    res2 = reabrir_tarefa(res1.nos_atualizados, neta_outra.id, status_destino="em_andamento")
    mapa2 = {n.id: n for n in res2.nos_atualizados}
    assert res2.ancestrais_reabertos == ()
    assert mapa2[neta_outra.id].vezes_reaberta == 1
    assert mapa2[filha.id].vezes_reaberta == 1

    # Conclui novamente e reabre neta pela segunda vez acumulando vezes_reaberta
    res_conclui_1 = concluir_tarefa(res2.nos_atualizados, neta_feita.id, agora=t0)
    res_conclui_2 = concluir_tarefa(res_conclui_1.nos_atualizados, neta_outra.id, agora=t0)
    res3 = reabrir_tarefa(
        res_conclui_2.nos_atualizados, neta_feita.id, status_destino="em_andamento"
    )
    mapa3 = {n.id: n for n in res3.nos_atualizados}
    assert mapa3[neta_feita.id].vezes_reaberta == 2
    assert mapa3[filha.id].vezes_reaberta == 2
    assert mapa3[raiz.id].vezes_reaberta == 2

    with pytest.raises(ErroDeDominio) as falha_ja_aberta:
        reabrir_tarefa(res3.nos_atualizados, neta_feita.id, status_destino="pendente")
    assert falha_ja_aberta.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_ja_aberta.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_destino:
        reabrir_tarefa(res3.nos_atualizados, neta_outra.id, status_destino="concluida")
    assert falha_destino.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_destino.value.status_http == 422


def test_mover_reparenting_promocao_ciclo_profundidade_e_reconciliacao() -> None:
    t0 = datetime(2026, 11, 21, 11, 0, tzinfo=UTC)
    r1 = _no("R1", profundidade=1, status="em_andamento")
    f1 = _no("F1", tarefa_pai_id=r1.id, profundidade=2, status="concluida", concluida_em=t0)
    f2 = _no("F2", tarefa_pai_id=r1.id, profundidade=2, status="pendente")
    n2 = _no("N2", tarefa_pai_id=f2.id, profundidade=3, status="pendente")

    p1 = _no("P1", profundidade=1, status="concluida", concluida_em=t0)
    p2 = _no("P2", tarefa_pai_id=p1.id, profundidade=2, status="concluida", concluida_em=t0)
    p3 = _no("P3", tarefa_pai_id=p2.id, profundidade=3, status="concluida", concluida_em=t0)

    nos = [r1, f1, f2, n2, p1, p2, p3]

    # Ciclo direto ou descendente
    with pytest.raises(ErroDeDominio) as falha_ciclo_self:
        mover_tarefa(nos, f2.id, novo_pai_id=f2.id, agora=t0)
    assert falha_ciclo_self.value.codigo == "CICLO_DETECTADO"

    with pytest.raises(ErroDeDominio) as falha_ciclo_desc:
        mover_tarefa(nos, r1.id, novo_pai_id=n2.id, agora=t0)
    assert falha_ciclo_desc.value.codigo == "CICLO_DETECTADO"

    # Subarvore f2+n2 (altura 2) sob p3 (nivel 3) chegaria ao nivel 5 -> permitido e reabre P1..P3
    # Mas vamos tambem testar nivel 6: movendo para neta nivel 4 abaixo de P3
    p4 = _no("P4", tarefa_pai_id=p3.id, profundidade=4, status="concluida", concluida_em=t0)
    with pytest.raises(ErroDeDominio) as falha_prof:
        mover_tarefa([*nos, p4], f2.id, novo_pai_id=p4.id, agora=t0)
    assert falha_prof.value.codigo == "PROFUNDIDADE_EXCEDIDA"
    assert falha_prof.value.detalhes == {"profundidade_maxima": 5, "profundidade_resultante": 6}

    # Move f2+n2 (altura 2) para p3 (nivel 3 -> niveis 4 e 5). R1 fica so com F1 concluida!
    res_move = mover_tarefa(nos, f2.id, novo_pai_id=p3.id, agora=t0)
    mapa = {n.id: n for n in res_move.nos_atualizados}
    assert mapa[f2.id].tarefa_pai_id == p3.id
    assert mapa[f2.id].profundidade == 4
    assert mapa[n2.id].profundidade == 5
    assert r1.id in res_move.ancestrais_concluidos
    assert mapa[r1.id].status == "concluida"
    assert set(res_move.ancestrais_reabertos) == {p1.id, p2.id, p3.id}
    assert mapa[p1.id].status == "em_andamento"
    assert mapa[p2.id].status == "em_andamento"
    assert mapa[p3.id].status == "em_andamento"
    assert mapa[p1.id].vezes_reaberta == 0

    # Promove f2 (nivel 4) + n2 (nivel 5) para raiz -> niveis 1 e 2
    res_prom_45 = mover_tarefa(res_move.nos_atualizados, f2.id, novo_pai_id=None, agora=t0)
    mapa_45 = {n.id: n for n in res_prom_45.nos_atualizados}
    assert mapa_45[f2.id].tarefa_pai_id is None
    assert mapa_45[f2.id].profundidade == 1
    assert mapa_45[n2.id].profundidade == 2

    # Se pai antigo ficar vazio apos mover unica filha, nao auto-conclui
    pai_unico = _no("Pai unico", profundidade=1, status="em_andamento")
    filha_unica = _no("Filha unica", tarefa_pai_id=pai_unico.id, profundidade=2, status="pendente")
    neta_unica = _no("Neta unica", tarefa_pai_id=filha_unica.id, profundidade=3, status="pendente")
    res_prom = mover_tarefa([pai_unico, filha_unica, neta_unica], filha_unica.id, novo_pai_id=None)
    mapa_prom = {n.id: n for n in res_prom.nos_atualizados}
    assert mapa_prom[filha_unica.id].tarefa_pai_id is None
    assert mapa_prom[filha_unica.id].profundidade == 1
    assert mapa_prom[neta_unica.id].profundidade == 2
    assert mapa_prom[pai_unico.id].status == "em_andamento"
    assert res_prom.ancestrais_concluidos == ()

    # Limite de 50 filhas diretas no destino
    destino_lotado = _no("Destino lotado", profundidade=1)
    filhas_lotadas = [
        _no(f"L{idx}", tarefa_pai_id=destino_lotado.id, profundidade=2, ordem_manual=idx + 1)
        for idx in range(MAX_FILHAS_DIRETAS)
    ]
    solta = _no("Solta", profundidade=1)
    with pytest.raises(ErroDeDominio) as falha_limite:
        mover_tarefa(
            [destino_lotado, *filhas_lotadas, solta], solta.id, novo_pai_id=destino_lotado.id
        )
    assert falha_limite.value.codigo == "LIMITE_FILHAS_EXCEDIDO"


def test_planejar_exclusao_folha_cascata_e_promocao_filhas() -> None:
    t0 = datetime(2026, 11, 21, 12, 0, tzinfo=UTC)
    raiz = _no("Raiz", profundidade=1, status="em_andamento")
    f_feita = _no(
        "Feita", tarefa_pai_id=raiz.id, profundidade=2, status="concluida", concluida_em=t0
    )
    mae = _no("Mae", tarefa_pai_id=raiz.id, profundidade=2, status="pendente")
    neta_1 = _no("Neta 1", tarefa_pai_id=mae.id, profundidade=3, status="pendente")
    bisneta = _no("Bisneta", tarefa_pai_id=neta_1.id, profundidade=4, status="pendente")
    nos = [raiz, f_feita, mae, neta_1, bisneta]

    # Mae com filhas exige estrategia explicita
    with pytest.raises(ErroDeDominio) as falha_estrat:
        planejar_exclusao_tarefa(nos, mae.id, estrategia=None, agora=t0)
    assert falha_estrat.value.codigo == "CONFIRMACAO_ESTRATEGIA_OBRIGATORIA"
    assert falha_estrat.value.status_http == 409
    assert falha_estrat.value.detalhes == {"total_descendentes": 2}

    # Promover filhas: remove mae, sobe neta_1 para nivel 2 (pai=raiz) e bisneta para nivel 3
    res_prom = planejar_exclusao_tarefa(nos, mae.id, estrategia="promover_filhas", agora=t0)
    mapa_prom = {n.id: n for n in res_prom.nos_restantes}
    assert res_prom.estrategia_aplicada == "promover_filhas"
    assert res_prom.ids_removidos == (mae.id,)
    assert res_prom.filhas_promovidas == (neta_1.id,)
    assert mapa_prom[neta_1.id].tarefa_pai_id == raiz.id
    assert mapa_prom[neta_1.id].profundidade == 2
    assert mapa_prom[bisneta.id].profundidade == 3
    assert mapa_prom[raiz.id].status == "em_andamento"

    # Cascata: remove mae, neta_1 e bisneta; como so sobrou f_feita concluida, raiz auto-conclui
    res_casc = planejar_exclusao_tarefa(nos, mae.id, estrategia="cascata", agora=t0)
    mapa_casc = {n.id: n for n in res_casc.nos_restantes}
    assert set(res_casc.ids_removidos) == {mae.id, neta_1.id, bisneta.id}
    assert res_casc.ancestrais_reconciliados == (raiz.id,)
    assert mapa_casc[raiz.id].status == "concluida"

    # Folha simples sem informar estrategia funciona diretamente
    res_folha = planejar_exclusao_tarefa([raiz, f_feita, mae], mae.id, estrategia=None, agora=t0)
    assert res_folha.ids_removidos == (mae.id,)
    assert res_folha.ancestrais_reconciliados == (raiz.id,)
