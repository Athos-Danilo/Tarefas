import { describe, expect, it, vi } from 'vitest';
import { ErroApi } from '../../src/servicos/cliente-http';
import { criarServicoJornada } from '../../src/servicos/cliente-jornada';
import type { BlocoNota, TarefaArvore } from '../../src/servicos/tipos-jornada';
import {
  agruparRaizesPorTurno,
  arredondarCoordenadaAproximada,
  calcularHorarioLembrete,
  calcularNovaOrdenacaoIrmas,
  calcularProgressoGeralJornada,
  descreverRecorrencia,
  podeMoverParaPai,
  validarBlocoNota,
  validarRecorrenciaLocal,
} from '../../src/dominios/jornada/logica-jornada';

function fabricarNo(parcial: Partial<TarefaArvore> & { id: string; titulo: string }): TarefaArvore {
  return {
    tarefaPaiId: null,
    prioridade: 'media',
    status: 'pendente',
    turno: 'livre',
    prazo: null,
    profundidade: 1,
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
    criadoEm: '2026-11-22T10:00:00Z',
    atualizadoEm: '2026-11-22T10:00:00Z',
    subtarefas: [],
    ...parcial,
  };
}

function fabricarRespostaCrua(id: string, titulo: string, parcial: Record<string, unknown> = {}) {
  return {
    id,
    tarefa_pai_id: null,
    titulo,
    prioridade: 'alta',
    status: 'pendente',
    turno: 'manha',
    prazo: null,
    profundidade: 1,
    ordem_manual: 0,
    percentual_conclusao: 0,
    total_folhas: 1,
    folhas_concluidas: 0,
    tem_filha_urgente_aberta: false,
    etiquetas: [],
    recorrencia: { tipo: 'nenhuma', dias_semana: [], dia_mes: null, intervalo: 1 },
    serie_recorrencia_id: null,
    vezes_reaberta: 0,
    compartilhada: false,
    responsavel: null,
    lembretes_pendentes: 0,
    criado_em: '2026-11-22T10:00:00Z',
    atualizado_em: '2026-11-22T10:00:00Z',
    subtarefas: [],
    ...parcial,
  };
}

describe('Dominio e cliente HTTP da Jornada do Dia (Fase 16)', () => {
  it('agrupa raizes por turno preservando ordenacao manual', () => {
    const tManha2 = fabricarNo({ id: 'm2', titulo: 'Revisar SQL', turno: 'manha', ordemManual: 2 });
    const tManha1 = fabricarNo({ id: 'm1', titulo: 'Ler edital', turno: 'manha', ordemManual: 0 });
    const tTarde = fabricarNo({
      id: 't1',
      titulo: 'Prototipar UI',
      turno: 'tarde',
      ordemManual: 0,
    });
    const tNoite = fabricarNo({ id: 'n1', titulo: 'Planejar dia', turno: 'noite', ordemManual: 0 });
    const tLivre = fabricarNo({ id: 'l1', titulo: 'Idea solta', turno: 'livre', ordemManual: 0 });

    const agrupado = agruparRaizesPorTurno([tManha2, tNoite, tLivre, tManha1, tTarde]);

    expect(agrupado.manha.map((item) => item.id)).toEqual(['m1', 'm2']);
    expect(agrupado.tarde.map((item) => item.id)).toEqual(['t1']);
    expect(agrupado.noite.map((item) => item.id)).toEqual(['n1']);
    expect(agrupado.livre.map((item) => item.id)).toEqual(['l1']);
  });

  it('bloqueia ciclos e profundidade acima de 5 niveis ao mover subarvore', () => {
    const nivel5 = fabricarNo({ id: 'n5', tarefaPaiId: 'n4', titulo: 'Nivel 5', profundidade: 5 });
    const nivel4 = fabricarNo({
      id: 'n4',
      tarefaPaiId: 'n3',
      titulo: 'Nivel 4',
      profundidade: 4,
      subtarefas: [nivel5],
    });
    const nivel3 = fabricarNo({
      id: 'n3',
      tarefaPaiId: 'n2',
      titulo: 'Nivel 3',
      profundidade: 3,
      subtarefas: [nivel4],
    });
    const nivel2 = fabricarNo({
      id: 'n2',
      tarefaPaiId: 'n1',
      titulo: 'Nivel 2',
      profundidade: 2,
      subtarefas: [nivel3],
    });
    const raizA = fabricarNo({
      id: 'n1',
      titulo: 'Raiz A',
      profundidade: 1,
      subtarefas: [nivel2],
    });

    const outroN2 = fabricarNo({
      id: 'b2',
      tarefaPaiId: 'b1',
      titulo: 'Outro N2',
      profundidade: 2,
    });
    const raizB = fabricarNo({
      id: 'b1',
      titulo: 'Raiz B',
      profundidade: 1,
      subtarefas: [outroN2],
    });

    const subAlt = fabricarNo({
      id: 'c2',
      tarefaPaiId: 'c1',
      titulo: 'Filha C',
      profundidade: 2,
    });
    const raizC = fabricarNo({
      id: 'c1',
      titulo: 'Raiz C (altura 2)',
      profundidade: 1,
      subtarefas: [subAlt],
    });

    const arvore = [raizA, raizB, raizC];

    expect(podeMoverParaPai(arvore, 'n1', 'n1')).toBe(false);
    expect(podeMoverParaPai(arvore, 'n2', 'n4')).toBe(false);
    expect(podeMoverParaPai(arvore, 'c1', 'n4')).toBe(false);
    expect(podeMoverParaPai(arvore, 'c1', 'n5')).toBe(false);
    expect(podeMoverParaPai(arvore, 'c1', 'n3')).toBe(true);
    expect(podeMoverParaPai(arvore, 'n4', null)).toBe(true);
    expect(podeMoverParaPai(arvore, 'n5', 'b2')).toBe(true);
  });

  it('valida recorrencia, blocos ricos (rejeitando URL insegura), reordenacao, progresso e lembrete', () => {
    expect(
      validarRecorrenciaLocal({
        tipo: 'semanal',
        diasSemana: [],
        diaMes: null,
        intervalo: 1,
      }).valida,
    ).toBe(false);
    expect(
      validarRecorrenciaLocal({
        tipo: 'semanal',
        diasSemana: [1, 3, 5],
        diaMes: null,
        intervalo: 1,
      }).valida,
    ).toBe(true);
    expect(
      descreverRecorrencia({
        tipo: 'semanal',
        diasSemana: [1, 3],
        diaMes: null,
        intervalo: 1,
      }),
    ).toContain('Seg');

    const linkPerigoso: BlocoNota = {
      id: 'b1',
      tipo: 'codigo_ou_link',
      subtipo: 'link',
      rotulo: 'Malicioso',
      conteudo: 'javascript:alert(1)',
    };
    const linkSeguro: BlocoNota = {
      id: 'b2',
      tipo: 'codigo_ou_link',
      subtipo: 'link',
      rotulo: 'Docs',
      conteudo: 'https://lume.exemplo/docs',
    };
    expect(validarBlocoNota(linkPerigoso).valido).toBe(false);
    expect(validarBlocoNota(linkSeguro).valido).toBe(true);

    const irmas = [
      fabricarNo({ id: 'a', titulo: 'A', ordemManual: 0 }),
      fabricarNo({ id: 'b', titulo: 'B', ordemManual: 1 }),
      fabricarNo({ id: 'c', titulo: 'C', ordemManual: 2 }),
    ];
    expect(calcularNovaOrdenacaoIrmas(irmas, 'a', 'c')).toEqual([
      { tarefaId: 'b', ordemManual: 0 },
      { tarefaId: 'c', ordemManual: 1 },
      { tarefaId: 'a', ordemManual: 2 },
    ]);

    const progresso = calcularProgressoGeralJornada([
      fabricarNo({ id: 'p1', titulo: 'P1', totalFolhas: 4, folhasConcluidas: 2 }),
      fabricarNo({ id: 'p2', titulo: 'P2', totalFolhas: 2, folhasConcluidas: 1 }),
    ]);
    expect(progresso).toBeCloseTo(0.5);

    expect(arredondarCoordenadaAproximada(-15.79423)).toBe(-15.79);
    const disparo = calcularHorarioLembrete('2026-11-30T15:00:00Z', 15);
    expect(disparo?.toISOString()).toBe('2026-11-30T14:45:00.000Z');
  });

  it('integra endpoints de tarefas, desfazer, notas, etiquetas e clima com cookie CSRF', async () => {
    document.cookie = 'lume_csrf=csrf-jornada-16; path=/';

    const fetchMock = vi.fn<typeof fetch>();
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            itens: [fabricarRespostaCrua('t1', 'Estudar Web II')],
            totais: { ativas: 1, concluidas: 0, limite_ativas: 200 },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa: fabricarRespostaCrua('t2', 'Revisar diario', {
              recorrencia: { tipo: 'diaria', dias_semana: [], dia_mes: null, intervalo: 1 },
            }),
            ancestrais_atualizados: [],
          }),
          { status: 201 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_id: 't2',
            nos_concluidos: ['t2'],
            ancestrais_atualizados: [],
            token_desfazer: 'tok-cascata-1',
            expira_em: '2026-11-22T18:10:15Z',
            proxima_ocorrencia: {
              id: 't3',
              prazo: '2026-11-23T18:00:00Z',
              serie_recorrencia_id: 'ser-1',
            },
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({ erro: { codigo: 'CLIMA_NAO_AUTORIZADO', mensagem: 'Sem opt-in' } }),
          { status: 403 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            habilitado: true,
            modo_localizacao: 'cidade_manual',
            cidade: 'Brasilia',
            uf: 'DF',
            latitude_aprox: -15.79,
            longitude_aprox: -47.88,
            estado_climatico: 'chuvoso',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            tarefa_id: 't1',
            usuario_id: 'u1',
            metadados_visuais: { forma_botanica: 'girassol' },
            notas_em_blocos: [{ id: 'n1', tipo: 'paragrafo', texto: 'Nota salva' }],
            atualizado_em: '2026-11-22T18:10:00Z',
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            erro: {
              codigo: 'CONFIRMACAO_CASCATA_OBRIGATORIA',
              mensagem: 'Confirme cascata',
              detalhes: { descendentes_em_aberto: 2 },
            },
          }),
          { status: 409 },
        ),
      );

    const servico = criarServicoJornada(fetchMock);

    const listagem = await servico.listarTarefas({
      turno: 'manha',
      busca: 'Web',
      incluirConcluidas: false,
    });
    expect(listagem.itens[0].titulo).toBe('Estudar Web II');
    expect(listagem.itens[0].tarefaPaiId).toBeNull();
    const urlListagem = fetchMock.mock.calls[0][0] as string;
    expect(urlListagem).toContain('/api/tarefas?');
    expect(urlListagem).toContain('turno=manha');
    expect(urlListagem).toContain('busca=Web');
    expect(urlListagem).toContain('incluir_concluidas=false');

    const criada = await servico.criarTarefa({
      titulo: 'Revisar diario',
      turno: 'noite',
      recorrencia: { tipo: 'diaria', diasSemana: [], diaMes: null, intervalo: 1 },
      etiquetaIds: ['e1'],
    });
    expect(criada.tarefa.recorrencia.tipo).toBe('diaria');
    const initCriar = fetchMock.mock.calls[1][1] as RequestInit;
    expect((initCriar.headers as Record<string, string>)['X-CSRF-Token']).toBe('csrf-jornada-16');

    const conclusao = await servico.concluirTarefa('t2', true);
    expect(conclusao.tokenDesfazer).toBe('tok-cascata-1');
    expect(conclusao.proximaOcorrencia?.id).toBe('t3');

    const climaNaoAutorizado = await servico.consultarClimaAtual();
    expect(climaNaoAutorizado).toEqual({ autorizado: false, clima: null });

    const consentimento = await servico.atualizarConsentimentoClima({
      habilitado: true,
      modoLocalizacao: 'cidade_manual',
      cidade: 'Brasilia',
      uf: 'DF',
      latitudeAprox: -15.79,
      longitudeAprox: -47.88,
    });
    expect(consentimento.estadoClimatico).toBe('chuvoso');

    const detalhes = await servico.salvarDetalhes('t1', {
      metadadosVisuais: { formaBotanica: 'girassol' },
      notasEmBlocos: [{ id: 'n1', tipo: 'paragrafo', texto: 'Nota salva' }],
    });
    expect(detalhes.notasEmBlocos).toHaveLength(1);
    const corpoDetalhes = JSON.parse(
      (fetchMock.mock.calls[5][1] as RequestInit).body as string,
    ) as {
      metadados_visuais: Record<string, unknown>;
    };
    expect(corpoDetalhes.metadados_visuais).toEqual({ forma_botanica: 'girassol' });

    await expect(servico.concluirTarefa('t1', false)).rejects.toMatchObject<Partial<ErroApi>>({
      status: 409,
      codigo: 'CONFIRMACAO_CASCATA_OBRIGATORIA',
    });
  });
});
