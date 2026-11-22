import type { PrioridadeTarefa } from '../astronomia/tipos';

export interface PropriedadesBadgePrioridade {
  prioridade: PrioridadeTarefa;
  className?: string;
}

const CONFIG_PRIORIDADE: Record<PrioridadeTarefa, { rotuloCompleto: string; corCss: string }> = {
  baixa: { rotuloCompleto: '● Baixa', corCss: 'var(--prio-baixa)' },
  media: { rotuloCompleto: '▲ Média', corCss: 'var(--prio-media)' },
  alta: { rotuloCompleto: '◆ Alta', corCss: 'var(--prio-alta)' },
  urgente: { rotuloCompleto: '★ Urgente', corCss: 'var(--prio-urgente)' },
};

export function BadgePrioridade({ prioridade, className = '' }: PropriedadesBadgePrioridade) {
  const info = CONFIG_PRIORIDADE[prioridade];

  return (
    <span
      className={`inline-flex items-center rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 py-0.5 text-xs font-bold tracking-tight ${className}`}
      style={{ color: info.corCss }}
    >
      {info.rotuloCompleto}
    </span>
  );
}
