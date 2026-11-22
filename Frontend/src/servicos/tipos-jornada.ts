import type { EstadoClimatico, PrioridadeTarefa } from '../astronomia/tipos';

export type StatusTarefa = 'pendente' | 'em_andamento' | 'concluida';

export type TurnoTarefa = 'manha' | 'tarde' | 'noite' | 'livre';

export type TipoRecorrencia = 'nenhuma' | 'diaria' | 'semanal' | 'mensal';

export type EstrategiaExclusao = 'cascata' | 'promover_filhas';

export type ModoLocalizacaoClima = 'geolocalizacao' | 'cidade_manual';

export interface ConfiguracaoRecorrencia {
  tipo: TipoRecorrencia;
  diasSemana: number[];
  diaMes: number | null;
  intervalo: number;
}

export interface EtiquetaResumo {
  id: string;
  nome: string;
  cor: string;
}

export interface EtiquetaCompleta extends EtiquetaResumo {
  criadoEm: string | null;
}

export interface ListaEtiquetasResposta {
  itens: EtiquetaCompleta[];
  limiteMaximo: number;
}

export interface ResponsavelTarefaResumo {
  tipo: 'usuario' | 'vaga';
  usuarioId: string | null;
  vagaId: string | null;
  nomeExibicao: string;
  avatarUrl: string | null;
}

export interface TarefaArvore {
  id: string;
  tarefaPaiId: string | null;
  titulo: string;
  prioridade: PrioridadeTarefa;
  status: StatusTarefa;
  turno: TurnoTarefa;
  prazo: string | null;
  profundidade: number;
  ordemManual: number;
  percentualConclusao: number;
  totalFolhas: number;
  folhasConcluidas: number;
  temFilhaUrgenteAberta: boolean;
  etiquetas: EtiquetaResumo[];
  recorrencia: ConfiguracaoRecorrencia;
  serieRecorrenciaId: string | null;
  vezesReaberta: number;
  compartilhada: boolean;
  responsavel: ResponsavelTarefaResumo | null;
  lembretesPendentes: number;
  criadoEm: string;
  atualizadoEm: string;
  subtarefas: TarefaArvore[];
}

export interface TotaisTarefas {
  ativas: number;
  concluidas: number;
  limiteAtivas: number;
}

export interface ListaTarefasResposta {
  itens: TarefaArvore[];
  totais: TotaisTarefas;
}

export interface FiltrosListagemTarefas {
  turno?: TurnoTarefa;
  status?: StatusTarefa;
  prioridade?: PrioridadeTarefa;
  etiquetaId?: string;
  busca?: string;
  incluirConcluidas?: boolean;
  formato?: 'arvore' | 'plano';
}

export interface EntradaCriarTarefa {
  titulo: string;
  tarefaPaiId?: string | null;
  prioridade?: PrioridadeTarefa;
  status?: StatusTarefa;
  turno?: TurnoTarefa;
  prazo?: string | null;
  recorrencia?: ConfiguracaoRecorrencia;
  etiquetaIds?: string[];
}

export interface EntradaAtualizarTarefa {
  titulo?: string;
  prioridade?: PrioridadeTarefa;
  status?: StatusTarefa;
  turno?: TurnoTarefa;
  prazo?: string | null;
  recorrencia?: ConfiguracaoRecorrencia;
  etiquetaIds?: string[];
}

export interface AncestralResumoAtualizado {
  id: string;
  status: StatusTarefa;
  percentualConclusao: number;
  totalFolhas: number;
  folhasConcluidas: number;
  temFilhaUrgenteAberta: boolean;
}

export interface ResultadoCriarTarefa {
  tarefa: TarefaArvore;
  ancestraisAtualizados: AncestralResumoAtualizado[];
}

export interface ProximaOcorrenciaResumo {
  id: string;
  prazo: string | null;
  serieRecorrenciaId: string | null;
}

export interface ResultadoConcluirTarefa {
  tarefaId: string;
  nosConcluidos: string[];
  ancestraisAtualizados: string[];
  tokenDesfazer: string | null;
  expiraEm: string | null;
  proximaOcorrencia: ProximaOcorrenciaResumo | null;
}

export interface ResultadoDesfazerCascata {
  restaurados: number;
  tarefaId: string;
}

export interface ResultadoReabrirTarefa {
  tarefaId: string;
  status: StatusTarefa;
  nosReabertos: string[];
  ancestraisReabertos: string[];
}

export interface ResultadoMoverTarefa {
  tarefa: TarefaArvore;
  ancestraisConcluidos: string[];
  ancestraisReabertos: string[];
}

export interface ItemOrdenacaoIrma {
  tarefaId: string;
  ordemManual: number;
}

export interface ResultadoExcluirTarefa {
  estrategiaAplicada: EstrategiaExclusao;
  tarefasRemovidas: number;
  filhasPromovidas: number;
}

export interface BlocoSubtitulo {
  id: string;
  tipo: 'subtitulo';
  nivel: 2 | 3;
  texto: string;
}

export interface BlocoParagrafo {
  id: string;
  tipo: 'paragrafo';
  texto: string;
}

export interface BlocoLista {
  id: string;
  tipo: 'lista';
  ordenada: boolean;
  itens: string[];
}

export interface ItemChecklistNota {
  texto: string;
  marcado: boolean;
}

export interface BlocoChecklist {
  id: string;
  tipo: 'checklist';
  itens: ItemChecklistNota[];
}

export interface BlocoCitacao {
  id: string;
  tipo: 'citacao';
  texto: string;
  autor?: string | null;
}

export interface BlocoCodigoOuLink {
  id: string;
  tipo: 'codigo_ou_link';
  subtipo: 'codigo' | 'link';
  rotulo?: string | null;
  conteudo: string;
}

export type BlocoNota =
  BlocoSubtitulo | BlocoParagrafo | BlocoLista | BlocoChecklist | BlocoCitacao | BlocoCodigoOuLink;

export interface MetadadosVisuaisTarefa {
  formaBotanica?: string;
  corEstrela?: string;
  icone?: string;
}

export interface DetalhesTarefa {
  tarefaId: string;
  usuarioId: string;
  metadadosVisuais: MetadadosVisuaisTarefa;
  notasEmBlocos: BlocoNota[];
  atualizadoEm: string | null;
}

export interface LembreteTarefaResumo {
  id: string;
  dispararEm: string;
  antecedenciaMin: number;
  status: string;
}

export interface DetalheTarefaCompleta {
  tarefa: TarefaArvore;
  detalhes: DetalhesTarefa;
  lembretes: LembreteTarefaResumo[];
}

export interface SugestaoCidadeClima {
  cidade: string;
  uf: string | null;
  pais: string | null;
  latitudeAprox: number;
  longitudeAprox: number;
}

export interface EntradaConsentimentoClima {
  habilitado: boolean;
  modoLocalizacao?: ModoLocalizacaoClima | null;
  cidade?: string | null;
  uf?: string | null;
  latitudeAprox?: number | null;
  longitudeAprox?: number | null;
}

export interface ResultadoConsentimentoClima {
  habilitado: boolean;
  modoLocalizacao: ModoLocalizacaoClima | null;
  cidade: string | null;
  uf: string | null;
  latitudeAprox: number | null;
  longitudeAprox: number | null;
  estadoClimatico: EstadoClimatico;
}

export interface ClimaAtual {
  habilitado: boolean;
  cidade: string | null;
  uf: string | null;
  temperaturaC: number;
  codigoWmo: number;
  estadoClimatico: EstadoClimatico;
  descricao: string;
  origemCache: boolean;
  atualizadoEm: string;
}

export type EstadoClimaUsuario =
  { autorizado: true; clima: ClimaAtual } | { autorizado: false; clima: null };

export interface ServicoJornadaFrontend {
  listarTarefas: (filtros?: FiltrosListagemTarefas) => Promise<ListaTarefasResposta>;
  obterTarefa: (tarefaId: string) => Promise<DetalheTarefaCompleta>;
  criarTarefa: (entrada: EntradaCriarTarefa) => Promise<ResultadoCriarTarefa>;
  atualizarTarefa: (tarefaId: string, entrada: EntradaAtualizarTarefa) => Promise<TarefaArvore>;
  concluirTarefa: (tarefaId: string, confirmarCascata: boolean) => Promise<ResultadoConcluirTarefa>;
  desfazerCascata: (tokenDesfazer: string) => Promise<ResultadoDesfazerCascata>;
  reabrirTarefa: (
    tarefaId: string,
    statusDestino?: 'pendente' | 'em_andamento',
  ) => Promise<ResultadoReabrirTarefa>;
  moverTarefa: (
    tarefaId: string,
    novoPaiId: string | null,
    novaOrdem?: number | null,
  ) => Promise<ResultadoMoverTarefa>;
  reordenarIrmas: (tarefaPaiId: string | null, ordenacao: ItemOrdenacaoIrma[]) => Promise<number>;
  excluirTarefa: (
    tarefaId: string,
    estrategia?: EstrategiaExclusao,
  ) => Promise<ResultadoExcluirTarefa>;
  salvarDetalhes: (
    tarefaId: string,
    entrada: {
      metadadosVisuais: MetadadosVisuaisTarefa;
      notasEmBlocos: BlocoNota[];
    },
  ) => Promise<DetalhesTarefa>;
  listarEtiquetas: () => Promise<ListaEtiquetasResposta>;
  criarEtiqueta: (entrada: { nome: string; cor: string }) => Promise<EtiquetaCompleta>;
  atualizarEtiqueta: (
    etiquetaId: string,
    entrada: { nome?: string; cor?: string },
  ) => Promise<EtiquetaCompleta>;
  excluirEtiqueta: (etiquetaId: string) => Promise<void>;
  buscarCidades: (consulta: string) => Promise<SugestaoCidadeClima[]>;
  atualizarConsentimentoClima: (
    entrada: EntradaConsentimentoClima,
  ) => Promise<ResultadoConsentimentoClima>;
  consultarClimaAtual: () => Promise<EstadoClimaUsuario>;
}
