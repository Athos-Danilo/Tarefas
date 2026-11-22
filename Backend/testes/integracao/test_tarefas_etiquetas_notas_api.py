from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import IdentidadeGoogle
from dominio.erros import ErroDeDominio
from infraestrutura.mongo.conexao import GerenciadorMongo
from infraestrutura.mongo.indices import (
    COLECAO_DETALHES_TAREFAS,
    COLECAO_EVENTOS_CICLO,
    COLECAO_LAYOUTS_CONSTELACAO,
    COLECAO_PREFERENCIAS_CENARIO,
)
from infraestrutura.postgres.conexao import FabricaPostgres
from infraestrutura.postgres.migracoes import aplicar_migracoes
from infraestrutura.postgres.modelos import LembreteTarefaModelo, UsuarioModelo
from principal import criar_aplicacao


class _ProvedorGoogleTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return (
            "https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id=teste&state={state}&code_challenge={code_challenge}"
        )

    async def trocar_codigo_por_usuario(
        self,
        codigo: str,
        code_verifier: str,
    ) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


def _entrar_com_google(cliente: TestClient, codigo: str) -> str:
    resp_iniciar = cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
    assert resp_iniciar.status_code == 302
    params = parse_qs(urlparse(resp_iniciar.headers["location"]).query)
    state = params["state"][0]
    resp_cb = cliente.get(
        f"/api/autenticacao/google/callback?code={codigo}&state={state}",
        follow_redirects=False,
    )
    assert resp_cb.status_code == 302
    return cliente.cookies.get("lume_csrf") or ""


async def _limpar_por_sub(config: Configuracoes, subs: list[str]) -> None:
    assert config.postgres_teste_url is not None
    assert config.mongo_url is not None
    fabrica = FabricaPostgres(config.postgres_teste_url)
    mongo = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
    try:
        ids_usuario: list[str] = []
        async with fabrica.obter_sessao() as sessao:
            for sub in subs:
                usuario = (
                    await sessao.execute(
                        select(UsuarioModelo).where(UsuarioModelo.google_sub == sub)
                    )
                ).scalar_one_or_none()
                if usuario is not None:
                    ids_usuario.append(str(usuario.id))
                    await sessao.delete(usuario)
            await sessao.commit()
        banco = mongo.obter_banco()
        for uid in ids_usuario:
            for col in (
                COLECAO_DETALHES_TAREFAS,
                COLECAO_LAYOUTS_CONSTELACAO,
                COLECAO_EVENTOS_CICLO,
                COLECAO_PREFERENCIAS_CENARIO,
            ):
                await banco[col].delete_many({"usuario_id": uid})
    finally:
        await mongo.fechar()
        await fabrica.fechar()


async def test_api_poliglota_tarefas_etiquetas_notas_recorrencia_e_isolamento(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_a = f"fase10-a-{uuid4()}"
    sub_b = f"fase10-b-{uuid4()}"
    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase10-32-bytes-seguros",
            "google_client_id": "client-fase10",
            "google_client_secret": "secret-fase10",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor = _ProvedorGoogleTeste(
        {
            "codigo_a": IdentidadeGoogle(
                google_sub=sub_a,
                email="usuario.a@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario A",
                foto_url=None,
            ),
            "codigo_b": IdentidadeGoogle(
                google_sub=sub_b,
                email="usuario.b@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario B",
                foto_url=None,
            ),
        }
    )

    try:
        app_a = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_b = criar_aplicacao(configuracoes=config, provedor_google=provedor)

        with TestClient(app_a) as cli_a, TestClient(app_b) as cli_b:
            csrf_a = _entrar_com_google(cli_a, "codigo_a")
            csrf_b = _entrar_com_google(cli_b, "codigo_b")

            # 1. Guarda de primeiro acesso bloqueia rotas do workspace
            resp_bloqueio = cli_a.get("/api/tarefas")
            assert resp_bloqueio.status_code == 403
            assert resp_bloqueio.json()["erro"]["codigo"] == "PRIMEIRO_ACESSO_PENDENTE"

            resp_etq_bloqueio = cli_a.post(
                "/api/etiquetas",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome": "Web", "cor": "#1D5C87"},
            )
            assert resp_etq_bloqueio.status_code == 403
            assert resp_etq_bloqueio.json()["erro"]["codigo"] == "PRIMEIRO_ACESSO_PENDENTE"

            # Conclui primeiro acesso de A (sem arvore guia) e B
            assert (
                cli_a.post(
                    "/api/conta/primeiro-acesso",
                    headers={"X-CSRF-Token": csrf_a},
                    json={
                        "nome_exibicao": "Athos A",
                        "avatar_tipo": "preset",
                        "avatar_id": "sol-nascente",
                        "criar_arvore_guia": False,
                    },
                ).status_code
                == 200
            )
            assert (
                cli_b.post(
                    "/api/conta/primeiro-acesso",
                    headers={"X-CSRF-Token": csrf_b},
                    json={
                        "nome_exibicao": "Pessoa B",
                        "avatar_tipo": "preset",
                        "avatar_id": "lua-crescente",
                        "criar_arvore_guia": False,
                    },
                ).status_code
                == 200
            )

            # 2. CRUD de etiquetas + duplicidade case-insensitive + limite 30
            resp_e1 = cli_a.post(
                "/api/etiquetas",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome": "Faculdade", "cor": "#1D5C87"},
            )
            assert resp_e1.status_code == 201
            etq_id = resp_e1.json()["id"]

            resp_dup = cli_a.post(
                "/api/etiquetas",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome": "  faculdade ", "cor": "#256B4E"},
            )
            assert resp_dup.status_code == 409
            assert resp_dup.json()["erro"]["codigo"] == "ETIQUETA_DUPLICADA"

            resp_upd_etq = cli_a.patch(
                f"/api/etiquetas/{etq_id}",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome": "Web II", "cor": "#256B4E"},
            )
            assert resp_upd_etq.status_code == 200
            assert resp_upd_etq.json()["nome"] == "Web II"

            extras: list[str] = []
            for idx in range(29):
                r_extra = cli_a.post(
                    "/api/etiquetas",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"nome": f"Tag {idx}", "cor": "#1D5C87"},
                )
                assert r_extra.status_code == 201
                extras.append(r_extra.json()["id"])

            resp_etq_lim = cli_a.post(
                "/api/etiquetas",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome": "Tag 31", "cor": "#1D5C87"},
            )
            assert resp_etq_lim.status_code == 422
            assert resp_etq_lim.json()["erro"]["codigo"] == "LIMITE_ETIQUETAS_EXCEDIDO"

            assert (
                cli_a.delete(
                    f"/api/etiquetas/{extras[-1]}",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 204
            )

            # 3. Hierarquia 5 niveis, bloqueio nivel 6, filtros e formatos arvore/plano
            prazo_base = datetime(2026, 11, 24, 18, 0, tzinfo=UTC)
            resp_raiz = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "titulo": "Projeto Web II",
                    "prioridade": "alta",
                    "turno": "tarde",
                    "prazo": prazo_base.isoformat().replace("+00:00", "Z"),
                    "recorrencia": {"tipo": "semanal", "dias_semana": [2, 5]},
                    "etiqueta_ids": [etq_id],
                },
            )
            assert resp_raiz.status_code == 201
            raiz = resp_raiz.json()["tarefa"]
            raiz_id = raiz["id"]
            assert raiz["profundidade"] == 1

            niveis: list[str] = [raiz_id]
            for niv in range(2, 6):
                r_filha = cli_a.post(
                    "/api/tarefas",
                    headers={"X-CSRF-Token": csrf_a},
                    json={
                        "titulo": f"Etapa nivel {niv}",
                        "tarefa_pai_id": niveis[-1],
                        "prioridade": "urgente" if niv == 4 else "media",
                        "turno": "manha" if niv == 4 else "tarde",
                    },
                )
                assert r_filha.status_code == 201
                niveis.append(r_filha.json()["tarefa"]["id"])

            resp_n6 = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Nivel 6 proibido", "tarefa_pai_id": niveis[-1]},
            )
            assert resp_n6.status_code == 422
            assert resp_n6.json()["erro"]["codigo"] == "PROFUNDIDADE_EXCEDIDA"

            resp_lista = cli_a.get("/api/tarefas?prioridade=urgente&formato=arvore")
            assert resp_lista.status_code == 200
            dados_lista = resp_lista.json()
            assert len(dados_lista["itens"]) == 1
            assert dados_lista["itens"][0]["id"] == raiz_id
            assert dados_lista["itens"][0]["tem_filha_urgente_aberta"] is True
            assert dados_lista["totais"]["ativas"] == 5
            assert dados_lista["totais"]["limite_ativas"] == 500

            resp_plano = cli_a.get("/api/tarefas?formato=plano&busca=nivel 4")
            assert resp_plano.status_code == 200
            assert len(resp_plano.json()["itens"]) == 1
            assert resp_plano.json()["itens"][0]["id"] == niveis[3]

            # 4. GET /{id} via CTE, PATCH /{id} limpando prazo e PATCH /reordenar
            assert cli_a.get(f"/api/tarefas/{raiz_id}").status_code == 200
            r_irma = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "titulo": "Irma para reordenar",
                    "tarefa_pai_id": raiz_id,
                    "prazo": "2026-12-01T12:00:00Z",
                },
            )
            assert r_irma.status_code == 201
            irma_id = r_irma.json()["tarefa"]["id"]

            r_patch = cli_a.patch(
                f"/api/tarefas/{irma_id}",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Irma ajustada", "prazo": None},
            )
            assert r_patch.status_code == 200
            assert r_patch.json()["titulo"] == "Irma ajustada"
            assert r_patch.json()["prazo"] is None

            r_reord = cli_a.patch(
                "/api/tarefas/reordenar",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "tarefa_pai_id": raiz_id,
                    "ordenacao": [
                        {"tarefa_id": irma_id, "ordem_manual": 1},
                        {"tarefa_id": niveis[1], "ordem_manual": 2},
                    ],
                },
            )
            assert r_reord.status_code == 200
            assert r_reord.json()["atualizadas"] == 2

            # 5. Mover: ciclo bloqueado, promocao a raiz e retorno ao pai
            r_ciclo = cli_a.post(
                f"/api/tarefas/{raiz_id}/mover",
                headers={"X-CSRF-Token": csrf_a},
                json={"novo_pai_id": niveis[2]},
            )
            assert r_ciclo.status_code == 409
            assert r_ciclo.json()["erro"]["codigo"] == "CICLO_DETECTADO"

            r_prom_raiz = cli_a.post(
                f"/api/tarefas/{irma_id}/mover",
                headers={"X-CSRF-Token": csrf_a},
                json={"novo_pai_id": None},
            )
            assert r_prom_raiz.status_code == 200
            assert r_prom_raiz.json()["tarefa"]["profundidade"] == 1
            assert r_prom_raiz.json()["tarefa"]["tarefa_pai_id"] is None

            # 6. Lembrete pendente cancelado na conclusao + cascata + desfazer + recorrencia
            fabrica_chk = FabricaPostgres(config.postgres_teste_url)
            lembrete_id = uuid4()
            try:
                sess_usuario = cli_a.get("/api/autenticacao/sessao").json()["usuario"]["id"]
                async with fabrica_chk.obter_sessao() as sess_pg:
                    sess_pg.add(
                        LembreteTarefaModelo(
                            id=lembrete_id,
                            usuario_id=UUID(sess_usuario),
                            tarefa_id=UUID(niveis[4]),
                            disparar_em=datetime.now(UTC) + timedelta(hours=1),
                            antecedencia_min=15,
                            status="pendente",
                        )
                    )
                    await sess_pg.commit()
            finally:
                await fabrica_chk.fechar()

            r_conc_sem = cli_a.post(
                f"/api/tarefas/{raiz_id}/concluir",
                headers={"X-CSRF-Token": csrf_a},
                json={"confirmar_cascata": False},
            )
            assert r_conc_sem.status_code == 409
            assert r_conc_sem.json()["erro"]["codigo"] == "CONFIRMACAO_CASCATA_OBRIGATORIA"

            r_conc_sim = cli_a.post(
                f"/api/tarefas/{raiz_id}/concluir",
                headers={"X-CSRF-Token": csrf_a},
                json={"confirmar_cascata": True},
            )
            assert r_conc_sim.status_code == 200
            dados_conc = r_conc_sim.json()
            assert len(dados_conc["nos_concluidos"]) == 5
            token_desfazer = dados_conc["token_desfazer"]
            assert token_desfazer is not None
            assert dados_conc["proxima_ocorrencia"] is not None
            assert dados_conc["proxima_ocorrencia"]["serie_recorrencia_id"] is not None

            # Verifica cancelamento do lembrete pendente e registro em eventos_ciclo
            fabrica_lem = FabricaPostgres(config.postgres_teste_url)
            try:
                async with fabrica_lem.obter_sessao() as sess_pg:
                    lem = await sess_pg.get(LembreteTarefaModelo, lembrete_id)
                    assert lem is not None
                    assert lem.status == "cancelado"
            finally:
                await fabrica_lem.fechar()

            mongo_chk = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
            try:
                qtd_eventos = await mongo_chk.obter_banco()[COLECAO_EVENTOS_CICLO].count_documents(
                    {"usuario_id": sess_usuario}
                )
                assert qtd_eventos >= 1
            finally:
                await mongo_chk.fechar()

            # Desfazer restaura e segunda chamada falha com DESFAZER_EXPIRADO
            r_undo = cli_a.post(
                "/api/tarefas/desfazer-cascata",
                headers={"X-CSRF-Token": csrf_a},
                json={"token_desfazer": token_desfazer},
            )
            assert r_undo.status_code == 200
            assert r_undo.json()["restaurados"] == 5

            r_undo_2 = cli_a.post(
                "/api/tarefas/desfazer-cascata",
                headers={"X-CSRF-Token": csrf_a},
                json={"token_desfazer": token_desfazer},
            )
            assert r_undo_2.status_code == 409
            assert r_undo_2.json()["erro"]["codigo"] == "DESFAZER_EXPIRADO"

            # 7. Reabrir apos concluir incrementa vezes_reaberta nos nos reabertos
            assert (
                cli_a.post(
                    f"/api/tarefas/{raiz_id}/concluir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"confirmar_cascata": True},
                ).status_code
                == 200
            )
            r_reabrir = cli_a.post(
                f"/api/tarefas/{niveis[4]}/reabrir",
                headers={"X-CSRF-Token": csrf_a},
                json={"status_destino": "em_andamento"},
            )
            assert r_reabrir.status_code == 200
            assert len(r_reabrir.json()["ancestrais_reabertos"]) == 4

            r_get_raiz = cli_a.get(f"/api/tarefas/{raiz_id}")
            assert r_get_raiz.json()["tarefa"]["vezes_reaberta"] == 1
            assert r_get_raiz.json()["tarefa"]["status"] == "em_andamento"

            # 8. Notas ricas (6 blocos) + bloqueio URL_NAO_SEGURA + exportacao MD/JSON
            r_put_det = cli_a.put(
                f"/api/tarefas/{raiz_id}/detalhes",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "metadados_visuais": {"forma_botanica": "girassol", "cor_estrela": "#FFD166"},
                    "notas_em_blocos": [
                        {"id": "1", "tipo": "subtitulo", "nivel": 2, "texto": "Resumo"},
                        {"id": "2", "tipo": "paragrafo", "texto": "Notas no **MongoDB**."},
                        {"id": "3", "tipo": "lista", "ordenada": False, "itens": ["A", "B"]},
                        {
                            "id": "4",
                            "tipo": "checklist",
                            "itens": [{"texto": "Revisar", "marcado": True}],
                        },
                        {"id": "5", "tipo": "citacao", "texto": "Passo a passo."},
                        {
                            "id": "6",
                            "tipo": "codigo_ou_link",
                            "subtipo": "link",
                            "rotulo": "Site",
                            "conteudo": "https://example.com",
                        },
                    ],
                },
            )
            assert r_put_det.status_code == 200
            assert len(r_put_det.json()["notas_em_blocos"]) == 6

            r_xss = cli_a.put(
                f"/api/tarefas/{raiz_id}/detalhes",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "metadados_visuais": {},
                    "notas_em_blocos": [
                        {
                            "id": "x",
                            "tipo": "codigo_ou_link",
                            "subtipo": "link",
                            "rotulo": "Bad",
                            "conteudo": "javascript:alert(1)",
                        }
                    ],
                },
            )
            assert r_xss.status_code == 422
            assert r_xss.json()["erro"]["codigo"] == "URL_NAO_SEGURA"

            r_exp_md = cli_a.get(f"/api/exportacao/tarefas?formato=md&tarefa_id={raiz_id}")
            assert r_exp_md.status_code == 200
            assert r_exp_md.headers["content-type"].startswith("text/markdown")
            assert "Notas no **MongoDB**." in r_exp_md.text

            r_exp_json = cli_a.get(f"/api/exportacao/tarefas?formato=json&tarefa_id={raiz_id}")
            assert r_exp_json.status_code == 200
            assert r_exp_json.json()["itens"][0]["id"] == raiz_id

            # 9. Isolamento multiusuario estrito (usuario B nao acessa recursos de A)
            assert cli_b.get(f"/api/tarefas/{raiz_id}").status_code == 404
            assert (
                cli_b.patch(
                    f"/api/tarefas/{raiz_id}",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"titulo": "Invasao"},
                ).status_code
                == 404
            )
            assert (
                cli_b.delete(
                    f"/api/tarefas/{raiz_id}?estrategia=cascata",
                    headers={"X-CSRF-Token": csrf_b},
                ).status_code
                == 404
            )
            assert (
                cli_b.patch(
                    f"/api/etiquetas/{etq_id}",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"nome": "Roubada"},
                ).status_code
                == 404
            )
            assert (
                cli_b.post(
                    f"/api/tarefas/{raiz_id}/concluir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"confirmar_cascata": False},
                ).status_code
                == 404
            )
            assert (
                cli_b.post(
                    f"/api/tarefas/{raiz_id}/mover",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"novo_pai_id": None},
                ).status_code
                == 404
            )
            assert cli_b.get(f"/api/tarefas/{raiz_id}/detalhes").status_code == 404
            assert (
                cli_b.put(
                    f"/api/tarefas/{raiz_id}/detalhes",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"metadados_visuais": {}, "notas_em_blocos": []},
                ).status_code
                == 404
            )

            # 10. Exclusao sem estrategia -> 409; promover_filhas preserva filhas
            r_del_sem = cli_a.delete(
                f"/api/tarefas/{niveis[1]}",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_del_sem.status_code == 409
            assert r_del_sem.json()["erro"]["codigo"] == "CONFIRMACAO_ESTRATEGIA_OBRIGATORIA"

            r_del_prom = cli_a.delete(
                f"/api/tarefas/{niveis[1]}?estrategia=promover_filhas",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_del_prom.status_code == 200
            assert r_del_prom.json()["filhas_promovidas"] == 1

            r_get_n3 = cli_a.get(f"/api/tarefas/{niveis[2]}")
            assert r_get_n3.status_code == 200
            assert r_get_n3.json()["tarefa"]["profundidade"] == 2
            assert r_get_n3.json()["tarefa"]["tarefa_pai_id"] == raiz_id

            r_del_casc = cli_a.delete(
                f"/api/tarefas/{raiz_id}?estrategia=cascata",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_del_casc.status_code == 200
            assert r_del_casc.json()["tarefas_removidas"] == 4
            assert cli_a.get(f"/api/tarefas/{raiz_id}").status_code == 404

            mongo_limp = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
            try:
                qtd_det = await mongo_limp.obter_banco()[COLECAO_DETALHES_TAREFAS].count_documents(
                    {"tarefa_id": raiz_id}
                )
                assert qtd_det == 0
            finally:
                await mongo_limp.fechar()
    finally:
        await _limpar_por_sub(config, [sub_a, sub_b])
