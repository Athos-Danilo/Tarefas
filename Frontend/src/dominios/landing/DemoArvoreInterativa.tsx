import { RotateCcw, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { BadgePrioridade } from '../../componentes/BadgePrioridade';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import {
  alternarNoDemo,
  calcularResumoArvoreDemo,
  criarArvoreDemoInicial,
  type NoDemoTarefa,
} from './demo-arvore-local';

export interface PropriedadesDemoArvoreInterativa {
  reduzirMovimento: boolean;
  aoMudarProgresso?: (progresso: number) => void;
}

interface PropriedadesNoLista {
  no: NoDemoTarefa;
  nivel: number;
  aoAlternar: (id: string) => void;
}

function ItemNoDemo({ no, nivel, aoAlternar }: PropriedadesNoLista) {
  const paddingClasse = nivel === 0 ? '' : nivel === 1 ? 'pl-4' : 'pl-8';

  return (
    <li className={`space-y-1.5 ${paddingClasse}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 py-2">
        <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5">
          <input
            type="checkbox"
            checked={no.concluida}
            onChange={() => aoAlternar(no.id)}
            className="h-4 w-4 shrink-0 cursor-pointer accent-[var(--primaria)]"
          />
          <span
            className={`text-sm font-medium ${
              no.concluida ? 'text-[var(--texto-sec)] line-through' : 'text-[var(--texto)]'
            }`}
          >
            {no.titulo}
          </span>
        </label>
        <BadgePrioridade prioridade={no.prioridade} />
      </div>

      {no.filhas.length > 0 ? (
        <ul className="space-y-1.5">
          {no.filhas.map((filha) => (
            <ItemNoDemo key={filha.id} no={filha} nivel={nivel + 1} aoAlternar={aoAlternar} />
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export function DemoArvoreInterativa({
  reduzirMovimento,
  aoMudarProgresso,
}: PropriedadesDemoArvoreInterativa) {
  const [arvore, setArvore] = useState<NoDemoTarefa>(() => criarArvoreDemoInicial());
  const resumo = calcularResumoArvoreDemo(arvore);

  const lidarAlternar = (idAlvo: string) => {
    const proxima = alternarNoDemo(arvore, idAlvo);
    setArvore(proxima);
    aoMudarProgresso?.(calcularResumoArvoreDemo(proxima).progressoNormalizado);
  };

  const lidarReiniciar = () => {
    const inicial = criarArvoreDemoInicial();
    setArvore(inicial);
    aoMudarProgresso?.(calcularResumoArvoreDemo(inicial).progressoNormalizado);
  };

  return (
    <CartaoBento aria-label="Demonstração interativa de árvore composta" className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--borda)] pb-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--primaria)]">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            Demonstração local sem gravação no servidor
          </span>
          <h2 className="fonte-display mt-1 text-lg font-bold text-[var(--texto)]">
            Árvore composta e constelação ao vivo
          </h2>
        </div>

        <Botao
          variante="secundario"
          tamanho="sm"
          reduzirMovimento={reduzirMovimento}
          onClick={lidarReiniciar}
        >
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          Reiniciar demonstração
        </Botao>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-medium text-[var(--texto-sec)]">
            Progresso pelas folhas ({resumo.folhasConcluidas}/{resumo.totalFolhas})
          </span>
          <div className="flex items-center gap-2">
            {resumo.temFilhaUrgenteAberta ? (
              <span
                className="rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 py-0.5 text-xs font-bold"
                style={{ color: 'var(--prio-urgente)' }}
              >
                ★ Filha urgente em aberto
              </span>
            ) : null}
            <span className="numero-tabular text-sm font-bold text-[var(--primaria)]">
              {resumo.percentual}%
            </span>
          </div>
        </div>

        <div
          role="progressbar"
          aria-valuenow={resumo.percentual}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Progresso da demonstração de tarefas"
          className="h-2.5 w-full overflow-hidden rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)]"
        >
          <div
            className="h-full bg-[var(--primaria)] transition-all duration-300"
            style={{ width: `${resumo.percentual}%` }}
          />
        </div>
      </div>

      <ul className="space-y-1.5">
        <ItemNoDemo no={arvore} nivel={0} aoAlternar={lidarAlternar} />
      </ul>
    </CartaoBento>
  );
}
