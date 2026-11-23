import { Handle, Position, type NodeProps } from '@xyflow/react';
import {
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronRight,
  FileText,
  Sparkles,
  Users,
} from 'lucide-react';
import type { DadosNoMapaLume } from './logica-mapa';

const ROTULOS_PRIORIDADE_NO = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  urgente: 'Urgente',
} as const;

const CORES_PRIORIDADE_NO = {
  baixa: 'bg-slate-500/15 text-slate-600 dark:text-slate-300 border-slate-400/30',
  media: 'bg-sky-500/15 text-sky-700 dark:text-sky-300 border-sky-400/30',
  alta: 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border-amber-400/30',
  urgente: 'bg-rose-500/15 text-rose-800 dark:text-rose-300 border-rose-400/30',
} as const;

function ehDadosNoMapa(dados: Record<string, unknown>): dados is DadosNoMapaLume {
  return 'tarefa' in dados && 'modoVisual' in dados;
}

export function NoMapaLume({ id, data }: NodeProps) {
  if (!ehDadosNoMapa(data)) {
    return null;
  }

  const {
    tarefa,
    modoVisual,
    temFilhas,
    recolhido,
    selecionadoNo,
    ocupado,
    aoSelecionarNo,
    aoAlternarRecolher,
    aoAlternarConclusao,
    aoAbrirDetalhes,
  } = data;

  const concluida = tarefa.status === 'concluida';
  const ehEstelar = modoVisual === 'constelacao_luminosa';

  return (
    <div
      data-testid={`no-mapa-${id}`}
      onClick={() => {
        aoSelecionarNo(tarefa.id);
      }}
      className={`w-64 rounded-2xl border p-3 shadow-lg backdrop-blur-md transition-all ${
        ehEstelar
          ? 'border-sky-300/30 bg-slate-950/75 text-slate-100 shadow-sky-900/30'
          : 'border-emerald-700/25 bg-[var(--superficie)]/90 text-[var(--texto)] shadow-emerald-950/10'
      } ${selecionadoNo ? 'ring-2 ring-[var(--primaria)] ring-offset-2 ring-offset-transparent' : ''} ${
        concluida ? 'opacity-80' : ''
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--primaria)]/70"
      />

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap items-center gap-1.5">
            <span
              className={`rounded-full border px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase ${
                CORES_PRIORIDADE_NO[tarefa.prioridade]
              }`}
            >
              {ROTULOS_PRIORIDADE_NO[tarefa.prioridade]}
            </span>

            {tarefa.profundidade === 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--primaria)]/15 px-2 py-0.5 text-[10px] font-semibold text-[var(--primaria)]">
                <Sparkles className="h-3 w-3" aria-hidden="true" />
                Raiz
              </span>
            ) : (
              <span className="rounded-full bg-black/10 px-2 py-0.5 text-[10px] font-medium opacity-75">
                Nível {tarefa.profundidade + 1}
              </span>
            )}
          </div>

          <h3
            className={`truncate text-sm font-bold ${concluida ? 'line-through opacity-70' : ''}`}
          >
            {tarefa.titulo}
          </h3>
        </div>

        <button
          type="button"
          disabled={ocupado}
          aria-label={
            concluida ? `Reabrir tarefa ${tarefa.titulo}` : `Concluir tarefa ${tarefa.titulo}`
          }
          onClick={(evento) => {
            evento.stopPropagation();
            aoAlternarConclusao(tarefa);
          }}
          className={`nodrag nopan flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border transition-colors ${
            concluida
              ? 'border-emerald-400 bg-emerald-500 text-white'
              : 'border-[var(--borda)] bg-black/5 hover:border-[var(--primaria)]'
          }`}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] opacity-85">
        <span className="rounded-md bg-black/10 px-1.5 py-0.5 font-mono">
          {tarefa.folhasConcluidas}/{tarefa.totalFolhas} folhas ({tarefa.percentualConclusao}%)
        </span>

        {tarefa.temFilhaUrgenteAberta && (
          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/20 px-1.5 py-0.5 font-semibold text-rose-400">
            <AlertTriangle className="h-3 w-3" aria-hidden="true" />
            Filha urgente aberta
          </span>
        )}
      </div>

      {tarefa.responsavel && (
        <div className="mt-2 flex items-center gap-2 rounded-xl border border-white/10 bg-black/10 px-2 py-1">
          {tarefa.responsavel.avatarUrl ? (
            <img
              src={tarefa.responsavel.avatarUrl}
              alt={`Avatar de ${tarefa.responsavel.nomeExibicao}`}
              width={20}
              height={20}
              className="h-5 w-5 rounded-full object-cover"
            />
          ) : (
            <Users className="h-3.5 w-3.5 shrink-0 opacity-75" aria-hidden="true" />
          )}
          <span className="truncate text-[11px] font-medium">
            {tarefa.responsavel.nomeExibicao}
          </span>
        </div>
      )}

      <div className="nodrag nopan mt-2.5 flex items-center justify-between gap-2 border-t border-white/10 pt-2">
        {temFilhas ? (
          <button
            type="button"
            aria-label={
              recolhido ? `Expandir ramo de ${tarefa.titulo}` : `Recolher ramo de ${tarefa.titulo}`
            }
            onClick={(evento) => {
              evento.stopPropagation();
              aoAlternarRecolher(tarefa.id);
            }}
            className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold hover:bg-black/10"
          >
            {recolhido ? (
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            <span>{recolhido ? 'Expandir' : 'Recolher'}</span>
          </button>
        ) : (
          <span className="text-[11px] opacity-60">Nó folha</span>
        )}

        <button
          type="button"
          aria-label={`Abrir detalhes de ${tarefa.titulo}`}
          onClick={(evento) => {
            evento.stopPropagation();
            aoAbrirDetalhes(tarefa.id);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-[var(--primaria)]/15 px-2 py-1 text-[11px] font-semibold text-[var(--primaria)] hover:bg-[var(--primaria)]/25"
        >
          <FileText className="h-3 w-3" aria-hidden="true" />
          <span>Detalhes</span>
        </button>
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!h-2.5 !w-2.5 !border-0 !bg-[var(--primaria)]/70"
      />
    </div>
  );
}
