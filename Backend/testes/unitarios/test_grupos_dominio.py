from uuid import uuid4

import pytest

from dominio.erros import ErroDeDominio
from dominio.grupos import (
    MAX_MEMBROS_GRUPO,
    MAX_VAGAS_GRUPO,
    MembroGrupoInfo,
    NoParaDesempenho,
    VagaGrupoInfo,
    calcular_desempenho_grupo,
    exigir_lider,
    no_pertence_ao_escopo_do_colaborador,
    normalizar_email_opcional,
    resolver_vaga_na_entrada,
    validar_atribuicao_responsavel,
    validar_limite_membros,
    validar_limite_vagas,
    validar_nome_vaga,
    validar_saida_membro,
    verificar_permissao_operacao_no,
)


def test_validacao_vagas_emails_e_limites_d09() -> None:
    assert validar_nome_vaga("  Integrante Frontend  ") == "Integrante Frontend"
    assert normalizar_email_opcional(None) is None
    assert normalizar_email_opcional("   ") is None
    assert normalizar_email_opcional("  Maria@Exemplo.COM  ") == "maria@exemplo.com"

    with pytest.raises(ErroDeDominio) as falha_nome:
        validar_nome_vaga("A")
    assert falha_nome.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_nome.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_email:
        normalizar_email_opcional("email-invalido")
    assert falha_email.value.codigo == "VALIDACAO_INVALIDA"

    validar_limite_vagas(MAX_VAGAS_GRUPO - 1)
    validar_limite_membros(MAX_MEMBROS_GRUPO - 1)

    with pytest.raises(ErroDeDominio) as falha_vagas:
        validar_limite_vagas(MAX_VAGAS_GRUPO)
    assert falha_vagas.value.codigo == "LIMITE_MEMBROS_GRUPO_EXCEDIDO"
    assert falha_vagas.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_membros:
        validar_limite_membros(MAX_MEMBROS_GRUPO)
    assert falha_membros.value.codigo == "LIMITE_MEMBROS_GRUPO_EXCEDIDO"
    assert falha_membros.value.status_http == 422


def test_validacao_atribuicao_e_resolucao_vaga_na_entrada() -> None:
    uid = uuid4()
    v1_id, v2_id, v3_id = uuid4(), uuid4(), uuid4()

    validar_atribuicao_responsavel(None, None)
    validar_atribuicao_responsavel(uid, None)
    validar_atribuicao_responsavel(None, v1_id)

    with pytest.raises(ErroDeDominio) as falha_dupla:
        validar_atribuicao_responsavel(uid, v1_id)
    assert falha_dupla.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_dupla.value.status_http == 422

    vagas = [
        VagaGrupoInfo(
            id=v1_id,
            nome_exibicao="Backend",
            email_opcional="maria@exemplo.com",
            ocupada_por_usuario_id=None,
        ),
        VagaGrupoInfo(
            id=v2_id,
            nome_exibicao="Frontend",
            email_opcional=None,
            ocupada_por_usuario_id=None,
        ),
        VagaGrupoInfo(
            id=v3_id,
            nome_exibicao="QA",
            email_opcional="ocupada@exemplo.com",
            ocupada_por_usuario_id=uuid4(),
        ),
    ]

    # Vinculo automatico por e-mail Google verificado
    assert (
        resolver_vaga_na_entrada(vagas, email_usuario="MARIA@exemplo.com", vaga_id_solicitada=None)
        == v1_id
    )
    # Sem vaga solicitada e sem e-mail correspondente -> entra livre
    assert (
        resolver_vaga_na_entrada(vagas, email_usuario="novo@exemplo.com", vaga_id_solicitada=None)
        is None
    )
    # Escolha manual de vaga livre
    assert (
        resolver_vaga_na_entrada(vagas, email_usuario="novo@exemplo.com", vaga_id_solicitada=v2_id)
        == v2_id
    )

    with pytest.raises(ErroDeDominio) as falha_ocupada:
        resolver_vaga_na_entrada(vagas, email_usuario="novo@exemplo.com", vaga_id_solicitada=v3_id)
    assert falha_ocupada.value.codigo == "VAGA_JA_OCUPADA"
    assert falha_ocupada.value.status_http == 409

    with pytest.raises(ErroDeDominio) as falha_inexistente:
        resolver_vaga_na_entrada(
            vagas, email_usuario="novo@exemplo.com", vaga_id_solicitada=uuid4()
        )
    assert falha_inexistente.value.codigo == "RECURSO_NAO_ENCONTRADO"
    assert falha_inexistente.value.status_http == 404


def test_matriz_autorizacao_lider_colaborador_e_saida() -> None:
    lider_id = uuid4()
    colab_a_id = uuid4()
    colab_b_id = uuid4()

    raiz_id = uuid4()
    sub_a_id = uuid4()
    neta_a_id = uuid4()
    sub_b_id = uuid4()

    nos = [
        NoParaDesempenho(id=raiz_id, tarefa_pai_id=None, status="em_andamento"),
        NoParaDesempenho(
            id=sub_a_id,
            tarefa_pai_id=raiz_id,
            status="em_andamento",
            responsavel_usuario_id=colab_a_id,
        ),
        NoParaDesempenho(id=neta_a_id, tarefa_pai_id=sub_a_id, status="pendente"),
        NoParaDesempenho(
            id=sub_b_id,
            tarefa_pai_id=raiz_id,
            status="pendente",
            responsavel_usuario_id=colab_b_id,
        ),
    ]

    exigir_lider("lider")
    with pytest.raises(ErroDeDominio) as falha_papel:
        exigir_lider("colaborador")
    assert falha_papel.value.codigo == "PERMISSAO_GRUPO_INSUFICIENTE"
    assert falha_papel.value.status_http == 403

    assert no_pertence_ao_escopo_do_colaborador(nos, neta_a_id, colab_a_id) is True
    assert no_pertence_ao_escopo_do_colaborador(nos, sub_b_id, colab_a_id) is False

    # Lider opera qualquer no
    verificar_permissao_operacao_no(
        nos, papel="lider", usuario_id=lider_id, alvo_id=sub_b_id, exige_lideranca=True
    )
    # Colaborador opera subetapa propria
    verificar_permissao_operacao_no(
        nos, papel="colaborador", usuario_id=colab_a_id, alvo_id=neta_a_id
    )

    with pytest.raises(ErroDeDominio) as falha_alheia:
        verificar_permissao_operacao_no(
            nos, papel="colaborador", usuario_id=colab_a_id, alvo_id=sub_b_id
        )
    assert falha_alheia.value.codigo == "PERMISSAO_GRUPO_INSUFICIENTE"
    assert falha_alheia.value.status_http == 403

    with pytest.raises(ErroDeDominio) as falha_lider_exclusiva:
        verificar_permissao_operacao_no(
            nos, papel="colaborador", usuario_id=colab_a_id, alvo_id=neta_a_id, exige_lideranca=True
        )
    assert falha_lider_exclusiva.value.codigo == "PERMISSAO_GRUPO_INSUFICIENTE"

    validar_saida_membro("colaborador", total_membros=2)
    validar_saida_membro("lider", total_membros=1)
    with pytest.raises(ErroDeDominio) as falha_saida_lider:
        validar_saida_membro("lider", total_membros=2)
    assert falha_saida_lider.value.codigo == "LIDER_DEVE_TRANSFERIR_OU_EXCLUIR"
    assert falha_saida_lider.value.status_http == 409


def test_calcular_desempenho_grupo_com_heranca_para_folhas() -> None:
    lider_id = uuid4()
    colab_id = uuid4()
    vaga_id = uuid4()

    raiz_id = uuid4()
    ramo_colab_id = uuid4()
    folha_c1_id = uuid4()
    folha_c2_id = uuid4()
    folha_lider_id = uuid4()
    folha_vaga_id = uuid4()

    nos = [
        NoParaDesempenho(
            id=raiz_id,
            tarefa_pai_id=None,
            status="em_andamento",
            responsavel_usuario_id=lider_id,
        ),
        NoParaDesempenho(
            id=ramo_colab_id,
            tarefa_pai_id=raiz_id,
            status="em_andamento",
            responsavel_usuario_id=colab_id,
        ),
        NoParaDesempenho(id=folha_c1_id, tarefa_pai_id=ramo_colab_id, status="concluida"),
        NoParaDesempenho(id=folha_c2_id, tarefa_pai_id=ramo_colab_id, status="pendente"),
        NoParaDesempenho(
            id=folha_lider_id,
            tarefa_pai_id=raiz_id,
            status="concluida",
            responsavel_usuario_id=lider_id,
        ),
        NoParaDesempenho(
            id=folha_vaga_id,
            tarefa_pai_id=raiz_id,
            status="pendente",
            vaga_responsavel_id=vaga_id,
        ),
    ]
    membros = [
        MembroGrupoInfo(usuario_id=lider_id, nome_exibicao="Lider", papel="lider"),
        MembroGrupoInfo(usuario_id=colab_id, nome_exibicao="Maria", papel="colaborador"),
    ]
    vagas = [
        VagaGrupoInfo(
            id=vaga_id,
            nome_exibicao="Integrante 3",
            email_opcional=None,
            ocupada_por_usuario_id=None,
        )
    ]

    painel = calcular_desempenho_grupo(
        tarefa_raiz_id=raiz_id,
        titulo_raiz="Trabalho Trio",
        meu_papel="lider",
        link_convite_ativo=True,
        nos=nos,
        membros=membros,
        vagas=vagas,
    )
    assert painel.resumo_geral.total_subtarefas_folha == 4
    assert painel.resumo_geral.folhas_concluidas == 2
    assert painel.resumo_geral.percentual_geral == 50

    por_uid = {item.usuario_id: item for item in painel.integrantes}
    assert por_uid[colab_id].atribuidas == 2
    assert por_uid[colab_id].concluidas == 1
    assert por_uid[colab_id].percentual == 50
    assert por_uid[lider_id].atribuidas == 1
    assert por_uid[lider_id].concluidas == 1
    assert por_uid[lider_id].percentual == 100

    assert len(painel.vagas_abertas) == 1
    assert painel.vagas_abertas[0].vaga_id == vaga_id
    assert painel.vagas_abertas[0].atribuidas == 1
