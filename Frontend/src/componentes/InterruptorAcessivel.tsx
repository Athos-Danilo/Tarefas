import * as Switch from '@radix-ui/react-switch';

export interface PropriedadesInterruptorAcessivel {
  id?: string;
  rotulo: string;
  descricao?: string;
  ativado: boolean;
  aoAlternar: (ativado: boolean) => void;
  desabilitado?: boolean;
}

export function InterruptorAcessivel({
  id,
  rotulo,
  descricao,
  ativado,
  aoAlternar,
  desabilitado = false,
}: PropriedadesInterruptorAcessivel) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2">
      <div className="min-w-0">
        <label
          htmlFor={id}
          className="block cursor-pointer text-xs font-semibold text-[var(--texto)]"
        >
          {rotulo}
        </label>
        {descricao ? <p className="text-xs text-[var(--texto-sec)]">{descricao}</p> : null}
      </div>
      <Switch.Root
        id={id}
        aria-label={rotulo}
        checked={ativado}
        disabled={desabilitado}
        onCheckedChange={aoAlternar}
        className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border border-[var(--borda)] bg-[var(--superficie-solida)] p-0.5 transition-colors data-[state=checked]:bg-[var(--primaria)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Switch.Thumb className="block h-4 w-4 translate-x-0 rounded-full bg-[var(--texto)] shadow-sm transition-transform data-[state=checked]:translate-x-5 data-[state=checked]:bg-[var(--primaria-texto)]" />
      </Switch.Root>
    </div>
  );
}
