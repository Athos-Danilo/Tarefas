from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from typing import Any
from urllib.parse import parse_qs, urlparse
from uuid import UUID, uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import IdentidadeGoogle
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
from infraestrutura.postgres.modelos import InscricaoPushModelo, UsuarioModelo
from principal import criar_aplicacao


class _ProvedorGooglePushTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&cc={code_challenge}"

    async def trocar_codigo_por_usuario(self, codigo: str, code_verifier: str) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


@dataclass(frozen=True)
class _EnvioRegistradoPush:
    inscricao_id: UUID
    usuario_id: UUID
    endpoint: str
    payload: dict[str, Any]


class _ProvedorWebPushDuble:
    def __init__(self, endpoints_expirados: set[str] | None = None) -> None:
        self.endpoints_expirados: set[str] = endpoints_expirados or set()
        self.envios: list[_EnvioRegistradoPush] = []

    async def enviar(
        self,
        inscricao: InscricaoPushRegistro,
        payload: dict[str, Any],
    ) -> ResultadoEnvioPush:
        self.envios.append(
            _EnvioRegistradoPush(
                inscricao_id=inscricao.id,
                usuario_id=inscricao.usuario_id,
                endpoint=inscricao.endpoint,
                payload=payload,
            )
        )
        if inscricao.endpoint in self.endpoints_expirados:
            return ResultadoEnvioPush(
                sucesso=False,
                expirada=True,
                status_http=410,
                detalhe="Inscricao expirada (410 Gone).",
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


async def test_push_multidispositivo_lembretes_cron_e_limpeza_expirada(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_a = f"push-a-{uuid4().hex[:8]}"
    sub_b = f"push-b-{uuid4().hex[:8]}"
    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase24-32-bytes-seguro",
            "google_client_id": "client-fase24",
            "google_client_secret": "secret-fase24",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
            "vapid_public_key": (
                "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8"
            ),
            "vapid_private_key": "chave-privada-teste-fase24",
            "vapid_subject": "mailto:teste@lume.dev",
            "token_cron_lembretes": "cron-token-super-secreto-24",
        }
    )
    provedor_google = _ProvedorGooglePushTeste(
        {
            "cod_a": IdentidadeGoogle(
                google_sub=sub_a,
                email=f"push.a.{sub_a}@lume.dev",
                email_verificado=True,
                nome_sugerido="Usuario Push A",
                foto_url=None,
            ),
            "cod_b": IdentidadeGoogle(
                google_sub=sub_b,
                email=f"push.b.{sub_b}@lume.dev",
                email_verificado=True,
                nome_sugerido="Usuario Push B",
                foto_url=None,
            ),
        }
    )
    endpoint_expirado = f"https://push.exemplo/expirado-{sub_a}"
    endpoint_pc = f"https://push.exemplo/pc-{sub_a}"
    endpoint_cel = f"https://push.exemplo/cel-{sub_a}"
    provedor_push = _ProvedorWebPushDuble(endpoints_expirados={endpoint_expirado})

    try:
        app_a = criar_aplicacao(
            config,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
        )
        app_b = criar_aplicacao(
            config,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
        )

        with TestClient(app_a) as cliente_a, TestClient(app_b) as cliente_b:
            csrf_a, _ = _entrar_e_liberar(cliente_a, "cod_a", "Ana Lume")
            csrf_b, _ = _entrar_e_liberar(cliente_b, "cod_b", "Bruno Lume")

            # Chave publica VAPID
            r_chave = cliente_a.get("/api/push/chave-publica")
            assert r_chave.status_code == 200
            assert r_chave.json()["habilitado"] is True
            assert r_chave.json()["chave_publica"] == config.vapid_public_key

            # Registra PC, celular e 1 inscricao que expirara em 410 Gone
            r_pc = cliente_a.post(
                "/api/push/dispositivos",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "endpoint": endpoint_pc,
                    "chaves": {"p256dh": "p256dh-pc-0123456789", "auth": "auth-pc-12345"},
                    "rotulo_dispositivo": "Notebook Windows",
                    "plataforma": "desktop",
                },
            )
            assert r_pc.status_code == 201
            disp_pc = r_pc.json()
            assert "chave_p256dh" not in disp_pc
            assert disp_pc["rotulo_dispositivo"] == "Notebook Windows"

            # Re-registro do mesmo endpoint atualiza rotulo sem duplicar
            r_pc_att = cliente_a.post(
                "/api/push/dispositivos",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "endpoint": endpoint_pc,
                    "chaves": {"p256dh": "p256dh-pc-0123456789", "auth": "auth-pc-12345"},
                    "rotulo_dispositivo": "Notebook Casa",
                    "plataforma": "desktop",
                },
            )
            assert r_pc_att.status_code == 201
            assert r_pc_att.json()["id"] == disp_pc["id"]
            assert r_pc_att.json()["rotulo_dispositivo"] == "Notebook Casa"

            r_cel = cliente_a.post(
                "/api/push/dispositivos",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "endpoint": endpoint_cel,
                    "chaves": {"p256dh": "p256dh-cel-0123456789", "auth": "auth-cel-12345"},
                    "rotulo_dispositivo": "Celular Android",
                    "plataforma": "android",
                },
            )
            assert r_cel.status_code == 201

            r_exp = cliente_a.post(
                "/api/push/dispositivos",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "endpoint": endpoint_expirado,
                    "chaves": {"p256dh": "p256dh-exp-0123456789", "auth": "auth-exp-12345"},
                    "rotulo_dispositivo": "Navegador Antigo",
                    "plataforma": "desktop",
                },
            )
            assert r_exp.status_code == 201

            r_lista_disp = cliente_a.get("/api/push/dispositivos")
            assert r_lista_disp.status_code == 200
            assert len(r_lista_disp.json()["itens"]) == 3
            assert all("chave_p256dh" not in item for item in r_lista_disp.json()["itens"])

            # Isolamento: B nao pode revogar dispositivo de A
            r_rev_b = cliente_b.delete(
                f"/api/push/dispositivos/{disp_pc['id']}",
                headers={"X-CSRF-Token": csrf_b},
            )
            assert r_rev_b.status_code == 404

            # Respeita teto de 10 dispositivos por usuario (registra +7 = 10, 11o falha com 409)
            ids_extras: list[str] = []
            for idx in range(7):
                r_extra = cliente_a.post(
                    "/api/push/dispositivos",
                    headers={"X-CSRF-Token": csrf_a},
                    json={
                        "endpoint": f"https://push.exemplo/extra-{sub_a}-{idx}",
                        "chaves": {"p256dh": f"p256dh-ex-{idx}-0123456", "auth": "auth-extra-12"},
                        "rotulo_dispositivo": f"Extra {idx}",
                        "plataforma": "outro",
                    },
                )
                assert r_extra.status_code == 201
                ids_extras.append(r_extra.json()["id"])

            r_11 = cliente_a.post(
                "/api/push/dispositivos",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "endpoint": f"https://push.exemplo/extra-{sub_a}-overflow",
                    "chaves": {"p256dh": "p256dh-over-01234567", "auth": "auth-over-123"},
                    "rotulo_dispositivo": "11o Aparelho",
                    "plataforma": "desktop",
                },
            )
            assert r_11.status_code == 409
            assert r_11.json()["erro"]["codigo"] == "LIMITE_DISPOSITIVOS_PUSH_ATINGIDO"

            # Revoga os 7 extras para deixar apenas pc, cel e expirado nos testes do cron
            for did in ids_extras:
                assert (
                    cliente_a.delete(
                        f"/api/push/dispositivos/{did}",
                        headers={"X-CSRF-Token": csrf_a},
                    ).status_code
                    == 204
                )

            # Cria tarefa de A e agenda lembretes (1 vencido para cron, 1 futuro) + testa teto 3
            prazo_iso = (datetime.now(UTC) + timedelta(hours=2)).isoformat()
            r_t1 = cliente_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Entregar Trabalho Web II", "turno": "manha", "prazo": prazo_iso},
            )
            assert r_t1.status_code == 201
            t1_id = r_t1.json()["tarefa"]["id"]

            vencido_iso = (datetime.now(UTC) - timedelta(minutes=2)).isoformat()
            futuro_iso = (datetime.now(UTC) + timedelta(hours=1)).isoformat()

            r_l1 = cliente_a.post(
                f"/api/tarefas/{t1_id}/lembretes",
                headers={"X-CSRF-Token": csrf_a},
                json={"disparar_em": vencido_iso, "antecedencia_min": 15},
            )
            assert r_l1.status_code == 201
            l1_id = r_l1.json()["id"]

            r_l2 = cliente_a.post(
                f"/api/tarefas/{t1_id}/lembretes",
                headers={"X-CSRF-Token": csrf_a},
                json={"disparar_em": futuro_iso, "antecedencia_min": 30},
            )
            assert r_l2.status_code == 201
            l2_id = r_l2.json()["id"]

            r_l3 = cliente_a.post(
                f"/api/tarefas/{t1_id}/lembretes",
                headers={"X-CSRF-Token": csrf_a},
                json={"disparar_em": futuro_iso, "antecedencia_min": 60},
            )
            assert r_l3.status_code == 201

            # 4o lembrete na mesma tarefa retorna 409
            r_l4 = cliente_a.post(
                f"/api/tarefas/{t1_id}/lembretes",
                headers={"X-CSRF-Token": csrf_a},
                json={"disparar_em": futuro_iso, "antecedencia_min": 120},
            )
            assert r_l4.status_code == 409
            assert r_l4.json()["erro"]["codigo"] == "LIMITE_LEMBRETES_TAREFA_ATINGIDO"

            # Atualiza l2 e cancela l2
            r_patch_l2 = cliente_a.patch(
                f"/api/lembretes/{l2_id}",
                headers={"X-CSRF-Token": csrf_a},
                json={"antecedencia_min": 45},
            )
            assert r_patch_l2.status_code == 200
            assert r_patch_l2.json()["antecedencia_min"] == 45

            assert (
                cliente_b.delete(
                    f"/api/lembretes/{l2_id}",
                    headers={"X-CSRF-Token": csrf_b},
                ).status_code
                == 404
            )
            assert (
                cliente_a.delete(
                    f"/api/lembretes/{l2_id}",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 204
            )

            # Protecao do endpoint interno de cron
            assert cliente_a.post("/api/interno/disparar-lembretes").status_code == 401
            assert (
                cliente_a.post(
                    "/api/interno/disparar-lembretes",
                    headers={"X-Token-Interno": "token-errado"},
                ).status_code
                == 401
            )

            # Disparo valido do cron: processa somente l1 (vencido), envia para PC/Cel/Expirado,
            # remove o expirado (410 Gone) e preserva futuros pendentes.
            r_cron = cliente_a.post(
                "/api/interno/disparar-lembretes",
                headers={"X-Token-Interno": "cron-token-super-secreto-24"},
            )
            assert r_cron.status_code == 200
            dados_cron = r_cron.json()
            assert dados_cron["lembretes_processados"] == 1
            assert dados_cron["notificacoes_enviadas"] == 2
            assert dados_cron["inscricoes_removidas_expiradas"] == 1
            assert len(provedor_push.envios) == 3

            # Confirmar no banco que a inscricao expirada foi removida
            fabrica_check = FabricaPostgres(config.postgres_teste_url)
            try:
                async with fabrica_check.obter_sessao() as sessao_chk:
                    restantes = (
                        (
                            await sessao_chk.execute(
                                select(InscricaoPushModelo.endpoint).where(
                                    InscricaoPushModelo.endpoint == endpoint_expirado
                                )
                            )
                        )
                        .scalars()
                        .all()
                    )
                    assert restantes == []
            finally:
                await fabrica_check.fechar()

            # Segunda chamada imediata do cron nao reenvia l1
            r_cron_2 = cliente_a.post(
                "/api/interno/disparar-lembretes",
                headers={"X-Token-Interno": "cron-token-super-secreto-24"},
            )
            assert r_cron_2.status_code == 200
            assert r_cron_2.json()["lembretes_processados"] == 0

            # Concluir t1 cancela automaticamente o lembrete futuro (l3) que restava pendente
            r_concluir = cliente_a.post(
                f"/api/tarefas/{t1_id}/concluir",
                headers={"X-CSRF-Token": csrf_a},
                json={"confirmar_cascata": False},
            )
            assert r_concluir.status_code == 200
            r_lem_t1 = cliente_a.get(f"/api/tarefas/{t1_id}/lembretes")
            assert r_lem_t1.status_code == 200
            pendentes_pos_conclusao = [
                item for item in r_lem_t1.json()["itens"] if item["status"] == "pendente"
            ]
            assert pendentes_pos_conclusao == []
            assert any(item["id"] == l1_id for item in r_lem_t1.json()["itens"])
            # Excluir tarefa deve remover lembretes associados em cascata
            r_t2 = cliente_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Tarefa para exclusao com lembrete", "turno": "tarde"},
            )
            assert r_t2.status_code == 201
            t2_id = r_t2.json()["tarefa"]["id"]
            assert (
                cliente_a.post(
                    f"/api/tarefas/{t2_id}/lembretes",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"disparar_em": futuro_iso, "antecedencia_min": 10},
                ).status_code
                == 201
            )
            assert (
                cliente_a.delete(
                    f"/api/tarefas/{t2_id}",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 200
            )
            assert cliente_a.get(f"/api/tarefas/{t2_id}/lembretes").status_code == 404
    finally:
        await _limpar_usuarios(config, [sub_a, sub_b])


async def test_web_push_em_eventos_de_tarefas_em_conjunto(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_lider = f"push-g-lid-{uuid4().hex[:8]}"
    sub_colab = f"push-g-col-{uuid4().hex[:8]}"
    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-grupo-push-32-bytes",
            "google_client_id": "client-fase24-g",
            "google_client_secret": "secret-fase24-g",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
            "vapid_public_key": (
                "BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8"
            ),
            "vapid_private_key": "chave-privada-grupo",
        }
    )
    provedor_google = _ProvedorGooglePushTeste(
        {
            "cod_lid": IdentidadeGoogle(
                google_sub=sub_lider,
                email=f"lider.{sub_lider}@lume.dev",
                email_verificado=True,
                nome_sugerido="Lider Push",
                foto_url=None,
            ),
            "cod_col": IdentidadeGoogle(
                google_sub=sub_colab,
                email=f"colab.{sub_colab}@lume.dev",
                email_verificado=True,
                nome_sugerido="Colaboradora Push",
                foto_url=None,
            ),
        }
    )
    provedor_push = _ProvedorWebPushDuble()

    try:
        app_lider = criar_aplicacao(
            config,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
        )
        app_colab = criar_aplicacao(
            config,
            provedor_google=provedor_google,
            provedor_web_push=provedor_push,
        )

        with TestClient(app_lider) as c_lider, TestClient(app_colab) as c_colab:
            csrf_lid, _ = _entrar_e_liberar(c_lider, "cod_lid", "Lider Ana")
            csrf_col, uid_col = _entrar_e_liberar(c_colab, "cod_col", "Colab Bia")

            # Cada membro ativa opt-in Web Push no proprio aparelho
            assert (
                c_lider.post(
                    "/api/push/dispositivos",
                    headers={"X-CSRF-Token": csrf_lid},
                    json={
                        "endpoint": f"https://push.exemplo/lid-{sub_lider}",
                        "chaves": {"p256dh": "p256dh-lid-0123456", "auth": "auth-lid-12"},
                        "rotulo_dispositivo": "PC da Lider",
                        "plataforma": "desktop",
                    },
                ).status_code
                == 201
            )
            assert (
                c_colab.post(
                    "/api/push/dispositivos",
                    headers={"X-CSRF-Token": csrf_col},
                    json={
                        "endpoint": f"https://push.exemplo/col-{sub_colab}",
                        "chaves": {"p256dh": "p256dh-col-0123456", "auth": "auth-col-12"},
                        "rotulo_dispositivo": "Celular da Bia",
                        "plataforma": "android",
                    },
                ).status_code
                == 201
            )

            # Lider cria projeto com subtarefa e compartilha
            r_raiz = c_lider.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_lid},
                json={"titulo": "Projeto Conjunto Push", "turno": "tarde"},
            )
            assert r_raiz.status_code == 201
            raiz_id = r_raiz.json()["tarefa"]["id"]

            r_sub = c_lider.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_lid},
                json={"titulo": "Implementar Push", "tarefa_pai_id": raiz_id, "turno": "tarde"},
            )
            assert r_sub.status_code == 201
            sub_id = r_sub.json()["tarefa"]["id"]

            r_comp = c_lider.post(
                f"/api/grupos/{raiz_id}/compartilhar",
                headers={"X-CSRF-Token": csrf_lid},
            )
            assert r_comp.status_code == 200
            token_convite = r_comp.json()["codigo_token"]

            r_entrar = c_colab.post(
                f"/api/grupos/convites/{token_convite}/entrar",
                headers={"X-CSRF-Token": csrf_col},
                json={},
            )
            assert r_entrar.status_code == 200

            provedor_push.envios.clear()

            # Lider atribui subtarefa a Colaboradora -> Colaboradora recebe push de atribuicao
            r_atrib = c_lider.patch(
                f"/api/tarefas/{sub_id}/atribuir",
                headers={"X-CSRF-Token": csrf_lid},
                json={"responsavel_usuario_id": uid_col, "vaga_responsavel_id": None},
            )
            assert r_atrib.status_code == 200
            assert len(provedor_push.envios) == 1
            assert provedor_push.envios[0].endpoint == f"https://push.exemplo/col-{sub_colab}"
            assert provedor_push.envios[0].payload["tipo"] == "grupo_atribuicao"
            assert "Implementar Push" in provedor_push.envios[0].payload["corpo"]

            provedor_push.envios.clear()

            # Colaboradora conclui a subtarefa -> Lider recebe push de conclusao (Colab nao recebe)
            r_conc = c_colab.post(
                f"/api/tarefas/{sub_id}/concluir",
                headers={"X-CSRF-Token": csrf_col},
                json={"confirmar_cascata": False},
            )
            assert r_conc.status_code == 200
            assert len(provedor_push.envios) == 1
            assert provedor_push.envios[0].endpoint == f"https://push.exemplo/lid-{sub_lider}"
            assert provedor_push.envios[0].payload["tipo"] == "grupo_conclusao"
            assert "Colab Bia" in provedor_push.envios[0].payload["corpo"]

            # Dispositivo expirado no grupo e limpo automaticamente sem quebrar atribuicao
            endpoint_lid_exp = f"https://push.exemplo/lid-exp-{sub_lider}"
            provedor_push.endpoints_expirados.add(endpoint_lid_exp)
            assert (
                c_lider.post(
                    "/api/push/dispositivos",
                    headers={"X-CSRF-Token": csrf_lid},
                    json={
                        "endpoint": endpoint_lid_exp,
                        "chaves": {"p256dh": "p256dh-lid-exp-012", "auth": "auth-exp-lid"},
                        "rotulo_dispositivo": "Tablet Antigo",
                        "plataforma": "ios",
                    },
                ).status_code
                == 201
            )
            r_sub2 = c_lider.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_lid},
                json={"titulo": "Etapa 2 Push", "tarefa_pai_id": raiz_id, "turno": "noite"},
            )
            assert r_sub2.status_code == 201
            sub2_id = r_sub2.json()["tarefa"]["id"]
            assert (
                c_lider.patch(
                    f"/api/tarefas/{sub2_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_lid},
                    json={"responsavel_usuario_id": uid_col, "vaga_responsavel_id": None},
                ).status_code
                == 200
            )
            assert (
                c_colab.post(
                    f"/api/tarefas/{sub2_id}/concluir",
                    headers={"X-CSRF-Token": csrf_col},
                    json={"confirmar_cascata": False},
                ).status_code
                == 200
            )
            restantes_lid = c_lider.get("/api/push/dispositivos").json()["itens"]
            assert [d["rotulo_dispositivo"] for d in restantes_lid] == ["PC da Lider"]
    finally:
        await _limpar_usuarios(config, [sub_lider, sub_colab])
