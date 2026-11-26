from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import IdentidadeGoogle
from contratos.clima import LeituraClimaExterna, SugestaoCidade
from contratos.push import InscricaoPushRegistro, ResultadoEnvioPush
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


class _ProvedorGoogleAuditTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&cc={code_challenge}"

    async def trocar_codigo_por_usuario(self, codigo: str, code_verifier: str) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


class _ProvedorClimaEspiaoTeste:
    def __init__(self) -> None:
        self.chamadas_clima = 0

    async def buscar_cidades(self, consulta: str, limite: int = 8) -> list[SugestaoCidade]:
        return []

    async def consultar_clima_atual(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
    ) -> LeituraClimaExterna:
        self.chamadas_clima += 1
        return LeituraClimaExterna(temperatura_c=22.0, codigo_wmo=0)


@dataclass(frozen=True)
class _EnvioPushAudit:
    inscricao_id: UUID
    usuario_id: UUID
    payload: dict[str, Any]


class _ProvedorWebPushAuditLimpo:
    def __init__(self) -> None:
        self.envios: list[_EnvioPushAudit] = []

    async def enviar(
        self,
        inscricao: InscricaoPushRegistro,
        payload: dict[str, Any],
    ) -> ResultadoEnvioPush:
        self.envios.append(
            _EnvioPushAudit(
                inscricao_id=inscricao.id,
                usuario_id=inscricao.usuario_id,
                payload=payload,
            )
        )
        return ResultadoEnvioPush(sucesso=True, expirada=False, status_http=201)


def _entrar_e_liberar(cliente: TestClient, codigo: str, nome: str) -> tuple[str, str]:
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


async def _limpar_usuarios(config: Configuracoes, subs: list[str]) -> None:
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


async def test_auditoria_fase25_cabecalhos_cookies_seguros_lembretes_e_exclusao_mongo(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    suf = uuid4().hex[:8]
    sub_a = f"f25-a-{suf}"
    sub_b = f"f25-b-{suf}"
    sub_c = f"f25-c-{suf}"
    sub_d = f"f25-d-{suf}"

    provedor_google = _ProvedorGoogleAuditTeste(
        {
            "cod_a": IdentidadeGoogle(
                google_sub=sub_a,
                email=f"lider.{suf}@lume.dev",
                email_verificado=True,
                nome_sugerido="Lider A",
                foto_url=None,
            ),
            "cod_b": IdentidadeGoogle(
                google_sub=sub_b,
                email=f"colab.b.{suf}@lume.dev",
                email_verificado=True,
                nome_sugerido="Colab B",
                foto_url=None,
            ),
            "cod_c": IdentidadeGoogle(
                google_sub=sub_c,
                email=f"colab.c.{suf}@lume.dev",
                email_verificado=True,
                nome_sugerido="Colab C",
                foto_url=None,
            ),
            "cod_d": IdentidadeGoogle(
                google_sub=sub_d,
                email=f"intruso.{suf}@lume.dev",
                email_verificado=True,
                nome_sugerido="Intruso D",
                foto_url=None,
            ),
        }
    )

    config_https = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-auditoria-fase25-https-32-bytes",
            "google_client_id": "client-f25-https",
            "google_client_secret": "secret-f25-https",
            "google_redirect_uri": "https://lume.dev/api/autenticacao/google/callback",
            "cookie_seguro": True,
        }
    )
    config_padrao = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-auditoria-fase25-padrao-32-bytes",
            "google_client_id": "client-f25",
            "google_client_secret": "secret-f25",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
            "vapid_public_key": (
                "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8"
            ),
            "vapid_private_key": "chave-privada-audit-25",
            "token_cron_lembretes": "cron-token-audit-25",
        }
    )
    provedor_push = _ProvedorWebPushAuditLimpo()
    provedor_clima = _ProvedorClimaEspiaoTeste()

    try:
        # 1) Verifica delete_cookie do OAuth com cookie_seguro=True em contexto HTTPS
        app_https = criar_aplicacao(config_https, provedor_google=provedor_google)
        with TestClient(app_https, base_url="https://testserver") as cli_https:
            r_init_s = cli_https.get("/api/autenticacao/google/iniciar", follow_redirects=False)
            assert r_init_s.status_code == 302
            state_s = parse_qs(urlparse(r_init_s.headers["location"]).query)["state"][0]
            r_cb_s = cli_https.get(
                f"/api/autenticacao/google/callback?code=cod_a&state={state_s}",
                follow_redirects=False,
            )
            assert r_cb_s.status_code == 302
            set_cookies = r_cb_s.headers.get_list("set-cookie")
            cookie_expiracao_oauth = next(
                (
                    item.lower()
                    for item in set_cookies
                    if item.lower().startswith("lume_oauth_estado=")
                ),
                "",
            )
            assert cookie_expiracao_oauth
            assert "httponly" in cookie_expiracao_oauth
            assert "samesite=lax" in cookie_expiracao_oauth
            assert "secure" in cookie_expiracao_oauth

        # 2) Fluxo completo de cabecalhos, clima opt-in, remocao de membro e exclusao definitiva
        app_a = criar_aplicacao(
            config_padrao,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
            provedor_clima=provedor_clima,
        )
        app_b = criar_aplicacao(
            config_padrao,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
            provedor_clima=provedor_clima,
        )
        app_c = criar_aplicacao(
            config_padrao,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
            provedor_clima=provedor_clima,
        )
        app_d = criar_aplicacao(
            config_padrao,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
            provedor_clima=provedor_clima,
        )

        with (
            TestClient(app_a) as cli_a,
            TestClient(app_b) as cli_b,
            TestClient(app_c) as cli_c,
            TestClient(app_d) as cli_d,
        ):
            csrf_a, _ = _entrar_e_liberar(cli_a, "cod_a", "Lider Audit")
            csrf_b, uid_b = _entrar_e_liberar(cli_b, "cod_b", "Colab B Audit")
            csrf_c, uid_c = _entrar_e_liberar(cli_c, "cod_c", "Colab C Audit")
            _csrf_d, _ = _entrar_e_liberar(cli_d, "cod_d", "Intruso D Audit")

            # Cabecalhos HTTP de seguranca em /api/saude e no-store em rotas sensiveis
            r_saude = cli_a.get("/api/saude")
            assert r_saude.status_code == 200
            assert r_saude.headers.get("x-content-type-options") == "nosniff"
            assert r_saude.headers.get("x-frame-options") == "DENY"
            assert r_saude.headers.get("referrer-policy") == "strict-origin-when-cross-origin"
            assert "camera=()" in (r_saude.headers.get("permissions-policy") or "")

            for rota_sensivel in (
                "/api/autenticacao/sessao",
                "/api/conta/perfil",
                "/api/push/dispositivos",
            ):
                r_sens = cli_a.get(rota_sensivel)
                assert r_sens.status_code == 200
                assert r_sens.headers.get("x-content-type-options") == "nosniff"
                assert r_sens.headers.get("x-frame-options") == "DENY"
                assert "no-store" in (r_sens.headers.get("cache-control") or "").lower()

            # Privacidade clima: padrao bloqueado sem chamar provedor externo
            r_clima = cli_d.get("/api/clima/atual")
            assert r_clima.status_code == 403
            assert r_clima.json()["erro"]["codigo"] == "CLIMA_NAO_AUTORIZADO"
            assert provedor_clima.chamadas_clima == 0

            # Lider cria projeto com 2 subtarefas e compartilha
            r_raiz = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Projeto Audit 25", "turno": "manha"},
            )
            assert r_raiz.status_code == 201
            raiz_id = r_raiz.json()["tarefa"]["id"]

            r_sub_b = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Subtarefa do B", "tarefa_pai_id": raiz_id, "turno": "manha"},
            )
            r_sub_c = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Subtarefa do C", "tarefa_pai_id": raiz_id, "turno": "tarde"},
            )
            assert r_sub_b.status_code == 201
            assert r_sub_c.status_code == 201
            sub_b_id = r_sub_b.json()["tarefa"]["id"]
            sub_c_id = r_sub_c.json()["tarefa"]["id"]

            r_comp = cli_a.post(
                f"/api/grupos/{raiz_id}/compartilhar",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_comp.status_code == 200
            token_convite = r_comp.json()["codigo_token"]

            assert (
                cli_b.post(
                    f"/api/grupos/convites/{token_convite}/entrar",
                    headers={"X-CSRF-Token": csrf_b},
                    json={},
                ).status_code
                == 200
            )
            assert (
                cli_c.post(
                    f"/api/grupos/convites/{token_convite}/entrar",
                    headers={"X-CSRF-Token": csrf_c},
                    json={},
                ).status_code
                == 200
            )

            # Intruso D recebe 404 em tarefas, lembretes e exportacao da arvore compartilhada
            assert cli_d.get(f"/api/tarefas/{sub_b_id}").status_code == 404
            assert cli_d.get(f"/api/exportacao/tarefas?tarefa_id={sub_b_id}").status_code == 404
            assert (
                cli_d.post(
                    f"/api/tarefas/{sub_b_id}/lembretes",
                    headers={"X-CSRF-Token": _csrf_d},
                    json={"disparar_em": datetime.now(UTC).isoformat(), "antecedencia_min": 5},
                ).status_code
                == 404
            )

            # Atribui subtarefas e agenda lembrete vencido para B
            assert (
                cli_b.post(
                    "/api/push/dispositivos",
                    headers={"X-CSRF-Token": csrf_b},
                    json={
                        "endpoint": f"https://push.exemplo/b-{suf}",
                        "chaves": {"p256dh": "p256dh-b-audit-123", "auth": "auth-b-123"},
                        "rotulo_dispositivo": "Celular B",
                        "plataforma": "android",
                    },
                ).status_code
                == 201
            )
            assert (
                cli_a.patch(
                    f"/api/tarefas/{sub_b_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"responsavel_usuario_id": uid_b, "vaga_responsavel_id": None},
                ).status_code
                == 200
            )
            assert (
                cli_a.patch(
                    f"/api/tarefas/{sub_c_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"responsavel_usuario_id": uid_c, "vaga_responsavel_id": None},
                ).status_code
                == 200
            )

            vencido_iso = (datetime.now(UTC) - timedelta(minutes=3)).isoformat()
            assert (
                cli_b.post(
                    f"/api/tarefas/{sub_b_id}/lembretes",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"disparar_em": vencido_iso, "antecedencia_min": 5},
                ).status_code
                == 201
            )

            # Lider remove B -> lembretes pendentes de B nesse grupo sao cancelados e B perde acesso
            assert (
                cli_a.delete(
                    f"/api/grupos/{raiz_id}/membros/{uid_b}",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 204
            )
            assert cli_b.get(f"/api/tarefas/{sub_b_id}").status_code == 404

            provedor_push.envios.clear()
            r_cron = cli_a.post(
                "/api/interno/disparar-lembretes",
                headers={"X-Token-Interno": "cron-token-audit-25"},
            )
            assert r_cron.status_code == 200
            assert r_cron.json()["lembretes_processados"] == 0
            assert r_cron.json()["notificacoes_enviadas"] == 0
            assert provedor_push.envios == []

            # C conclui subtarefa (gera evento com usuario_id=uid_a e autor_usuario_id=uid_c)
            # e exclui a conta: todos os dados pessoais e de autoria devem sumir do MongoDB
            assert (
                cli_c.post(
                    f"/api/tarefas/{sub_c_id}/concluir",
                    headers={"X-CSRF-Token": csrf_c},
                    json={"confirmar_cascata": False},
                ).status_code
                == 200
            )
            assert (
                cli_c.post(
                    "/api/conta/excluir",
                    headers={"X-CSRF-Token": csrf_c},
                    json={"confirmacao": "EXCLUIR"},
                ).status_code
                == 200
            )

            mongo_chk = GerenciadorMongo(config_padrao.mongo_url, config_padrao.mongo_banco_teste)
            try:
                banco_chk = mongo_chk.obter_banco()
                restantes_autoria = await banco_chk[COLECAO_EVENTOS_CICLO].count_documents(
                    {"autor_usuario_id": uid_c}
                )
                assert restantes_autoria == 0
                restantes_prefs = await banco_chk[COLECAO_PREFERENCIAS_CENARIO].count_documents(
                    {"usuario_id": uid_c}
                )
                assert restantes_prefs == 0
            finally:
                await mongo_chk.fechar()
    finally:
        await _limpar_usuarios(config_padrao, [sub_a, sub_b, sub_c, sub_d])
