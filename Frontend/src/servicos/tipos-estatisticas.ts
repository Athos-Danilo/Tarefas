export type PeriodoEstatisticas = '7d' | '30d' | '90d' | 'tudo';
export type EscopoEstatisticas = 'todas' | 'pessoais' | 'grupo';
export type FormatoExportacaoDiario = 'md' | 'json';

export type ModoTemporalPreferencia = 'relogio_real' | 'simulador';
export type Qualidade3dPreferencia = 'auto' | 'alto' | 'desempenho_2d';
export type StatusTutorialPreferencia = 'pendente' | 'pulado' | 'concluido';

export interface KpisEstatisticasFrontend {
  totalCriadas: number;
  totalConcluidas: number;
  taxaConclusaoPct: number;
  tempoMedioConclusaoHoras: number;
  pontualidadePct: number;
  sequenciaAtualDias: number;
  sequenciaRecordeDias: number;
  minutosFocoTotais: number;
  taxaFocoConcluidoPct: number;
}

export interface PontoSerieTemporalFrontend {
  data: string;
  criadas: number;
  concluidas: number;
  minutosFoco: number;
}

export interface PontoMapaCalorFrontend {
  data: string;
  intensidade: number;
  acoes: number;
}

export interface DistribuicaoTurnoFrontend {
  manha: number;
  tarde: number;
  noite: number;
  livre: number;
}

export interface DistribuicaoPrioridadeFrontend {
  baixa: number;
  media: number;
  alta: number;
  urgente: number;
}

export interface ItemPorEtiquetaFrontend {
  etiquetaId: string;
  nome: string;
  cor: string;
  concluidas: number;
}

export interface ResumoRecorrenciasFrontend {
  rotinasAtivas: number;
  ocorrenciasCumpridas: number;
  taxaConsistenciaPct: number;
}

export interface TituloRepetidoFrontend {
  tituloNormalizado: string;
  ocorrencias: number;
  concluidas: number;
}

export interface ResumoRepeticoesRetrabalhoFrontend {
  totalReaberturas: number;
  tarefasReabertasDistintas: number;
  titulosMaisRepetidos: TituloRepetidoFrontend[];
}

export interface ResumoArvoresFrontend {
  constelacoesConcluidas: number;
  profundidadeMedia: number;
}

export interface ResumoEstatisticasFrontend {
  periodo: PeriodoEstatisticas;
  escopo: EscopoEstatisticas;
  kpis: KpisEstatisticasFrontend;
  serieTemporal: PontoSerieTemporalFrontend[];
  mapaCalor: PontoMapaCalorFrontend[];
  porTurno: DistribuicaoTurnoFrontend;
  porPrioridade: DistribuicaoPrioridadeFrontend;
  porEtiqueta: ItemPorEtiquetaFrontend[];
  recorrencias: ResumoRecorrenciasFrontend;
  repeticoesERetrabalho: ResumoRepeticoesRetrabalhoFrontend;
  arvores: ResumoArvoresFrontend;
}

export interface ParametrosResumoEstatisticas {
  periodo: PeriodoEstatisticas;
  escopo: EscopoEstatisticas;
  etiquetaId?: string | null;
  fusoHorario?: string;
}

export interface EventoDiarioFrontend {
  eventoId: string;
  autorUsuarioId: string;
  tarefaId: string | null;
  tarefaRaizId: string | null;
  tipoEvento: string;
  momentoDoDia: string;
  resumo: string;
  detalhes: Record<string, unknown>;
  criadoEm: string;
}

export interface DiarioEventosPaginado {
  itens: EventoDiarioFrontend[];
  proximoCursor: string | null;
}

export interface ParametrosListarDiario {
  limite?: number;
  cursor?: string | null;
  tipo?: string | null;
  busca?: string | null;
}

export interface ParametrosExportacaoDiario {
  formato: FormatoExportacaoDiario;
  de?: string | null;
  ate?: string | null;
}

export interface PreferenciasAudioFrontend {
  habilitado: boolean;
  volumeGeral: number;
  volumeEfeitos: number;
  volumeAmbiente: number;
}

export interface PreferenciasTutorialFrontend {
  status: StatusTutorialPreferencia;
  etapaAtual: number;
}

export interface PreferenciasCenarioFrontend {
  modoTemporal: ModoTemporalPreferencia;
  horaSimulada: string | null;
  qualidade3d: Qualidade3dPreferencia;
  reduzirMovimento: boolean;
  audio: PreferenciasAudioFrontend;
  tutorial: PreferenciasTutorialFrontend;
}

export interface EntradaAtualizarPreferencias {
  modoTemporal?: ModoTemporalPreferencia;
  horaSimulada?: string | null;
  qualidade3d?: Qualidade3dPreferencia;
  reduzirMovimento?: boolean;
  audio?: Partial<PreferenciasAudioFrontend>;
  tutorial?: Partial<PreferenciasTutorialFrontend>;
}

export interface ServicoEstatisticasFrontend {
  obterResumo: (parametros: ParametrosResumoEstatisticas) => Promise<ResumoEstatisticasFrontend>;
  listarDiario: (parametros: ParametrosListarDiario) => Promise<DiarioEventosPaginado>;
  obterUrlExportacaoDiario: (parametros: ParametrosExportacaoDiario) => string;
  obterPreferencias: () => Promise<PreferenciasCenarioFrontend>;
  atualizarPreferencias: (
    entrada: EntradaAtualizarPreferencias,
  ) => Promise<PreferenciasCenarioFrontend>;
}
