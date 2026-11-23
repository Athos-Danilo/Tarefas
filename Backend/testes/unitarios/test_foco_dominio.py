from datetime import UTC, datetime, timedelta
from uuid import UUID, uuid4

import pytest
from pymongo.errors import PyMongoError

from contratos.foco import RepositorioSessoesFoco, SessaoFocoRegistro
from contratos.grupos import ContextoGrupoDaTarefa, RepositorioGrupos
from contratos.tarefas import EventoCicloRegistro, RepositorioEventosCiclo
from dominio.erros import ErroDeDominio
from dominio.foco import (
    DURACAO_FOCO_MAX_SEG,
    DURACAO_FOCO_MIN_SEG,
    LIMITE_HISTORICO_FOCO_MAX,
    calcular_duracao_real_seg,
    normalizar_limite_historico,
    validar_duracao_planejada,
)
from servicos.servico_foco import ServicoFoco


def test_validar_duracao_planejada_aceita_limites_e_rejeita_fora_da_faixa() -> None:
    assert validar_duracao_planejada(DURACAO_FOCO_MIN_SEG) == 60
    assert validar_duracao_planejada(1500) == 1500
    assert validar_duracao_planejada(DURACAO_FOCO_MAX_SEG) == 14400

    for ruim in (0, 59, -10, DURACAO_FOCO_MAX_SEG + 1):
        with pytest.raises(ErroDeDominio) as exc:
            validar_duracao_planejada(ruim)
        assert exc.value.status_http == 422
        assert exc.value.codigo == "DURACAO_FOCO_INVALIDA"


def test_normalizar_limite_historico_valida_limites() -> None:
    assert normalizar_limite_historico(1) == 1
    assert normalizar_limite_historico(20) == 20
    assert normalizar_limite_historico(LIMITE_HISTORICO_FOCO_MAX) == 100

    for ruim in (0, -1, LIMITE_HISTORICO_FOCO_MAX + 1):
        with pytest.raises(ErroDeDominio) as exc:
            normalizar_limite_historico(ruim)
        assert exc.value.status_http == 422
        assert exc.value.codigo == "LIMITE_HISTORICO_INVALIDO"


def test_calcular_duracao_real_seg_por_relogio_ou_informada() -> None:
    inicio = datetime(2026, 11, 23, 10, 0, tzinfo=UTC)
    fim = inicio + timedelta(minutes=18, seconds=12)

    assert (
        calcular_duracao_real_seg(
            iniciada_em=inicio,
            encerrada_em=fim,
            duracao_informada_seg=None,
        )
        == 1092
    )
    assert (
        calcular_duracao_real_seg(
            iniciada_em=inicio,
            encerrada_em=fim,
            duracao_informada_seg=640,
        )
        == 640
    )

    for ruim in (-1, DURACAO_FOCO_MAX_SEG + 1):
        with pytest.raises(ErroDeDominio) as exc:
            calcular_duracao_real_seg(
                iniciada_em=inicio,
                encerrada_em=fim,
                duracao_informada_seg=ruim,
            )
        assert exc.value.status_http == 422
        assert exc.value.codigo == "DURACAO_REAL_INVALIDA"


class _RepoGruposDuble:
    def __init__(self, contexto: ContextoGrupoDaTarefa | None) -> None:
        self._contexto = contexto

    async def obter_contexto_por_tarefa(
        self,
        usuario_solicitante_id: UUID,
        tarefa_id: UUID,
    ) -> ContextoGrupoDaTarefa | None:
        del usuario_solicitante_id, tarefa_id
        return self._contexto


class _RepoFocoMemoria:
    def __init__(self) -> None:
        self.sessoes: dict[UUID, SessaoFocoRegistro] = {}

    async def obter_ativa(self, usuario_id: UUID) -> SessaoFocoRegistro | None:
        for sessao in self.sessoes.values():
            if sessao.usuario_id == usuario_id and sessao.status == "em_andamento":
                return sessao
        return None

    async def obter_por_id(
        self,
        usuario_id: UUID,
        sessao_id: UUID,
    ) -> SessaoFocoRegistro | None:
        sessao = self.sessoes.get(sessao_id)
        if sessao is None or sessao.usuario_id != usuario_id:
            return None
        return sessao

    async def criar(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        duracao_planejada_seg: int,
        iniciada_em: datetime,
    ) -> SessaoFocoRegistro:
        if await self.obter_ativa(usuario_id) is not None:
            raise ErroDeDominio(
                codigo="SESSAO_FOCO_JA_ATIVA",
                mensagem="Ja existe uma sessao ativa.",
                status_http=409,
            )
        registro = SessaoFocoRegistro(
            id=uuid4(),
            usuario_id=usuario_id,
            tarefa_id=tarefa_id,
            tarefa_titulo="Estudar Web II",
            duracao_planejada_seg=duracao_planejada_seg,
            duracao_real_seg=None,
            iniciada_em=iniciada_em,
            encerrada_em=None,
            status="em_andamento",
        )
        self.sessoes[registro.id] = registro
        return registro

    async def encerrar(
        self,
        *,
        usuario_id: UUID,
        sessao_id: UUID,
        status: str,
        duracao_real_seg: int,
        encerrada_em: datetime,
    ) -> SessaoFocoRegistro | None:
        atual = await self.obter_por_id(usuario_id, sessao_id)
        if atual is None:
            return None
        encerrada = SessaoFocoRegistro(
            id=atual.id,
            usuario_id=atual.usuario_id,
            tarefa_id=atual.tarefa_id,
            tarefa_titulo=atual.tarefa_titulo,
            duracao_planejada_seg=atual.duracao_planejada_seg,
            duracao_real_seg=duracao_real_seg,
            iniciada_em=atual.iniciada_em,
            encerrada_em=encerrada_em,
            status=status,  # type: ignore[arg-type]
        )
        self.sessoes[sessao_id] = encerrada
        return encerrada

    async def listar_historico(
        self,
        usuario_id: UUID,
        limite: int,
    ) -> list[SessaoFocoRegistro]:
        itens = [s for s in self.sessoes.values() if s.usuario_id == usuario_id]
        itens.sort(key=lambda s: s.iniciada_em, reverse=True)
        return itens[:limite]


class _RepoEventosFalho:
    async def registrar(self, evento: EventoCicloRegistro) -> None:
        del evento
        raise PyMongoError("MongoDB temporariamente indisponivel")

    async def listar_por_raiz(
        self, tarefa_raiz_id: str, limite: int = 20
    ) -> list[dict[str, object]]:
        del tarefa_raiz_id, limite
        return []


async def test_servico_foco_impede_duas_ativas_rejeita_reencerramento_e_tolera_mongo_offline() -> (
    None
):
    usuario_id = uuid4()
    raiz_id = uuid4()
    contexto = ContextoGrupoDaTarefa(
        tarefa_raiz_id=raiz_id,
        titulo_raiz="Estudar Web II",
        dono_arvore_id=usuario_id,
        compartilhada=False,
        meu_papel=None,
        nos_arvore=(),
    )
    instante = datetime(2026, 11, 23, 11, 0, tzinfo=UTC)
    repo_foco: RepositorioSessoesFoco = _RepoFocoMemoria()
    repo_grupos: RepositorioGrupos = _RepoGruposDuble(contexto)  # type: ignore[assignment]
    repo_eventos: RepositorioEventosCiclo = _RepoEventosFalho()  # type: ignore[assignment]

    servico = ServicoFoco(
        repositorio_foco=repo_foco,
        repositorio_grupos=repo_grupos,
        repositorio_eventos=repo_eventos,
        relogio=lambda: instante,
    )

    sessao = await servico.iniciar_sessao(
        usuario_id=usuario_id,
        tarefa_id=raiz_id,
        duracao_planejada_seg=1500,
    )
    assert sessao.status == "em_andamento"

    with pytest.raises(ErroDeDominio) as exc_dup:
        await servico.iniciar_sessao(
            usuario_id=usuario_id,
            tarefa_id=raiz_id,
            duracao_planejada_seg=1500,
        )
    assert exc_dup.value.status_http == 409
    assert exc_dup.value.codigo == "SESSAO_FOCO_JA_ATIVA"

    instante = instante + timedelta(minutes=25)
    concluida = await servico.concluir_sessao(
        usuario_id=usuario_id,
        sessao_id=sessao.id,
        duracao_informada_seg=None,
    )
    assert concluida.status == "concluida"
    assert concluida.duracao_real_seg == 1500

    with pytest.raises(ErroDeDominio) as exc_enc:
        await servico.interromper_sessao(
            usuario_id=usuario_id,
            sessao_id=sessao.id,
            duracao_informada_seg=None,
        )
    assert exc_enc.value.status_http == 409
    assert exc_enc.value.codigo == "SESSAO_FOCO_JA_ENCERRADA"

    servico_sem_acesso = ServicoFoco(
        repositorio_foco=repo_foco,
        repositorio_grupos=_RepoGruposDuble(None),  # type: ignore[arg-type]
        repositorio_eventos=None,
    )
    with pytest.raises(ErroDeDominio) as exc_nao_encontrada:
        await servico_sem_acesso.iniciar_sessao(
            usuario_id=usuario_id,
            tarefa_id=uuid4(),
            duracao_planejada_seg=900,
        )
    assert exc_nao_encontrada.value.status_http == 404
    assert exc_nao_encontrada.value.codigo == "TAREFA_NAO_ENCONTRADA"
