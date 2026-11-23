import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  construirSeriesDistribuicao,
  formatarDuracaoHoras,
  formatarMinutosFoco,
  formatarRotuloTipoEvento,
  horaSimuladaParaMinuto,
  minutoParaHoraSimulada,
  obterClasseIntensidadeCalor,
} from '../../src/dominios/estatisticas/logica-estatisticas';
import { criarServicoEstatisticas } from '../../src/servicos/cliente-estatisticas';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Lógica pura de Estatísticas, Diário e Preferências', () => {
  it('converte hora simulada HH:MM para minuto do dia e valida entradas inválidas', () => {
    expect(horaSimuladaParaMinuto('00:00')).toBe(0);
    expect(horaSimuladaParaMinuto('21:15')).toBe(1275);
    expect(horaSimuladaParaMinuto('23:59')).toBe(1439);
    expect(horaSimuladaParaMinuto('24:00')).toBeNull();
    expect(horaSimuladaParaMinuto('abc')).toBeNull();
    expect(horaSimuladaParaMinuto(null)).toBeNull();

    expect(minutoParaHoraSimulada(0)).toBe('00:00');
    expect(minutoParaHoraSimulada(1275)).toBe('21:15');
    expect(minutoParaHoraSimulada(1439)).toBe('23:59');
  });

  it('formata rótulos de eventos do ciclo, durações e intensidades do mapa de calor', () => {
    expect(formatarRotuloTipoEvento('tarefa_criada')).toBe('Tarefa criada');
    expect(formatarRotuloTipoEvento('cascata_concluida')).toBe('Cascata concluída');
    expect(formatarRotuloTipoEvento('tarefa_reaberta')).toBe('Tarefa reaberta');
    expect(formatarRotuloTipoEvento('foco_concluido')).toBe('Foco concluído');
    expect(formatarRotuloTipoEvento('foco_interrompido')).toBe('Foco interrompido');
    expect(formatarRotuloTipoEvento('grupo_atribuicao')).toBe('Atribuição em grupo');
    expect(formatarRotuloTipoEvento('evento_personalizado')).toBe('evento_personalizado');

    expect(formatarDuracaoHoras(0)).toBe('0,0 h');
    expect(formatarDuracaoHoras(18.4)).toBe('18,4 h');
    expect(formatarMinutosFoco(45)).toBe('45 min');
    expect(formatarMinutosFoco(130)).toBe('2h 10min');

    expect(obterClasseIntensidadeCalor(0)).toContain('bg-white/5');
    expect(obterClasseIntensidadeCalor(2)).toContain('bg-amber-');
    expect(obterClasseIntensidadeCalor(4)).toContain('bg-emerald-');
  });

  it('constrói séries de turno e prioridade prontas para Recharts', () => {
    const series = construirSeriesDistribuicao(
      { manha: 12, tarde: 11, noite: 7, livre: 4 },
      { baixa: 8, media: 14, alta: 8, urgente: 4 },
    );

    expect(series.porTurno).toHaveLength(4);
    expect(series.porTurno[0]).toMatchObject({
      chave: 'manha',
      rotulo: 'Manhã',
      total: 12,
    });
    expect(series.porPrioridade).toHaveLength(4);
    expect(series.porPrioridade[3]).toMatchObject({
      chave: 'urgente',
      rotulo: 'Urgente',
      total: 4,
    });
  });
});

describe('Cliente HTTP de Estatísticas, Diário, Exportação e Preferências', () => {
  it('consulta resumo, pagina diário, gera URL de exportação e atualiza preferências com CSRF', async () => {
    Object.defineProperty(document, 'cookie', {
      configurable: true,
      value: 'lume_csrf=csrf-stats-123',
    });

    const fetchMock = vi.fn((input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
      const url =
        typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith('/api/estatisticas/resumo')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              periodo: '90d',
              escopo: 'grupo',
              kpis: {
                total_criadas: 10,
                total_concluidas: 8,
                taxa_conclusao_pct: 80,
                tempo_medio_conclusao_horas: 12.5,
                pontualidade_pct: 90,
                sequencia_atual_dias: 4,
                sequencia_recorde_dias: 7,
                minutos_foco_totais: 150,
                taxa_foco_concluido_pct: 85,
              },
              serie_temporal: [{ data: '2026-11-23', criadas: 2, concluidas: 2, minutos_foco: 50 }],
              mapa_calor: [{ data: '2026-11-23', intensidade: 3, acoes: 5 }],
              por_turno: { manha: 4, tarde: 2, noite: 1, livre: 1 },
              por_prioridade: { baixa: 1, media: 3, alta: 3, urgente: 1 },
              por_etiqueta: [
                {
                  etiqueta_id: 'etq-1',
                  nome: 'Faculdade',
                  cor: '#1D5C87',
                  concluidas: 5,
                },
              ],
              recorrencias: {
                rotinas_ativas: 2,
                ocorrencias_cumpridas: 6,
                taxa_consistencia_pct: 75,
              },
              repeticoes_e_retrabalho: {
                total_reaberturas: 2,
                tarefas_reabertas_distintas: 1,
                titulos_mais_repetidos: [
                  {
                    titulo_normalizado: 'revisar resumo de aula',
                    ocorrencias: 3,
                    concluidas: 2,
                  },
                ],
              },
              arvores: {
                constelacoes_concluidas: 2,
                profundidade_media: 2.3,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      if (url.startsWith('/api/diario/eventos')) {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              itens: [
                {
                  evento_id: 'evt-1',
                  autor_usuario_id: 'usr-1',
                  tarefa_id: 'tar-1',
                  tarefa_raiz_id: 'tar-1',
                  tipo_evento: 'foco_concluido',
                  momento_do_dia: 'noite',
                  resumo: 'Concluiu sessão de 25 min.',
                  detalhes: { minutos: 25 },
                  criado_em: '2026-11-23T22:00:00Z',
                },
              ],
              proximo_cursor: 'cur-2',
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      if (url === '/api/preferencias' && init?.method === 'PATCH') {
        return Promise.resolve(
          new Response(
            JSON.stringify({
              modo_temporal: 'simulador',
              hora_simulada: '21:15',
              qualidade_3d: 'desempenho_2d',
              reduzir_movimento: true,
              audio: {
                habilitado: true,
                volume_geral: 0.6,
                volume_efeitos: 0.8,
                volume_ambiente: 0.5,
              },
              tutorial: {
                status: 'pulado',
                etapa_atual: 4,
              },
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } },
          ),
        );
      }

      return Promise.resolve(
        new Response(
          JSON.stringify({
            modo_temporal: 'relogio_real',
            hora_simulada: null,
            qualidade_3d: 'auto',
            reduzir_movimento: false,
            audio: {
              habilitado: false,
              volume_geral: 0.7,
              volume_efeitos: 0.8,
              volume_ambiente: 0.5,
            },
            tutorial: {
              status: 'pendente',
              etapa_atual: 0,
            },
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
      );
    });

    const servico = criarServicoEstatisticas(fetchMock);

    const resumo = await servico.obterResumo({
      periodo: '90d',
      escopo: 'grupo',
      etiquetaId: 'etq-1',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toContain(
      '/api/estatisticas/resumo?periodo=90d&escopo=grupo&etiqueta_id=etq-1',
    );
    expect(resumo.kpis.taxaConclusaoPct).toBe(80);
    expect(resumo.repeticoesERetrabalho.totalReaberturas).toBe(2);

    const diario = await servico.listarDiario({
      limite: 20,
      cursor: 'cur-1',
      tipo: 'foco_concluido',
      busca: 'sessão',
    });
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/api/diario/eventos?');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('cursor=cur-1');
    expect(fetchMock.mock.calls[1]?.[0]).toContain('tipo=foco_concluido');
    expect(diario.proximoCursor).toBe('cur-2');
    expect(diario.itens[0]?.eventoId).toBe('evt-1');

    expect(
      servico.obterUrlExportacaoDiario({ formato: 'md', de: '2026-11-01', ate: '2026-11-23' }),
    ).toBe('/api/exportacao/diario?formato=md&de=2026-11-01&ate=2026-11-23');

    const inicial = await servico.obterPreferencias();
    expect(inicial.modoTemporal).toBe('relogio_real');

    const atualizado = await servico.atualizarPreferencias({
      modoTemporal: 'simulador',
      horaSimulada: '21:15',
      qualidade3d: 'desempenho_2d',
      reduzirMovimento: true,
      audio: { habilitado: true, volumeGeral: 0.6 },
      tutorial: { status: 'pulado', etapaAtual: 4 },
    });
    expect(atualizado.qualidade3d).toBe('desempenho_2d');
    const chamadaPatch = fetchMock.mock.calls[3];
    expect(chamadaPatch?.[1]?.method).toBe('PATCH');
    expect((chamadaPatch?.[1]?.headers as Record<string, string>)['X-CSRF-Token']).toBe(
      'csrf-stats-123',
    );
  });
});
