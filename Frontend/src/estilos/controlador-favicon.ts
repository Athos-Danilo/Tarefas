import { obterFaixaFavicon } from '../astronomia/ciclo-solar';
import type { FaixaFavicon } from '../astronomia/tipos';

export interface InfoFaviconTurno {
  id: FaixaFavicon;
  nome: string;
  faixa: string;
  arquivo: string;
  corPadrao: string;
}

export const FASES_FAVICON: Record<FaixaFavicon, InfoFaviconTurno> = {
  manha: {
    id: 'manha',
    nome: 'Manhã',
    faixa: '05:45 - 11:59',
    arquivo: '/favicons/favicon-lume-manha.png',
    corPadrao: '#256B4E',
  },
  tarde: {
    id: 'tarde',
    nome: 'Tarde',
    faixa: '12:00 - 16:59',
    arquivo: '/favicons/favicon-lume-tarde.png',
    corPadrao: '#A94F0D',
  },
  entardecer: {
    id: 'entardecer',
    nome: 'Entardecer',
    faixa: '17:00 - 18:59',
    arquivo: '/favicons/favicon-lume-entardecer.png',
    corPadrao: '#9C3E32',
  },
  noite: {
    id: 'noite',
    nome: 'Noite',
    faixa: '19:00 - 05:44',
    arquivo: '/favicons/favicon-lume-noite.png',
    corPadrao: '#F5D076',
  },
};

export interface ControladorFavicon {
  sincronizarPorMinuto: (minutoDoDia: number, corTema?: string) => boolean;
  obterFaixaAtual: () => FaixaFavicon | null;
}

export function criarControladorFavicon(documento?: Document): ControladorFavicon {
  const doc = documento ?? (typeof document !== 'undefined' ? document : undefined);
  let faixaAtual: FaixaFavicon | null = null;

  return {
    sincronizarPorMinuto(minutoDoDia: number, corTema?: string): boolean {
      const proximaFaixa = obterFaixaFavicon(minutoDoDia);
      if (faixaAtual === proximaFaixa) {
        return false;
      }
      faixaAtual = proximaFaixa;

      if (!doc) {
        return true;
      }

      const info = FASES_FAVICON[proximaFaixa];
      const link = doc.getElementById('favicon-ativo') ?? doc.querySelector('link[rel="icon"]');
      if (link) {
        link.setAttribute('href', info.arquivo);
      }

      const metaTema =
        doc.getElementById('meta-theme-color') ?? doc.querySelector('meta[name="theme-color"]');
      if (metaTema) {
        metaTema.setAttribute('content', corTema ?? info.corPadrao);
      }

      return true;
    },

    obterFaixaAtual(): FaixaFavicon | null {
      return faixaAtual;
    },
  };
}
