from urllib.parse import parse_qs, urlparse
from uuid import uuid4

from fastapi.testclient import TestClient
from sqlalchemy import select

from configuracao.configuracoes import Configuracoes
from contratos.autenticacao import IdentidadeGoogle
from contratos.clima import LeituraClimaExterna, SugestaoCidade
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


class _ProvedorGoogleClimaTeste:
    def __init__(self, mapa: dict[str, IdentidadeGoogle]) -> None:
        self._mapa = mapa

    def gerar_url_autorizacao(self, state: str, code_challenge: str) -> str:
        return f"https://accounts.google.com/o/oauth2/v2/auth?state={state}&cc={code_challenge}"

    async def trocar_codigo_por_usuario(self, codigo: str, code_verifier: str) -> IdentidadeGoogle:
        identidade = self._mapa.get(codigo)
        if identidade is None or not code_verifier:
            raise ErroDeDominio("OAUTH_INVALIDO", "Codigo OAuth invalido.", status_http=401)
        return identidade


class _ProvedorClimaIntegracao:
    """Substituto deterministico do Open-Meteo para teste E2E da API."""

    def __init__(self) -> None:
        self.chamadas_clima = 0
        self.chamadas_cidades = 0

    async def buscar_cidades(self, consulta: str, limite: int = 8) -> list[SugestaoCidade]:
        self.chamadas_cidades += 1
        if consulta.lower().startswith("brasil"):
            itens = [
                SugestaoCidade(
                    cidade="Brasília",
                    uf="DF",
                    pais="Brasil",
                    latitude_aprox=-15.79,
                    longitude_aprox=-47.88,
                ),
                SugestaoCidade(
                    cidade="Brasilândia",
                    uf="MS",
                    pais="Brasil",
                    latitude_aprox=-21.26,
                    longitude_aprox=-52.04,
                ),
            ]
            return itens[:limite]
        return []

    async def consultar_clima_atual(
        self,
        latitude_aprox: float,
        longitude_aprox: float,
    ) -> LeituraClimaExterna:
        self.chamadas_clima += 1
        if latitude_aprox == -23.55 and longitude_aprox == -46.63:
            raise ErroDeDominio(
                codigo="SERVICO_EXTERNO_INDISPONIVEL",
                mensagem="Falha simulada do provedor Open-Meteo.",
                status_http=503,
            )
        return LeituraClimaExterna(temperatura_c=24.5, codigo_wmo=61)


def _autenticar(cliente: TestClient, codigo: str) -> str:
    r_init = cliente.get("/api/autenticacao/google/iniciar", follow_redirects=False)
    assert r_init.status_code == 302
    state = parse_qs(urlparse(r_init.headers["location"]).query)["state"][0]
    r_cb = cliente.get(
        f"/api/autenticacao/google/callback?code={codigo}&state={state}",
        follow_redirects=False,
    )
    assert r_cb.status_code == 302
    return cliente.cookies.get("lume_csrf") or ""


async def _limpar_usuario_clima(config: Configuracoes, sub: str) -> None:
    assert config.postgres_teste_url is not None
    assert config.mongo_url is not None
    fabrica = FabricaPostgres(config.postgres_teste_url)
    mongo = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
    try:
        uid_str: str | None = None
        async with fabrica.obter_sessao() as sessao:
            usuario = (
                await sessao.execute(select(UsuarioModelo).where(UsuarioModelo.google_sub == sub))
            ).scalar_one_or_none()
            if usuario is not None:
                uid_str = str(usuario.id)
                await sessao.delete(usuario)
                await sessao.commit()
        if uid_str is not None:
            banco = mongo.obter_banco()
            for col in (
                COLECAO_DETALHES_TAREFAS,
                COLECAO_LAYOUTS_CONSTELACAO,
                COLECAO_EVENTOS_CICLO,
                COLECAO_PREFERENCIAS_CENARIO,
            ):
                await banco[col].delete_many({"usuario_id": uid_str})
    finally:
        await mongo.fechar()
        await fabrica.fechar()


async def test_fluxo_completo_clima_opt_in_cidades_cache_e_limpeza_privacidade(
    configuracoes_teste: Configuracoes,
) -> None:
    assert configuracoes_teste.postgres_teste_url is not None
    assert configuracoes_teste.mongo_url is not None
    aplicar_migracoes(configuracoes_teste.postgres_teste_url, "head")

    sub = f"clima-sub-{uuid4()}"
    config = configuracoes_teste.model_copy(
        update={
            "segredo_sessao": "segredo-integracao-fase12-32-bytes-seguros",
            "google_client_id": "client-fase12",
            "google_client_secret": "secret-fase12",
            "google_redirect_uri": "http://localhost:5173/api/autenticacao/google/callback",
        }
    )
    provedor_google = _ProvedorGoogleClimaTeste(
        {
            "cod_clima": IdentidadeGoogle(
                google_sub=sub,
                email="clima.teste@exemplo.com",
                email_verificado=True,
                nome_sugerido="Usuario Clima",
                foto_url=None,
            )
        }
    )
    provedor_clima = _ProvedorClimaIntegracao()

    try:
        app = criar_aplicacao(
            configuracoes=config,
            provedor_google=provedor_google,
            provedor_clima=provedor_clima,
        )
        with TestClient(app) as cliente:
            # 1. Sem sessao -> 401 NAO_AUTENTICADO
            for r_anon in (
                cliente.get("/api/clima/cidades?q=Brasilia"),
                cliente.get("/api/clima/atual"),
                cliente.put("/api/clima/consentimento", json={"habilitado": False}),
            ):
                assert r_anon.status_code == 401
                assert r_anon.json()["erro"]["codigo"] == "NAO_AUTENTICADO"

            # 2. Autenticado antes de concluir primeiro acesso -> 403 PRIMEIRO_ACESSO_PENDENTE
            csrf = _autenticar(cliente, "cod_clima")
            r_pendente = cliente.get("/api/clima/cidades?q=Brasilia")
            assert r_pendente.status_code == 403
            assert r_pendente.json()["erro"]["codigo"] == "PRIMEIRO_ACESSO_PENDENTE"

            # 3. Conclui primeiro acesso
            r_pa = cliente.post(
                "/api/conta/primeiro-acesso",
                headers={"X-CSRF-Token": csrf},
                json={
                    "nome_exibicao": "Pessoa Clima",
                    "avatar_tipo": "preset",
                    "avatar_id": "sol-nascente",
                    "criar_arvore_guia": False,
                },
            )
            assert r_pa.status_code == 200
            usuario_id = str(cliente.get("/api/autenticacao/sessao").json()["usuario"]["id"])

            # 4. Clima bloqueado por padrao -> 403 CLIMA_NAO_AUTORIZADO sem chamar provedor
            r_negado = cliente.get("/api/clima/atual")
            assert r_negado.status_code == 403
            assert r_negado.json()["erro"]["codigo"] == "CLIMA_NAO_AUTORIZADO"
            assert provedor_clima.chamadas_clima == 0

            # 5. Busca de cidades valida tamanho minimo e devolve sugestoes arredondadas
            r_curto = cliente.get("/api/clima/cidades?q=a")
            assert r_curto.status_code == 422
            assert r_curto.json()["erro"]["codigo"] == "VALIDACAO_INVALIDA"

            r_cidades = cliente.get("/api/clima/cidades?q=Brasilia")
            assert r_cidades.status_code == 200
            itens = r_cidades.json()["itens"]
            assert 1 <= len(itens) <= 8
            assert itens[0]["cidade"] == "Brasília"
            assert itens[0]["uf"] == "DF"
            assert itens[0]["latitude_aprox"] == -15.79
            assert itens[0]["longitude_aprox"] == -47.88

            # 6. PUT sem CSRF -> 403 CSRF_INVALIDO
            r_sem_csrf = cliente.put(
                "/api/clima/consentimento",
                json={"habilitado": False},
            )
            assert r_sem_csrf.status_code == 403
            assert r_sem_csrf.json()["erro"]["codigo"] == "CSRF_INVALIDO"

            # 7. Consentimento manual arredonda coordenadas no MongoDB e preserva campos
            r_consent = cliente.put(
                "/api/clima/consentimento",
                headers={"X-CSRF-Token": csrf},
                json={
                    "habilitado": True,
                    "modo_localizacao": "manual",
                    "cidade": "Brasília",
                    "uf": "DF",
                    "latitude_aprox": -15.793889,
                    "longitude_aprox": -47.882778,
                },
            )
            assert r_consent.status_code == 200
            dados_consent = r_consent.json()
            assert dados_consent["habilitado"] is True
            assert dados_consent["latitude_aprox"] == -15.79
            assert dados_consent["longitude_aprox"] == -47.88

            mongo_check = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
            try:
                doc = await mongo_check.obter_banco()[COLECAO_PREFERENCIAS_CENARIO].find_one(
                    {"usuario_id": usuario_id},
                    {"_id": 0},
                )
                assert doc is not None
                assert doc["clima"]["habilitado"] is True
                assert doc["clima"]["latitude_aprox"] == -15.79
                assert doc["clima"]["longitude_aprox"] == -47.88
                assert doc["tutorial"]["status"] == "pendente"
                assert doc["audio"]["habilitado"] is False
            finally:
                await mongo_check.fechar()

            # 8 e 9. Primeira consulta chama provedor; segunda usa cache em memoria
            r_atual_1 = cliente.get("/api/clima/atual")
            assert r_atual_1.status_code == 200
            d1 = r_atual_1.json()
            assert d1["habilitado"] is True
            assert d1["cidade"] == "Brasília"
            assert d1["uf"] == "DF"
            assert d1["temperatura_c"] == 24.5
            assert d1["codigo_wmo"] == 61
            assert d1["estado_climatico"] == "chuvoso"
            assert d1["descricao"] == "Chuva leve"
            assert d1["origem_cache"] is False
            assert d1["atualizado_em"].endswith("Z")
            assert provedor_clima.chamadas_clima == 1

            r_atual_2 = cliente.get("/api/clima/atual")
            assert r_atual_2.status_code == 200
            assert r_atual_2.json()["origem_cache"] is True
            assert provedor_clima.chamadas_clima == 1

            # 10. Modo navegador em coordenada sem cache e com falha externa -> 503
            r_nav = cliente.put(
                "/api/clima/consentimento",
                headers={"X-CSRF-Token": csrf},
                json={
                    "habilitado": True,
                    "modo_localizacao": "navegador",
                    "latitude_aprox": -23.55052,
                    "longitude_aprox": -46.63331,
                },
            )
            assert r_nav.status_code == 200
            r_503 = cliente.get("/api/clima/atual")
            assert r_503.status_code == 503
            assert r_503.json()["erro"]["codigo"] == "SERVICO_EXTERNO_INDISPONIVEL"

            # 11. Desativar limpa localizacao no MongoDB mesmo com payload sujo e volta para 403
            r_desativar = cliente.put(
                "/api/clima/consentimento",
                headers={"X-CSRF-Token": csrf},
                json={
                    "habilitado": False,
                    "modo_localizacao": "manual",
                    "cidade": "Brasília",
                    "uf": "DF",
                    "latitude_aprox": -15.79,
                    "longitude_aprox": -47.88,
                },
            )
            assert r_desativar.status_code == 200
            dados_off = r_desativar.json()
            assert dados_off["habilitado"] is False
            assert dados_off["estado_climatico"] == "limpo"
            assert dados_off["cidade"] is None
            assert dados_off["uf"] is None
            assert dados_off["modo_localizacao"] is None
            assert dados_off["latitude_aprox"] is None
            assert dados_off["longitude_aprox"] is None

            mongo_check2 = GerenciadorMongo(config.mongo_url, config.mongo_banco_teste)
            try:
                doc_off = await mongo_check2.obter_banco()[COLECAO_PREFERENCIAS_CENARIO].find_one(
                    {"usuario_id": usuario_id},
                    {"_id": 0},
                )
                assert doc_off is not None
                assert doc_off["clima"] == {
                    "habilitado": False,
                    "modo_localizacao": None,
                    "cidade": None,
                    "uf": None,
                    "latitude_aprox": None,
                    "longitude_aprox": None,
                }
            finally:
                await mongo_check2.fechar()

            chamadas_antes = provedor_clima.chamadas_clima
            r_bloqueado = cliente.get("/api/clima/atual")
            assert r_bloqueado.status_code == 403
            assert r_bloqueado.json()["erro"]["codigo"] == "CLIMA_NAO_AUTORIZADO"
            assert provedor_clima.chamadas_clima == chamadas_antes
    finally:
        await _limpar_usuario_clima(config, sub)
