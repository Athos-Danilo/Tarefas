import * as Tabs from '@radix-ui/react-tabs';
import type { ReactNode } from 'react';

export interface ItemAba {
  valor: string;
  rotulo: string;
  conteudo: ReactNode;
}

export interface PropriedadesAbasAcessiveis {
  valorAtivo: string;
  aoMudarValor: (valor: string) => void;
  rotuloGrupo: string;
  itens: ReadonlyArray<ItemAba>;
}

export function AbasAcessiveis({
  valorAtivo,
  aoMudarValor,
  rotuloGrupo,
  itens,
}: PropriedadesAbasAcessiveis) {
  return (
    <Tabs.Root value={valorAtivo} onValueChange={aoMudarValor} className="w-full">
      <Tabs.List
        aria-label={rotuloGrupo}
        className="inline-flex flex-wrap gap-1 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] p-1"
      >
        {itens.map((item) => (
          <Tabs.Trigger
            key={item.valor}
            value={item.valor}
            className="min-h-9 cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-[var(--texto-sec)] transition-colors data-[state=active]:bg-[var(--primaria)] data-[state=active]:text-[var(--primaria-texto)]"
          >
            {item.rotulo}
          </Tabs.Trigger>
        ))}
      </Tabs.List>

      {itens.map((item) => (
        <Tabs.Content key={item.valor} value={item.valor} className="mt-3 outline-none">
          {item.conteudo}
        </Tabs.Content>
      ))}
    </Tabs.Root>
  );
}
