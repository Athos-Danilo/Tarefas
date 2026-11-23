import { createContext } from 'react';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../servicos/tipos-conta';

export interface ValorContextoAutenticacao {
  estadoSessao: EstadoSessao;
  carregandoSessao: boolean;
  servico: ServicoAutenticacaoFrontend;
  recarregarSessao: () => Promise<void>;
  definirSessao: (novaSessao: EstadoSessao) => void;
  tutorialSolicitadoRevisao: boolean;
  versaoRevisaoTutorial: number;
  solicitarRevisaoTutorial: () => void;
  consumirRevisaoTutorial: () => void;
}

export const ContextoAutenticacao = createContext<ValorContextoAutenticacao | null>(null);
