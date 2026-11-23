from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime
from typing import Any, Literal, Protocol, TypedDict
from uuid import UUID

from dominio.modelos_tarefa import (
    ConfiguracaoRecorrencia,
    EspecificacaoProximaOcorrencia,
    NoTarefa,
    PrioridadeTarefa,
    RegistroDesfazerCascata,
    StatusTarefa,
    TurnoTarefa,
)


@dataclass(frozen=True)
class EtiquetaRegistro:
    """Registro persistido de etiqueta pertencente a um usuario."""

    id: UUID
    usuario_id: UUID
    nome: str
    cor: str
    criado_em: datetime | None = None


@dataclass(frozen=True)
class LembreteResumo:
    """Resumo de lembrete vinculado a uma tarefa para leitura consolidada."""

    id: UUID
    disparar_em: datetime
    antecedencia_min: int
    status: str


@dataclass(frozen=True)
class ResponsavelTarefaResumo:
    """Resumo de usuario ou vaga responsavel por uma subtarefa."""

    tipo: Literal["usuario", "vaga"]
    usuario_id: UUID | None
    vaga_id: UUID | None
    nome_exibicao: str
    avatar_url: str | None


@dataclass(frozen=True)
class TarefaRegistro:
    """Visao hidratada de uma tarefa persistida com etiquetas e contagem de lembretes."""

    id: UUID
    usuario_id: UUID
    tarefa_pai_id: UUID | None
    titulo: str
    prioridade: PrioridadeTarefa
    status: StatusTarefa
    turno: TurnoTarefa
    prazo: datetime | None
    profundidade: int
    ordem_manual: int
    recorrencia: ConfiguracaoRecorrencia
    serie_recorrencia_id: UUID | None
    vezes_reaberta: int
    concluida_em: datetime | None
    criado_em: datetime
    atualizado_em: datetime
    etiquetas: tuple[EtiquetaRegistro, ...] = ()
    lembretes_pendentes: int = 0
    compartilhada: bool = False
    responsavel_usuario_id: UUID | None = None
    vaga_responsavel_id: UUID | None = None
    responsavel: ResponsavelTarefaResumo | None = None

    def para_no_tarefa(self) -> NoTarefa:
        """Converte o registro persistido para o no puro do motor de dominio."""
        return NoTarefa(
            id=self.id,
            titulo=self.titulo,
            tarefa_pai_id=self.tarefa_pai_id,
            prioridade=self.prioridade,
            status=self.status,
            turno=self.turno,
            profundidade=self.profundidade,
            ordem_manual=self.ordem_manual,
            prazo=self.prazo,
            recorrencia=self.recorrencia,
            serie_recorrencia_id=self.serie_recorrencia_id,
            vezes_reaberta=self.vezes_reaberta,
            concluida_em=self.concluida_em,
        )


class DetalhesTarefaDocumento(TypedDict):
    """Documento MongoDB na colecao detalhes_tarefas."""

    tarefa_id: str
    usuario_id: str
    metadados_visuais: dict[str, Any]
    notas_em_blocos: list[dict[str, Any]]
    atualizado_em: str | None


@dataclass(frozen=True)
class EventoCicloRegistro:
    """Evento rico gravado na colecao eventos_ciclo no MongoDB."""

    usuario_id: str
    autor_usuario_id: str
    tarefa_id: str | None
    tarefa_raiz_id: str | None
    tipo_evento: str
    momento_do_dia: str
    resumo: str
    detalhes: dict[str, Any]
    criado_em: datetime


class RepositorioEtiquetas(Protocol):
    """Porta de persistencia para etiquetas nomeadas do usuario."""

    async def listar(self, usuario_id: UUID) -> list[EtiquetaRegistro]: ...

    async def buscar_por_ids(
        self,
        usuario_id: UUID,
        etiqueta_ids: tuple[UUID, ...],
    ) -> list[EtiquetaRegistro]: ...

    async def criar(
        self,
        usuario_id: UUID,
        nome: str,
        nome_normalizado: str,
        cor: str,
    ) -> EtiquetaRegistro: ...

    async def atualizar(
        self,
        usuario_id: UUID,
        etiqueta_id: UUID,
        nome: str,
        nome_normalizado: str,
        cor: str,
    ) -> EtiquetaRegistro: ...

    async def excluir(self, usuario_id: UUID, etiqueta_id: UUID) -> bool: ...


class RepositorioTarefas(Protocol):
    """Porta transacional PostgreSQL para arvore de tarefas e recorrencia."""

    async def listar_todas_do_usuario(self, usuario_id: UUID) -> list[TarefaRegistro]: ...

    async def obter_por_id(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> TarefaRegistro | None: ...

    async def obter_subarvore_cte(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> list[TarefaRegistro]: ...

    async def listar_lembretes_da_tarefa(
        self,
        usuario_id: UUID,
        tarefa_id: UUID,
    ) -> list[LembreteResumo]: ...

    async def criar_tarefa_atomica(
        self,
        *,
        usuario_id: UUID,
        tarefa_pai_id: UUID | None,
        titulo: str,
        prioridade: PrioridadeTarefa,
        status: StatusTarefa,
        turno: TurnoTarefa,
        prazo: datetime | None,
        profundidade: int,
        recorrencia: ConfiguracaoRecorrencia,
        serie_recorrencia_id: UUID | None,
        etiqueta_ids: tuple[UUID, ...],
        ancestrais_a_reabrir: tuple[UUID, ...],
        compartilhada: bool = False,
        responsavel_usuario_id: UUID | None = None,
    ) -> TarefaRegistro: ...

    async def atualizar_tarefa_atomica(
        self,
        *,
        usuario_id: UUID,
        tarefa_id: UUID,
        titulo: str,
        prioridade: PrioridadeTarefa,
        turno: TurnoTarefa,
        prazo: datetime | None,
        recorrencia: ConfiguracaoRecorrencia,
        serie_recorrencia_id: UUID | None,
        etiqueta_ids: tuple[UUID, ...] | None,
        status: StatusTarefa | None = None,
    ) -> TarefaRegistro: ...

    async def aplicar_mudancas_arvore_atomica(
        self,
        *,
        usuario_id: UUID,
        nos_modificados: Sequence[NoTarefa],
        ids_concluidos_cancelar_lembretes: tuple[UUID, ...] = (),
        nova_ocorrencia: EspecificacaoProximaOcorrencia | None = None,
        etiquetas_ocorrencia_ids: tuple[UUID, ...] = (),
    ) -> TarefaRegistro | None: ...

    async def reordenar_irmas_atomica(
        self,
        *,
        usuario_id: UUID,
        tarefa_pai_id: UUID | None,
        itens_ordenacao: Sequence[tuple[UUID, int]],
    ) -> int: ...

    async def excluir_tarefas_atomica(
        self,
        *,
        usuario_id: UUID,
        nos_atualizados: Sequence[NoTarefa],
        ids_remover: tuple[UUID, ...],
    ) -> None: ...


class RepositorioDetalhesTarefas(Protocol):
    """Porta MongoDB para metadados visuais e notas em blocos."""

    async def obter_ou_padrao(
        self,
        usuario_id: str,
        tarefa_id: str,
    ) -> DetalhesTarefaDocumento: ...

    async def obter_varios(
        self,
        usuario_id: str,
        tarefa_ids: list[str],
    ) -> dict[str, DetalhesTarefaDocumento]: ...

    async def salvar(self, documento: DetalhesTarefaDocumento) -> None: ...

    async def transferir_dono_por_tarefas(
        self,
        dono_anterior_id: str,
        novo_dono_id: str,
        tarefa_ids: list[str],
    ) -> None: ...

    async def remover_por_tarefas(self, usuario_id: str, tarefa_ids: list[str]) -> None: ...

    async def remover_layouts_raizes(self, usuario_id: str, raiz_ids: list[str]) -> None: ...


class RepositorioEventosCiclo(Protocol):
    """Porta MongoDB para registro e leitura do diario eventos_ciclo."""

    async def registrar(self, evento: EventoCicloRegistro) -> None: ...

    async def listar_por_raiz(
        self,
        tarefa_raiz_id: str,
        limite: int = 20,
    ) -> list[dict[str, Any]]: ...

    async def listar_diario_paginado(
        self,
        *,
        usuario_id: str,
        raizes_compartilhadas: Sequence[str] = (),
        limite: int = 20,
        cursor: str | None = None,
        tipo: str | None = None,
        busca: str | None = None,
    ) -> tuple[list[dict[str, Any]], str | None]: ...

    async def listar_por_periodo(
        self,
        *,
        usuario_id: str,
        raizes_compartilhadas: Sequence[str] = (),
        inicio: datetime | None = None,
        fim: datetime | None = None,
        limite: int = 5000,
    ) -> list[dict[str, Any]]: ...


class ArmazenamentoDesfazerCascata(Protocol):
    """Porta temporaria para tokens de desfazer conclusao em cascata."""

    def salvar(self, usuario_id: UUID, registro: RegistroDesfazerCascata) -> str: ...

    def obter(self, usuario_id: UUID, token: str) -> RegistroDesfazerCascata | None: ...

    def marcar_consumido(self, usuario_id: UUID, token: str) -> None: ...
