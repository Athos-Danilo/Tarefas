import { requisitarJson } from './cliente-http';
import type {
  DiarioEventosPaginado,
  EntradaAtualizarPreferencias,
  EscopoEstatisticas,
  ModoTemporalPreferencia,
  ParametrosExportacaoDiario,
  ParametrosListarDiario,
  ParametrosResumoEstatisticas,
  PeriodoEstatisticas,
  PreferenciasCenarioFrontend,
  Qualidade3dPreferencia,
  ResumoEstatisticasFrontend,
  ServicoEstatisticasFrontend,
  StatusTutorialPreferencia,
} from './tipos-estatisticas';

interface RespostaEstatisticasResumoApi {
  periodo: PeriodoEstatisticas;
  escopo: EscopoEstatisticas;
  kpis: {
    total_criadas: number;
    total_concluidas: number;
    taxa_conclusao_pct: number;
    tempo_medio_conclusao_horas: number;
    pontualidade_pct: number;
    sequencia_atual_dias: number;
    sequencia_recorde_dias: number;
    minutos_foco_totais: number;
    taxa_foco_concluido_pct: number;
  };
  serie_temporal: Array<{
    data: string;
    criadas: number;
    concluidas: number;
    minutos_foco: number;
  }>;
  mapa_calor: Array<{
    data: string;
    intensidade: number;
    acoes: number;
  }>;
  por_turno: {
    manha: number;
    tarde: number;
    noite: number;
    livre: number;
  };
  por_prioridade: {
    baixa: number;
    media: number;
    alta: number;
    urgente: number;
  };
  por_etiqueta: Array<{
    etiqueta_id: string;
    nome: string;
    cor: string;
    concluidas: number;
  }>;
  recorrencias: {
    rotinas_ativas: number;
    ocorrencias_cumpridas: number;
    taxa_consistencia_pct: number;
  };
  repeticoes_e_retrabalho: {
    total_reaberturas: number;
    tarefas_reabertas_distintas: number;
    titulos_mais_repetidos: Array<{
      titulo_normalizado: string;
      ocorrencias: number;
      concluidas: number;
    }>;
  };
  arvores: {
    constelacoes_concluidas: number;
    profundidade_media: number;
  };
}

interface EventoDiarioApi {
  evento_id: string;
  autor_usuario_id: string;
  tarefa_id: string | null;
  tarefa_raiz_id: string | null;
  tipo_evento: string;
  momento_do_dia: string;
  resumo: string;
  detalhes: Record<string, unknown>;
  criado_em: string;
}

interface RespostaDiarioEventosApi {
  itens: EventoDiarioApi[];
  proximo_cursor: string | null;
}

interface PreferenciasCenarioApi {
  modo_temporal: ModoTemporalPreferencia;
  hora_simulada: string | null;
  qualidade_3d: Qualidade3dPreferencia;
  reduzir_movimento: boolean;
  audio: {
    habilitado: boolean;
    volume_geral: number;
    volume_efeitos: number;
    volume_ambiente: number;
  };
  tutorial: {
    status: StatusTutorialPreferencia;
    etapa_atual: number;
  };
}

function mapearPreferencias(bruto: PreferenciasCenarioApi): PreferenciasCenarioFrontend {
  return {
    modoTemporal: bruto.modo_temporal,
    horaSimulada: bruto.hora_simulada,
    qualidade3d: bruto.qualidade_3d,
    reduzirMovimento: bruto.reduzir_movimento,
    audio: {
      habilitado: bruto.audio.habilitado,
      volumeGeral: bruto.audio.volume_geral,
      volumeEfeitos: bruto.audio.volume_efeitos,
      volumeAmbiente: bruto.audio.volume_ambiente,
    },
    tutorial: {
      status: bruto.tutorial.status,
      etapaAtual: bruto.tutorial.etapa_atual,
    },
  };
}

export function criarServicoEstatisticas(
  funcaoFetch: typeof fetch = fetch,
): ServicoEstatisticasFrontend {
  return {
    async obterResumo(
      parametros: ParametrosResumoEstatisticas,
    ): Promise<ResumoEstatisticasFrontend> {
      const busca = new URLSearchParams({
        periodo: parametros.periodo,
        escopo: parametros.escopo,
      });
      if (parametros.etiquetaId) {
        busca.set('etiqueta_id', parametros.etiquetaId);
      }
      if (parametros.fusoHorario) {
        busca.set('fuso_horario', parametros.fusoHorario);
      }

      const bruto = await requisitarJson<RespostaEstatisticasResumoApi>(
        `/api/estatisticas/resumo?${busca.toString()}`,
        { method: 'GET' },
        funcaoFetch,
      );

      return {
        periodo: bruto.periodo,
        escopo: bruto.escopo,
        kpis: {
          totalCriadas: bruto.kpis.total_criadas,
          totalConcluidas: bruto.kpis.total_concluidas,
          taxaConclusaoPct: bruto.kpis.taxa_conclusao_pct,
          tempoMedioConclusaoHoras: bruto.kpis.tempo_medio_conclusao_horas,
          pontualidadePct: bruto.kpis.pontualidade_pct,
          sequenciaAtualDias: bruto.kpis.sequencia_atual_dias,
          sequenciaRecordeDias: bruto.kpis.sequencia_recorde_dias,
          minutosFocoTotais: bruto.kpis.minutos_foco_totais,
          taxaFocoConcluidoPct: bruto.kpis.taxa_foco_concluido_pct,
        },
        serieTemporal: bruto.serie_temporal.map((p) => ({
          data: p.data,
          criadas: p.criadas,
          concluidas: p.concluidas,
          minutosFoco: p.minutos_foco,
        })),
        mapaCalor: bruto.mapa_calor,
        porTurno: bruto.por_turno,
        porPrioridade: bruto.por_prioridade,
        porEtiqueta: bruto.por_etiqueta.map((etq) => ({
          etiquetaId: etq.etiqueta_id,
          nome: etq.nome,
          cor: etq.cor,
          concluidas: etq.concluidas,
        })),
        recorrencias: {
          rotinasAtivas: bruto.recorrencias.rotinas_ativas,
          ocorrenciasCumpridas: bruto.recorrencias.ocorrencias_cumpridas,
          taxaConsistenciaPct: bruto.recorrencias.taxa_consistencia_pct,
        },
        repeticoesERetrabalho: {
          totalReaberturas: bruto.repeticoes_e_retrabalho.total_reaberturas,
          tarefasReabertasDistintas: bruto.repeticoes_e_retrabalho.tarefas_reabertas_distintas,
          titulosMaisRepetidos: bruto.repeticoes_e_retrabalho.titulos_mais_repetidos.map(
            (item) => ({
              tituloNormalizado: item.titulo_normalizado,
              ocorrencias: item.ocorrencias,
              concluidas: item.concluidas,
            }),
          ),
        },
        arvores: {
          constelacoesConcluidas: bruto.arvores.constelacoes_concluidas,
          profundidadeMedia: bruto.arvores.profundidade_media,
        },
      };
    },

    async listarDiario(parametros: ParametrosListarDiario): Promise<DiarioEventosPaginado> {
      const busca = new URLSearchParams();
      if (parametros.limite !== undefined) {
        busca.set('limite', String(parametros.limite));
      }
      if (parametros.cursor) {
        busca.set('cursor', parametros.cursor);
      }
      if (parametros.tipo) {
        busca.set('tipo', parametros.tipo);
      }
      if (parametros.busca && parametros.busca.trim()) {
        busca.set('busca', parametros.busca.trim());
      }

      const bruto = await requisitarJson<RespostaDiarioEventosApi>(
        `/api/diario/eventos?${busca.toString()}`,
        { method: 'GET' },
        funcaoFetch,
      );

      return {
        itens: bruto.itens.map((evt) => ({
          eventoId: evt.evento_id,
          autorUsuarioId: evt.autor_usuario_id,
          tarefaId: evt.tarefa_id,
          tarefaRaizId: evt.tarefa_raiz_id,
          tipoEvento: evt.tipo_evento,
          momentoDoDia: evt.momento_do_dia,
          resumo: evt.resumo,
          detalhes: evt.detalhes,
          criadoEm: evt.criado_em,
        })),
        proximoCursor: bruto.proximo_cursor,
      };
    },

    obterUrlExportacaoDiario(parametros: ParametrosExportacaoDiario): string {
      const busca = new URLSearchParams({ formato: parametros.formato });
      if (parametros.de && parametros.de.trim()) {
        busca.set('de', parametros.de.trim());
      }
      if (parametros.ate && parametros.ate.trim()) {
        busca.set('ate', parametros.ate.trim());
      }
      return `/api/exportacao/diario?${busca.toString()}`;
    },

    async obterPreferencias(): Promise<PreferenciasCenarioFrontend> {
      const bruto = await requisitarJson<PreferenciasCenarioApi>(
        '/api/preferencias',
        { method: 'GET' },
        funcaoFetch,
      );
      return mapearPreferencias(bruto);
    },

    async atualizarPreferencias(
      entrada: EntradaAtualizarPreferencias,
    ): Promise<PreferenciasCenarioFrontend> {
      const payload: Record<string, unknown> = {};
      if (entrada.modoTemporal !== undefined) {
        payload.modo_temporal = entrada.modoTemporal;
      }
      if (entrada.horaSimulada !== undefined) {
        payload.hora_simulada = entrada.horaSimulada;
      }
      if (entrada.qualidade3d !== undefined) {
        payload.qualidade_3d = entrada.qualidade3d;
      }
      if (entrada.reduzirMovimento !== undefined) {
        payload.reduzir_movimento = entrada.reduzirMovimento;
      }
      if (entrada.audio !== undefined) {
        const audioPatch: Record<string, unknown> = {};
        if (entrada.audio.habilitado !== undefined) {
          audioPatch.habilitado = entrada.audio.habilitado;
        }
        if (entrada.audio.volumeGeral !== undefined) {
          audioPatch.volume_geral = entrada.audio.volumeGeral;
        }
        if (entrada.audio.volumeEfeitos !== undefined) {
          audioPatch.volume_efeitos = entrada.audio.volumeEfeitos;
        }
        if (entrada.audio.volumeAmbiente !== undefined) {
          audioPatch.volume_ambiente = entrada.audio.volumeAmbiente;
        }
        payload.audio = audioPatch;
      }
      if (entrada.tutorial !== undefined) {
        const tutPatch: Record<string, unknown> = {};
        if (entrada.tutorial.status !== undefined) {
          tutPatch.status = entrada.tutorial.status;
        }
        if (entrada.tutorial.etapaAtual !== undefined) {
          tutPatch.etapa_atual = entrada.tutorial.etapaAtual;
        }
        payload.tutorial = tutPatch;
      }

      const bruto = await requisitarJson<PreferenciasCenarioApi>(
        '/api/preferencias',
        {
          method: 'PATCH',
          body: JSON.stringify(payload),
        },
        funcaoFetch,
      );
      return mapearPreferencias(bruto);
    },
  };
}
