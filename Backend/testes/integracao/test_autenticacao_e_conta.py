from io import BytesIO
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from PIL import Image
from sqlalchemy import func, select

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
from infraestrutura.postgres.modelos import SessaoModelo, TarefaModelo, UsuarioModelo
from principal import criar_aplicacao


class ProvedorGoogleControlado:
    """Substituto deterministico do Google OAuth 2.0 para testes de integracao."""

    def __init__(self, identidades_por_codigo: dict[str, IdentidadeGoogle]) -> None:
        self._identidades = identidades_por_codigo

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return (
            "https://accounts.google.com/o/oauth2/v2/auth"
            f"?client_id=teste&response_type=code&state={state}"
            f"&code_challenge={code_challenge}&code_challenge_method=S256"
        )

    async def trocar_codigo_por_usuario(
        self,
        codigo: str,
        code_verifier: str,
    ) -> IdentidadeGoogle:
        if not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Code verifier ausente.", status_http=401)
        identidade = self._identidades.get(codigo)
        if identidade is None:
            raise ErroDeDominio(
                "OAUTH_INVALIDO",
                "Codigo OAuth invalido ou expirado.",
                status_http=401,
            )
        return identidade


def _criar_png_valido() -> bytes:
    img = Image.new("RGB", (320, 320), color=(37, 107, 78))
    saida = BytesIO()
    img.save(saida, format="PNG")
    return saida.getvalue()


async def _limpar_usuario_teste(
    config: Configuracoes,
    google_sub: str,
) -> None:
    assert config.postgres_teste_url is not None
    assert config.mongo_url is not None
    fabrica = FabricaPostgres(config.postgres_teste_url)
    gerenciador = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
    try:
        usuario_id_str: str | None = None
        async with fabrica.obter_sessao() as sessao:
            usuario = (
                await sessao.execute(
                    select(UsuarioModelo).where(UsuarioModelo.google_sub == google_sub)
                )
            ).scalar_one_or_none()
            if usuario is not None:
                usuario_id_str = str(usuario.id)
                await sessao.delete(usuario)
                await sessao.commit()
        if usuario_id_str is not None:
            banco = gerenciador.obter_banco()
            for col in (
                COLECAO_DETALHES_TAREFAS,
                COLECAO_LAYOUTS_CONSTELACAO,
                COLECAO_EVENTOS_CICLO,
                COLECAO_PREFERENCIAS_CENARIO,
            ):
                await banco[col].delete_many({"usuario_id": usuario_id_str})
    finally:
        await gerenciador.fechar()
        await fabrica.fechar()


def _autenticar_via_callback(
    cliente: TestClient,
    codigo_oauth: str,
) -> str:
    resp_iniciar = cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
    assert resp_iniciar.status_code == 302
    url_google = urlparse(resp_iniciar.headers["location"])
    params = parse_qs(url_google.query)
    state = params["state"][0]
    assert "code_challenge" in params
    assert "lume_oauth_estado" in cliente.cookies

    resp_callback = cliente.get(
        f"/api/autenticacao/google/callback?code={codigo_oauth}&state={state}",
        follow_redirects=False,
    )
    assert resp_callback.status_code == 302
    return resp_callback.headers["location"]


async def test_fluxo_completo_oauth_primeiro_acesso_csrf_avatar_sair_e_exclusao(
    configuracoes_teste: Configuracoes,
    tmp_path: Path,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_unico = f"google-sub-{uuid4()}"
    config = configuracoes_teste.model_copy(
        update={
            "diretorio_uploads": str(tmp_path),
            "segredo_sessao": "chave-teste-integracao-com-32-bytes-seguros",
            "google_client_id": "client-id-teste",
            "google_client_secret": "client-secret-teste",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor = ProvedorGoogleControlado(
        {
            "codigo_valido": IdentidadeGoogle(
                google_sub=sub_unico,
                email="athos.teste@exemplo.com",
                email_verificado=True,
                nome_sugerido="Athos Google",
                foto_url="https://lh3.googleusercontent.com/avatar-exemplo.png",
            ),
            "codigo_nao_verificado": IdentidadeGoogle(
                google_sub=f"nao-verif-{uuid4()}",
                email="nao.verificado@exemplo.com",
                email_verificado=False,
                nome_sugerido="Nao Verificado",
                foto_url=None,
            ),
        }
    )

    try:
        app = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        with TestClient(app) as cliente:
            # 1. Bloqueio de rotas privadas sem sessao
            assert cliente.get("/api/autenticacao/sessao").status_code == 401
            assert cliente.get("/api/conta/perfil").status_code == 401
            resp_priv = cliente.post(
                "/api/conta/primeiro-acesso",
                json={
                    "nome_exibicao": "Athos",
                    "avatar_tipo": "preset",
                    "avatar_id": "sol-nascente",
                },
            )
            assert resp_priv.status_code == 401
            assert resp_priv.json()["erro"]["codigo"] == "NAO_AUTENTICADO"

            # 2. State divergente e email nao verificado retornam 401 OAUTH_INVALIDO
            cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
            resp_state_errado = cliente.get(
                "/api/autenticacao/google/callback?code=codigo_valido&state=adulterado",
                follow_redirects=False,
            )
            assert resp_state_errado.status_code == 401
            assert resp_state_errado.json()["erro"]["codigo"] == "OAUTH_INVALIDO"

            resp_ini2 = cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
            state2 = parse_qs(urlparse(resp_ini2.headers["location"]).query)["state"][0]
            resp_nao_verif = cliente.get(
                f"/api/autenticacao/google/callback?code=codigo_nao_verificado&state={state2}",
                follow_redirects=False,
            )
            assert resp_nao_verif.status_code == 401
            assert resp_nao_verif.json()["erro"]["codigo"] == "OAUTH_INVALIDO"

            # 3. Primeiro login valido redireciona para /primeiro-acesso
            destino = _autenticar_via_callback(cliente, "codigo_valido")
            assert destino == "/primeiro-acesso"
            assert "lume_sessao" in cliente.cookies
            csrf_token = cliente.cookies.get("lume_csrf")
            assert csrf_token

            resp_sessao = cliente.get("/api/autenticacao/sessao")
            assert resp_sessao.status_code == 200
            dados_sessao = resp_sessao.json()
            usuario_id = dados_sessao["usuario"]["id"]
            assert dados_sessao["autenticado"] is True
            assert dados_sessao["usuario"]["primeiro_acesso_concluido"] is False
            assert "expira_em" in dados_sessao["sessao"]
            assert "expiracao_absoluta_em" in dados_sessao["sessao"]

            # 4. Protecao CSRF bloqueia mutacoes sem X-CSRF-Token valido
            resp_sem_csrf = cliente.post(
                "/api/conta/primeiro-acesso",
                json={
                    "nome_exibicao": "Athos",
                    "avatar_tipo": "preset",
                    "avatar_id": "vagalume-estelar",
                    "criar_arvore_guia": True,
                },
            )
            assert resp_sem_csrf.status_code == 403
            assert resp_sem_csrf.json()["erro"]["codigo"] == "CSRF_INVALIDO"

            # 5. Primeiro acesso cria arvore-guia e inicializa tutorial.status = 'pendente'
            resp_pa = cliente.post(
                "/api/conta/primeiro-acesso",
                headers={"X-CSRF-Token": csrf_token},
                json={
                    "nome_exibicao": "Athos",
                    "avatar_tipo": "preset",
                    "avatar_id": "vagalume-estelar",
                    "criar_arvore_guia": True,
                },
            )
            assert resp_pa.status_code == 200
            dados_pa = resp_pa.json()
            assert dados_pa["primeiro_acesso_concluido"] is True
            assert dados_pa["arvore_guia_criada"] is True
            assert dados_pa["tarefa_guia_id"] is not None

            # Verifica preferencias no MongoDB com tutorial pendente e clima/audio off
            gerenciador = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
            try:
                pref_doc = await gerenciador.obter_banco()[COLECAO_PREFERENCIAS_CENARIO].find_one(
                    {"usuario_id": usuario_id}
                )
                assert pref_doc is not None
                assert pref_doc["clima"]["habilitado"] is False
                assert pref_doc["audio"]["habilitado"] is False
                assert pref_doc["tutorial"]["status"] == "pendente"
            finally:
                await gerenciador.fechar()

            # 6. Upload de avatar (256x256 WebP), leitura e bloqueio de invalidos
            png_bytes = _criar_png_valido()
            resp_avatar = cliente.post(
                "/api/conta/avatar",
                headers={"X-CSRF-Token": csrf_token},
                files={"arquivo": ("avatar.png", png_bytes, "image/png")},
            )
            assert resp_avatar.status_code == 200
            assert resp_avatar.json()["avatar_tipo"] == "upload"
            assert resp_avatar.json()["largura"] == 256
            assert resp_avatar.json()["altura"] == 256

            resp_img = cliente.get("/api/conta/avatar/atual")
            assert resp_img.status_code == 200
            assert resp_img.headers["content-type"] == "image/webp"

            resp_invalido = cliente.post(
                "/api/conta/avatar",
                headers={"X-CSRF-Token": csrf_token},
                files={"arquivo": ("texto.txt", b"nao-eh-imagem", "text/plain")},
            )
            assert resp_invalido.status_code == 422
            assert resp_invalido.json()["erro"]["codigo"] == "FORMATO_IMAGEM_INVALIDO"

            resp_grande = cliente.post(
                "/api/conta/avatar",
                headers={"X-CSRF-Token": csrf_token},
                files={"arquivo": ("grande.png", b"a" * (2 * 1024 * 1024 + 10), "image/png")},
            )
            assert resp_grande.status_code == 413
            assert resp_grande.json()["erro"]["codigo"] == "ARQUIVO_MUITO_GRANDE"

            # 7. Edicao de perfil
            resp_perfil = cliente.patch(
                "/api/conta/perfil",
                headers={"X-CSRF-Token": csrf_token},
                json={"nome_exibicao": "Athos Danilo", "avatar_tipo": "google", "avatar_id": None},
            )
            assert resp_perfil.status_code == 200
            assert resp_perfil.json()["nome_exibicao"] == "Athos Danilo"
            assert resp_perfil.json()["avatar_tipo"] == "google"

            # Volta para avatar upload para confirmar remocao de arquivo na exclusao de conta
            cliente.patch(
                "/api/conta/perfil",
                headers={"X-CSRF-Token": csrf_token},
                json={"nome_exibicao": "Athos Danilo", "avatar_tipo": "upload", "avatar_id": None},
            )
            arquivos_upload = list(tmp_path.glob("*"))
            assert len(arquivos_upload) == 1

            # 8. Segundo login redireciona para /jornada e testa /sair vs /sair-todos
            app_b = criar_aplicacao(configuracoes=config, provedor_google=provedor)
            with TestClient(app_b) as cliente_b:
                destino_b = _autenticar_via_callback(cliente_b, "codigo_valido")
                assert destino_b == "/jornada"
                csrf_b = cliente_b.cookies.get("lume_csrf") or ""

                resp_sair = cliente.post(
                    "/api/autenticacao/sair",
                    headers={"X-CSRF-Token": csrf_token},
                )
                assert resp_sair.status_code == 204
                assert cliente.get("/api/autenticacao/sessao").status_code == 401
                assert cliente_b.get("/api/autenticacao/sessao").status_code == 200

                # Login novamente em cliente para ter 2 sessoes ativas e testar /sair-todos
                _autenticar_via_callback(cliente, "codigo_valido")
                resp_todos = cliente_b.post(
                    "/api/autenticacao/sair-todos",
                    headers={"X-CSRF-Token": csrf_b},
                )
                assert resp_todos.status_code == 200
                assert resp_todos.json()["sessoes_revogadas"] >= 2
                assert cliente_b.get("/api/autenticacao/sessao").status_code == 401
                assert cliente.get("/api/autenticacao/sessao").status_code == 401

            # 9. Reautentica e testa exclusao definitiva (D06)
            _autenticar_via_callback(cliente, "codigo_valido")
            csrf_final = cliente.cookies.get("lume_csrf") or ""

            resp_exc_errada = cliente.post(
                "/api/conta/excluir",
                headers={"X-CSRF-Token": csrf_final},
                json={"confirmacao": "APAGAR"},
            )
            assert resp_exc_errada.status_code == 409
            assert resp_exc_errada.json()["erro"]["codigo"] == "CONFIRMACAO_EXCLUSAO_INVALIDA"

            resp_exc = cliente.post(
                "/api/conta/excluir",
                headers={"X-CSRF-Token": csrf_final},
                json={"confirmacao": "EXCLUIR"},
            )
            assert resp_exc.status_code == 200
            assert resp_exc.json()["conta_excluida"] is True
            assert cliente.get("/api/autenticacao/sessao").status_code == 401

            # Avatar no disco foi apagado
            assert list(tmp_path.glob("*")) == []

            # PostgreSQL e MongoDB completamente limpos para este usuario
            fabrica = FabricaPostgres(config.postgres_teste_url)
            try:
                async with fabrica.obter_sessao() as sessao_pg:
                    uid = UUID(usuario_id)
                    assert (
                        await sessao_pg.execute(
                            select(func.count())
                            .select_from(UsuarioModelo)
                            .where(UsuarioModelo.id == uid)
                        )
                    ).scalar_one() == 0
                    assert (
                        await sessao_pg.execute(
                            select(func.count())
                            .select_from(SessaoModelo)
                            .where(SessaoModelo.usuario_id == uid)
                        )
                    ).scalar_one() == 0
                    assert (
                        await sessao_pg.execute(
                            select(func.count())
                            .select_from(TarefaModelo)
                            .where(TarefaModelo.usuario_id == uid)
                        )
                    ).scalar_one() == 0
            finally:
                await fabrica.fechar()

            gerenciador_verif = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
            try:
                banco = gerenciador_verif.obter_banco()
                for col in (
                    COLECAO_DETALHES_TAREFAS,
                    COLECAO_LAYOUTS_CONSTELACAO,
                    COLECAO_EVENTOS_CICLO,
                    COLECAO_PREFERENCIAS_CENARIO,
                ):
                    assert await banco[col].count_documents({"usuario_id": usuario_id}) == 0
            finally:
                await gerenciador_verif.fechar()

            # 10. Novo login com o mesmo google_sub reinicia como primeiro acesso
            destino_novo = _autenticar_via_callback(cliente, "codigo_valido")
            assert destino_novo == "/primeiro-acesso"
    finally:
        await _limpar_usuario_teste(config, sub_unico)
