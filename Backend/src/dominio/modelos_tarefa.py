from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal
from uuid import UUID

from dominio.erros import ErroDeDominio

PrioridadeTarefa = Literal["baixa", "media", "alta", "urgente"]
StatusTarefa = Literal["pendente", "em_andamento", "concluida"]
TurnoTarefa = Literal["manha", "tarde", "noite", "livre"]
TipoRecorrencia = Literal["nenhuma", "diaria", "semanal", "mensal"]
EstrategiaExclusao = Literal["cascata", "promover_filhas"]

TITULO_MIN_CHARS = 1
TITULO_MAX_CHARS = 140
PROFUNDIDADE_MINIMA = 1
PROFUNDIDADE_MAXIMA = 5
MAX_FILHAS_DIRETAS = 50
MAX_TAREFAS_ATIVAS_USUARIO = 500
MAX_TAREFAS_TOTAIS_USUARIO = 2000
TTL_DESFAZER_CASCATA_SEGUNDOS = 15
DIA_SEMANA_MIN = 0
DIA_SEMANA_MAX = 6
INTERVALO_RECORRENCIA_MAX = 365


@dataclass(frozen=True)
class ConfiguracaoRecorrencia:
    """Regra de repeticao periodica associada a uma tarefa."""

    tipo: TipoRecorrencia = "nenhuma"
    dias_semana: tuple[int, ...] = ()
    dia_mes: int | None = None
    intervalo: int = 1


@dataclass(frozen=True)
class NoTarefa:
    """Representacao pura de um no da arvore de tarefas sem acoplamento a banco."""

    id: UUID
    titulo: str
    tarefa_pai_id: UUID | None = None
    prioridade: PrioridadeTarefa = "media"
    status: StatusTarefa = "pendente"
    turno: TurnoTarefa = "livre"
    profundidade: int = 1
    ordem_manual: int = 1
    prazo: datetime | None = None
    recorrencia: ConfiguracaoRecorrencia = field(default_factory=ConfiguracaoRecorrencia)
    serie_recorrencia_id: UUID | None = None
    vezes_reaberta: int = 0
    concluida_em: datetime | None = None


@dataclass(frozen=True)
class MetricasNoTarefa:
    """Metricas calculadas por tarefas-folha e alerta de descendente urgente."""

    tarefa_id: UUID
    total_folhas: int
    folhas_concluidas: int
    percentual_conclusao: int
    tem_filha_urgente_aberta: bool


@dataclass(frozen=True)
class EstadoAnteriorNo:
    """Fotografia exata de status e timestamp antes de conclusao em lote."""

    tarefa_id: UUID
    status_anterior: StatusTarefa
    concluida_em_anterior: datetime | None


@dataclass(frozen=True)
class RegistroDesfazerCascata:
    """Registro temporario com janela de validade para desfazer conclusao em cascata."""

    tarefa_raiz_acao_id: UUID
    criado_em: datetime
    expira_em: datetime
    estados_anteriores: tuple[EstadoAnteriorNo, ...]
    consumido: bool = False


@dataclass(frozen=True)
class ResultadoConclusao:
    """Resultado completo da conclusao com propagacao e registro de desfazer."""

    nos_atualizados: tuple[NoTarefa, ...]
    nos_concluidos: tuple[UUID, ...]
    ancestrais_atualizados: tuple[UUID, ...]
    registro_desfazer: RegistroDesfazerCascata | None


@dataclass(frozen=True)
class ResultadoDesfazer:
    """Resultado da restauracao de uma conclusao em cascata dentro do prazo."""

    nos_atualizados: tuple[NoTarefa, ...]
    nos_restaurados: tuple[UUID, ...]
    registro_atualizado: RegistroDesfazerCascata


@dataclass(frozen=True)
class ResultadoReabertura:
    """Resultado da reabertura ascendente com incremento de retrabalho."""

    nos_atualizados: tuple[NoTarefa, ...]
    nos_reabertos: tuple[UUID, ...]
    ancestrais_reabertos: tuple[UUID, ...]


@dataclass(frozen=True)
class ResultadoMovimentacao:
    """Resultado da movimentacao ou promocao de subarvore com reconciliacao."""

    nos_atualizados: tuple[NoTarefa, ...]
    ancestrais_concluidos: tuple[UUID, ...]
    ancestrais_reabertos: tuple[UUID, ...]


@dataclass(frozen=True)
class ResultadoExclusao:
    """Plano puro de exclusao em cascata ou promocao de filhas diretas."""

    nos_restantes: tuple[NoTarefa, ...]
    ids_removidos: tuple[UUID, ...]
    filhas_promovidas: tuple[UUID, ...]
    ancestrais_reconciliados: tuple[UUID, ...]
    estrategia_aplicada: EstrategiaExclusao


@dataclass(frozen=True)
class EspecificacaoProximaOcorrencia:
    """Dados prontos para gerar a proxima ocorrencia de uma tarefa recorrente."""

    titulo: str
    tarefa_pai_id: UUID | None
    prioridade: PrioridadeTarefa
    turno: TurnoTarefa
    profundidade: int
    proximo_prazo: datetime
    recorrencia: ConfiguracaoRecorrencia
    serie_recorrencia_id: UUID | None


def validar_titulo_tarefa(titulo: str) -> str:
    """Remove espacos nas extremidades e valida comprimento entre 1 e 140 caracteres."""
    limpo = titulo.strip()
    if len(limpo) < TITULO_MIN_CHARS or len(limpo) > TITULO_MAX_CHARS:
        raise ErroDeDominio(
            codigo="VALIDACAO_INVALIDA",
            mensagem="O titulo da tarefa deve conter entre 1 e 140 caracteres.",
            status_http=422,
            detalhes={"minimo": TITULO_MIN_CHARS, "maximo": TITULO_MAX_CHARS},
        )
    return limpo


def validar_limites_criacao_usuario(
    *,
    total_ativas_usuario: int,
    total_geral_usuario: int,
    status_inicial: StatusTarefa = "pendente",
) -> None:
    """Garante os tetos de 500 tarefas ativas e 2.000 tarefas totais por conta."""
    if total_geral_usuario >= MAX_TAREFAS_TOTAIS_USUARIO:
        raise ErroDeDominio(
            codigo="LIMITE_TAREFAS_EXCEDIDO",
            mensagem="Limite maximo de 2.000 tarefas totais na conta foi atingido.",
            status_http=422,
            detalhes={"limite_total": MAX_TAREFAS_TOTAIS_USUARIO},
        )
    if status_inicial != "concluida" and total_ativas_usuario >= MAX_TAREFAS_ATIVAS_USUARIO:
        raise ErroDeDominio(
            codigo="LIMITE_TAREFAS_EXCEDIDO",
            mensagem="Limite maximo de 500 tarefas ativas simultaneas foi atingido.",
            status_http=422,
            detalhes={"limite_ativas": MAX_TAREFAS_ATIVAS_USUARIO},
        )


def validar_limite_filhas_diretas(total_filhas_atuais: int, adicionais: int = 1) -> None:
    """Garante no maximo 50 filhas diretas sob a mesma tarefa-mae."""
    resultantes = total_filhas_atuais + adicionais
    if resultantes > MAX_FILHAS_DIRETAS:
        raise ErroDeDominio(
            codigo="LIMITE_FILHAS_EXCEDIDO",
            mensagem="Cada tarefa-mae aceita no maximo 50 subtarefas diretas.",
            status_http=422,
            detalhes={
                "limite_filhas_diretas": MAX_FILHAS_DIRETAS,
                "filhas_resultantes": resultantes,
            },
        )


def normalizar_titulo_para_repeticao(titulo: str) -> str:
    """Normaliza espacos e caixa para agrupar tarefas repetidas no dashboard."""
    return " ".join(titulo.strip().lower().split())
