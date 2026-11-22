import * as Tooltip from '@radix-ui/react-tooltip';
import type { ReactNode } from 'react';

export interface PropriedadesDicaAcessivel {
  conteudo: string;
  children: ReactNode;
}

export function DicaAcessivel({ conteudo, children }: PropriedadesDicaAcessivel) {
  return (
    <Tooltip.Root delayDuration={250}>
      <Tooltip.Trigger asChild>{children}</Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Content
          sideOffset={6}
          className="z-50 rounded-lg border border-[var(--borda)] bg-[var(--superficie-solida)] px-2.5 py-1.5 text-xs font-medium text-[var(--texto)] shadow-lg"
        >
          {conteudo}
          <Tooltip.Arrow className="fill-[var(--superficie-solida)]" />
        </Tooltip.Content>
      </Tooltip.Portal>
    </Tooltip.Root>
  );
}
