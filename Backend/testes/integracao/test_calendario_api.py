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


class _ProvedorGoogleCalendarioTeste:
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


async def test_api_calendario_mensal_fuso_recorrencias_filtros_e_grupos(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub_a = f"fase20-a-{uuid4()}"
    sub_b = f"fase20-b-{uuid4()}"

    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase20-calendario-32b",
            "google_client_id": "client-fase20",
            "google_client_secret": "secret-fase20",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor = _ProvedorGoogleCalendarioTeste(
        {
            "cod_a": IdentidadeGoogle(
                google_sub=sub_a,
                email="calendario.a@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario Cal A",
                foto_url=None,
            ),
            "cod_b": IdentidadeGoogle(
                google_sub=sub_b,
                email="calendario.b@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario Cal B",
                foto_url=None,
            ),
        }
    )

    try:
        app_a = criar_aplicacao(configuracoes=config, provedor_google=provedor)
        app_b = criar_aplicacao(configuracoes=config, provedor_google=provedor)

        with TestClient(app_a) as cli_a, TestClient(app_b) as cli_b:
            # 1. Protecao de autenticacao
            assert cli_a.get("/api/calendario/mensal?ano=2026&mes=11").status_code == 401

            csrf_a = _entrar_e_concluir_acesso(cli_a, "cod_a", "Usuario Cal A")
            csrf_b = _entrar_e_concluir_acesso(cli_b, "cod_b", "Usuario Cal B")

            # 2. Validacao de mes e fuso horario invalidos
            assert cli_a.get("/api/calendario/mensal?ano=2026&mes=13").status_code == 422
            assert (
                cli_a.get(
                    "/api/calendario/mensal?ano=2026&mes=11&fuso_horario=Invalido/Fuso"
                ).status_code
                == 422
            )

            # 3. Cria tarefa na virada UTC e tarefa recorrente semanal
            r_virada = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "titulo": "Entrega Virada Fuso",
                    "prioridade": "alta",
                    "turno": "noite",
                    "prazo": "2026-12-01T01:30:00Z",
                },
            )
            assert r_virada.status_code == 201

            r_rec = cli_a.post(
                "/api/tarefas",
                headers={"X-CSRF-Token": csrf_a},
                json={
                    "titulo": "Sync Semanal Grupo",
                    "prioridade": "urgente",
                    "turno": "manha",
                    "prazo": "2026-11-02T14:00:00Z",
                    "recorrencia": {
                        "tipo": "semanal",
                        "dias_semana": [1],
                        "intervalo": 1,
                    },
                },
            )
            assert r_rec.status_code == 201
            rec_id = r_rec.json()["tarefa"]["id"]

            # 4. Consulta novembro em America/Sao_Paulo ve dia 30 e recorrencias
            r_nov_sp = cli_a.get(
                "/api/calendario/mensal?ano=2026&mes=11&fuso_horario=America/Sao_Paulo"
            )
            assert r_nov_sp.status_code == 200
            corpo_sp = r_nov_sp.json()
            assert corpo_sp["ano"] == 2026
            assert corpo_sp["mes"] == 11
            dias_sp = {d["data"]: d for d in corpo_sp["dias"]}
            assert "2026-11-30" in dias_sp
            assert dias_sp["2026-11-30"]["total_tarefas"] == 2
            assert dias_sp["2026-11-30"]["maior_prioridade"] == "urgente"
            assert dias_sp["2026-11-02"]["tarefas"][0]["eh_projecao"] is False
            assert dias_sp["2026-11-09"]["tarefas"][0]["eh_projecao"] is True

            # Em UTC a entrega de 01/12 01:30Z nao cai em novembro
            r_nov_utc = cli_a.get("/api/calendario/mensal?ano=2026&mes=11&fuso_horario=UTC")
            assert r_nov_utc.status_code == 200
            titulos_dia_30_utc = {
                item["titulo"]
                for d in r_nov_utc.json()["dias"]
                if d["data"] == "2026-11-30"
                for item in d["tarefas"]
            }
            assert "Entrega Virada Fuso" not in titulos_dia_30_utc

            # 5. Virada de mes para dezembro continua projetando recorrencia semanal
            r_dez_sp = cli_a.get(
                "/api/calendario/mensal?ano=2026&mes=12&fuso_horario=America/Sao_Paulo"
            )
            assert r_dez_sp.status_code == 200
            datas_dez = {d["data"] for d in r_dez_sp.json()["dias"]}
            assert "2026-12-07" in datas_dez

            # 6. Filtros de prioridade e turno
            r_filt = cli_a.get(
                "/api/calendario/mensal?ano=2026&mes=11&fuso_horario=America/Sao_Paulo"
                "&prioridade=alta&turno=noite"
            )
            assert r_filt.status_code == 200
            assert len(r_filt.json()["dias"]) == 1
            assert r_filt.json()["dias"][0]["tarefas"][0]["titulo"] == "Entrega Virada Fuso"

            # 7. Isolamento antes do compartilhamento e visibilidade apos entrar no grupo
            assert cli_b.get("/api/calendario/mensal?ano=2026&mes=11").json()["dias"] == []

            r_comp = cli_a.post(
                f"/api/grupos/{rec_id}/compartilhar",
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
            r_cal_b = cli_b.get(
                "/api/calendario/mensal?ano=2026&mes=11&fuso_horario=America/Sao_Paulo"
            )
            assert any(d["data"] == "2026-11-02" for d in r_cal_b.json()["dias"])
    finally:
        await _limpar_usuarios_teste(config, [sub_a, sub_b])
