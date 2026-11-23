import type { Edge, Node } from '@xyflow/react';
import type { MomentoDoDia } from '../../astronomia/tipos';
import type { LayoutConstelacao, PosicaoNoMapa } from '../../servicos/tipos-constelacoes';
import type { TarefaArvore } from '../../servicos/tipos-jornada';

export type ModoVisualMapa = 'ramos_botanicos' | 'constelacao_luminosa';

export type DirecaoMovimentoMapa = 'esquerda' | 'direita' | 'cima' | 'baixo';

export const PASSO_MOVIMENTO_TECLADO = 24;
export const COORDENADA_MAPA_MIN = -50000;
export const COORDENADA_MAPA_MAX = 50000;

const ESPACAMENTO_HORIZONTAL = 288;
const ESPACAMENTO_VERTICAL = 196;
const LARGURA_INICIAL_NO = 256;
const ALTURA_INICIAL_NO = 156;

export interface NoVisivelArvore {
  tarefa: TarefaArvore;
  paiId: string | null;
  nivel: number;
  temFilhas: boolean;
  recolhido: boolean;
}

export interface ArestaMapaArvore {
  id: string;
  origemId: string;
  destinoId: string;
}

export interface ResultadoLayoutAutomatico {
  idsVisiveis: string[];
  itensVisiveis: NoVisivelArvore[];
  posicoes: Record<string, PosicaoNoMapa>;
  arestas: ArestaMapaArvore[];
}

export interface DadosNoMapaLume extends Record<string, unknown> {
  tarefa: TarefaArvore;
  modoVisual: ModoVisualMapa;
  temFilhas: boolean;
  recolhido: boolean;
  selecionadoNo: boolean;
  ocupado: boolean;
  aoSelecionarNo: (tarefaId: string) => void;
  aoAlternarRecolher: (tarefaId: string) => void;
  aoAlternarConclusao: (tarefa: TarefaArvore) => void;
  aoAbrirDetalhes: (tarefaId: string) => void;
}

export type TipoNoMapaLume = Node<DadosNoMapaLume, 'tarefaLume'>;

export function resolverModoVisualMapa(momentoDoDia: MomentoDoDia): ModoVisualMapa {
  if (momentoDoDia === 'manha' || momentoDoDia === 'tarde') {
    return 'ramos_botanicos';
  }
  return 'constelacao_luminosa';
}

export function achatarArvoreVisivel(
  raiz: TarefaArvore,
  nosRecolhidos: ReadonlySet<string>,
): { nos: NoVisivelArvore[]; arestas: ArestaMapaArvore[] } {
  const nos: NoVisivelArvore[] = [];
  const arestas: ArestaMapaArvore[] = [];

  const visitar = (atual: TarefaArvore, paiId: string | null, nivel: number): void => {
    const temFilhas = atual.subtarefas.length > 0;
    const recolhido = temFilhas && nosRecolhidos.has(atual.id);
    nos.push({
      tarefa: atual,
      paiId,
      nivel,
      temFilhas,
      recolhido,
    });
    if (paiId !== null) {
      arestas.push({
        id: `${paiId}->${atual.id}`,
        origemId: paiId,
        destinoId: atual.id,
      });
    }
    if (recolhido) {
      return;
    }
    for (const filha of atual.subtarefas) {
      visitar(filha, atual.id, nivel + 1);
    }
  };

  visitar(raiz, null, 0);
  return { nos, arestas };
}

function medirFolhasVisiveis(no: TarefaArvore, nosRecolhidos: ReadonlySet<string>): number {
  if (no.subtarefas.length === 0 || nosRecolhidos.has(no.id)) {
    return 1;
  }
  let soma = 0;
  for (const filha of no.subtarefas) {
    soma += medirFolhasVisiveis(filha, nosRecolhidos);
  }
  return Math.max(1, soma);
}

export function calcularLayoutAutomaticoArvore(
  raiz: TarefaArvore,
  nosRecolhidos: ReadonlySet<string>,
): ResultadoLayoutAutomatico {
  const { nos: itensVisiveis, arestas } = achatarArvoreVisivel(raiz, nosRecolhidos);
  const posicoes: Record<string, PosicaoNoMapa> = {};

  const posicionar = (atual: TarefaArvore, nivel: number, deslocamentoInicio: number): number => {
    const folhas = medirFolhasVisiveis(atual, nosRecolhidos);
    const filhasVisiveis = nosRecolhidos.has(atual.id) ? [] : atual.subtarefas;

    if (filhasVisiveis.length === 0) {
      posicoes[atual.id] = {
        x: Math.round((deslocamentoInicio + 0.5) * ESPACAMENTO_HORIZONTAL),
        y: nivel * ESPACAMENTO_VERTICAL + 40,
        fixado: false,
      };
      return 1;
    }

    let cursor = deslocamentoInicio;
    const centrosFilhos: number[] = [];
    for (const filha of filhasVisiveis) {
      const usadas = posicionar(filha, nivel + 1, cursor);
      const posFilha = posicoes[filha.id];
      if (posFilha) {
        centrosFilhos.push(posFilha.x);
      }
      cursor += usadas;
    }

    const primeiroX = centrosFilhos[0] ?? (deslocamentoInicio + 0.5) * ESPACAMENTO_HORIZONTAL;
    const ultimoX = centrosFilhos[centrosFilhos.length - 1] ?? primeiroX;
    posicoes[atual.id] = {
      x: Math.round((primeiroX + ultimoX) / 2),
      y: nivel * ESPACAMENTO_VERTICAL + 40,
      fixado: false,
    };
    return folhas;
  };

  posicionar(raiz, 0, 0);

  return {
    idsVisiveis: itensVisiveis.map((item) => item.tarefa.id),
    itensVisiveis,
    posicoes,
    arestas,
  };
}

export function mesclarPosicoesComLayoutSalvo(
  automatico: Record<string, PosicaoNoMapa>,
  layoutSalvo?: LayoutConstelacao | null,
): Record<string, PosicaoNoMapa> {
  const combinado: Record<string, PosicaoNoMapa> = {};
  for (const [id, autoPos] of Object.entries(automatico)) {
    const salvo = layoutSalvo?.nos[id];
    combinado[id] = salvo ? { ...salvo } : { ...autoPos };
  }
  return combinado;
}

function limitarCoordenada(valor: number): number {
  return Math.max(COORDENADA_MAPA_MIN, Math.min(COORDENADA_MAPA_MAX, valor));
}

export function deslocarPosicaoNo(
  atual: PosicaoNoMapa,
  direcao: DirecaoMovimentoMapa,
  passo = PASSO_MOVIMENTO_TECLADO,
): PosicaoNoMapa {
  switch (direcao) {
    case 'esquerda':
      return { x: limitarCoordenada(atual.x - passo), y: atual.y, fixado: true };
    case 'direita':
      return { x: limitarCoordenada(atual.x + passo), y: atual.y, fixado: true };
    case 'cima':
      return { x: atual.x, y: limitarCoordenada(atual.y - passo), fixado: true };
    case 'baixo':
      return { x: atual.x, y: limitarCoordenada(atual.y + passo), fixado: true };
  }
}

export function navegarNoPorTeclado(
  idsVisiveis: readonly string[],
  selecionadoId: string | null,
  tecla: string,
): string | null {
  if (idsVisiveis.length === 0) {
    return null;
  }
  if (tecla === 'Home') {
    return idsVisiveis[0] ?? null;
  }
  if (tecla === 'End') {
    return idsVisiveis[idsVisiveis.length - 1] ?? null;
  }

  const indiceAtual = selecionadoId ? idsVisiveis.indexOf(selecionadoId) : 0;
  const base = indiceAtual >= 0 ? indiceAtual : 0;

  if (tecla === 'ArrowRight' || tecla === 'ArrowDown') {
    const proximo = (base + 1) % idsVisiveis.length;
    return idsVisiveis[proximo] ?? null;
  }
  if (tecla === 'ArrowLeft' || tecla === 'ArrowUp') {
    const anterior = (base - 1 + idsVisiveis.length) % idsVisiveis.length;
    return idsVisiveis[anterior] ?? null;
  }
  return idsVisiveis[base] ?? null;
}

export function construirGrafoMapa({
  itensVisiveis,
  arestas,
  posicoes,
  modoVisual,
  noSelecionadoId,
  ocupado,
  reduzirMovimento,
  aoSelecionarNo,
  aoAlternarRecolher,
  aoAlternarConclusao,
  aoAbrirDetalhes,
}: {
  itensVisiveis: readonly NoVisivelArvore[];
  arestas: readonly ArestaMapaArvore[];
  posicoes: Record<string, PosicaoNoMapa>;
  modoVisual: ModoVisualMapa;
  noSelecionadoId: string | null;
  ocupado: boolean;
  reduzirMovimento: boolean;
  aoSelecionarNo: (tarefaId: string) => void;
  aoAlternarRecolher: (tarefaId: string) => void;
  aoAlternarConclusao: (tarefa: TarefaArvore) => void;
  aoAbrirDetalhes: (tarefaId: string) => void;
}): { nodes: TipoNoMapaLume[]; edges: Edge[] } {
  const nodes: TipoNoMapaLume[] = itensVisiveis.map((item) => {
    const pos = posicoes[item.tarefa.id] ?? { x: 0, y: 0, fixado: false };
    return {
      id: item.tarefa.id,
      type: 'tarefaLume',
      position: { x: pos.x, y: pos.y },
      initialWidth: LARGURA_INICIAL_NO,
      initialHeight: ALTURA_INICIAL_NO,
      selected: item.tarefa.id === noSelecionadoId,
      data: {
        tarefa: item.tarefa,
        modoVisual,
        temFilhas: item.temFilhas,
        recolhido: item.recolhido,
        selecionadoNo: item.tarefa.id === noSelecionadoId,
        ocupado,
        aoSelecionarNo,
        aoAlternarRecolher,
        aoAlternarConclusao,
        aoAbrirDetalhes,
      },
    };
  });

  const corAresta =
    modoVisual === 'ramos_botanicos' ? 'rgba(56, 132, 86, 0.72)' : 'rgba(147, 197, 253, 0.75)';

  const edges: Edge[] = arestas.map((aresta) => ({
    id: aresta.id,
    source: aresta.origemId,
    target: aresta.destinoId,
    type: modoVisual === 'ramos_botanicos' ? 'default' : 'smoothstep',
    animated: modoVisual === 'constelacao_luminosa' && !reduzirMovimento,
    style: {
      stroke: corAresta,
      strokeWidth: modoVisual === 'ramos_botanicos' ? 2.5 : 2,
      strokeDasharray: modoVisual === 'constelacao_luminosa' ? '5 4' : undefined,
    },
  }));

  return { nodes, edges };
}

export function encontrarNoNaArvorePorId(
  lista: readonly TarefaArvore[],
  alvoId: string | null,
): TarefaArvore | null {
  if (!alvoId) {
    return null;
  }
  for (const item of lista) {
    if (item.id === alvoId) {
      return item;
    }
    const sub = encontrarNoNaArvorePorId(item.subtarefas, alvoId);
    if (sub) {
      return sub;
    }
  }
  return null;
}
