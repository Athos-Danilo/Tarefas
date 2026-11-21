import { useMemo } from 'react';
import { CartaoStatusApi } from '../componentes/CartaoStatusApi';
import { useSaudeApi } from '../hooks/usar-saude-api';
import { criarClienteSaude } from '../servicos/cliente-saude';
import type { BuscadorDeSaude } from '../servicos/tipos-saude';

interface PropriedadesAplicacao {
  buscadorDeSaude?: BuscadorDeSaude;
}

export function Aplicacao({ buscadorDeSaude }: PropriedadesAplicacao) {
  const buscador = useMemo(() => buscadorDeSaude ?? criarClienteSaude(), [buscadorDeSaude]);
  const { carregando, dados, erro, recarregar } = useSaudeApi(buscador);

  return (
    <main className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center gap-6 px-4 py-12">
      <header className="text-center">
        <span className="inline-block rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-900">
          Base técnica - Fase 06
        </span>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--cor-texto-principal)]">
          Lume: Horizonte Vivo
        </h1>
        <p className="mt-2 max-w-xl text-sm text-[var(--cor-texto-suave)]">
          Fundação inicial em React, TypeScript estrito, Tailwind CSS e FastAPI pronta para os
          próximos ciclos de desenvolvimento.
        </p>
      </header>

      <CartaoStatusApi
        carregando={carregando}
        dados={dados}
        erro={erro}
        aoTentarNovamente={() => {
          void recarregar();
        }}
      />
    </main>
  );
}
