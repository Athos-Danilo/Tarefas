from datetime import UTC, datetime
from typing import Any
from uuid import UUID, uuid4

import pytest
from pymongo.errors import PyMongoError

from contratos.tarefas import (
    DetalhesTarefaDocumento,
    EtiquetaRegistro,
    EventoCicloRegistro,
    LembreteResumo,
    TarefaRegistro,
)
from dominio.erros import ErroDeDominio
from dominio.modelos_tarefa import ConfiguracaoRecorrencia, RegistroDesfazerCascata
from dominio.notas_e_etiquetas import (
    MAX_BLOCOS_POR_TAREFA,
    MAX_ETIQUETAS_POR_TAREFA,
    normalizar_nome_etiqueta,
    renderizar_arvore_markdown,
    validar_cor_hex,
    validar_detalhes_tarefa,
    validar_etiquetas_da_tarefa,
)
from servicos.servico_tarefas import ServicoTarefas


def test_etiquetas_validacao_cor_normalizacao_e_limite_por_tarefa() -> None:
    assert normalizar_nome_etiqueta("  Web   II  ") == ("Web II", "web ii")
    assert validar_cor_hex("  #1d5c87 ") == "#1D5C87"

    with pytest.raises(ErroDeDominio) as falha_nome:
        normalizar_nome_etiqueta("   ")
    assert falha_nome.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_nome.value.status_http == 422

    with pytest.raises(ErroDeDominio) as falha_cor:
        validar_cor_hex("azul")
    assert falha_cor.value.codigo == "VALIDACAO_INVALIDA"
    assert falha_cor.value.status_http == 422

    ids = [uuid4() for _ in range(MAX_ETIQUETAS_POR_TAREFA)]
    dedup = validar_etiquetas_da_tarefa([ids[0], ids[0], ids[1]])
    assert dedup == (ids[0], ids[1])

    excesso = [*ids, uuid4()]
    with pytest.raises(ErroDeDominio) as falha_limite:
        validar_etiquetas_da_tarefa(excesso)
    assert falha_limite.value.codigo == "LIMITE_ETIQUETAS_EXCEDIDO"
    assert falha_limite.value.status_http == 422


def test_detalhes_tarefa_seis_blocos_limites_e_url_segura() -> None:
    blocos_validos: list[dict[str, Any]] = [
        {"id": "b1", "tipo": "subtitulo", "nivel": 2, "texto": "Guia de API"},
        {"id": "b2", "tipo": "paragrafo", "texto": "Usar **FastAPI** com *TDD*."},
        {"id": "b3", "tipo": "lista", "ordenada": False, "itens": ["PostgreSQL", "MongoDB"]},
        {
            "id": "b4",
            "tipo": "checklist",
            "itens": [{"texto": "Escrever testes", "marcado": True}],
        },
        {"id": "b5", "tipo": "citacao", "texto": "Persistir com clareza.", "autor": "Lume"},
        {
            "id": "b6",
            "tipo": "codigo_ou_link",
            "subtipo": "link",
            "rotulo": "Docs",
            "conteudo": "https://fastapi.tiangolo.com/",
        },
    ]
    validado = validar_detalhes_tarefa(
        metadados_visuais={"forma_botanica": "girassol", "cor_estrela": "#FFD166"},
        notas_em_blocos=blocos_validos,
    )
    assert len(validado["notas_em_blocos"]) == 6
    assert validado["metadados_visuais"]["forma_botanica"] == "girassol"

    # Link javascript: deve falhar com URL_NAO_SEGURA
    with pytest.raises(ErroDeDominio) as falha_url:
        validar_detalhes_tarefa(
            metadados_visuais={},
            notas_em_blocos=[
                {
                    "id": "bx",
                    "tipo": "codigo_ou_link",
                    "subtipo": "link",
                    "rotulo": "XSS",
                    "conteudo": "javascript:alert(1)",
                }
            ],
        )
    assert falha_url.value.codigo == "URL_NAO_SEGURA"
    assert falha_url.value.status_http == 422

    # Limite de blocos (> 50)
    muitos_blocos = [
        {"id": f"b{i}", "tipo": "paragrafo", "texto": "ok"}
        for i in range(MAX_BLOCOS_POR_TAREFA + 1)
    ]
    with pytest.raises(ErroDeDominio) as falha_blocos:
        validar_detalhes_tarefa(metadados_visuais={}, notas_em_blocos=muitos_blocos)
    assert falha_blocos.value.codigo == "LIMITE_BLOCOS_EXCEDIDO"
    assert falha_blocos.value.status_http == 422

    # Limite de caracteres (> 15.000)
    with pytest.raises(ErroDeDominio) as falha_chars:
        validar_detalhes_tarefa(
            metadados_visuais={},
            notas_em_blocos=[{"id": "b1", "tipo": "paragrafo", "texto": "a" * 15001}],
        )
    assert falha_chars.value.codigo == "LIMITE_BLOCOS_EXCEDIDO"
    assert falha_chars.value.status_http == 422


def test_renderizar_arvore_markdown_inclui_hierarquia_e_blocos() -> None:
    uid = uuid4()
    raiz_id = uuid4()
    filha_id = uuid4()
    agora = datetime(2026, 11, 22, 10, 0, tzinfo=UTC)
    registros = [
        TarefaRegistro(
            id=raiz_id,
            usuario_id=uid,
            tarefa_pai_id=None,
            titulo="Projeto Web II",
            prioridade="alta",
            status="em_andamento",
            turno="tarde",
            prazo=None,
            profundidade=1,
            ordem_manual=1,
            recorrencia=ConfiguracaoRecorrencia(),
            serie_recorrencia_id=None,
            vezes_reaberta=0,
            concluida_em=None,
            criado_em=agora,
            atualizado_em=agora,
            etiquetas=(EtiquetaRegistro(id=uuid4(), usuario_id=uid, nome="Web", cor="#1D5C87"),),
        ),
        TarefaRegistro(
            id=filha_id,
            usuario_id=uid,
            tarefa_pai_id=raiz_id,
            titulo="Notas de arquitetura",
            prioridade="media",
            status="concluida",
            turno="manha",
            prazo=None,
            profundidade=2,
            ordem_manual=1,
            recorrencia=ConfiguracaoRecorrencia(),
            serie_recorrencia_id=None,
            vezes_reaberta=0,
            concluida_em=agora,
            criado_em=agora,
            atualizado_em=agora,
        ),
    ]
    detalhes = {
        filha_id: DetalhesTarefaDocumento(
            tarefa_id=str(filha_id),
            usuario_id=str(uid),
            metadados_visuais={},
            notas_em_blocos=[
                {"id": "1", "tipo": "paragrafo", "texto": "Validado no MongoDB."},
                {
                    "id": "2",
                    "tipo": "checklist",
                    "itens": [{"texto": "Integrar rotas", "marcado": True}],
                },
            ],
            atualizado_em="2026-11-22T10:00:00Z",
        )
    }

    markdown = renderizar_arvore_markdown(registros, detalhes)
    assert "# Tarefas exportadas - Lume" in markdown
    assert "Projeto Web II" in markdown
    assert "Notas de arquitetura" in markdown
    assert "Validado no MongoDB." in markdown
    assert "- [x] Integrar rotas" in markdown


class _RepoTarefasStub:
    def __init__(self, tarefa: TarefaRegistro) -> None:
        self.tarefa = tarefa

    async def listar_todas_do_usuario(self, usuario_id: UUID) -> list[TarefaRegistro]:
        return [self.tarefa] if usuario_id == self.tarefa.usuario_id else []

    async def obter_por_id(self, usuario_id: UUID, tarefa_id: UUID) -> TarefaRegistro | None:
        if usuario_id == self.tarefa.usuario_id and tarefa_id == self.tarefa.id:
            return self.tarefa
        return None

    async def obter_subarvore_cte(self, usuario_id: UUID, tarefa_id: UUID) -> list[TarefaRegistro]:
        if usuario_id == self.tarefa.usuario_id and tarefa_id == self.tarefa.id:
            return [self.tarefa]
        return []

    async def listar_lembretes_da_tarefa(
        self, usuario_id: UUID, tarefa_id: UUID
    ) -> list[LembreteResumo]:
        return []

    async def criar_tarefa_atomica(self, **kwargs: Any) -> TarefaRegistro:
        return self.tarefa

    async def atualizar_tarefa_atomica(self, **kwargs: Any) -> TarefaRegistro:
        return self.tarefa

    async def aplicar_mudancas_arvore_atomica(self, **kwargs: Any) -> TarefaRegistro | None:
        return None

    async def reordenar_irmas_atomica(self, **kwargs: Any) -> int:
        return 0

    async def excluir_tarefas_atomica(self, **kwargs: Any) -> None:
        return None


class _RepoEtiquetasStub:
    async def listar(self, usuario_id: UUID) -> list[EtiquetaRegistro]:
        return []

    async def buscar_por_ids(
        self, usuario_id: UUID, etiqueta_ids: tuple[UUID, ...]
    ) -> list[EtiquetaRegistro]:
        return []

    async def criar(
        self, usuario_id: UUID, nome: str, nome_normalizado: str, cor: str
    ) -> EtiquetaRegistro:
        raise NotImplementedError

    async def atualizar(
        self, usuario_id: UUID, etiqueta_id: UUID, nome: str, nome_normalizado: str, cor: str
    ) -> EtiquetaRegistro:
        raise NotImplementedError

    async def excluir(self, usuario_id: UUID, etiqueta_id: UUID) -> bool:
        return False


class _RepoDetalhesFalhoStub:
    async def obter_ou_padrao(self, usuario_id: str, tarefa_id: str) -> DetalhesTarefaDocumento:
        raise PyMongoError("falha simulada na leitura do Mongo")

    async def obter_varios(
        self, usuario_id: str, tarefa_ids: list[str]
    ) -> dict[str, DetalhesTarefaDocumento]:
        raise PyMongoError("falha simulada em lote")

    async def salvar(self, documento: DetalhesTarefaDocumento) -> None:
        raise OSError("timeout simulado na gravacao do Mongo")

    async def remover_por_tarefas(self, usuario_id: str, tarefa_ids: list[str]) -> None:
        raise PyMongoError("falha simulada na limpeza")

    async def remover_layouts_raizes(self, usuario_id: str, raiz_ids: list[str]) -> None:
        raise PyMongoError("falha simulada na limpeza")


class _RepoEventosFalhoStub:
    async def registrar(self, evento: EventoCicloRegistro) -> None:
        raise PyMongoError("falha simulada de evento")


class _ArmazenamentoDesfazerStub:
    def salvar(self, usuario_id: UUID, registro: RegistroDesfazerCascata) -> str:
        return "undo_stub"

    def obter(self, usuario_id: UUID, token: str) -> RegistroDesfazerCascata | None:
        return None

    def marcar_consumido(self, usuario_id: UUID, token: str) -> None:
        return None


async def test_consistencia_eventual_e_fallback_seguro_mongo() -> None:
    uid = uuid4()
    tid = uuid4()
    agora = datetime(2026, 11, 22, 10, 0, tzinfo=UTC)
    tarefa = TarefaRegistro(
        id=tid,
        usuario_id=uid,
        tarefa_pai_id=None,
        titulo="Tarefa resiliente",
        prioridade="media",
        status="pendente",
        turno="livre",
        prazo=None,
        profundidade=1,
        ordem_manual=1,
        recorrencia=ConfiguracaoRecorrencia(),
        serie_recorrencia_id=None,
        vezes_reaberta=0,
        concluida_em=None,
        criado_em=agora,
        atualizado_em=agora,
    )
    servico = ServicoTarefas(
        repositorio_tarefas=_RepoTarefasStub(tarefa),
        repositorio_etiquetas=_RepoEtiquetasStub(),
        repositorio_detalhes=_RepoDetalhesFalhoStub(),
        repositorio_eventos=_RepoEventosFalhoStub(),
        armazenamento_desfazer=_ArmazenamentoDesfazerStub(),
    )

    # Leitura degrada com fallback padrao sem quebrar tarefa estrutural
    detalhes = await servico.obter_detalhes(uid, tid)
    assert detalhes["notas_em_blocos"] == []
    arvore_det = await servico.obter_tarefa(uid, tid)
    assert arvore_det.detalhes["notas_em_blocos"] == []

    # Conclusao com falha no repositorio de eventos nao derruba a operacao PostgreSQL
    res_conclusao = await servico.concluir_tarefa(uid, tid, confirmar_cascata=False)
    assert tid in res_conclusao.nos_concluidos

    # Escrita explicita de notas propaga 503 quando Mongo esta indisponivel
    with pytest.raises(ErroDeDominio) as falha_mongo:
        await servico.salvar_detalhes(
            uid,
            tid,
            metadados_visuais={},
            notas_em_blocos=[{"id": "1", "tipo": "paragrafo", "texto": "Teste"}],
        )
    assert falha_mongo.value.codigo == "SERVICO_EXTERNO_INDISPONIVEL"
    assert falha_mongo.value.status_http == 503
