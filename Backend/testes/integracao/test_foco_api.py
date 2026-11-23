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


class _ProvedorGoogleFocoTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&cc={code_challenge}"

    async def trocar_codigo_por_usuario(self, codigo: str, code_verifier: str) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


def _entrar_e_concluir_acesso(cliente: TestClient, codigo: str, nome: str) -> tuple[str, str]:
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
    uid = str(cliente.get("/api/autenticacao/sessao").json()["usuario"]["id"])
    return csrf, uid


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


async def test_api_foco_sessao_unica_conclusao_interrupcao_eventos_e_isolamento(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_a = f"fase19-a-{uuid4()}"
    sub_b = f"fase19-b-{uuid4()}"

    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase19-foco-32-bytes",
            "google_client_id": "client-fase19",
            "google_client_secret": "secret-fase19",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor = _ProvedorGoogleFocoTeste(
        {
            "cod_a": IdentidadeGoogle(
                google_sub=sub_a,
                email="foco.a@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario Foco A",
                foto_url=None,
            ),
            "cod_b": IdentidadeGoogle(
                google_sub=sub_b,
                email="foco.b@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario Foco B",
                foto_url=None,
            ),
        }
    )

    try:
        app_a = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_b = criar_aplicacao(configuracoes=config, provedor_google=provedor)

        with TestClient(app_a) as cli_a, TestClient(app_b) as cli_b:
            # 1. Protecao de autenticacao
            assert cli_a.get("/api/foco/sessoes/ativa").status_code == 401

            csrf_a, uid_a = _entrar_e_concluir_acesso(cli_a, "cod_a", "Usuario Foco A")
            csrf_b, _ = _entrar_e_concluir_acesso(cli_b, "cod_b", "Usuario Foco B")

            # 2. Cria raiz e subtarefa
            r_raiz = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Preparar Seminario", "prioridade": "alta", "turno": "manha"},
            )
            assert r_raiz.status_code == 201
            raiz_id = r_raiz.json()["tarefa"]["id"]

            r_filha = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Ensaiar slides", "tarefa_pai_id": raiz_id},
            )
            assert r_filha.status_code == 201
            filha_id = r_filha.json()["tarefa"]["id"]

            # 3. GET inicial sem sessao ativa
            r_ativa_inicial = cli_a.get("/api/foco/sessoes/ativa")
            assert r_ativa_inicial.status_code == 200
            assert r_ativa_inicial.json() == {"sessao_ativa": None}

            # 4. Exige CSRF em mutacoes e valida duracao
            assert (
                cli_a.post(
                    "/api/foco/sessoes",
                    json={"tarefa_id": raiz_id, "duracao_planejada_seg": 1500},
                ).status_code
                == 403
            )
            assert (
                cli_a.post(
                    "/api/foco/sessoes",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"tarefa_id": raiz_id, "duracao_planejada_seg": 30},
                ).status_code
                == 422
            )

            # 5. Usuario B nao pode iniciar foco em tarefa pessoal de A
            r_alheia = cli_b.post(
                "/api/foco/sessoes",
                headers={"X-CSRF-Token": csrf_b},
                json={"tarefa_id": raiz_id, "duracao_planejada_seg": 900},
            )
            assert r_alheia.status_code == 404
            assert r_alheia.json()["erro"]["codigo"] == "TAREFA_NAO_ENCONTRADA"

            # 6. Inicia primeira sessao e bloqueia segunda simultanea (409)
            r_inicio_1 = cli_a.post(
                "/api/foco/sessoes",
                headers={"X-CSRF-Token": csrf_a},
                json={"tarefa_id": raiz_id, "duracao_planejada_seg": 1500},
            )
            assert r_inicio_1.status_code == 201
            sessao_1 = r_inicio_1.json()["sessao"]
            assert sessao_1["tarefa_id"] == raiz_id
            assert sessao_1["tarefa_titulo"] == "Preparar Seminario"
            assert sessao_1["duracao_planejada_seg"] == 1500
            assert sessao_1["status"] == "em_andamento"
            sessao_1_id = sessao_1["id"]

            r_segunda = cli_a.post(
                "/api/foco/sessoes",
                headers={"X-CSRF-Token": csrf_a},
                json={"tarefa_id": filha_id, "duracao_planejada_seg": 900},
            )
            assert r_segunda.status_code == 409
            assert r_segunda.json()["erro"]["codigo"] == "SESSAO_FOCO_JA_ATIVA"

            r_ativa = cli_a.get("/api/foco/sessoes/ativa")
            assert r_ativa.status_code == 200
            assert r_ativa.json()["sessao_ativa"]["id"] == sessao_1_id

            # 7. Conclui primeira sessao e impede reencerramento
            r_concluir = cli_a.post(
                f"/api/foco/sessoes/{sessao_1_id}/concluir",
                headers={"X-CSRF-Token": csrf_a},
                json={"duracao_real_seg": 1500},
            )
            assert r_concluir.status_code == 200
            corpo_concluir = r_concluir.json()["sessao"]
            assert corpo_concluir["status"] == "concluida"
            assert corpo_concluir["duracao_real_seg"] == 1500
            assert corpo_concluir["encerrada_em"] is not None

            assert (
                cli_a.post(
                    f"/api/foco/sessoes/{sessao_1_id}/concluir",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 409
            )
            assert cli_a.get("/api/foco/sessoes/ativa").json() == {"sessao_ativa": None}

            # 8. Inicia segunda sessao e interrompe
            r_inicio_2 = cli_a.post(
                "/api/foco/sessoes",
                headers={"X-CSRF-Token": csrf_a},
                json={"tarefa_id": filha_id, "duracao_planejada_seg": 1200},
            )
            assert r_inicio_2.status_code == 201
            sessao_2_id = r_inicio_2.json()["sessao"]["id"]

            r_interromper = cli_a.post(
                f"/api/foco/sessoes/{sessao_2_id}/interromper",
                headers={"X-CSRF-Token": csrf_a},
                json={"duracao_real_seg": 320},
            )
            assert r_interromper.status_code == 200
            corpo_interromper = r_interromper.json()["sessao"]
            assert corpo_interromper["status"] == "interrompida"
            assert corpo_interromper["duracao_real_seg"] == 320

            # 9. Historico reflete ordem descendente, total concluido e isolamento
            r_hist_a = cli_a.get("/api/foco/sessoes?limite=10")
            assert r_hist_a.status_code == 200
            hist_a = r_hist_a.json()
            assert [item["id"] for item in hist_a["itens"]] == [sessao_2_id, sessao_1_id]
            assert hist_a["total_segundos_concluidos"] == 1500

            r_hist_b = cli_b.get("/api/foco/sessoes?limite=10")
            assert r_hist_b.status_code == 200
            assert r_hist_b.json()["itens"] == []

            # 10. Colaborador em Tarefa em Conjunto inicia sua propria sessao na tarefa do grupo
            r_comp = cli_a.post(
                f"/api/grupos/{raiz_id}/compartilhar",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_comp.status_code == 200
            token = r_comp.json()["codigo_token"]
            assert (
                cli_b.post(
                    f"/api/grupos/convites/{token}/entrar",
                    headers={"X-CSRF-Token": csrf_b},
                    json={},
                ).status_code
                == 200
            )
            r_foco_colab = cli_b.post(
                "/api/foco/sessoes",
                headers={"X-CSRF-Token": csrf_b},
                json={"tarefa_id": filha_id, "duracao_planejada_seg": 900},
            )
            assert r_foco_colab.status_code == 201
            sessao_b_id = r_foco_colab.json()["sessao"]["id"]
            assert (
                cli_b.post(
                    f"/api/foco/sessoes/{sessao_b_id}/concluir",
                    headers={"X-CSRF-Token": csrf_b},
                ).status_code
                == 200
            )

        # 11. Eventos foco_concluido e foco_interrompido gravados no MongoDB
        mongo = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
        try:
            banco = mongo.obter_banco()
            filtro_eventos = {
                "usuario_id": uid_a,
                "tipo_evento": {"$in": ["foco_concluido", "foco_interrompido"]},
            }
            eventos = await banco[COLECAO_EVENTOS_CICLO].find(filtro_eventos).to_list(length=10)
            tipos = {ev["tipo_evento"] for ev in eventos}
            assert tipos == {"foco_concluido", "foco_interrompido"}
        finally:
            await mongo.fechar()
    finally:
        await _limpar_usuarios_teste(config, [sub_a, sub_b])
