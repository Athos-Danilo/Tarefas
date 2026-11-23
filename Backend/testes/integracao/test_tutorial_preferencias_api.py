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


class _ProvedorGoogleTutorialTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&cc={code_challenge}"

    async def trocar_codigo_por_usuario(self, codigo: str, code_verifier: str) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


def _entrar_oauth(cliente: TestClient, codigo: str) -> str:
    r_init = cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
    assert r_init.status_code == 302
    state = parse_qs(urlparse(r_init.headers["location"]).query)["state"][0]
    r_cb = cliente.get(
        f"/api/autenticacao/google/callback?code={codigo}&state={state}",
        follow_redirects=False,
    )
    assert r_cb.status_code == 302
    return cliente.cookies.get("lume_csrf") or ""


async def _limpar_usuario_teste(config: Configuracoes, google_sub: str) -> None:
    assert config.postgres_teste_url is not None
    assert config.mongo_url is not None
    fabrica = FabricaPostgres(config.postgres_teste_url)
    mongo = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
    try:
        usuario_id: str | None = None
        async with fabrica.obter_sessao() as sessao:
            usuario = (
                await sessao.execute(
                    select(UsuarioModelo).where(UsuarioModelo.google_sub == google_sub)
                )
            ).scalar_one_or_none()
            if usuario is not None:
                usuario_id = str(usuario.id)
                await sessao.delete(usuario)
            await sessao.commit()
        if usuario_id is not None:
            banco = mongo.obter_banco()
            for col in (
                COLECAO_DETALHES_TAREFAS,
                COLECAO_LAYOUTS_CONSTELACAO,
                COLECAO_EVENTOS_CICLO,
                COLECAO_PREFERENCIAS_CENARIO,
            ):
                await banco[col].delete_many({"usuario_id": usuario_id})
                await banco[col].delete_many({"autor_usuario_id": usuario_id})
    finally:
        await mongo.fechar()
        await fabrica.fechar()


async def test_ciclo_vida_tutorial_persistido_entre_logins_e_preserva_preferencias(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url)

    sufixo = uuid4().hex[:8]
    google_sub = f"sub-tut-{sufixo}"
    cod_primeiro_login = f"cod-tut-1-{sufixo}"
    cod_segundo_login = f"cod-tut-2-{sufixo}"
    identidade = IdentidadeGoogle(
        google_sub=google_sub,
        email=f"tutorial-{sufixo}@lume.dev",
        email_verificado=True,
        nome_sugerido="Novo Usuario Tutorial",
        foto_url=None,
    )
    provedor = _ProvedorGoogleTutorialTeste(
        {
            cod_primeiro_login: identidade,
            cod_segundo_login: identidade,
        }
    )

    try:
        app = criar_aplicacao(configuracoes_teste, provedor_google=provedor)

        # Primeiro dispositivo / primeiro acesso
        with TestClient(app) as cliente_1:
            csrf_1 = _entrar_oauth(cliente_1, cod_primeiro_login)
            r_pa = cliente_1.post(
                "/api/conta/primeiro-acesso",
                headers={"X-CSRF-Token": csrf_1},
                json={
                    "nome_exibicao": "Explorer Lume",
                    "avatar_tipo": "preset",
                    "avatar_id": "sol-nascente",
                    "criar_arvore_guia": False,
                },
            )
            assert r_pa.status_code == 200

            r_pref_inicial = cliente_1.get("/api/preferencias")
            assert r_pref_inicial.status_code == 200
            assert r_pref_inicial.json()["tutorial"] == {"status": "pendente", "etapa_atual": 0}

            # Configura clima e audio antes de alterar o tutorial
            assert (
                cliente_1.put(
                    "/api/clima/consentimento",
                    headers={"X-CSRF-Token": csrf_1},
                    json={
                        "habilitado": True,
                        "modo_localizacao": "manual",
                        "cidade": "Florianopolis",
                        "uf": "SC",
                        "latitude_aprox": -27.59,
                        "longitude_aprox": -48.55,
                    },
                ).status_code
                == 200
            )
            assert (
                cliente_1.patch(
                    "/api/preferencias",
                    headers={"X-CSRF-Token": csrf_1},
                    json={"audio": {"habilitado": True, "volume_geral": 0.55}},
                ).status_code
                == 200
            )

            # Sem CSRF falha com 403
            assert (
                cliente_1.patch(
                    "/api/preferencias",
                    json={"tutorial": {"status": "pulado", "etapa_atual": 2}},
                ).status_code
                == 403
            )

            # Validacoes 422
            assert (
                cliente_1.patch(
                    "/api/preferencias",
                    headers={"X-CSRF-Token": csrf_1},
                    json={"tutorial": {"status": "invalido"}},
                ).status_code
                == 422
            )
            assert (
                cliente_1.patch(
                    "/api/preferencias",
                    headers={"X-CSRF-Token": csrf_1},
                    json={"tutorial": {"etapa_atual": 7}},
                ).status_code
                == 422
            )
            assert (
                cliente_1.patch(
                    "/api/preferencias",
                    headers={"X-CSRF-Token": csrf_1},
                    json={"tutorial": {"etapa_atual": -1}},
                ).status_code
                == 422
            )

            # Avanca ate passo 3 e pula o tutorial
            r_avanco = cliente_1.patch(
                "/api/preferencias",
                headers={"X-CSRF-Token": csrf_1},
                json={"tutorial": {"status": "pendente", "etapa_atual": 3}},
            )
            assert r_avanco.status_code == 200
            assert r_avanco.json()["tutorial"] == {"status": "pendente", "etapa_atual": 3}

            r_pulo = cliente_1.patch(
                "/api/preferencias",
                headers={"X-CSRF-Token": csrf_1},
                json={"tutorial": {"status": "pulado", "etapa_atual": 3}},
            )
            assert r_pulo.status_code == 200
            assert r_pulo.json()["tutorial"] == {"status": "pulado", "etapa_atual": 3}

            r_sair = cliente_1.post(
                "/api/autenticacao/sair",
                headers={"X-CSRF-Token": csrf_1},
            )
            assert r_sair.status_code == 204

        # Novo login simulando outro aparelho: tutorial continua pulado
        with TestClient(app) as cliente_2:
            csrf_2 = _entrar_oauth(cliente_2, cod_segundo_login)
            r_pref_relogin = cliente_2.get("/api/preferencias")
            assert r_pref_relogin.status_code == 200
            dados_relogin = r_pref_relogin.json()
            assert dados_relogin["tutorial"] == {"status": "pulado", "etapa_atual": 3}
            assert dados_relogin["audio"]["habilitado"] is True
            assert dados_relogin["audio"]["volume_geral"] == 0.55

            # Concluir revisao
            r_conclusao = cliente_2.patch(
                "/api/preferencias",
                headers={"X-CSRF-Token": csrf_2},
                json={"tutorial": {"status": "concluido", "etapa_atual": 6}},
            )
            assert r_conclusao.status_code == 200
            assert r_conclusao.json()["tutorial"] == {"status": "concluido", "etapa_atual": 6}
            assert r_conclusao.json()["audio"]["volume_geral"] == 0.55

            # Confirma no MongoDB _teste que clima permaneceu preservado
            mongo_check = GerenciadorMongo(
                configuracoes_teste.mongo_url, configuracoes_teste.mongo_banco_teste
            )
            try:
                doc = await mongo_check.obter_banco()[COLECAO_PREFERENCIAS_CENARIO].find_one(
                    {"clima.cidade": "Florianopolis"}
                )
                assert doc is not None
                assert doc["clima"]["uf"] == "SC"
                assert doc["tutorial"]["status"] == "concluido"
                assert doc["tutorial"]["etapa_atual"] == 6
            finally:
                await mongo_check.fechar()
    finally:
        await _limpar_usuario_teste(configuracoes_teste, google_sub)
