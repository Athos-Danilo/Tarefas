export type StatusSessaoFoco = 'em_andamento' | 'concluida' | 'interrompida';

export interface SessaoFoco {
  id: string;
  tarefaId: string;
  tarefaTitulo: string;
  duracaoPlanejadaSeg: number;
  duracaoRealSeg: number | null;
  iniciadaEm: string;
  encerradaEm: string | null;
  status: StatusSessaoFoco;
}

export interface EntradaIniciarSessaoFoco {
  tarefaId: string;
  duracaoPlanejadaSeg: number;
}

export interface HistoricoFoco {
  itens: SessaoFoco[];
  totalSegundosConcluidos: number;
}

export interface ServicoFocoFrontend {
  obterSessaoAtiva(): Promise<SessaoFoco | null>;
  iniciarSessao(entrada: EntradaIniciarSessaoFoco): Promise<SessaoFoco>;
  concluirSessao(sessaoId: string, duracaoRealSeg?: number): Promise<SessaoFoco>;
  interromperSessao(sessaoId: string, duracaoRealSeg?: number): Promise<SessaoFoco>;
  listarHistorico(limite?: number): Promise<HistoricoFoco>;
}
