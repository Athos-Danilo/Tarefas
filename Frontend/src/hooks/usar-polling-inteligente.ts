import { useEffect, useRef } from 'react';

export interface OpcoesPollingInteligente {
  ativo: boolean;
  intervaloMs: number;
  aoAtualizar: () => void | Promise<void>;
}

export function usePollingInteligente({
  ativo,
  intervaloMs,
  aoAtualizar,
}: OpcoesPollingInteligente): void {
  const callbackRef = useRef(aoAtualizar);

  useEffect(() => {
    callbackRef.current = aoAtualizar;
  }, [aoAtualizar]);

  useEffect(() => {
    if (!ativo) {
      return;
    }

    const disparar = () => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        return;
      }
      void callbackRef.current();
    };

    const idIntervalo = setInterval(disparar, intervaloMs);

    const aoMudarVisibilidade = () => {
      if (document.visibilityState === 'visible') {
        void callbackRef.current();
      }
    };

    const aoFocarJanela = () => {
      disparar();
    };

    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', aoMudarVisibilidade);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('focus', aoFocarJanela);
    }

    return () => {
      clearInterval(idIntervalo);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', aoMudarVisibilidade);
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('focus', aoFocarJanela);
      }
    };
  }, [ativo, intervaloMs]);
}
