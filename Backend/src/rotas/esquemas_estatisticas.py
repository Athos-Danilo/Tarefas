from datetime import UTC, datetime
from typing import Any

from pydantic import BaseModel

from dominio.estatisticas import ResumoEstatisticas
from dominio.preferencias_padrao import PreferenciasCenario
from rotas.esquemas_autenticacao import formatar_instante_iso_utc


class KpisEstatisticasResposta(BaseModel):
    """Indicadores principais do dashboard D14."""

    total_criadas: int
    total_concluidas: int
    taxa_conclusao_pct: int
    tempo_medio_conclusao_horas: float
    pontualidade_pct: int
    sequencia_atual_dias: int
    sequencia_recorde_dias: int
    minutos_foco_totais: int
    taxa_foco_concluido_pct: int


class PontoSerieTemporalResposta(BaseModel):
    """Ponto diario de tarefas criadas, concluidas e foco."""

    data: str
    criadas: int
    concluidas: int
    minutos_foco: int


class PontoMapaCalorResposta(BaseModel):
    """Celula diaria para o heatmap de atividade."""

    data: str
    intensidade: int
    acoes: int


class DistribuicaoTurnoResposta(BaseModel):
    """Conclusoes agrupadas por turno."""

    manha: int
    tarde: int
    noite: int
    livre: int


class DistribuicaoPrioridadeResposta(BaseModel):
    """Conclusoes agrupadas por prioridade."""

    baixa: int
    media: int
    alta: int
    urgente: int


class ItemPorEtiquetaResposta(BaseModel):
    """Conclusoes por etiqueta."""

    etiqueta_id: str
    nome: str
    cor: str
    concluidas: int


class ResumoRecorrenciasResposta(BaseModel):
    """Metricas de consistencia das rotinas recorrentes."""

    rotinas_ativas: int
    ocorrencias_cumpridas: int
    taxa_consistencia_pct: int


class TituloRepetidoResposta(BaseModel):
    """Titulo recorrente/repetido normalizado."""

    titulo_normalizado: str
    ocorrencias: int
    concluidas: int


class ResumoRepeticoesRetrabalhoResposta(BaseModel):
    """Metricas de reaberturas e repeticoes."""

    total_reaberturas: int
    tarefas_reabertas_distintas: int
    titulos_mais_repetidos: list[TituloRepetidoResposta]


class ResumoArvoresResposta(BaseModel):
    """Metricas de constelacoes concluidas e profundidade media."""

    constelacoes_concluidas: int
    profundidade_media: float


class RespostaEstatisticasResumo(BaseModel):
    """Resposta completa de GET /api/estatisticas/resumo."""

    periodo: str
    escopo: str
    kpis: KpisEstatisticasResposta
    serie_temporal: list[PontoSerieTemporalResposta]
    mapa_calor: list[PontoMapaCalorResposta]
    por_turno: DistribuicaoTurnoResposta
    por_prioridade: DistribuicaoPrioridadeResposta
    por_etiqueta: list[ItemPorEtiquetaResposta]
    recorrencias: ResumoRecorrenciasResposta
    repeticoes_e_retrabalho: ResumoRepeticoesRetrabalhoResposta
    arvores: ResumoArvoresResposta


class EventoDiarioResposta(BaseModel):
    """Item serializado de eventos_ciclo no diario."""

    evento_id: str
    autor_usuario_id: str
    tarefa_id: str | None
    tarefa_raiz_id: str | None
    tipo_evento: str
    momento_do_dia: str
    resumo: str
    detalhes: dict[str, Any]
    criado_em: str


class RespostaDiarioEventos(BaseModel):
    """Resposta paginada de GET /api/diario/eventos."""

    itens: list[EventoDiarioResposta]
    proximo_cursor: str | None


class PreferenciasAudioResposta(BaseModel):
    """Configuracoes de audio opt-in."""

    habilitado: bool
    volume_geral: float
    volume_efeitos: float
    volume_ambiente: float


class PreferenciasTutorialResposta(BaseModel):
    """Estado do tutorial guiado do Lume."""

    status: str
    etapa_atual: int


class RespostaPreferenciasCenario(BaseModel):
    """Resposta de GET e PATCH /api/preferencias."""

    modo_temporal: str
    hora_simulada: str | None
    qualidade_3d: str
    reduzir_movimento: bool
    audio: PreferenciasAudioResposta
    tutorial: PreferenciasTutorialResposta


class RequisicaoAudioParcial(BaseModel):
    """Campos opcionais de audio para PATCH /api/preferencias."""

    habilitado: bool | None = None
    volume_geral: float | None = None
    volume_efeitos: float | None = None
    volume_ambiente: float | None = None


class RequisicaoTutorialParcial(BaseModel):
    """Campos opcionais do tutorial para PATCH /api/preferencias."""

    status: str | None = None
    etapa_atual: int | None = None


class RequisicaoAtualizarPreferencias(BaseModel):
    """Payload parcial de PATCH /api/preferencias."""

    modo_temporal: str | None = None
    hora_simulada: str | None = None
    qualidade_3d: str | None = None
    reduzir_movimento: bool | None = None
    audio: RequisicaoAudioParcial | None = None
    tutorial: RequisicaoTutorialParcial | None = None


def montar_resposta_resumo(resumo: ResumoEstatisticas) -> RespostaEstatisticasResumo:
    """Converte o resumo de dominio para o esquema Pydantic HTTP."""
    return RespostaEstatisticasResumo(
        periodo=resumo["periodo"],
        escopo=resumo["escopo"],
        kpis=KpisEstatisticasResposta(**resumo["kpis"]),
        serie_temporal=[PontoSerieTemporalResposta(**p) for p in resumo["serie_temporal"]],
        mapa_calor=[PontoMapaCalorResposta(**m) for m in resumo["mapa_calor"]],
        por_turno=DistribuicaoTurnoResposta(**resumo["por_turno"]),
        por_prioridade=DistribuicaoPrioridadeResposta(**resumo["por_prioridade"]),
        por_etiqueta=[ItemPorEtiquetaResposta(**e) for e in resumo["por_etiqueta"]],
        recorrencias=ResumoRecorrenciasResposta(**resumo["recorrencias"]),
        repeticoes_e_retrabalho=ResumoRepeticoesRetrabalhoResposta(
            total_reaberturas=resumo["repeticoes_e_retrabalho"]["total_reaberturas"],
            tarefas_reabertas_distintas=resumo["repeticoes_e_retrabalho"][
                "tarefas_reabertas_distintas"
            ],
            titulos_mais_repetidos=[
                TituloRepetidoResposta(**item)
                for item in resumo["repeticoes_e_retrabalho"]["titulos_mais_repetidos"]
            ],
        ),
        arvores=ResumoArvoresResposta(**resumo["arvores"]),
    )


def montar_evento_diario_resposta(item: dict[str, Any]) -> EventoDiarioResposta:
    """Serializa um documento de eventos_ciclo em JSON compatível."""
    criado = item.get("criado_em")
    if isinstance(criado, datetime):
        criado_iso = formatar_instante_iso_utc(
            criado.replace(tzinfo=UTC) if criado.tzinfo is None else criado
        )
    else:
        criado_iso = str(criado or "")

    return EventoDiarioResposta(
        evento_id=str(item.get("evento_id", "")),
        autor_usuario_id=str(item.get("autor_usuario_id", item.get("usuario_id", ""))),
        tarefa_id=str(item["tarefa_id"]) if item.get("tarefa_id") else None,
        tarefa_raiz_id=str(item["tarefa_raiz_id"]) if item.get("tarefa_raiz_id") else None,
        tipo_evento=str(item.get("tipo_evento", "")),
        momento_do_dia=str(item.get("momento_do_dia", "")),
        resumo=str(item.get("resumo", "")),
        detalhes=dict(item.get("detalhes") or {}),
        criado_em=criado_iso,
    )


def montar_resposta_preferencias(prefs: PreferenciasCenario) -> RespostaPreferenciasCenario:
    """Converte PreferenciasCenario para a resposta publica de /api/preferencias."""
    return RespostaPreferenciasCenario(
        modo_temporal=prefs["modo_temporal"],
        hora_simulada=prefs["hora_simulada"],
        qualidade_3d=prefs["qualidade_3d"],
        reduzir_movimento=prefs["reduzir_movimento"],
        audio=PreferenciasAudioResposta(**prefs["audio"]),
        tutorial=PreferenciasTutorialResposta(
            status=prefs["tutorial"]["status"],
            etapa_atual=prefs["tutorial"]["etapa_atual"],
        ),
    )
