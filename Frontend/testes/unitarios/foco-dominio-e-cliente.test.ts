import { describe, expect, it, vi } from 'vitest';
import {
  achatarTarefasParaSelecao,
  calcularProgressoTemporizador,
  calcularSegundosRestantesIniciais,
  extrairSubtarefasImediatas,
  formatarCronometroSegundos,
  resolverTemaTemporizador,
} from '../../src/dominios/foco/logica-foco';
import { criarServicoFoco } from '../../src/servicos/cliente-foco';
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

const ARVORES_EXEMPLO: TarefaArvore[] = [
  fabricarNo({
    id: 'raiz-1',
    titulo: 'Apresentar TCC',
    profundidade: 0,
    subtarefas: [
      fabricarNo({
        id: 'filha-1',
        tarefaPaiId: 'raiz-1',
        titulo: 'Revisar slides',
        profundidade: 1,
      }),
      fabricarNo({
        id: 'filha-2',
        tarefaPaiId: 'raiz-1',
        titulo: 'Ensaiar fala',
        profundidade: 1,
      }),
    ],
  }),
];

describe('Domínio do Modo Foco Imersivo', () => {
  it('resolve tema solar para dia e tema lunar para crepúsculo e noite', () => {
    expect(resolverTemaTemporizador('manha')).toBe('solar');
    expect(resolverTemaTemporizador('tarde')).toBe('solar');
    expect(resolverTemaTemporizador('crepusculo')).toBe('lunar');
    expect(resolverTemaTemporizador('noite')).toBe('lunar');
  });

  it('formata segundos em cronômetro tabular e calcula progresso e saldo inicial', () => {
    expect(formatarCronometroSegundos(1500)).toBe('25:00');
    expect(formatarCronometroSegundos(65)).toBe('01:05');
    expect(formatarCronometroSegundos(3661)).toBe('1:01:01');
    expect(formatarCronometroSegundos(-12)).toBe('00:00');

    expect(calcularProgressoTemporizador(1500, 1500)).toBe(0);
    expect(calcularProgressoTemporizador(1500, 750)).toBe(0.5);
    expect(calcularProgressoTemporizador(1500, 0)).toBe(1);
    expect(calcularProgressoTemporizador(0, 0)).toBe(0);

    const inicioMs = Date.parse('2026-11-23T10:00:00Z');
    const cincoMinDepoisMs = inicioMs + 300_000;
    expect(calcularSegundosRestantesIniciais(1500, '2026-11-23T10:00:00Z', cincoMinDepoisMs)).toBe(
      1200,
    );
  });

  it('achata tarefas para seleção e extrai subtarefas imediatas do nó em foco', () => {
    const opcoes = achatarTarefasParaSelecao(ARVORES_EXEMPLO);
    expect(opcoes.map((item) => [item.id, item.nivel, item.titulo])).toEqual([
      ['raiz-1', 0, 'Apresentar TCC'],
      ['filha-1', 1, 'Revisar slides'],
      ['filha-2', 1, 'Ensaiar fala'],
    ]);

    expect(extrairSubtarefasImediatas(ARVORES_EXEMPLO, 'raiz-1').map((t) => t.id)).toEqual([
      'filha-1',
      'filha-2',
    ]);
    expect(extrairSubtarefasImediatas(ARVORES_EXEMPLO, 'filha-1')).toEqual([]);
  });
});

describe('Cliente HTTP de Sessões de Foco', () => {
  it('mapeia sessão ativa, inicia/conclui/interrompe com CSRF e lista histórico', async () => {
    document.cookie = 'lume_csrf=csrf-foco-77; path=/';
    const chamadaFetch = vi.fn<typeof fetch>();

    const sessaoAtivaApi = {
      id: 'ses-1',
      tarefa_id: 'raiz-1',
      tarefa_titulo: 'Apresentar TCC',
      duracao_planejada_seg: 1500,
      duracao_real_seg: null,
      iniciada_em: '2026-11-23T10:00:00Z',
      encerrada_em: null,
      status: 'em_andamento',
    };

    const sessaoConcluidaApi = {
      ...sessaoAtivaApi,
      duracao_real_seg: 1500,
      encerrada_em: '2026-11-23T10:25:00Z',
      status: 'concluida',
    };

    const sessaoInterrompidaApi = {
      ...sessaoAtivaApi,
      id: 'ses-2',
      duracao_real_seg: 420,
      encerrada_em: '2026-11-23T10:40:00Z',
      status: 'interrompida',
    };

    chamadaFetch
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sessao_ativa: sessaoAtivaApi }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sessao: sessaoAtivaApi }), {
          status: 201,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sessao: sessaoConcluidaApi }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ sessao: sessaoInterrompidaApi }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            itens: [sessaoInterrompidaApi, sessaoConcluidaApi],
            total_segundos_concluidos: 1500,
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );

    const cliente = criarServicoFoco(chamadaFetch);

    const ativa = await cliente.obterSessaoAtiva();
    expect(ativa?.tarefaTitulo).toBe('Apresentar TCC');
    expect(ativa?.duracaoPlanejadaSeg).toBe(1500);

    await cliente.iniciarSessao({ tarefaId: 'raiz-1', duracaoPlanejadaSeg: 1500 });
    const postInicio = chamadaFetch.mock.calls[1];
    expect(postInicio?.[0]).toBe('/api/foco/sessoes');
    expect((postInicio?.[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe(
      'csrf-foco-77',
    );
    const corpoInicio = postInicio?.[1]?.body;
    if (typeof corpoInicio !== 'string') {
      throw new Error('Corpo JSON esperado ao iniciar sessao.');
    }
    expect(JSON.parse(corpoInicio)).toEqual({
      tarefa_id: 'raiz-1',
      duracao_planejada_seg: 1500,
    });

    const concluida = await cliente.concluirSessao('ses-1', 1500);
    expect(concluida.status).toBe('concluida');

    const interrompida = await cliente.interromperSessao('ses-2', 420);
    expect(interrompida.status).toBe('interrompida');

    const historico = await cliente.listarHistorico(20);
    expect(historico.totalSegundosConcluidos).toBe(1500);
    expect(historico.itens).toHaveLength(2);
  });
});
