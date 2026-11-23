import '@xyflow/react/dist/style.css';

import {
  Background,
  BackgroundVariant,
  Controls,
  ReactFlow,
  ReactFlowProvider,
  type Edge,
  type NodeTypes,
  type OnNodesChange,
  type Viewport,
} from '@xyflow/react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Compass,
  MoonStar,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Sparkles,
  Sun,
} from 'lucide-react';
import {
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Link } from 'react-router';
import type { DadosFaseLunar } from '../../astronomia/fase-lunar';
import type { MomentoDoDia } from '../../astronomia/tipos';
import { Botao } from '../../componentes/Botao';
import { CartaoBento } from '../../componentes/CartaoBento';
import { usePollingInteligente } from '../../hooks/usar-polling-inteligente';
import { ErroApi } from '../../servicos/cliente-http';
import type {
  LayoutConstelacao,
  PosicaoNoMapa,
  ServicoConstelacoesFrontend,
  ViewportMapa,
} from '../../servicos/tipos-constelacoes';
import type {
  EntradaAtribuirResponsavel,
  ServicoGruposFrontend,
} from '../../servicos/tipos-grupos';
import type {
  BlocoNota,
  EntradaAtualizarTarefa,
  MetadadosVisuaisTarefa,
  ServicoJornadaFrontend,
  TarefaArvore,
} from '../../servicos/tipos-jornada';
import { INTERVALO_POLLING_GRUPO_MS } from '../grupos/logica-grupos';
import { GavetaEdicaoTarefa } from '../jornada/GavetaEdicaoTarefa';
import { calcularProgressoGeralJornada } from '../jornada/logica-jornada';
import {
  calcularLayoutAutomaticoArvore,
  construirGrafoMapa,
  deslocarPosicaoNo,
  type DirecaoMovimentoMapa,
  encontrarNoNaArvorePorId,
  mesclarPosicoesComLayoutSalvo,
  navegarNoPorTeclado,
  resolverModoVisualMapa,
  type TipoNoMapaLume,
} from './logica-mapa';
import { NoMapaLume } from './NoMapaLume';

const TIPOS_NO_MAPA: NodeTypes = {
  tarefaLume: NoMapaLume,
};

export interface PropriedadesPaginaMapaConstelacao {
  momentoDoDia: MomentoDoDia;
  faseLunar: DadosFaseLunar;
  reduzirMovimento: boolean;
  servicoJornada: ServicoJornadaFrontend;
  servicoGrupos: ServicoGruposFrontend;
  servicoConstelacoes: ServicoConstelacoesFrontend;
  aoMudarProgressoJornada?: (progresso: number) => void;
}

export function PaginaMapaConstelacao({
  momentoDoDia,
  faseLunar,
  reduzirMovimento,
  servicoJornada,
  servicoGrupos,
  servicoConstelacoes,
  aoMudarProgressoJornada,
}: PropriedadesPaginaMapaConstelacao) {
  const queryClient = useQueryClient();
  const modoVisual = resolverModoVisualMapa(momentoDoDia);
  const ehEstelar = modoVisual === 'constelacao_luminosa';

  const [raizSelecionadaManualId, setRaizSelecionadaManualId] = useState<string | null>(null);
  const [noSelecionadoManualId, setNoSelecionadoManualId] = useState<string | null>(null);
  const [recolhidosPorRaiz, setRecolhidosPorRaiz] = useState<Record<string, string[]>>({});
  const [posicoesEditadasPorRaiz, setPosicoesEditadasPorRaiz] = useState<
    Record<string, Record<string, PosicaoNoMapa>>
  >({});
  const [viewportEditadoPorRaiz, setViewportEditadoPorRaiz] = useState<
    Record<string, ViewportMapa>
  >({});
  const [tituloSubtarefa, setTituloSubtarefa] = useState('');
  const [tarefaDetalhesId, setTarefaDetalhesId] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const tarefasQuery = useQuery({
    queryKey: ['tarefas', 'mapa'],
    queryFn: () => servicoJornada.listarTarefas({ incluirConcluidas: true, formato: 'arvore' }),
  });

  const etiquetasQuery = useQuery({
    queryKey: ['etiquetas'],
    queryFn: () => servicoJornada.listarEtiquetas(),
  });

  const raizes = useMemo(() => tarefasQuery.data?.itens ?? [], [tarefasQuery.data]);
  const raizAtiva = useMemo(() => {
    if (raizes.length === 0) {
      return null;
    }
    return raizes.find((item) => item.id === raizSelecionadaManualId) ?? raizes[0] ?? null;
  }, [raizes, raizSelecionadaManualId]);

  const progressoGeral = useMemo(() => calcularProgressoGeralJornada(raizes), [raizes]);
  useEffect(() => {
    aoMudarProgressoJornada?.(progressoGeral);
  }, [aoMudarProgressoJornada, progressoGeral]);

  const raizAtivaId = raizAtiva?.id ?? null;

  const layoutQuery = useQuery({
    queryKey: ['constelacao-layout', raizAtivaId],
    enabled: raizAtivaId !== null,
    queryFn: () => servicoConstelacoes.obterLayout(raizAtivaId as string),
  });

  const painelGrupoQuery = useQuery({
    queryKey: ['grupo-painel', raizAtivaId],
    enabled: Boolean(raizAtiva?.compartilhada && raizAtivaId),
    queryFn: () => servicoGrupos.obterDesempenhoGrupo(raizAtivaId as string),
  });

  const detalhesQuery = useQuery({
    queryKey: ['tarefa-detalhes', tarefaDetalhesId],
    enabled: tarefaDetalhesId !== null,
    queryFn: () => servicoJornada.obterTarefa(tarefaDetalhesId as string),
  });

  const recolhidosAtivos = useMemo(
    () => new Set(raizAtivaId ? (recolhidosPorRaiz[raizAtivaId] ?? []) : []),
    [raizAtivaId, recolhidosPorRaiz],
  );

  const automatico = useMemo(() => {
    if (!raizAtiva) {
      return {
        idsVisiveis: [],
        itensVisiveis: [],
        posicoes: {},
        arestas: [],
      };
    }
    return calcularLayoutAutomaticoArvore(raizAtiva, recolhidosAtivos);
  }, [raizAtiva, recolhidosAtivos]);

  const posicoesMescladas = useMemo(() => {
    const base = mesclarPosicoesComLayoutSalvo(automatico.posicoes, layoutQuery.data);
    const edicaoLocal = raizAtivaId ? posicoesEditadasPorRaiz[raizAtivaId] : undefined;
    if (!edicaoLocal) {
      return base;
    }
    const combinado: Record<string, PosicaoNoMapa> = { ...base };
    for (const [id, pos] of Object.entries(edicaoLocal)) {
      if (id in combinado) {
        combinado[id] = pos;
      }
    }
    return combinado;
  }, [automatico.posicoes, layoutQuery.data, posicoesEditadasPorRaiz, raizAtivaId]);

  const viewportAtual = useMemo<ViewportMapa>(() => {
    if (raizAtivaId && viewportEditadoPorRaiz[raizAtivaId]) {
      return viewportEditadoPorRaiz[raizAtivaId];
    }
    return layoutQuery.data?.viewport ?? { zoom: 1, centroX: 0, centroY: 0 };
  }, [layoutQuery.data?.viewport, raizAtivaId, viewportEditadoPorRaiz]);

  const noSelecionadoId = useMemo(() => {
    if (!raizAtiva) {
      return null;
    }
    if (noSelecionadoManualId && automatico.idsVisiveis.includes(noSelecionadoManualId)) {
      return noSelecionadoManualId;
    }
    return raizAtiva.id;
  }, [automatico.idsVisiveis, noSelecionadoManualId, raizAtiva]);

  const noSelecionado = useMemo(
    () => (raizAtiva ? encontrarNoNaArvorePorId([raizAtiva], noSelecionadoId) : null),
    [noSelecionadoId, raizAtiva],
  );

  const recarregarMapaEMembros = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: ['tarefas'] });
    if (raizAtivaId && raizAtiva?.compartilhada) {
      await queryClient.invalidateQueries({ queryKey: ['grupo-painel', raizAtivaId] });
    }
  }, [queryClient, raizAtiva?.compartilhada, raizAtivaId]);

  usePollingInteligente({
    ativo: Boolean(raizAtiva?.compartilhada),
    intervaloMs: INTERVALO_POLLING_GRUPO_MS,
    aoAtualizar: recarregarMapaEMembros,
  });

  const lidarErroMutacao = useCallback((erro: unknown) => {
    if (erro instanceof ErroApi) {
      setMensagemErro(erro.mensagem);
      return;
    }
    setMensagemErro('Não foi possível concluir a ação no Mapa Visual.');
  }, []);

  const salvarLayoutMutation = useMutation({
    mutationFn: (param: {
      raizId: string;
      nos: Record<string, PosicaoNoMapa>;
      viewport: ViewportMapa;
    }) =>
      servicoConstelacoes.salvarLayout(param.raizId, { nos: param.nos, viewport: param.viewport }),
    onSuccess: (layoutAtualizado, variaveis) => {
      setMensagemErro(null);
      queryClient.setQueryData<LayoutConstelacao>(
        ['constelacao-layout', variaveis.raizId],
        layoutAtualizado,
      );
      setPosicoesEditadasPorRaiz((anterior) => {
        const copia = { ...anterior };
        delete copia[variaveis.raizId];
        return copia;
      });
    },
    onError: lidarErroMutacao,
  });

  const limparLayoutMutation = useMutation({
    mutationFn: (raizId: string) => servicoConstelacoes.limparLayout(raizId),
    onSuccess: (_resp, raizId) => {
      setMensagemErro(null);
      queryClient.setQueryData<LayoutConstelacao>(['constelacao-layout', raizId], {
        tarefaRaizId: raizId,
        nos: {},
        viewport: { zoom: 1, centroX: 0, centroY: 0 },
        atualizadoEm: null,
      });
      setPosicoesEditadasPorRaiz((anterior) => {
        const copia = { ...anterior };
        delete copia[raizId];
        return copia;
      });
      setViewportEditadoPorRaiz((anterior) => {
        const copia = { ...anterior };
        delete copia[raizId];
        return copia;
      });
    },
    onError: lidarErroMutacao,
  });

  const criarSubtarefaMutation = useMutation({
    mutationFn: (entrada: { titulo: string; tarefaPaiId: string }) =>
      servicoJornada.criarTarefa({
        titulo: entrada.titulo,
        tarefaPaiId: entrada.tarefaPaiId,
        turno: noSelecionado?.turno ?? 'livre',
      }),
    onSuccess: async () => {
      setMensagemErro(null);
      setTituloSubtarefa('');
      await recarregarMapaEMembros();
    },
    onError: lidarErroMutacao,
  });

  const alternarConclusaoMutation = useMutation({
    mutationFn: async (tarefa: TarefaArvore): Promise<void> => {
      if (tarefa.status === 'concluida') {
        await servicoJornada.reabrirTarefa(tarefa.id);
        return;
      }
      await servicoJornada.concluirTarefa(tarefa.id, tarefa.subtarefas.length > 0);
    },
    onSuccess: async () => {
      setMensagemErro(null);
      await recarregarMapaEMembros();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const atualizarTarefaMutation = useMutation({
    mutationFn: (param: { tarefaId: string; entrada: EntradaAtualizarTarefa }) =>
      servicoJornada.atualizarTarefa(param.tarefaId, param.entrada),
    onSuccess: async () => {
      await recarregarMapaEMembros();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const moverTarefaMutation = useMutation({
    mutationFn: (param: { tarefaId: string; novoPaiId: string | null }) =>
      servicoJornada.moverTarefa(param.tarefaId, param.novoPaiId),
    onSuccess: async () => {
      await recarregarMapaEMembros();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const atribuirResponsavelMutation = useMutation({
    mutationFn: (param: { tarefaId: string; entrada: EntradaAtribuirResponsavel }) =>
      servicoGrupos.atribuirResponsavel(param.tarefaId, param.entrada),
    onSuccess: async () => {
      await recarregarMapaEMembros();
      if (tarefaDetalhesId) {
        await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
      }
    },
    onError: lidarErroMutacao,
  });

  const salvarDetalhesMutation = useMutation({
    mutationFn: (param: {
      tarefaId: string;
      entrada: { metadadosVisuais: MetadadosVisuaisTarefa; notasEmBlocos: BlocoNota[] };
    }) => servicoJornada.salvarDetalhes(param.tarefaId, param.entrada),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['tarefa-detalhes', tarefaDetalhesId] });
    },
    onError: lidarErroMutacao,
  });

  const aoAlternarRecolher = useCallback(
    (tarefaId: string) => {
      if (!raizAtivaId) {
        return;
      }
      setRecolhidosPorRaiz((anterior) => {
        const atual = new Set(anterior[raizAtivaId] ?? []);
        if (atual.has(tarefaId)) {
          atual.delete(tarefaId);
        } else {
          atual.add(tarefaId);
        }
        return { ...anterior, [raizAtivaId]: [...atual] };
      });
    },
    [raizAtivaId],
  );

  const aoAlternarConclusao = useCallback(
    (tarefa: TarefaArvore) => {
      alternarConclusaoMutation.mutate(tarefa);
    },
    [alternarConclusaoMutation],
  );

  const grafo = useMemo(
    () =>
      construirGrafoMapa({
        itensVisiveis: automatico.itensVisiveis,
        arestas: automatico.arestas,
        posicoes: posicoesMescladas,
        modoVisual,
        noSelecionadoId,
        ocupado: alternarConclusaoMutation.isPending,
        reduzirMovimento,
        aoSelecionarNo: setNoSelecionadoManualId,
        aoAlternarRecolher,
        aoAlternarConclusao,
        aoAbrirDetalhes: setTarefaDetalhesId,
      }),
    [
      alternarConclusaoMutation.isPending,
      aoAlternarConclusao,
      aoAlternarRecolher,
      automatico.arestas,
      automatico.itensVisiveis,
      modoVisual,
      noSelecionadoId,
      posicoesMescladas,
      reduzirMovimento,
    ],
  );

  const moverNoSelecionado = useCallback(
    (direcao: DirecaoMovimentoMapa) => {
      if (!raizAtivaId || !noSelecionadoId) {
        return;
      }
      const posAtual = posicoesMescladas[noSelecionadoId] ?? { x: 0, y: 0, fixado: false };
      const novaPosicao = deslocarPosicaoNo(posAtual, direcao);
      const mapaAtualizado: Record<string, PosicaoNoMapa> = {
        ...posicoesMescladas,
        [noSelecionadoId]: novaPosicao,
      };
      setPosicoesEditadasPorRaiz((anterior) => ({
        ...anterior,
        [raizAtivaId]: {
          ...(anterior[raizAtivaId] ?? {}),
          [noSelecionadoId]: novaPosicao,
        },
      }));
      salvarLayoutMutation.mutate({
        raizId: raizAtivaId,
        nos: mapaAtualizado,
        viewport: viewportAtual,
      });
    },
    [noSelecionadoId, posicoesMescladas, raizAtivaId, salvarLayoutMutation, viewportAtual],
  );

  const aoMudarNos: OnNodesChange<TipoNoMapaLume> = useCallback(
    (mudancas) => {
      if (!raizAtivaId) {
        return;
      }
      const movimentos = mudancas.getByType('position');
      if (movimentos.length === 0) {
        return;
      }
      setPosicoesEditadasPorRaiz((anterior) => {
        const atualRaiz = { ...(anterior[raizAtivaId] ?? {}) };
        for (const item of movimentos) {
          if (item.position) {
            atualRaiz[item.id] = {
              x: Math.round(item.position.x),
              y: Math.round(item.position.y),
              fixado: true,
            };
          }
        }
        return { ...anterior, [raizAtivaId]: atualRaiz };
      });
    },
    [raizAtivaId],
  );

  const aoFinalizarArraste = useCallback(
    (evento: unknown, no: TipoNoMapaLume) => {
      void evento;
      if (!raizAtivaId) {
        return;
      }
      const mapaAtualizado: Record<string, PosicaoNoMapa> = {
        ...posicoesMescladas,
        [no.id]: {
          x: Math.round(no.position.x),
          y: Math.round(no.position.y),
          fixado: true,
        },
      };
      salvarLayoutMutation.mutate({
        raizId: raizAtivaId,
        nos: mapaAtualizado,
        viewport: viewportAtual,
      });
    },
    [posicoesMescladas, raizAtivaId, salvarLayoutMutation, viewportAtual],
  );

  const aoFinalizarViewport = useCallback(
    (evento: unknown, vp: Viewport) => {
      void evento;
      if (!raizAtivaId) {
        return;
      }
      const zoomNormalizado = Math.max(0.2, Math.min(3, Number(vp.zoom.toFixed(2))));
      const novoViewport: ViewportMapa = {
        zoom: zoomNormalizado,
        centroX: Math.round(vp.x),
        centroY: Math.round(vp.y),
      };
      setViewportEditadoPorRaiz((anterior) => ({
        ...anterior,
        [raizAtivaId]: novoViewport,
      }));
    },
    [raizAtivaId],
  );

  const lidarTeclaCanvas = useCallback(
    (evento: KeyboardEvent<HTMLDivElement>) => {
      const alvo = evento.target;
      if (
        alvo instanceof HTMLInputElement ||
        alvo instanceof HTMLTextAreaElement ||
        alvo instanceof HTMLSelectElement
      ) {
        return;
      }
      const direcoesShift: Record<string, DirecaoMovimentoMapa> = {
        ArrowLeft: 'esquerda',
        ArrowRight: 'direita',
        ArrowUp: 'cima',
        ArrowDown: 'baixo',
      };
      if (evento.shiftKey && evento.key in direcoesShift) {
        evento.preventDefault();
        moverNoSelecionado(direcoesShift[evento.key]);
        return;
      }
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(evento.key)) {
        evento.preventDefault();
        const proximoId = navegarNoPorTeclado(automatico.idsVisiveis, noSelecionadoId, evento.key);
        if (proximoId) {
          setNoSelecionadoManualId(proximoId);
        }
      }
    },
    [automatico.idsVisiveis, moverNoSelecionado, noSelecionadoId],
  );

  const lidarEnviarSubtarefa = (evento: FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    if (!noSelecionado || noSelecionado.profundidade >= 4) {
      return;
    }
    const limpo = tituloSubtarefa.trim();
    if (!limpo) {
      return;
    }
    criarSubtarefaMutation.mutate({ titulo: limpo, tarefaPaiId: noSelecionado.id });
  };

  if (tarefasQuery.isPending) {
    return (
      <CartaoBento className="p-6">
        <p className="text-sm font-medium text-[var(--texto-sec)]">
          Preparando o Mapa Visual de Constelação e Ramos...
        </p>
      </CartaoBento>
    );
  }

  return (
    <div className="space-y-4">
      <CartaoBento className="p-4 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-['Fraunces',serif] text-2xl font-bold text-[var(--texto)]">
                Mapa visual
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                  ehEstelar
                    ? 'bg-indigo-500/20 text-indigo-300'
                    : 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {ehEstelar ? (
                  <MoonStar className="h-3.5 w-3.5" aria-hidden="true" />
                ) : (
                  <Sun className="h-3.5 w-3.5" aria-hidden="true" />
                )}
                <span>{ehEstelar ? 'Constelação luminosa' : 'Ramos botânicos'}</span>
              </span>
              <span className="rounded-full bg-[var(--superficie-alt)] px-3 py-1 text-xs text-[var(--texto-sec)]">
                Lua {faseLunar.nome}
              </span>
            </div>
            <p className="mt-1 text-xs text-[var(--texto-sec)]">
              Organize suas árvores espacialmente no céu do Lume. As coordenadas personalizadas
              ficam salvas por tarefa raiz.
            </p>
          </div>

          {raizes.length > 0 && raizAtiva && (
            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor="seletor-raiz-mapa">
                Selecionar tarefa raiz
              </label>
              <select
                id="seletor-raiz-mapa"
                aria-label="Selecionar tarefa raiz"
                value={raizAtiva.id}
                onChange={(evento) => {
                  setRaizSelecionadaManualId(evento.target.value);
                  setNoSelecionadoManualId(evento.target.value);
                }}
                className="min-h-10 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm font-medium text-[var(--texto)]"
              >
                {raizes.map((raiz) => (
                  <option key={raiz.id} value={raiz.id}>
                    {raiz.titulo}
                  </option>
                ))}
              </select>

              <Botao
                variante="secundario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                disabled={salvarLayoutMutation.isPending}
                onClick={() => {
                  if (!raizAtivaId) {
                    return;
                  }
                  salvarLayoutMutation.mutate({
                    raizId: raizAtivaId,
                    nos: posicoesMescladas,
                    viewport: viewportAtual,
                  });
                }}
              >
                <Save className="h-4 w-4" aria-hidden="true" />
                <span>{salvarLayoutMutation.isPending ? 'Salvando...' : 'Salvar layout'}</span>
              </Botao>

              <Botao
                variante="secundario"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                disabled={limparLayoutMutation.isPending}
                onClick={() => {
                  if (raizAtivaId) {
                    limparLayoutMutation.mutate(raizAtivaId);
                  }
                }}
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Reorganizar constelação</span>
              </Botao>

              <Botao
                variante="fantasma"
                tamanho="sm"
                reduzirMovimento={reduzirMovimento}
                onClick={() => {
                  void recarregarMapaEMembros();
                }}
                aria-label="Atualizar dados do mapa"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </Botao>
            </div>
          )}
        </div>

        {mensagemErro && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300"
          >
            {mensagemErro}
          </p>
        )}
      </CartaoBento>

      {raizes.length === 0 ? (
        <CartaoBento className="flex flex-col items-center gap-4 p-8 text-center">
          <Sparkles className="h-9 w-9 text-[var(--primaria)]" aria-hidden="true" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-[var(--texto)]">
              Nenhuma tarefa composta disponível para mapear ainda
            </h2>
            <p className="text-sm text-[var(--texto-sec)]">
              Crie sua primeira tarefa raiz na Jornada do Dia e retorne para desenhá-la no Mapa.
            </p>
          </div>
          <Link
            to="/jornada"
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--primaria)] px-4 py-2 text-sm font-semibold text-[var(--primaria-texto)]"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
            <span>Ir para Jornada do Dia</span>
          </Link>
        </CartaoBento>
      ) : (
        <>
          <CartaoBento className="p-3 sm:p-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <form
                onSubmit={lidarEnviarSubtarefa}
                className="flex flex-1 flex-wrap items-center gap-2"
              >
                <label className="sr-only" htmlFor="input-subtarefa-mapa">
                  Nova subtarefa neste ramo
                </label>
                <input
                  id="input-subtarefa-mapa"
                  type="text"
                  value={tituloSubtarefa}
                  disabled={!noSelecionado || noSelecionado.profundidade >= 4}
                  onChange={(evento) => setTituloSubtarefa(evento.target.value)}
                  placeholder={
                    noSelecionado && noSelecionado.profundidade >= 4
                      ? 'Limite de 5 níveis atingido neste nó'
                      : `Adicionar subtarefa em "${noSelecionado?.titulo ?? ''}"...`
                  }
                  className="min-h-10 min-w-[220px] flex-1 rounded-xl border border-[var(--borda)] bg-[var(--superficie-alt)] px-3 text-sm text-[var(--texto)] placeholder:text-[var(--texto-sec)]"
                />
                <Botao
                  type="submit"
                  tamanho="sm"
                  reduzirMovimento={reduzirMovimento}
                  disabled={
                    !noSelecionado ||
                    noSelecionado.profundidade >= 4 ||
                    criarSubtarefaMutation.isPending ||
                    tituloSubtarefa.trim().length === 0
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  <span>Adicionar ao mapa</span>
                </Botao>
              </form>

              <div
                aria-label="Navegação e posicionamento por teclado"
                className="flex flex-wrap items-center gap-1.5"
              >
                <span className="mr-1 text-xs font-medium text-[var(--texto-sec)]">
                  Selecionado:{' '}
                  <strong className="text-[var(--texto)]">{noSelecionado?.titulo}</strong>
                </span>
                <button
                  type="button"
                  aria-label="Nó anterior"
                  onClick={() => {
                    const anterior = navegarNoPorTeclado(
                      automatico.idsVisiveis,
                      noSelecionadoId,
                      'ArrowLeft',
                    );
                    if (anterior) {
                      setNoSelecionadoManualId(anterior);
                    }
                  }}
                  className="rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-1 text-xs font-medium text-[var(--texto)]"
                >
                  Anterior
                </button>
                <button
                  type="button"
                  aria-label="Próximo nó"
                  onClick={() => {
                    const proximo = navegarNoPorTeclado(
                      automatico.idsVisiveis,
                      noSelecionadoId,
                      'ArrowRight',
                    );
                    if (proximo) {
                      setNoSelecionadoManualId(proximo);
                    }
                  }}
                  className="rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] px-2 py-1 text-xs font-medium text-[var(--texto)]"
                >
                  Próximo
                </button>
                <button
                  type="button"
                  aria-label="Mover nó à esquerda"
                  onClick={() => moverNoSelecionado('esquerda')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Mover nó à direita"
                  onClick={() => moverNoSelecionado('direita')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
                >
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Mover nó para cima"
                  onClick={() => moverNoSelecionado('cima')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
                >
                  <ArrowUp className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  aria-label="Mover nó para baixo"
                  onClick={() => moverNoSelecionado('baixo')}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--borda)] bg-[var(--superficie-alt)] text-[var(--texto)]"
                >
                  <ArrowDown className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </CartaoBento>

          <div
            tabIndex={0}
            aria-label="Canvas interativo do Mapa Visual de Constelação e Ramos"
            onKeyDown={lidarTeclaCanvas}
            style={{ width: '100%', height: 560 }}
            className={`relative h-[560px] w-full overflow-hidden rounded-3xl border border-[var(--borda)] backdrop-blur-md focus:ring-2 focus:ring-[var(--primaria)] focus:outline-none ${
              ehEstelar ? 'bg-slate-950/45' : 'bg-[var(--superficie)]/45'
            }`}
          >
            <ReactFlowProvider>
              <ReactFlow<TipoNoMapaLume, Edge>
                nodes={grafo.nodes}
                edges={grafo.edges}
                nodeTypes={TIPOS_NO_MAPA}
                onNodesChange={aoMudarNos}
                onNodeDragStop={aoFinalizarArraste}
                onMoveEnd={aoFinalizarViewport}
                minZoom={0.2}
                maxZoom={3}
                fitView
                proOptions={{ hideAttribution: true }}
              >
                <Background
                  variant={BackgroundVariant.Dots}
                  gap={24}
                  size={1.2}
                  color={ehEstelar ? 'rgba(186, 230, 253, 0.25)' : 'rgba(56, 132, 86, 0.22)'}
                />
                <Controls showInteractive={false} />
              </ReactFlow>
            </ReactFlowProvider>
          </div>
        </>
      )}

      <GavetaEdicaoTarefa
        aberto={tarefaDetalhesId !== null}
        detalhe={detalhesQuery.data ?? null}
        carregando={detalhesQuery.isPending}
        arvoreCompleta={raizes}
        etiquetas={etiquetasQuery.data?.itens ?? []}
        painelGrupo={painelGrupoQuery.data ?? null}
        salvandoTarefa={atualizarTarefaMutation.isPending}
        salvandoDetalhes={salvarDetalhesMutation.isPending}
        movendo={moverTarefaMutation.isPending}
        atribuindoResponsavel={atribuirResponsavelMutation.isPending}
        aoFechar={() => setTarefaDetalhesId(null)}
        aoAtualizarTarefa={(tarefaId, entrada) =>
          atualizarTarefaMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        aoMoverTarefa={(tarefaId, novoPaiId) =>
          moverTarefaMutation.mutateAsync({ tarefaId, novoPaiId }).then(() => undefined)
        }
        aoAtribuirResponsavel={(tarefaId, entrada) =>
          atribuirResponsavelMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        aoSalvarDetalhes={(tarefaId, entrada) =>
          salvarDetalhesMutation.mutateAsync({ tarefaId, entrada }).then(() => undefined)
        }
        reduzirMovimento={reduzirMovimento}
      />
    </div>
  );
}
