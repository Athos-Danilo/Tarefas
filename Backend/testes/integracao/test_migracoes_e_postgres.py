from datetime import UTC, datetime, timedelta
from uuid import uuid4

import pytest
from sqlalchemy import func, select, text
from sqlalchemy.exc import IntegrityError

from configuracao.configuracoes import Configuracoes
from infraestrutura.postgres.conexao import FabricaPostgres
from infraestrutura.postgres.migracoes import aplicar_migracoes, reverter_migracoes
from infraestrutura.postgres.modelos import (
    EtiquetaModelo,
    InscricaoPushModelo,
    LembreteTarefaModelo,
    SessaoFocoModelo,
    SessaoModelo,
    TarefaEtiquetaModelo,
    TarefaModelo,
    UsuarioModelo,
)
from infraestrutura.postgres.verificador_postgres import VerificadorPostgres

TABELAS_ESPERADAS = {
    "usuarios",
    "sessoes",
    "tarefas",
    "etiquetas",
    "tarefa_etiquetas",
    "sessoes_foco",
    "inscricoes_push",
    "lembretes_tarefas",
}


async def _listar_tabelas_publicas(fabrica: FabricaPostgres) -> set[str]:
    async with fabrica.obter_sessao() as sessao:
        resultado = await sessao.execute(
            text(
                "SELECT table_name FROM information_schema.tables "
                "WHERE table_schema = 'public' AND table_type = 'BASE TABLE'"
            )
        )
        return {str(linha[0]) for linha in resultado.fetchall()}


async def test_ciclo_alembic_upgrade_downgrade_upgrade_em_tarefas_teste(
    configuracoes_teste: Configuracoes,
) -> None:
    url_teste = configuracoes_teste.postgres_teste_url
    assert url_teste is not None

    aplicar_migracoes(url_teste, "head")
    fabrica = FabricaPostgres(url_teste)
    try:
        tabelas_apos_upgrade = await _listar_tabelas_publicas(fabrica)
        assert TABELAS_ESPERADAS.issubset(tabelas_apos_upgrade)
    finally:
        await fabrica.fechar()

    reverter_migracoes(url_teste, "base")
    fabrica_vazia = FabricaPostgres(url_teste)
    try:
        tabelas_apos_downgrade = await _listar_tabelas_publicas(fabrica_vazia)
        assert TABELAS_ESPERADAS.isdisjoint(tabelas_apos_downgrade)
    finally:
        await fabrica_vazia.fechar()

    aplicar_migracoes(url_teste, "head")
    fabrica_reaplicada = FabricaPostgres(url_teste)
    try:
        tabelas_finais = await _listar_tabelas_publicas(fabrica_reaplicada)
        assert TABELAS_ESPERADAS.issubset(tabelas_finais)
    finally:
        await fabrica_reaplicada.fechar()


async def test_restricoes_integridade_postgres_e_cascade_exclusao_conta(
    configuracoes_teste: Configuracoes,
) -> None:
    url_teste = configuracoes_teste.postgres_teste_url
    assert url_teste is not None
    aplicar_migracoes(url_teste, "head")

    fabrica = FabricaPostgres(url_teste)
    usuario_id = uuid4()

    try:
        async with fabrica.obter_sessao() as sessao:
            usuario = UsuarioModelo(
                id=usuario_id,
                google_sub=f"sub-{usuario_id}",
                email=f"athos-{usuario_id}@exemplo.com",
                nome_exibicao="Athos Teste",
                avatar_id="sol-nascente",
                primeiro_acesso_concluido=True,
            )
            sessao.add(usuario)
            await sessao.commit()

        # 1. Profundidade fora do intervalo 1..5 deve falhar no CHECK do Postgres
        async with fabrica.obter_sessao() as sessao:
            sessao.add(
                TarefaModelo(
                    id=uuid4(),
                    usuario_id=usuario_id,
                    titulo="Profundidade invalida",
                    profundidade=6,
                )
            )
            with pytest.raises(IntegrityError):
                await sessao.commit()
            await sessao.rollback()

        # 2. Auto-ciclo (tarefa_pai_id == id) deve falhar no CHECK do Postgres
        async with fabrica.obter_sessao() as sessao:
            id_ciclo = uuid4()
            sessao.add(
                TarefaModelo(
                    id=id_ciclo,
                    usuario_id=usuario_id,
                    tarefa_pai_id=id_ciclo,
                    titulo="Auto ciclo",
                    profundidade=1,
                )
            )
            with pytest.raises(IntegrityError):
                await sessao.commit()
            await sessao.rollback()

        # 3. Etiqueta duplicada por usuario (nome_normalizado) deve falhar no UNIQUE
        async with fabrica.obter_sessao() as sessao:
            sessao.add(
                EtiquetaModelo(
                    id=uuid4(),
                    usuario_id=usuario_id,
                    nome="Web II",
                    nome_normalizado="web ii",
                    cor="#256B4E",
                )
            )
            await sessao.commit()

        async with fabrica.obter_sessao() as sessao:
            sessao.add(
                EtiquetaModelo(
                    id=uuid4(),
                    usuario_id=usuario_id,
                    nome="WEB II",
                    nome_normalizado="web ii",
                    cor="#1D5C87",
                )
            )
            with pytest.raises(IntegrityError):
                await sessao.commit()
            await sessao.rollback()

        # 4. Criar tarefa, vinculo, sessao web, foco, push e lembrete + testar indice unico parcial
        tarefa_id = uuid4()
        async with fabrica.obter_sessao() as sessao:
            etiqueta_id = (
                await sessao.execute(
                    select(EtiquetaModelo.id).where(EtiquetaModelo.usuario_id == usuario_id)
                )
            ).scalar_one()

            agora = datetime.now(UTC)
            tarefa = TarefaModelo(
                id=tarefa_id,
                usuario_id=usuario_id,
                titulo="Arvore raiz valida",
                prioridade="alta",
                status="em_andamento",
                turno="tarde",
                profundidade=1,
            )
            sessao.add(tarefa)
            await sessao.flush()

            sessao.add_all(
                [
                    SessaoModelo(
                        id=uuid4(),
                        usuario_id=usuario_id,
                        token_hash=f"tok-{uuid4()}",
                        csrf_token_hash=f"csrf-{uuid4()}",
                        expira_em=agora + timedelta(days=7),
                    ),
                    TarefaEtiquetaModelo(tarefa_id=tarefa_id, etiqueta_id=etiqueta_id),
                    SessaoFocoModelo(
                        id=uuid4(),
                        usuario_id=usuario_id,
                        tarefa_id=tarefa_id,
                        duracao_planejada_seg=1500,
                        status="em_andamento",
                    ),
                    InscricaoPushModelo(
                        id=uuid4(),
                        usuario_id=usuario_id,
                        endpoint=f"https://push.exemplo/{uuid4()}",
                        chave_p256dh="chave-pub-exemplo",
                        chave_auth="chave-auth-exemplo",
                        rotulo_dispositivo="Navegador Teste",
                        plataforma="desktop",
                    ),
                    LembreteTarefaModelo(
                        id=uuid4(),
                        usuario_id=usuario_id,
                        tarefa_id=tarefa_id,
                        disparar_em=agora + timedelta(minutes=15),
                        antecedencia_min=15,
                        status="pendente",
                    ),
                ]
            )
            await sessao.commit()

        # Segunda sessao de foco em_andamento para o mesmo usuario deve ser bloqueada
        async with fabrica.obter_sessao() as sessao:
            sessao.add(
                SessaoFocoModelo(
                    id=uuid4(),
                    usuario_id=usuario_id,
                    tarefa_id=tarefa_id,
                    duracao_planejada_seg=900,
                    status="em_andamento",
                )
            )
            with pytest.raises(IntegrityError):
                await sessao.commit()
            await sessao.rollback()

        # 5. Exclusao da conta deve propagar ON DELETE CASCADE em todas as 7 tabelas dependentes
        async with fabrica.obter_sessao() as sessao:
            usuario_salvo = await sessao.get(UsuarioModelo, usuario_id)
            assert usuario_salvo is not None
            await sessao.delete(usuario_salvo)
            await sessao.commit()

        async with fabrica.obter_sessao() as sessao:
            for modelo in (
                SessaoModelo,
                TarefaModelo,
                EtiquetaModelo,
                SessaoFocoModelo,
                InscricaoPushModelo,
                LembreteTarefaModelo,
            ):
                qtd = await sessao.execute(
                    select(func.count()).select_from(modelo).where(modelo.usuario_id == usuario_id)
                )
                assert qtd.scalar_one() == 0

            qtd_assoc = await sessao.execute(
                select(func.count())
                .select_from(TarefaEtiquetaModelo)
                .where(TarefaEtiquetaModelo.tarefa_id == tarefa_id)
            )
            assert qtd_assoc.scalar_one() == 0
    finally:
        async with fabrica.obter_sessao() as sessao_limpeza:
            restante = await sessao_limpeza.get(UsuarioModelo, usuario_id)
            if restante is not None:
                await sessao_limpeza.delete(restante)
                await sessao_limpeza.commit()
        await fabrica.fechar()


async def test_verificador_postgres_reporta_conectado_e_indisponivel(
    configuracoes_teste: Configuracoes,
) -> None:
    url_teste = configuracoes_teste.postgres_teste_url
    assert url_teste is not None

    fabrica_ok = FabricaPostgres(url_teste)
    fabrica_ruim = FabricaPostgres(
        "postgresql+psycopg://postgres:invalida@127.0.0.1:59999/inexistente"
    )
    try:
        assert await VerificadorPostgres(fabrica_ok).verificar() == "conectado"
        assert await VerificadorPostgres(fabrica_ruim).verificar() == "indisponivel"
    finally:
        await fabrica_ok.fechar()
        await fabrica_ruim.fechar()
