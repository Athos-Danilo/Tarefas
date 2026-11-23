import { describe, expect, it, vi } from 'vitest';
import {
  calcularLayoutAutomaticoArvore,
  deslocarPosicaoNo,
  mesclarPosicoesComLayoutSalvo,
  navegarNoPorTeclado,
  PASSO_MOVIMENTO_TECLADO,
  resolverModoVisualMapa,
} from '../../src/dominios/mapa/logica-mapa';
import { criarServicoConstelacoes } from '../../src/servicos/cliente-constelacoes';
import type { TarefaArvore } from '../../src/servicos/tipos-jornada';

function fabricarNo(parcial: Partial<TarefaArvore> & { id: string; titulo: string }): TarefaArvore {
  return {
    tarefaPaiId: null,
    prioridade: 'media',
    status: 'pendente',
    turno: 'livre',
    prazo: null,
    profundidade: 0,
    ordemManual: 0,
    percentualConclusao: 0,
    totalFolhas: 1,
    folhasConcluidas: 0,
    temFilhaUrgenteAberta: false,
    etiquetas: [],
    recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
    serieRecorrenciaId: null,
    vezesReaberta: 0,
    compartilhada: false,
    responsavel: null,
    lembretesPendentes: 0,
    criadoEm: '2026-11-23T10:00:00Z',
    atualizadoEm: '2026-11-23T10:00:00Z',
    subtarefas: [],
    ...parcial,
  };
}

const ARVORE_EXEMPLO: TarefaArvore = fabricarNo({
  id: 'raiz-1',
  titulo: 'Projeto Lume',
  profundidade: 0,
  totalFolhas: 2,
  folhasConcluidas: 1,
  subtarefas: [
    fabricarNo({
      id: 'filha-1',
      tarefaPaiId: 'raiz-1',
      titulo: 'Backend API',
      profundidade: 1,
      ordemManual: 0,
      status: 'concluida',
      subtarefas: [
        fabricarNo({
          id: 'neta-1',
          tarefaPaiId: 'filha-1',
          titulo: 'Validar Mongo',
          profundidade: 2,
          ordemManual: 0,
          status: 'concluida',
        }),
      ],
    }),
    fabricarNo({
      id: 'filha-2',
      tarefaPaiId: 'raiz-1',
      titulo: 'Mapa React Flow',
      profundidade: 1,
      ordemManual: 1,
      prioridade: 'urgente',
    }),
  ],
});

describe('Domínio do Mapa Visual de Constelação e Ramos', () => {
  it('resolve ramos botânicos para manhã/tarde e constelação luminosa para crepúsculo/noite', () => {
    expect(resolverModoVisualMapa('manha')).toBe('ramos_botanicos');
    expect(resolverModoVisualMapa('tarde')).toBe('ramos_botanicos');
    expect(resolverModoVisualMapa('crepusculo')).toBe('constelacao_luminosa');
    expect(resolverModoVisualMapa('noite')).toBe('constelacao_luminosa');
  });

  it('calcula layout automático hierárquico e oculta descendentes quando o ramo está recolhido', () => {
    const aberto = calcularLayoutAutomaticoArvore(ARVORE_EXEMPLO, new Set());
    expect(aberto.idsVisiveis).toEqual(['raiz-1', 'filha-1', 'neta-1', 'filha-2']);
    expect(aberto.arestas).toEqual([
      { id: 'raiz-1->filha-1', origemId: 'raiz-1', destinoId: 'filha-1' },
      { id: 'filha-1->neta-1', origemId: 'filha-1', destinoId: 'neta-1' },
      { id: 'raiz-1->filha-2', origemId: 'raiz-1', destinoId: 'filha-2' },
    ]);
    expect(aberto.posicoes['neta-1'].y).toBeGreaterThan(aberto.posicoes['filha-1'].y);
    expect(aberto.posicoes['filha-1'].y).toBeGreaterThan(aberto.posicoes['raiz-1'].y);

    const recolhido = calcularLayoutAutomaticoArvore(ARVORE_EXEMPLO, new Set(['filha-1']));
    expect(recolhido.idsVisiveis).toEqual(['raiz-1', 'filha-1', 'filha-2']);
    expect(recolhido.arestas).toHaveLength(2);
    expect(recolhido.posicoes['neta-1']).toBeUndefined();
  });

  it('mescla coordenadas salvas com fallback automático para subtarefas recém-criadas', () => {
    const automatico = calcularLayoutAutomaticoArvore(ARVORE_EXEMPLO, new Set());
    const mesclado = mesclarPosicoesComLayoutSalvo(automatico.posicoes, {
      tarefaRaizId: 'raiz-1',
      nos: {
        'raiz-1': { x: 510, y: 110, fixado: true },
        'filha-2': { x: 780, y: 340, fixado: true },
      },
      viewport: { zoom: 1.1, centroX: 400, centroY: 200 },
      atualizadoEm: '2026-11-23T12:00:00Z',
    });

    expect(mesclado['raiz-1']).toEqual({ x: 510, y: 110, fixado: true });
    expect(mesclado['filha-2']).toEqual({ x: 780, y: 340, fixado: true });
    expect(mesclado['filha-1']).toEqual({
      x: automatico.posicoes['filha-1'].x,
      y: automatico.posicoes['filha-1'].y,
      fixado: false,
    });
  });

  it('desloca posição via teclado respeitando limites e navega entre nós visíveis', () => {
    const movida = deslocarPosicaoNo({ x: 100, y: 200, fixado: false }, 'direita');
    expect(movida).toEqual({
      x: 100 + PASSO_MOVIMENTO_TECLADO,
      y: 200,
      fixado: true,
    });

    const limitada = deslocarPosicaoNo({ x: 50000, y: -50000, fixado: false }, 'direita');
    expect(limitada.x).toBe(50000);

    const lista = ['raiz-1', 'filha-1', 'filha-2'];
    expect(navegarNoPorTeclado(lista, 'raiz-1', 'ArrowRight')).toBe('filha-1');
    expect(navegarNoPorTeclado(lista, 'filha-1', 'ArrowLeft')).toBe('raiz-1');
    expect(navegarNoPorTeclado(lista, 'filha-2', 'Home')).toBe('raiz-1');
    expect(navegarNoPorTeclado(lista, 'raiz-1', 'End')).toBe('filha-2');
  });
});

describe('Cliente HTTP de Constelações', () => {
  it('mapeia layout GET, envia PUT com CSRF e executa DELETE 204', async () => {
    document.cookie = 'lume_csrf=csrf-mapa-123; path=/';
    const chamadaFetch = vi.fn<typeof fetch>();

    chamadaFetch
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_raiz_id: 'raiz-1',
            nos: {
              'raiz-1': { x: 420.5, y: 180, fixado: true },
            },
            viewport: { zoom: 1.25, centro_x: 320, centro_y: 190 },
            atualizado_em: '2026-11-23T13:00:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_raiz_id: 'raiz-1',
            nos: {
              'raiz-1': { x: 480, y: 220, fixado: true },
            },
            viewport: { zoom: 1.0, centro_x: 0, centro_y: 0 },
            atualizado_em: '2026-11-23T13:05:00Z',
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      )
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const cliente = criarServicoConstelacoes(chamadaFetch);

    const carregado = await cliente.obterLayout('raiz-1');
    expect(carregado).toEqual({
      tarefaRaizId: 'raiz-1',
      nos: { 'raiz-1': { x: 420.5, y: 180, fixado: true } },
      viewport: { zoom: 1.25, centroX: 320, centroY: 190 },
      atualizadoEm: '2026-11-23T13:00:00Z',
    });

    await cliente.salvarLayout('raiz-1', {
      nos: { 'raiz-1': { x: 480, y: 220, fixado: true } },
      viewport: { zoom: 1.0, centroX: 0, centroY: 0 },
    });

    const chamadaPut = chamadaFetch.mock.calls[1];
    expect(chamadaPut?.[0]).toBe('/api/constelacoes/raiz-1/layout');
    expect((chamadaPut?.[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe(
      'csrf-mapa-123',
    );
    const corpoPut = chamadaPut?.[1]?.body;
    if (typeof corpoPut !== 'string') {
      throw new Error('Corpo JSON esperado na chamada PUT.');
    }
    expect(JSON.parse(corpoPut)).toEqual({
      nos: { 'raiz-1': { x: 480, y: 220, fixado: true } },
      viewport: { zoom: 1.0, centro_x: 0, centro_y: 0 },
    });

    await cliente.limparLayout('raiz-1');
    const chamadaDelete = chamadaFetch.mock.calls[2];
    expect(chamadaDelete?.[0]).toBe('/api/constelacoes/raiz-1/layout');
    expect(chamadaDelete?.[1]?.method).toBe('DELETE');
  });
});
