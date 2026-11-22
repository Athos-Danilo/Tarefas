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


class _ProvedorGoogleGrupoTeste:
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


async def test_fluxo_completo_tarefas_em_conjunto_vagas_convites_permissoes_e_saida(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_a = f"grupo-a-{uuid4()}"
    sub_b = f"grupo-b-{uuid4()}"
    sub_c = f"grupo-c-{uuid4()}"
    sub_d = f"grupo-d-{uuid4()}"
    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase11-32-bytes-seguros",
            "google_client_id": "client-fase11",
            "google_client_secret": "secret-fase11",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor = _ProvedorGoogleGrupoTeste(
        {
            "cod_a": IdentidadeGoogle(
                google_sub=sub_a,
                email="lider.a@exemplo.com",
                email_verificado=True,
                nome_sugerido="Lider A",
                foto_url=None,
            ),
            "cod_b": IdentidadeGoogle(
                google_sub=sub_b,
                email="colab.b@exemplo.com",
                email_verificado=True,
                nome_sugerido="Colab B",
                foto_url=None,
            ),
            "cod_c": IdentidadeGoogle(
                google_sub=sub_c,
                email="colab.c@exemplo.com",
                email_verificado=True,
                nome_sugerido="Colab C",
                foto_url=None,
            ),
            "cod_d": IdentidadeGoogle(
                google_sub=sub_d,
                email="intruso.d@exemplo.com",
                email_verificado=True,
                nome_sugerido="Intruso D",
                foto_url=None,
            ),
        }
    )

    try:
        app_a = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_b = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_c = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_d = criar_aplicacao(configuracoes=config, provedor_google=provedor)

        with (
            TestClient(app_a) as cli_a,
            TestClient(app_b) as cli_b,
            TestClient(app_c) as cli_c,
            TestClient(app_d) as cli_d,
        ):
            csrf_a, _uid_a = _entrar_e_concluir_acesso(cli_a, "cod_a", "Lider A")
            csrf_b, uid_b = _entrar_e_concluir_acesso(cli_b, "cod_b", "Colab B")
            csrf_c, uid_c = _entrar_e_concluir_acesso(cli_c, "cod_c", "Colab C")
            _csrf_d, _uid_d = _entrar_e_concluir_acesso(cli_d, "cod_d", "Intruso D")

            # 1. Cria raiz + subtarefas e compartilha projeto
            r_raiz = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Trabalho Web II em Trio", "prioridade": "alta"},
            )
            assert r_raiz.status_code == 201
            raiz_id = r_raiz.json()["tarefa"]["id"]

            r_sub_b = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Backend e Testes", "tarefa_pai_id": raiz_id},
            )
            r_sub_c = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Interface React", "tarefa_pai_id": raiz_id},
            )
            r_sub_x = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={"titulo": "Documentacao Final", "tarefa_pai_id": raiz_id},
            )
            assert r_sub_b.status_code == 201
            assert r_sub_c.status_code == 201
            assert r_sub_x.status_code == 201
            sub_b_id = r_sub_b.json()["tarefa"]["id"]
            sub_c_id = r_sub_c.json()["tarefa"]["id"]
            sub_x_id = r_sub_x.json()["tarefa"]["id"]

            # Nao pode compartilhar subtarefa (apenas raiz)
            assert (
                cli_a.post(
                    f"/api/grupos/{sub_b_id}/compartilhar",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 422
            )

            r_comp = cli_a.post(
                f"/api/grupos/{raiz_id}/compartilhar",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_comp.status_code == 200
            token_inicial = r_comp.json()["codigo_token"]

            # Cria vagas (incl. teto de 10 e remocao)
            r_vaga_b = cli_a.post(
                f"/api/grupos/{raiz_id}/vagas",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome_exibicao": "Especialista API", "email_opcional": "colab.b@exemplo.com"},
            )
            assert r_vaga_b.status_code == 201
            vaga_b_id = r_vaga_b.json()["id"]

            r_vaga_c = cli_a.post(
                f"/api/grupos/{raiz_id}/vagas",
                headers={"X-CSRF-Token": csrf_a},
                json={"nome_exibicao": "Integrante Frontend"},
            )
            assert r_vaga_c.status_code == 201
            vaga_c_id = r_vaga_c.json()["id"]

            vagas_extras: list[str] = []
            for idx in range(8):
                rv = cli_a.post(
                    f"/api/grupos/{raiz_id}/vagas",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"nome_exibicao": f"Vaga Extra {idx}"},
                )
                assert rv.status_code == 201
                vagas_extras.append(rv.json()["id"])

            assert (
                cli_a.post(
                    f"/api/grupos/{raiz_id}/vagas",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"nome_exibicao": "Vaga 11"},
                ).status_code
                == 422
            )

            # 2. Pre-atribui subtarefas a vagas e valida regra max 1 responsavel + exclusao vaga
            assert (
                cli_a.patch(
                    f"/api/tarefas/{sub_x_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"responsavel_usuario_id": uid_b, "vaga_responsavel_id": vaga_b_id},
                ).status_code
                == 422
            )
            assert (
                cli_a.patch(
                    f"/api/tarefas/{sub_x_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"vaga_responsavel_id": vagas_extras[0]},
                ).status_code
                == 200
            )
            assert (
                cli_a.delete(
                    f"/api/grupos/{raiz_id}/vagas/{vagas_extras[0]}",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 204
            )
            assert cli_a.get(f"/api/tarefas/{sub_x_id}").json()["tarefa"]["responsavel"] is None

            assert (
                cli_a.patch(
                    f"/api/tarefas/{sub_b_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"vaga_responsavel_id": vaga_b_id},
                ).status_code
                == 200
            )
            assert (
                cli_a.patch(
                    f"/api/tarefas/{sub_c_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"vaga_responsavel_id": vaga_c_id},
                ).status_code
                == 200
            )

            # 3. Regenera convite, valida token antigo revogado e entrada de B e C
            r_reg = cli_a.post(
                f"/api/grupos/{raiz_id}/convites/regenerar",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_reg.status_code == 200
            token_ativo = r_reg.json()["codigo_token"]
            assert token_ativo != token_inicial

            r_antigo = cli_b.get(f"/api/grupos/convites/{token_inicial}")
            assert r_antigo.status_code == 404
            assert r_antigo.json()["erro"]["codigo"] == "CONVITE_INVALIDO_OU_REVOGADO"

            r_previa = cli_b.get(f"/api/grupos/convites/{token_ativo}")
            assert r_previa.status_code == 200
            assert r_previa.json()["titulo"] == "Trabalho Web II em Trio"

            # B entra sem especificar vaga -> auto-vinculo por e-mail e herda sub_b_id
            r_entrar_b = cli_b.post(
                f"/api/grupos/convites/{token_ativo}/entrar",
                headers={"X-CSRF-Token": csrf_b},
                json={},
            )
            assert r_entrar_b.status_code == 200
            assert r_entrar_b.json()["vaga_vinculada_id"] == vaga_b_id
            assert r_entrar_b.json()["subtarefas_herdadas"] == 1

            # C tenta pegar a vaga ja ocupada de B -> 409 VAGA_JA_OCUPADA
            r_c_ocup = cli_c.post(
                f"/api/grupos/convites/{token_ativo}/entrar",
                headers={"X-CSRF-Token": csrf_c},
                json={"vaga_id": vaga_b_id},
            )
            assert r_c_ocup.status_code == 409
            assert r_c_ocup.json()["erro"]["codigo"] == "VAGA_JA_OCUPADA"

            r_entrar_c = cli_c.post(
                f"/api/grupos/convites/{token_ativo}/entrar",
                headers={"X-CSRF-Token": csrf_c},
                json={"vaga_id": vaga_c_id},
            )
            assert r_entrar_c.status_code == 200
            assert r_entrar_c.json()["subtarefas_herdadas"] == 1

            # 4. Permissoes por papel, notas compartilhadas e isolamento do intruso D
            assert cli_d.get(f"/api/tarefas/{raiz_id}").status_code == 404
            assert cli_d.get(f"/api/tarefas/{raiz_id}/detalhes").status_code == 404
            assert cli_d.get(f"/api/grupos/{raiz_id}/desempenho").status_code == 404

            # B ve a arvore inteira e cria subetapa dentro da sua subtarefa
            assert len(cli_b.get("/api/tarefas").json()["itens"]) == 1
            r_sub_b2 = cli_b.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_b},
                json={"titulo": "Escrever migracao", "tarefa_pai_id": sub_b_id},
            )
            assert r_sub_b2.status_code == 201
            sub_b2_id = r_sub_b2.json()["tarefa"]["id"]

            # B conclui e reabre sua subetapa, e salva notas compartilhadas lidas pelo lider
            assert (
                cli_b.post(
                    f"/api/tarefas/{sub_b2_id}/concluir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"confirmar_cascata": False},
                ).status_code
                == 200
            )
            assert (
                cli_b.post(
                    f"/api/tarefas/{sub_b2_id}/reabrir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"status_destino": "em_andamento"},
                ).status_code
                == 200
            )
            assert (
                cli_b.post(
                    f"/api/tarefas/{sub_b2_id}/concluir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"confirmar_cascata": False},
                ).status_code
                == 200
            )
            assert (
                cli_b.put(
                    f"/api/tarefas/{sub_b_id}/detalhes",
                    headers={"X-CSRF-Token": csrf_b},
                    json={
                        "metadados_visuais": {},
                        "notas_em_blocos": [
                            {"id": "n1", "tipo": "paragrafo", "texto": "Nota colaborativa B."}
                        ],
                    },
                ).status_code
                == 200
            )
            assert (
                cli_a.get(f"/api/tarefas/{sub_b_id}/detalhes").json()["notas_em_blocos"][0]["texto"]
                == "Nota colaborativa B."
            )

            # B nao pode alterar subtarefa de C, nem criar vagas, nem atribuir responsavel
            assert (
                cli_b.post(
                    f"/api/tarefas/{sub_c_id}/concluir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"confirmar_cascata": False},
                ).status_code
                == 403
            )
            assert (
                cli_b.patch(
                    f"/api/tarefas/{sub_c_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"responsavel_usuario_id": uid_b},
                ).status_code
                == 403
            )
            assert (
                cli_b.post(
                    f"/api/grupos/{raiz_id}/vagas",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"nome_exibicao": "Vaga Proibida"},
                ).status_code
                == 403
            )

            # 5. Painel /desempenho: lider ve token, colaborador nao ve token
            r_painel_a = cli_a.get(f"/api/grupos/{raiz_id}/desempenho")
            assert r_painel_a.status_code == 200
            dados_pa = r_painel_a.json()
            assert dados_pa["meu_papel"] == "lider"
            assert dados_pa["codigo_token"] == token_ativo
            assert dados_pa["resumo_geral"]["total_subtarefas_folha"] == 3
            assert dados_pa["resumo_geral"]["folhas_concluidas"] == 1
            assert len(dados_pa["atividade_recente"]) >= 1

            r_painel_b = cli_b.get(f"/api/grupos/{raiz_id}/desempenho")
            assert r_painel_b.status_code == 200
            assert r_painel_b.json()["meu_papel"] == "colaborador"
            assert r_painel_b.json()["codigo_token"] is None

            # 6. Revogacao, remocao de C, transferencia para B, saida de A e exclusao de conta
            assert (
                cli_a.delete(
                    f"/api/grupos/{raiz_id}/convites",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 204
            )
            assert cli_d.get(f"/api/grupos/convites/{token_ativo}").status_code == 404

            r_sair_bloqueado = cli_a.post(
                f"/api/grupos/{raiz_id}/sair",
                headers={"X-CSRF-Token": csrf_a},
            )
            assert r_sair_bloqueado.status_code == 409
            assert r_sair_bloqueado.json()["erro"]["codigo"] == "LIDER_DEVE_TRANSFERIR_OU_EXCLUIR"

            # Remove C -> subtarefa de C fica sem responsavel e C perde acesso
            assert (
                cli_a.delete(
                    f"/api/grupos/{raiz_id}/membros/{uid_c}",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 204
            )
            assert cli_c.get(f"/api/tarefas/{raiz_id}").status_code == 404
            assert cli_a.get(f"/api/tarefas/{sub_c_id}").json()["tarefa"]["responsavel"] is None

            # Transfere lideranca para B -> A sai deixando grupo preservado sob B
            assert (
                cli_a.post(
                    f"/api/grupos/{raiz_id}/transferir-lideranca",
                    headers={"X-CSRF-Token": csrf_a},
                    json={"novo_lider_usuario_id": uid_b},
                ).status_code
                == 200
            )
            assert (
                cli_a.post(
                    f"/api/grupos/{raiz_id}/sair",
                    headers={"X-CSRF-Token": csrf_a},
                ).status_code
                == 200
            )
            assert cli_a.get(f"/api/tarefas/{raiz_id}").status_code == 404
            assert (
                cli_b.get(f"/api/tarefas/{sub_b_id}/detalhes").json()["notas_em_blocos"][0]["texto"]
                == "Nota colaborativa B."
            )

            # Re-adiciona C via novo convite e valida que excluir conta de C preserva sub_c_id
            novo_conv = cli_b.post(
                f"/api/grupos/{raiz_id}/convites/regenerar",
                headers={"X-CSRF-Token": csrf_b},
            ).json()["codigo_token"]
            assert (
                cli_c.post(
                    f"/api/grupos/convites/{novo_conv}/entrar",
                    headers={"X-CSRF-Token": csrf_c},
                    json={},
                ).status_code
                == 200
            )
            assert (
                cli_b.patch(
                    f"/api/tarefas/{sub_c_id}/atribuir",
                    headers={"X-CSRF-Token": csrf_b},
                    json={"responsavel_usuario_id": uid_c},
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
            assert cli_b.get(f"/api/tarefas/{sub_c_id}").json()["tarefa"]["responsavel"] is None
    finally:
        await _limpar_usuarios_teste(config, [sub_a, sub_b, sub_c, sub_d])
