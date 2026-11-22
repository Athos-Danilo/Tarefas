import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PropriedadesModalAcessivel {
  titulo: string;
  descricao?: string;
  gatilho: ReactNode;
  children: ReactNode;
  aberto?: boolean;
  aoMudarAbertura?: (aberto: boolean) => void;
}

export function ModalAcessivel({
  titulo,
  descricao,
  gatilho,
  children,
  aberto,
  aoMudarAbertura,
}: PropriedadesModalAcessivel) {
  return (
    <Dialog.Root open={aberto} onOpenChange={aoMudarAbertura}>
      <Dialog.Trigger asChild>{gatilho}</Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/55 backdrop-blur-xs" />
        <Dialog.Content className="superficie-bento fixed top-1/2 left-1/2 z-50 w-[min(92vw,32rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl p-6 text-[var(--texto)] shadow-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="fonte-display text-xl font-bold text-[var(--texto)]">
                {titulo}
              </Dialog.Title>
              {descricao ? (
                <Dialog.Description className="mt-1 text-sm text-[var(--texto-sec)]">
                  {descricao}
                </Dialog.Description>
              ) : null}
            </div>
            <Dialog.Close
              aria-label="Fechar janela"
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Dialog.Close>
          </div>
          <div className="mt-4">{children}</div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
