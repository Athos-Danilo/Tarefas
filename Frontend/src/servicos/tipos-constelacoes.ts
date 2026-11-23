export interface PosicaoNoMapa {
  x: number;
  y: number;
  fixado: boolean;
}

export interface ViewportMapa {
  zoom: number;
  centroX: number;
  centroY: number;
}

export interface LayoutConstelacao {
  tarefaRaizId: string;
  nos: Record<string, PosicaoNoMapa>;
  viewport: ViewportMapa;
  atualizadoEm: string | null;
}

export interface EntradaSalvarLayoutConstelacao {
  nos: Record<string, PosicaoNoMapa>;
  viewport: ViewportMapa;
}

export interface ServicoConstelacoesFrontend {
  obterLayout(tarefaRaizId: string): Promise<LayoutConstelacao>;
  salvarLayout(
    tarefaRaizId: string,
    entrada: EntradaSalvarLayoutConstelacao,
  ): Promise<LayoutConstelacao>;
  limparLayout(tarefaRaizId: string): Promise<void>;
}
