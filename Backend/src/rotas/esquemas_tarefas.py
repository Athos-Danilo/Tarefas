from datetime import datetime
from typing import Any, Literal
from uuid import UUID

from pydantic import BaseModel, Field

from contratos.tarefas import EtiquetaRegistro, TarefaRegistro
from dominio.modelos_tarefa import (
    ConfiguracaoRecorrencia,
    EstrategiaExclusao,
    PrioridadeTarefa,
    StatusTarefa,
    TipoRecorrencia,
    TurnoTarefa,
)
from dominio.notas_e_etiquetas import MAX_ETIQUETAS_USUARIO
from rotas.esquemas_autenticacao import formatar_instante_iso_utc
from servicos.servico_tarefas import NoTarefaExpandido


class EtiquetaResumoResposta(BaseModel):
    """Representacao resumida de etiqueta associada a uma tarefa."""

    id: UUID
    nome: str
    cor: str


class EtiquetaResposta(BaseModel):
    """Resposta completa de etiqueta no CRUD /api/etiquetas."""

    id: UUID
    nome: str
    cor: str
    criado_em: str | None = None


class RespostaListaEtiquetas(BaseModel):
    """Lista de etiquetas do usuario e seu teto maximo."""

    itens: list[EtiquetaResposta]
    limite_maximo: int = MAX_ETIQUETAS_USUARIO


class RequisicaoCriarEtiqueta(BaseModel):
    """Payload de POST /api/etiquetas."""

    nome: str
    cor: str


class RequisicaoAtualizarEtiqueta(BaseModel):
    """Payload parcial de PATCH /api/etiquetas/{etiqueta_id}."""

    nome: str | None = None
    cor: str | None = None


class RecorrenciaEsquema(BaseModel):
    """Esquema de recorrencia periodica em tarefas."""

    tipo: TipoRecorrencia = "nenhuma"
    dias_semana: list[int] = Field(default_factory=list)
    dia_mes: int | None = None
    intervalo: int = 1

    def para_dominio(self) -> ConfiguracaoRecorrencia:
        return ConfiguracaoRecorrencia(
            tipo=self.tipo,
            dias_semana=tuple(self.dias_semana),
            dia_mes=self.dia_mes,
            intervalo=self.intervalo,
        )


class TarefaResposta(BaseModel):
    """Representacao canonica de tarefa em arvore ou plano."""

    id: UUID
    tarefa_pai_id: UUID | None
    titulo: str
    prioridade: PrioridadeTarefa
    status: StatusTarefa
    turno: TurnoTarefa
    prazo: str | None
    profundidade: int
    ordem_manual: int
    percentual_conclusao: int
    total_folhas: int
    folhas_concluidas: int
    tem_filha_urgente_aberta: bool
    etiquetas: list[EtiquetaResumoResposta]
    recorrencia: RecorrenciaEsquema
    serie_recorrencia_id: UUID | None
    vezes_reaberta: int
    compartilhada: bool
    responsavel: dict[str, Any] | None = None
    lembretes_pendentes: int
    criado_em: str
    atualizado_em: str
    subtarefas: list["TarefaResposta"] = Field(default_factory=list)


class TotaisTarefasResposta(BaseModel):
    """Contadores globais da conta no workspace."""

    ativas: int
    concluidas: int
    limite_ativas: int


class RespostaListarTarefas(BaseModel):
    """Resposta de GET /api/tarefas."""

    itens: list[TarefaResposta]
    totais: TotaisTarefasResposta


class AncestralResumoResposta(BaseModel):
    """Resumo atualizado de ancestral apos criacao de subtarefa."""

    id: UUID
    status: StatusTarefa
    percentual_conclusao: int
    total_folhas: int
    folhas_concluidas: int
    tem_filha_urgente_aberta: bool


class RespostaCriarTarefa(BaseModel):
    """Resposta 201 Created de POST /api/tarefas."""

    tarefa: TarefaResposta
    ancestrais_atualizados: list[AncestralResumoResposta]


class RequisicaoCriarTarefa(BaseModel):
    """Payload de POST /api/tarefas."""

    titulo: str
    tarefa_pai_id: UUID | None = None
    prioridade: PrioridadeTarefa = "media"
    status: StatusTarefa = "pendente"
    turno: TurnoTarefa = "livre"
    prazo: datetime | None = None
    recorrencia: RecorrenciaEsquema | None = None
    etiqueta_ids: list[UUID] = Field(default_factory=list)


class RequisicaoAtualizarTarefa(BaseModel):
    """Payload parcial de PATCH /api/tarefas/{tarefa_id}."""

    titulo: str | None = None
    prioridade: PrioridadeTarefa | None = None
    status: StatusTarefa | None = None
    turno: TurnoTarefa | None = None
    prazo: datetime | None = None
    recorrencia: RecorrenciaEsquema | None = None
    etiqueta_ids: list[UUID] | None = None


class LembreteResposta(BaseModel):
    """Resumo de lembrete vinculado a tarefa."""

    id: UUID
    disparar_em: str
    antecedencia_min: int
    status: str


class DetalhesTarefaResposta(BaseModel):
    """Documento de metadados visuais e notas em blocos da tarefa."""

    tarefa_id: str
    usuario_id: str
    metadados_visuais: dict[str, Any]
    notas_em_blocos: list[dict[str, Any]]
    atualizado_em: str | None


class RespostaDetalheTarefaCompleta(BaseModel):
    """Resposta consolidada de GET /api/tarefas/{tarefa_id}."""

    tarefa: TarefaResposta
    detalhes: DetalhesTarefaResposta
    lembretes: list[LembreteResposta]


class RequisicaoSalvarDetalhes(BaseModel):
    """Payload de PUT /api/tarefas/{tarefa_id}/detalhes."""

    metadados_visuais: dict[str, Any] = Field(default_factory=dict)
    notas_em_blocos: list[dict[str, Any]] = Field(default_factory=list)


class RequisicaoConcluirTarefa(BaseModel):
    """Payload de POST /api/tarefas/{tarefa_id}/concluir."""

    confirmar_cascata: bool = False


class ProximaOcorrenciaResumo(BaseModel):
    """Resumo da proxima ocorrencia gerada para tarefas recorrentes."""

    id: UUID
    prazo: str | None
    serie_recorrencia_id: UUID | None


class RespostaConcluirTarefa(BaseModel):
    """Resposta de POST /api/tarefas/{tarefa_id}/concluir."""

    tarefa_id: UUID
    nos_concluidos: list[UUID]
    ancestrais_atualizados: list[UUID]
    token_desfazer: str | None
    expira_em: str | None
    proxima_ocorrencia: ProximaOcorrenciaResumo | None = None


class RequisicaoDesfazerCascata(BaseModel):
    """Payload de POST /api/tarefas/desfazer-cascata."""

    token_desfazer: str


class RespostaDesfazerCascata(BaseModel):
    """Resposta de POST /api/tarefas/desfazer-cascata."""

    restaurados: int
    tarefa_id: UUID


class RequisicaoReabrirTarefa(BaseModel):
    """Payload de POST /api/tarefas/{tarefa_id}/reabrir."""

    status_destino: Literal["pendente", "em_andamento"] = "em_andamento"


class RespostaReabrirTarefa(BaseModel):
    """Resposta de POST /api/tarefas/{tarefa_id}/reabrir."""

    tarefa_id: UUID
    status: StatusTarefa
    nos_reabertos: list[UUID]
    ancestrais_reabertos: list[UUID]


class RequisicaoMoverTarefa(BaseModel):
    """Payload de POST /api/tarefas/{tarefa_id}/mover."""

    novo_pai_id: UUID | None = None
    nova_ordem: int | None = None


class RespostaMoverTarefa(BaseModel):
    """Resposta de POST /api/tarefas/{tarefa_id}/mover."""

    tarefa: TarefaResposta
    ancestrais_concluidos: list[UUID]
    ancestrais_reabertos: list[UUID]


class ItemOrdenacaoIrma(BaseModel):
    """Item individual de ordenacao manual entre irmas."""

    tarefa_id: UUID
    ordem_manual: int


class RequisicaoReordenarIrmas(BaseModel):
    """Payload de PATCH /api/tarefas/reordenar."""

    tarefa_pai_id: UUID | None = None
    ordenacao: list[ItemOrdenacaoIrma]


class RespostaReordenarIrmas(BaseModel):
    """Resposta de PATCH /api/tarefas/reordenar."""

    atualizadas: int


class RespostaExcluirTarefa(BaseModel):
    """Resposta de DELETE /api/tarefas/{tarefa_id}."""

    estrategia_aplicada: EstrategiaExclusao
    tarefas_removidas: int
    filhas_promovidas: int


def montar_etiqueta_resposta(registro: EtiquetaRegistro) -> EtiquetaResposta:
    return EtiquetaResposta(
        id=registro.id,
        nome=registro.nome,
        cor=registro.cor,
        criado_em=formatar_instante_iso_utc(registro.criado_em) if registro.criado_em else None,
    )


def montar_tarefa_resposta(no: NoTarefaExpandido) -> TarefaResposta:
    reg: TarefaRegistro = no.registro
    return TarefaResposta(
        id=reg.id,
        tarefa_pai_id=reg.tarefa_pai_id,
        titulo=reg.titulo,
        prioridade=reg.prioridade,
        status=reg.status,
        turno=reg.turno,
        prazo=formatar_instante_iso_utc(reg.prazo) if reg.prazo else None,
        profundidade=reg.profundidade,
        ordem_manual=reg.ordem_manual,
        percentual_conclusao=no.metricas.percentual_conclusao,
        total_folhas=no.metricas.total_folhas,
        folhas_concluidas=no.metricas.folhas_concluidas,
        tem_filha_urgente_aberta=no.metricas.tem_filha_urgente_aberta,
        etiquetas=[EtiquetaResumoResposta(id=e.id, nome=e.nome, cor=e.cor) for e in reg.etiquetas],
        recorrencia=RecorrenciaEsquema(
            tipo=reg.recorrencia.tipo,
            dias_semana=list(reg.recorrencia.dias_semana),
            dia_mes=reg.recorrencia.dia_mes,
            intervalo=reg.recorrencia.intervalo,
        ),
        serie_recorrencia_id=reg.serie_recorrencia_id,
        vezes_reaberta=reg.vezes_reaberta,
        compartilhada=reg.compartilhada,
        responsavel=(
            {
                "tipo": reg.responsavel.tipo,
                "usuario_id": str(reg.responsavel.usuario_id)
                if reg.responsavel.usuario_id
                else None,
                "vaga_id": str(reg.responsavel.vaga_id) if reg.responsavel.vaga_id else None,
                "nome_exibicao": reg.responsavel.nome_exibicao,
                "avatar_url": reg.responsavel.avatar_url,
            }
            if reg.responsavel is not None
            else None
        ),
        lembretes_pendentes=reg.lembretes_pendentes,
        criado_em=formatar_instante_iso_utc(reg.criado_em),
        atualizado_em=formatar_instante_iso_utc(reg.atualizado_em),
        subtarefas=[montar_tarefa_resposta(filha) for filha in no.subtarefas],
    )
