import type { FaixaFavicon } from '../astronomia/tipos';
import { FASES_FAVICON } from '../estilos/controlador-favicon';

export interface PropriedadesSeloMarcaLume {
  faixaFavicon: FaixaFavicon;
  tamanho?: 'compacto' | 'hero';
}

export function SeloMarcaLume({ faixaFavicon, tamanho = 'compacto' }: PropriedadesSeloMarcaLume) {
  const infoFavicon = FASES_FAVICON[faixaFavicon];
  const dimensao = tamanho === 'hero' ? 56 : 42;

  return (
    <div className="inline-flex items-center gap-3">
      <img
        src={infoFavicon.arquivo}
        alt={`Símbolo Sol de 4 Ls do Lume (${infoFavicon.nome})`}
        width={dimensao}
        height={dimensao}
        className="shrink-0 drop-shadow-sm"
      />
      <div className="min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="fonte-display text-2xl font-bold tracking-tight text-[var(--texto)]">
            Lume
          </span>
          <span className="numero-tabular rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-0.5 text-xs font-semibold text-[var(--primaria)]">
            {infoFavicon.nome}
          </span>
        </div>
        <p className="text-xs text-[var(--texto-sec)]">
          Suas <strong className="font-bold text-[var(--texto)]">tarefas</strong> no{' '}
          <em className="fonte-display font-semibold italic text-[var(--primaria)]">ritmo vivo</em>{' '}
          do dia.
        </p>
      </div>
    </div>
  );
}
