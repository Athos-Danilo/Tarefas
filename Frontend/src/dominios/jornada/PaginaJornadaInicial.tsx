import { ArrowRight, Sparkles } from 'lucide-react';
import { Link } from 'react-router';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import type { MomentoDoDia } from '../../astronomia/tipos';
import { BarraArcoDoDia } from '../../cenario/BarraArcoDoDia';
import { CartaoBento } from '../../componentes/CartaoBento';
import { useAutenticacao } from '../../hooks/usar-autenticacao';

export interface PropriedadesPaginaJornadaInicial {
  minuto: number;
  momentoDoDia: MomentoDoDia;
  nomeMomento: string;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
  suporteWebGL: boolean;
}

export function PaginaJornadaInicial({
  minuto,
  momentoDoDia,
  nomeMomento,
  faseLunar,
  reduzirMovimento,
  suporteWebGL,
}: PropriedadesPaginaJornadaInicial) {
  const { estadoSessao, tutorialSolicitadoRevisao } = useAutenticacao();

  if (!estadoSessao.autenticado) {
    return null;
  }

  const { usuario } = estadoSessao;
  const avatarSrc = usuario.avatarUrl ?? '/assets-3d/avatares/sol-nascente.png';

  return (
    <div className="space-y-6">
      <CartaoBento destacado className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <img
            src={avatarSrc}
            alt={`Avatar ativo de ${usuario.nomeExibicao}`}
            width={56}
            height={56}
            className="h-14 w-14 rounded-full border border-[var(--borda)] object-cover"
          />
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primaria)]">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              Espaço autenticado do Lume
            </span>
            <h1 className="fonte-display text-2xl font-bold text-[var(--texto)]">
              Olá, {usuario.nomeExibicao}
            </h1>
          </div>
        </div>

        <Link
          to="/perfil"
          className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-4 py-2 text-sm font-semibold text-[var(--texto)]"
        >
          <span>Gerenciar perfil e conta</span>
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </CartaoBento>

      {tutorialSolicitadoRevisao ? (
        <CartaoBento role="status" className="border-l-4 border-l-[var(--primaria)]">
          <p className="text-sm font-medium text-[var(--texto)]">
            Revisão do Modo Tutorial solicitada. O tour interativo completo em 6 passos será
            acoplado na Fase 22.
          </p>
        </CartaoBento>
      ) : null}

      <BarraArcoDoDia
        minuto={minuto}
        momentoDoDia={momentoDoDia}
        nomeMomento={nomeMomento}
        faseLunar={faseLunar}
        reduzirMovimento={reduzirMovimento}
        suporteWebGL={suporteWebGL}
      />

      <CartaoBento className="space-y-2">
        <h2 className="fonte-display text-lg font-bold text-[var(--texto)]">
          Jornada do Dia pronta para a Fase 16
        </h2>
        <p className="text-sm text-[var(--texto-sec)]">
          Sua sessão, nome de exibição e avatar já estão integrados ao backend. Na próxima fase,
          esta visão receberá a lista hierárquica completa em árvore até 5 níveis, recorrência,
          etiquetas, notas em blocos e clima local opt-in.
        </p>
      </CartaoBento>
    </div>
  );
}
