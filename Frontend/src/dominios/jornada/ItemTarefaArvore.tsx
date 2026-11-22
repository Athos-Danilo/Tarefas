import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Bell,
  CalendarClock,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  GripVertical,
  Pencil,
  Plus,
  Repeat,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { BadgePrioridade } from '../../componentes/BadgePrioridade';
import type { ItemOrdenacaoIrma, TarefaArvore } from '../../servicos/tipos-jornada';
import {
  calcularNovaOrdenacaoIrmas,
  descreverRecorrencia,
  formatarPrazoCurto,
  PROFUNDIDADE_MAXIMA,
} from './logica-jornada';

export interface PropriedadesItemTarefaArvore {
  tarefa: TarefaArvore;
  irmas: readonly TarefaArvore[];
  indice: number;
  aoConcluir: (tarefaId: string) => void;
  aoReabrir: (tarefaId: string) => void;
  aoSelecionarPaiParaCriar: (tarefa: TarefaArvore) => void;
  aoAbrirEdicao: (tarefaId: string) => void;
  aoExcluir: (tarefaId: string) => void;
  aoReordenarIrmas: (tarefaPaiId: string | null, ordenacao: ItemOrdenacaoIrma[]) => void;
  ocupado?: boolean;
}

export function ItemTarefaArvore({
  tarefa,
  irmas,
  indice,
  aoConcluir,
  aoReabrir,
  aoSelecionarPaiParaCriar,
  aoAbrirEdicao,
  aoExcluir,
  aoReordenarIrmas,
  ocupado = false,
}: PropriedadesItemTarefaArvore) {
  const [expandido, setExpandido] = useState(true);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: tarefa.id,
    data: { tarefaPaiId: tarefa.tarefaPaiId },
  });

  const estiloArrasto: CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  const concluida = tarefa.status === 'concluida';
  const temFilhas = tarefa.subtarefas.length > 0;
  const textoRecorrencia = descreverRecorrencia(tarefa.recorrencia);
  const textoPrazo = formatarPrazoCurto(tarefa.prazo);
  const limiteProfundidadeAtingido = tarefa.profundidade >= PROFUNDIDADE_MAXIMA;
  const mostrarBarraProgresso = temFilhas || tarefa.totalFolhas > 1;

  const moverNaLista = (deslocamento: -1 | 1) => {
    const destino = irmas[indice + deslocamento];
    if (!destino) {
      return;
    }
    const novaOrdenacao = calcularNovaOrdenacaoIrmas(irmas, tarefa.id, destino.id);
    aoReordenarIrmas(tarefa.tarefaPaiId, novaOrdenacao);
  };

  const recuoNivel = Math.min(4, Math.max(0, tarefa.profundidade - 1));

  return (
    <div
      ref={setNodeRef}
      style={estiloArrasto}
      className="space-y-2"
      data-testid={`tarefa-no-${tarefa.id}`}
    >
      <div
        className={`rounded-2xl border p-3 transition-colors ${
          concluida
            ? 'border-[var(--borda)] bg-[var(--superficie-alt)] opacity-85'
            : 'border-[var(--borda)] bg-[var(--superficie-solida)]'
        }`}
        style={{ marginLeft: recuoNivel > 0 ? `${recuoNivel * 16}px` : undefined }}
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-1 items-start gap-2">
            {temFilhas ? (
              <button
                type="button"
                aria-expanded={expandido}
                aria-label={expandido ? `Recolher ${tarefa.titulo}` : `Expandir ${tarefa.titulo}`}
                onClick={() => setExpandido((atual) => !atual)}
                className="mt-0.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
              >
                {expandido ? (
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                )}
              </button>
            ) : (
              <span className="mt-0.5 inline-block h-8 w-8 shrink-0" aria-hidden="true" />
            )}

            <button
              type="button"
              disabled={ocupado}
              aria-label={concluida ? `Reabrir ${tarefa.titulo}` : `Concluir ${tarefa.titulo}`}
              onClick={() => (concluida ? aoReabrir(tarefa.id) : aoConcluir(tarefa.id))}
              className="mt-0.5 inline-flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-[var(--primaria)] hover:bg-[var(--superficie-alt)]"
            >
              {concluida ? (
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Circle className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`text-sm font-bold ${
                    concluida ? 'text-[var(--texto-sec)] line-through' : 'text-[var(--texto)]'
                  }`}
                >
                  {tarefa.titulo}
                </span>

                <span className="rounded-md border border-[var(--borda)] bg-[var(--superficie-alt)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--texto-sec)]">
                  N{tarefa.profundidade}
                </span>

                <BadgePrioridade prioridade={tarefa.prioridade} />

                {tarefa.temFilhaUrgenteAberta ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--prio-urgente)] bg-[var(--superficie-alt)] px-2 py-0.5 text-[11px] font-bold text-[var(--prio-urgente)]">
                    <AlertTriangle className="h-3 w-3" aria-hidden="true" />
                    <span>★ Filha urgente</span>
                  </span>
                ) : null}

                {textoRecorrencia ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-0.5 text-[11px] font-semibold text-[var(--primaria)]">
                    <Repeat className="h-3 w-3" aria-hidden="true" />
                    <span>{textoRecorrencia}</span>
                  </span>
                ) : null}

                {textoPrazo ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-0.5 font-mono text-[11px] text-[var(--texto-sec)]">
                    <CalendarClock className="h-3 w-3" aria-hidden="true" />
                    <span>{textoPrazo}</span>
                  </span>
                ) : null}

                {tarefa.lembretesPendentes > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-0.5 text-[11px] font-semibold text-[var(--secundaria)]">
                    <Bell className="h-3 w-3" aria-hidden="true" />
                    <span>{tarefa.lembretesPendentes}</span>
                  </span>
                ) : null}
              </div>

              {tarefa.etiquetas.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {tarefa.etiquetas.map((etq) => (
                    <span
                      key={etq.id}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-0.5 text-[11px] font-semibold text-[var(--texto)]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: etq.cor }}
                        aria-hidden="true"
                      />
                      <span>{etq.nome}</span>
                    </span>
                  ))}
                </div>
              ) : null}

              {mostrarBarraProgresso ? (
                <div className="flex items-center gap-2 pt-0.5">
                  <div className="h-2 w-32 overflow-hidden rounded-full bg-[var(--superficie-alt)]">
                    <div
                      className="h-full rounded-full bg-[var(--primaria)] transition-all"
                      style={{ width: `${tarefa.percentualConclusao}%` }}
                    />
                  </div>
                  <span className="font-mono text-[11px] font-semibold text-[var(--texto-sec)]">
                    {tarefa.percentualConclusao}% ({tarefa.folhasConcluidas}/{tarefa.totalFolhas})
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label={`Arrastar ${tarefa.titulo}`}
              {...attributes}
              {...listeners}
              className="inline-flex min-h-9 min-w-9 cursor-grab items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto-sec)] active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" aria-hidden="true" />
            </button>

            <button
              type="button"
              disabled={ocupado || indice === 0}
              aria-label={`Mover ${tarefa.titulo} para cima`}
              onClick={() => moverNaLista(-1)}
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              disabled={ocupado || indice === irmas.length - 1}
              aria-label={`Mover ${tarefa.titulo} para baixo`}
              onClick={() => moverNaLista(1)}
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
            </button>

            <button
              type="button"
              disabled={ocupado || limiteProfundidadeAtingido}
              aria-label={`Adicionar subtarefa em ${tarefa.titulo}`}
              title={
                limiteProfundidadeAtingido
                  ? 'Limite máximo de 5 níveis atingido'
                  : 'Adicionar subtarefa'
              }
              onClick={() => aoSelecionarPaiParaCriar(tarefa)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)] disabled:cursor-not-allowed disabled:opacity-45"
            >
              <Plus className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Subtarefa</span>
            </button>

            <button
              type="button"
              aria-label={`Editar e notas de ${tarefa.titulo}`}
              onClick={() => aoAbrirEdicao(tarefa.id)}
              className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2.5 text-xs font-semibold text-[var(--texto)]"
            >
              <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Editar</span>
            </button>

            {concluida ? (
              <button
                type="button"
                disabled={ocupado}
                aria-label={`Reabrir ${tarefa.titulo} rapidamente`}
                onClick={() => aoReabrir(tarefa.id)}
                className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            ) : null}

            <button
              type="button"
              disabled={ocupado}
              aria-label={`Excluir ${tarefa.titulo}`}
              onClick={() => aoExcluir(tarefa.id)}
              className="inline-flex min-h-9 min-w-9 cursor-pointer items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--erro)]"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {temFilhas && expandido ? (
        <SortableContext
          items={tarefa.subtarefas.map((sub) => sub.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2 border-l-2 border-[var(--borda)] pl-3">
            {tarefa.subtarefas.map((sub, indiceSub) => (
              <ItemTarefaArvore
                key={sub.id}
                tarefa={sub}
                irmas={tarefa.subtarefas}
                indice={indiceSub}
                aoConcluir={aoConcluir}
                aoReabrir={aoReabrir}
                aoSelecionarPaiParaCriar={aoSelecionarPaiParaCriar}
                aoAbrirEdicao={aoAbrirEdicao}
                aoExcluir={aoExcluir}
                aoReordenarIrmas={aoReordenarIrmas}
                ocupado={ocupado}
              />
            ))}
          </div>
        </SortableContext>
      ) : null}
    </div>
  );
}
