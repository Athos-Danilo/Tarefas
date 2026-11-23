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


class _ProvedorGoogleConstelacaoTeste:
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


async def test_api_constelacoes_layout_persistencia_grupo_e_isolamento(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_a = f"fase18-lider-{uuid4()}"
    sub_b = f"fase18-colab-{uuid4()}"
    sub_c = f"fase18-estranho-{uuid4()}"

    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase18-constelacao-32-bytes",
            "google_client_id": "client-fase18",
            "google_client_secret": "secret-fase18",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor = _ProvedorGoogleConstelacaoTeste(
        {
            "cod_a": IdentidadeGoogle(
                google_sub=sub_a,
                email="lider.mapa@exemplo.com",
                email_verificado=True,
                nome_sugerido="Lider Mapa",
                foto_url=None,
            ),
            "cod_b": IdentidadeGoogle(
                google_sub=sub_b,
                email="colab.mapa@exemplo.com",
                email_verificado=True,
                nome_sugerido="Colaborador Mapa",
                foto_url=None,
            ),
            "cod_c": IdentidadeGoogle(
                google_sub=sub_c,
                email="estranho.mapa@exemplo.com",
                email_verificado=True,
                nome_sugerido="Estranho Mapa",
                foto_url=None,
            ),
        }
    )

    try:
        app_a = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_b = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_c = criar_aplicacao(configuracoes=config, provedor_google=provedor)

        with (
            TestClient(app_a) as cli_a,
            TestClient(app_b) as cli_b,
            TestClient(app_c) as cli_c,
        ):
            # 1. Rota protegida contra anonimos
            assert cli_a.get(f"/api/constelacoes/{uuid4()}/layout").status_code == 401

            csrf_a = _entrar_e_concluir_acesso(cli_a, "cod_a", "Lider Mapa")
            csrf_b = _entrar_e_concluir_acesso(cli_b, "cod_b", "Colab Mapa")
            csrf_c = _entrar_e_concluir_acesso(cli_c, "cod_c", "Estranho Mapa")

            # 2. Cria raiz e subtarefa
            r_raiz = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Projeto Constelacao", "prioridade": "alta", "turno": "noite"},
            )
            assert r_raiz.status_code == 201
            raiz_id = r_raiz.json()["tarefa"]["id"]

            r_filha = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Estrela Filha", "tarefa_pai_id": raiz_id},
            )
            assert r_filha.status_code == 201
            filha_id = r_filha.json()["tarefa"]["id"]

            # 3. GET inicial retorna layout vazio padrao
            r_get_inicial = cli_a.get(f"/api/constelacoes/{raiz_id}/layout")
            assert r_get_inicial.status_code == 200
            corpo_inicial = r_get_inicial.json()
            assert corpo_inicial["tarefa_raiz_id"] == raiz_id
            assert corpo_inicial["nos"] == {}
            assert corpo_inicial["viewport"] == {"zoom": 1.0, "centro_x": 0.0, "centro_y": 0.0}
            assert corpo_inicial["atualizado_em"] is None

            # 4. Consultar layout passando ID de subtarefa (nao raiz) retorna 404
            r_sub_invalida = cli_a.get(f"/api/constelacoes/{filha_id}/layout")
            assert r_sub_invalida.status_code == 404
            assert r_sub_invalida.json()["erro"]["codigo"] == "TAREFA_NAO_ENCONTRADA"

            # 5. PUT e DELETE exigem CSRF
            assert (
                cli_a.put(
                    f"/api/constelacoes/{raiz_id}/layout",
                    json={"nos": {}, "viewport": {"zoom": 1.0, "centro_x": 0.0, "centro_y": 0.0}},
                ).status_code
                == 403
            )
            assert cli_a.delete(f"/api/constelacoes/{raiz_id}/layout").status_code == 403

            # 6. PUT salva posicoes fixadas e viewport
            payload_a = {
                "nos": {
                    raiz_id: {"x": 420.5, "y": 180.0, "fixado": True},
                    filha_id: {"x": 580.0, "y": 295.0, "fixado": True},
                },
                "viewport": {"zoom": 1.25, "centro_x": 450.0, "centro_y": 240.0},
            }
            r_put_a = cli_a.put(
                f"/api/constelacoes/{raiz_id}/layout",
                headers={"X-CSRF-Token": csrf_a},
                json=payload_a,
            )
            assert r_put_a.status_code == 200
            corpo_put_a = r_put_a.json()
            assert corpo_put_a["nos"][raiz_id] == {"x": 420.5, "y": 180.0, "fixado": True}
            assert corpo_put_a["nos"][filha_id] == {"x": 580.0, "y": 295.0, "fixado": True}
            assert corpo_put_a["viewport"] == {"zoom": 1.25, "centro_x": 450.0, "centro_y": 240.0}
            assert corpo_put_a["atualizado_em"] is not None

            # 7. GET confirma persistencia no MongoDB
            r_get_a = cli_a.get(f"/api/constelacoes/{raiz_id}/layout")
            assert r_get_a.status_code == 200
            assert r_get_a.json()["nos"] == payload_a["nos"]
            assert r_get_a.json()["viewport"] == payload_a["viewport"]

            # 8. Validacao de viewport fora da faixa (422)
            r_zoom_ruim = cli_a.put(
                f"/api/constelacoes/{raiz_id}/layout",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "nos": {},
                    "viewport": {"zoom": 5.0, "centro_x": 0.0, "centro_y": 0.0},
                },
            )
            assert r_zoom_ruim.status_code == 422

            # 9. Isolamento: usuario C nao tem acesso
            assert cli_c.get(f"/api/constelacoes/{raiz_id}/layout").status_code == 404
            assert (
                cli_c.put(
                    f"/api/constelacoes/{raiz_id}/layout",
                    headers={"X-CSRF-Token": csrf_c},
                    json=payload_a,
                ).status_code
                == 404
            )
            assert (
                cli_c.delete(
                    f"/api/constelacoes/{raiz_id}/layout",
                    headers={"X-CSRF-Token": csrf_c},
                ).status_code
                == 404
            )

            # 10. Tarefa em Conjunto: colaborador B entra no grupo e salva layout proprio
            r_comp = cli_a.post(
                f"/api/grupos/{raiz_id}/compartilhar",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_comp.status_code == 200
            token_grupo = r_comp.json()["codigo_token"]

            r_entrar = cli_b.post(
                f"/api/grupos/convites/{token_grupo}/entrar",
                headers={"X-CSRF-Token": csrf_b},
                json={},
            )
            assert r_entrar.status_code == 200

            payload_b = {
                "nos": {
                    raiz_id: {"x": 100.0, "y": 50.0, "fixado": True},
                },
                "viewport": {"zoom": 0.8, "centro_x": 120.0, "centro_y": 90.0},
            }
            r_put_b = cli_b.put(
                f"/api/constelacoes/{raiz_id}/layout",
                headers={"X-CSRF-Token": csrf_b},
                json=payload_b,
            )
            assert r_put_b.status_code == 200

            # Layout de A permanece intacto enquanto B tem o seu proprio
            layout_a_apos = cli_a.get(f"/api/constelacoes/{raiz_id}/layout").json()
            layout_b_apos = cli_b.get(f"/api/constelacoes/{raiz_id}/layout").json()
            assert layout_a_apos["nos"] == payload_a["nos"]
            assert layout_b_apos["nos"] == payload_b["nos"]

            # 11. DELETE limpa o layout de A sem afetar o de B
            r_del_a = cli_a.delete(
                f"/api/constelacoes/{raiz_id}/layout",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_del_a.status_code == 204
            assert cli_a.get(f"/api/constelacoes/{raiz_id}/layout").json()["nos"] == {}
            layout_b_final = cli_b.get(f"/api/constelacoes/{raiz_id}/layout").json()
            assert layout_b_final["nos"] == payload_b["nos"]
    finally:
        await _limpar_usuarios_teste(config, [sub_a, sub_b, sub_c])
