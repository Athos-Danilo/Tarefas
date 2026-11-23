from datetime import UTC, datetime, timedelta
from urllib.parse import parse_qs, urlparse
from uuid import uuid4

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
from infraestrutura.postgres.modelos import UsuarioModelo
from principal import criar_aplicacao


class _ProvedorGoogleStatsTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&cc={code_challenge}"

    async def trocar_codigo_por_usuario(self, codigo: str, code_verifier: str) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


def _entrar_e_concluir_acesso(cliente: TestClient, codigo: str, nome: str) -> str:
    r_init = cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
    assert r_init.status_code == 302
    state = parse_qs(urlparse(r_init.headers["location"]).query)["state"][0]
    r_cb = cliente.get(
        f"/api/autenticacao/google/callback?code={codigo}&state={state}",
        follow_redirects=False,
    )
    assert r_cb.status_code == 302
    csrf = cliente.cookies.get("lume_csrf") or ""
    r_pa = cliente.post(
        "/api/conta/primeiro-acesso",
        headers={"X-CSRF-Token": csrf},
        json={
            "nome_exibicao": nome,
            "avatar_tipo": "preset",
            "avatar_id": "sol-nascente",
            "criar_arvore_guia": False,
        },
    )
    assert r_pa.status_code == 200
    return csrf


async def _limpar_usuarios_teste(config: Configuracoes, subs: list[str]) -> None:
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
                await banco[col].delete_many({"autor_usuario_id": uid})
    finally:
        await mongo.fechar()
        await fabrica.fechar()


async def test_api_estatisticas_diario_exportacao_e_preferencias(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url)

    sufixo = uuid4().hex[:8]
    sub_a = f"sub-stats-a-{sufixo}"
    cod_a = f"cod-stats-a-{sufixo}"
    provedor = _ProvedorGoogleStatsTeste(
        {
            cod_a: IdentidadeGoogle(
                google_sub=sub_a,
                email=f"stats-a-{sufixo}@lume.dev",
                email_verificado=True,
                nome_sugerido="Usuario Estatisticas",
                foto_url=None,
            )
        }
    )

    try:
        app = criar_aplicacao(configuracoes_teste, provedor_google=provedor)
        with TestClient(app) as cliente_anon:
            assert cliente_anon.get("/api/estatisticas/resumo").status_code == 401
            assert cliente_anon.get("/api/diario/eventos").status_code == 401
            assert cliente_anon.get("/api/exportacao/diario").status_code == 401
            assert cliente_anon.get("/api/preferencias").status_code == 401

        with TestClient(app) as cliente:
            csrf = _entrar_e_concluir_acesso(cliente, cod_a, "Analista Lume")

            r_etq = cliente.post(
                "/api/etiquetas",
                headers={"X-CSRF-Token": csrf},
                json={"nome": "Faculdade", "cor": "#1D5C87"},
            )
            assert r_etq.status_code == 201
            etiqueta_id = r_etq.json()["id"]

            amanha_iso = (datetime.now(UTC) + timedelta(days=1)).isoformat()

            # Criar tarefa 1 (com etiqueta + prazo futuro), concluir, reabrir e concluir novamente
            r_t1 = cliente.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf},
                json={
                    "titulo": "Revisar resumo de aula",
                    "prioridade": "alta",
                    "turno": "manha",
                    "prazo": amanha_iso,
                    "etiqueta_ids": [etiqueta_id],
                },
            )
            assert r_t1.status_code == 201
            t1_id = r_t1.json()["tarefa"]["id"]

            r_conc1 = cliente.post(
                f"/api/tarefas/{t1_id}/concluir",
                headers={"X-CSRF-Token": csrf},
                json={"confirmar_cascata": False},
            )
            assert r_conc1.status_code == 200
            r_reabrir = cliente.post(
                f"/api/tarefas/{t1_id}/reabrir",
                headers={"X-CSRF-Token": csrf},
                json={},
            )
            assert r_reabrir.status_code == 200
            r_conc2 = cliente.post(
                f"/api/tarefas/{t1_id}/concluir",
                headers={"X-CSRF-Token": csrf},
                json={"confirmar_cascata": False},
            )
            assert r_conc2.status_code == 200

            # Criar tarefa 2 com mesmo titulo normalizado para detectar repeticao
            r_t2 = cliente.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf},
                json={
                    "titulo": "revisar resumo de aula",
                    "prioridade": "media",
                    "turno": "tarde",
                },
            )
            assert r_t2.status_code == 201
            t2_id = r_t2.json()["tarefa"]["id"]

            # Sessao de foco na tarefa 2
            r_foco = cliente.post(
                "/api/foco/sessoes",
                headers={"X-CSRF-Token": csrf},
                json={"tarefa_id": t2_id, "duracao_planejada_seg": 1500},
            )
            assert r_foco.status_code == 201
            sessao_id = r_foco.json()["sessao"]["id"]
            r_enc = cliente.post(
                f"/api/foco/sessoes/{sessao_id}/concluir",
                headers={"X-CSRF-Token": csrf},
                json={"duracao_real_seg": 600},
            )
            assert r_enc.status_code == 200

            # 1) GET /api/estatisticas/resumo
            r_stats = cliente.get("/api/estatisticas/resumo?periodo=30d&escopo=todas&etiqueta_id=")
            assert r_stats.status_code == 200
            dados_stats = r_stats.json()
            assert dados_stats["periodo"] == "30d"
            assert dados_stats["escopo"] == "todas"
            assert dados_stats["kpis"]["total_criadas"] == 2
            assert dados_stats["kpis"]["total_concluidas"] == 1
            assert dados_stats["kpis"]["minutos_foco_totais"] == 10
            assert dados_stats["kpis"]["taxa_foco_concluido_pct"] == 100
            assert dados_stats["repeticoes_e_retrabalho"]["total_reaberturas"] == 1
            assert dados_stats["repeticoes_e_retrabalho"]["tarefas_reabertas_distintas"] == 1
            assert (
                dados_stats["repeticoes_e_retrabalho"]["titulos_mais_repetidos"][0][
                    "titulo_normalizado"
                ]
                == "revisar resumo de aula"
            )
            assert (
                dados_stats["repeticoes_e_retrabalho"]["titulos_mais_repetidos"][0]["ocorrencias"]
                == 2
            )

            # Escopo grupo vazio para usuario sem tarefas compartilhadas
            r_grupo = cliente.get("/api/estatisticas/resumo?periodo=7d&escopo=grupo")
            assert r_grupo.status_code == 200
            assert r_grupo.json()["kpis"]["total_criadas"] == 0

            # 2) GET /api/diario/eventos paginado por cursor, filtro tipo e busca regex-segura
            r_pag1 = cliente.get("/api/diario/eventos?limite=2")
            assert r_pag1.status_code == 200
            p1 = r_pag1.json()
            assert len(p1["itens"]) == 2
            assert p1["proximo_cursor"] is not None

            r_pag2 = cliente.get(f"/api/diario/eventos?limite=2&cursor={p1['proximo_cursor']}")
            assert r_pag2.status_code == 200
            p2 = r_pag2.json()
            ids_p1 = {item["evento_id"] for item in p1["itens"]}
            ids_p2 = {item["evento_id"] for item in p2["itens"]}
            assert ids_p1.isdisjoint(ids_p2)

            r_busca = cliente.get("/api/diario/eventos?tipo=tarefa_reaberta&busca=[reaberta]")
            assert r_busca.status_code == 200
            assert r_busca.json()["itens"] == []

            r_tipo = cliente.get("/api/diario/eventos?tipo=foco_concluido")
            assert r_tipo.status_code == 200
            assert len(r_tipo.json()["itens"]) == 1
            assert r_tipo.json()["itens"][0]["tipo_evento"] == "foco_concluido"

            # Cursor invalido -> 422
            assert cliente.get("/api/diario/eventos?cursor=nao-existe").status_code == 422

            # 3) GET /api/exportacao/diario
            r_exp_md = cliente.get("/api/exportacao/diario?formato=md")
            assert r_exp_md.status_code == 200
            assert r_exp_md.headers["content-type"].startswith("text/markdown")
            assert "# Diário do Ciclo - Lume" in r_exp_md.text

            r_exp_json = cliente.get("/api/exportacao/diario?formato=json")
            assert r_exp_json.status_code == 200
            assert r_exp_json.headers["content-type"].startswith("application/json")
            assert len(r_exp_json.json()["itens"]) >= 5

            # 4) GET e PATCH /api/preferencias preservando clima e validando CSRF
            r_pref_get = cliente.get("/api/preferencias")
            assert r_pref_get.status_code == 200
            assert r_pref_get.json()["modo_temporal"] == "relogio_real"
            assert r_pref_get.json()["tutorial"]["status"] == "pendente"

            # Salva cidade via clima antes para confirmar preservacao do bloco clima
            r_clima = cliente.put(
                "/api/clima/consentimento",
                headers={"X-CSRF-Token": csrf},
                json={
                    "habilitado": True,
                    "modo_localizacao": "manual",
                    "cidade": "Curitiba",
                    "uf": "PR",
                    "latitude_aprox": -25.43,
                    "longitude_aprox": -49.27,
                },
            )
            assert r_clima.status_code == 200

            # Sem CSRF -> 403
            r_sem_csrf = cliente.patch("/api/preferencias", json={"qualidade_3d": "alto"})
            assert r_sem_csrf.status_code == 403

            r_pref_patch = cliente.patch(
                "/api/preferencias",
                headers={"X-CSRF-Token": csrf},
                json={
                    "modo_temporal": "simulador",
                    "hora_simulada": "21:15",
                    "qualidade_3d": "desempenho_2d",
                    "reduzir_movimento": True,
                    "audio": {
                        "habilitado": True,
                        "volume_geral": 0.65,
                    },
                    "tutorial": {
                        "status": "pulado",
                        "etapa_atual": 4,
                    },
                },
            )
            assert r_pref_patch.status_code == 200
            prefs_salvas = r_pref_patch.json()
            assert prefs_salvas["modo_temporal"] == "simulador"
            assert prefs_salvas["hora_simulada"] == "21:15"
            assert prefs_salvas["qualidade_3d"] == "desempenho_2d"
            assert prefs_salvas["reduzir_movimento"] is True
            assert prefs_salvas["audio"]["habilitado"] is True
            assert prefs_salvas["audio"]["volume_geral"] == 0.65
            assert prefs_salvas["tutorial"]["status"] == "pulado"
            assert prefs_salvas["tutorial"]["etapa_atual"] == 4

            # Confirma no MongoDB _teste que clima nao foi apagado pela atualizacao de preferencias
            mongo_check = GerenciadorMongo(
                configuracoes_teste.mongo_url, configuracoes_teste.mongo_banco_teste
            )
            try:
                doc_pref = await mongo_check.obter_banco()[COLECAO_PREFERENCIAS_CENARIO].find_one(
                    {"clima.cidade": "Curitiba", "modo_temporal": "simulador"}
                )
                assert doc_pref is not None
                assert doc_pref["clima"]["uf"] == "PR"
                assert doc_pref["clima"]["habilitado"] is True
            finally:
                await mongo_check.fechar()

            # Volume invalido -> 422
            assert (
                cliente.patch(
                    "/api/preferencias",
                    headers={"X-CSRF-Token": csrf},
                    json={"audio": {"volume_efeitos": 1.8}},
                ).status_code
                == 422
            )
    finally:
        await _limpar_usuarios_teste(configuracoes_teste, [sub_a])
