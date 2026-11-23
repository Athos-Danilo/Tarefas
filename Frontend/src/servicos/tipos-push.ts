export type PlataformaPush = 'desktop' | 'android' | 'ios' | 'outro';

export type StatusLembretePush = 'pendente' | 'enviado' | 'cancelado';

export interface ChavePublicaPushResposta {
  chavePublica: string | null;
  habilitado: boolean;
}

export interface DispositivoPush {
  id: string;
  rotuloDispositivo: string;
  plataforma: PlataformaPush;
  criadoEm: string;
  ultimoEnvioEm: string | null;
}

export interface ListaDispositivosPushResposta {
  itens: DispositivoPush[];
  limiteMaximo: number;
}

export interface EntradaRegistrarDispositivoPush {
  endpoint: string;
  chaves: {
    p256dh: string;
    auth: string;
  };
  rotuloDispositivo?: string | null;
  plataforma: PlataformaPush;
}

export interface LembreteDetalhado {
  id: string;
  tarefaId: string;
  dispararEm: string;
  antecedenciaMin: number;
  status: StatusLembretePush;
  enviadoEm: string | null;
  criadoEm: string;
}

export interface ListaLembretesTarefaResposta {
  itens: LembreteDetalhado[];
  limiteMaximo: number;
}

export interface EntradaCriarLembrete {
  dispararEm: string;
  antecedenciaMin: number;
}

export interface EntradaAtualizarLembrete {
  dispararEm?: string;
  antecedenciaMin?: number;
}

export interface ServicoPushFrontend {
  obterChavePublica: () => Promise<ChavePublicaPushResposta>;
  listarDispositivos: () => Promise<ListaDispositivosPushResposta>;
  registrarDispositivo: (entrada: EntradaRegistrarDispositivoPush) => Promise<DispositivoPush>;
  revogarDispositivo: (dispositivoId: string) => Promise<void>;
  listarLembretes: (tarefaId: string) => Promise<ListaLembretesTarefaResposta>;
  criarLembrete: (tarefaId: string, entrada: EntradaCriarLembrete) => Promise<LembreteDetalhado>;
  atualizarLembrete: (
    lembreteId: string,
    entrada: EntradaAtualizarLembrete,
  ) => Promise<LembreteDetalhado>;
  cancelarLembrete: (lembreteId: string) => Promise<void>;
}
