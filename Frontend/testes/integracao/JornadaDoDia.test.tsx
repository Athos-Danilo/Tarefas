import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { useMotorTemporal } from '../../src/astronomia/motor-temporal';
import { ErroApi } from '../../src/servicos/cliente-http';
import type { ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type {
  BlocoNota,
  ClimaAtual,
  DetalhesTarefa,
  EntradaAtualizarTarefa,
  EntradaConsentimentoClima,
  EntradaCriarTarefa,
  EstrategiaExclusao,
  EtiquetaCompleta,
  FiltrosListagemTarefas,
  ItemOrdenacaoIrma,
  MetadadosVisuaisTarefa,
  ResultadoConcluirTarefa,
  ResultadoCriarTarefa,
  ResultadoExcluirTarefa,
  ResultadoMoverTarefa,
  ResultadoReabrirTarefa,
  ServicoJornadaFrontend,
  TarefaArvore,
} from '../../src/servicos/tipos-jornada';
import type { BuscadorDeSaude } from '../../src/servicos/tipos-saude';

const BUSCADOR_OK: BuscadorDeSaude = {
  consultarSaude: () =>
    Promise.resolve({
      status: 'ok',
      servico: 'lume-api',
      versao: '0.1.0',
      bancoRelacional: 'conectado',
      bancoDocumental: 'conectado',
      timestamp: '2026-11-22T18:00:00Z',
    }),
};

function criarServicoAutenticacaoDuble(): ServicoAutenticacaoFrontend {
  return {
    consultarSessao: () =>
      Promise.resolve({
        autenticado: true,
        usuario: {
          id: 'u-fase16',
          email: 'athos.lume@exemplo.com',
          nomeExibicao: 'Athos Silva',
          avatarTipo: 'preset',
          avatarId: 'sol-nascente',
          avatarUrl: '/assets-3d/avatares/sol-nascente.png',
          primeiroAcessoConcluido: true,
        },
        sessao: {
          expiraEm: '2026-11-29T18:00:00Z',
          expiracaoAbsolutaEm: '2026-12-22T18:00:00Z',
        },
      }),
    concluirPrimeiroAcesso: () =>
      Promise.resolve({
        primeiroAcessoConcluido: true,
        arvoreGuiaCriada: true,
        tarefaGuiaId: 't-guia',
      }),
    obterPerfil: () =>
      Promise.resolve({
        id: 'u-fase16',
        email: 'athos.lume@exemplo.com',
        nomeExibicao: 'Athos Silva',
        avatarTipo: 'preset',
        avatarId: 'sol-nascente',
        avatarUrl: '/assets-3d/avatares/sol-nascente.png',
        primeiroAcessoConcluido: true,
      }),
    atualizarPerfil: () => Promise.reject(new Error('Nao usado aqui')),
    enviarAvatar: () => Promise.reject(new Error('Nao usado aqui')),
    sair: () => Promise.resolve(),
    sairTodos: () => Promise.resolve(1),
    excluirConta: () => Promise.resolve({ contaExcluida: true, mensagem: 'Excluida' }),
  };
}

function fabricarTarefaBase(
  parcial: Partial<TarefaArvore> & { id: string; titulo: string },
): TarefaArvore {
  return {
    tarefaPaiId: null,
    prioridade: 'media',
    status: 'pendente',
    turno: 'manha',
    prazo: '2026-11-25T15:00:00Z',
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
    criadoEm: '2026-11-22T09:00:00Z',
    atualizadoEm: '2026-11-22T09:00:00Z',
    subtarefas: [],
    ...parcial,
  };
}

function fabricarCenarioJornadaDuble() {
  const etiquetaFaculdade: EtiquetaCompleta = {
    id: 'etq-1',
    nome: 'Faculdade',
    cor: '#1D5C87',
    criadoEm: '2026-11-20T10:00:00Z',
  };

  let etiquetas: EtiquetaCompleta[] = [etiquetaFaculdade];
  let climaAtual: ClimaAtual | null = null;
  let notasSalvas: BlocoNota[] = [
    { id: 'blk-1', tipo: 'paragrafo', texto: 'Revisar requisitos da arquitetura poliglota.' },
  ];

  const nivel5 = fabricarTarefaBase({
    id: 't-n5',
    tarefaPaiId: 't-n4',
    titulo: 'Folha no nivel maximo 5',
    profundidade: 5,
    prioridade: 'urgente',
  });
  const nivel4 = fabricarTarefaBase({
    id: 't-n4',
    tarefaPaiId: 't-n3',
    titulo: 'Etapa nivel 4',
    profundidade: 4,
    temFilhaUrgenteAberta: true,
    subtarefas: [nivel5],
  });
  const nivel3 = fabricarTarefaBase({
    id: 't-n3',
    tarefaPaiId: 't-n2',
    titulo: 'Modulo nivel 3',
    profundidade: 3,
    temFilhaUrgenteAberta: true,
    subtarefas: [nivel4],
  });
  const nivel2 = fabricarTarefaBase({
    id: 't-n2',
    tarefaPaiId: 't-raiz-1',
    titulo: 'Subtarefa de Web II',
    profundidade: 2,
    temFilhaUrgenteAberta: true,
    subtarefas: [nivel3],
  });

  const raizManha1 = fabricarTarefaBase({
    id: 't-raiz-1',
    titulo: 'Projeto Web II',
    turno: 'manha',
    ordemManual: 0,
    prioridade: 'alta',
    temFilhaUrgenteAberta: true,
    percentualConclusao: 50,
    totalFolhas: 2,
    folhasConcluidas: 1,
    etiquetas: [etiquetaFaculdade],
    recorrencia: { tipo: 'semanal', diasSemana: [1, 4], diaMes: null, intervalo: 1 },
    subtarefas: [nivel2],
  });

  const raizManha2 = fabricarTarefaBase({
    id: 't-raiz-2',
    titulo: 'Checklist rapido da manha',
    turno: 'manha',
    ordemManual: 1,
    prioridade: 'baixa',
  });

  const raizTarde = fabricarTarefaBase({
    id: 't-raiz-tarde',
    titulo: 'Estudar graficos Recharts',
    turno: 'tarde',
    ordemManual: 0,
    prioridade: 'media',
  });

  let raizes: TarefaArvore[] = [raizManha1, raizManha2, raizTarde];

  const listarTarefas = vi.fn((filtros?: FiltrosListagemTarefas) => {
    let itensFiltrados = raizes;
    if (filtros?.busca) {
      const q = filtros.busca.toLowerCase();
      itensFiltrados = itensFiltrados.filter((item) => item.titulo.toLowerCase().includes(q));
    }
    if (filtros?.prioridade) {
      itensFiltrados = itensFiltrados.filter((item) => item.prioridade === filtros.prioridade);
    }
    return Promise.resolve({
      itens: itensFiltrados,
      totais: { ativas: itensFiltrados.length, concluidas: 1, limiteAtivas: 200 },
    });
  });

  const criarTarefa = vi.fn((entrada: EntradaCriarTarefa): Promise<ResultadoCriarTarefa> => {
    const nova = fabricarTarefaBase({
      id: `t-nova-${Date.now()}`,
      titulo: entrada.titulo,
      tarefaPaiId: entrada.tarefaPaiId ?? null,
      prioridade: entrada.prioridade ?? 'media',
      turno: entrada.turno ?? 'manha',
      prazo: entrada.prazo ?? null,
      ordemManual: raizes.length,
      recorrencia: entrada.recorrencia ?? {
        tipo: 'nenhuma',
        diasSemana: [],
        diaMes: null,
        intervalo: 1,
      },
    });
    if (!entrada.tarefaPaiId) {
      raizes = [...raizes, nova];
    }
    return Promise.resolve({ tarefa: nova, ancestraisAtualizados: [] });
  });

  const concluirTarefa = vi.fn(
    (tarefaId: string, confirmarCascata: boolean): Promise<ResultadoConcluirTarefa> => {
      if (tarefaId === 't-raiz-1' && !confirmarCascata) {
        return Promise.reject(
          new ErroApi(409, 'CONFIRMACAO_CASCATA_OBRIGATORIA', 'Ha subtarefas abertas.', {
            descendentes_em_aberto: 4,
          }),
        );
      }
      return Promise.resolve({
        tarefaId,
        nosConcluidos: [tarefaId, 't-n2'],
        ancestraisAtualizados: [],
        tokenDesfazer: 'tok-desfazer-16',
        expiraEm: '2026-11-22T18:10:00Z',
        proximaOcorrencia: {
          id: 't-prox-1',
          prazo: '2026-11-26T15:00:00Z',
          serieRecorrenciaId: 'serie-web',
        },
      });
    },
  );

  const desfazerCascata = vi.fn((token: string) => {
    expect(token).toBe('tok-desfazer-16');
    return Promise.resolve({ restaurados: 2, tarefaId: 't-raiz-1' });
  });

  const reordenarIrmas = vi.fn((_pai: string | null, ordenacao: ItemOrdenacaoIrma[]) =>
    Promise.resolve(ordenacao.length),
  );

  const excluirTarefa = vi.fn(
    (tarefaId: string, estrategia?: EstrategiaExclusao): Promise<ResultadoExcluirTarefa> => {
      if (tarefaId === 't-raiz-1' && !estrategia) {
        return Promise.reject(
          new ErroApi(409, 'CONFIRMACAO_ESTRATEGIA_OBRIGATORIA', 'Escolha uma estrategia.', {
            total_descendentes: 4,
          }),
        );
      }
      return Promise.resolve({
        estrategiaAplicada: estrategia ?? 'cascata',
        tarefasRemovidas: 1,
        filhasPromovidas: estrategia === 'promover_filhas' ? 1 : 0,
      });
    },
  );

  const obterTarefa = vi.fn((tarefaId: string) => {
    const detalhes: DetalhesTarefa = {
      tarefaId,
      usuarioId: 'u-fase16',
      metadadosVisuais: { formaBotanica: 'girassol' },
      notasEmBlocos: notasSalvas,
      atualizadoEm: '2026-11-22T17:00:00Z',
    };
    return Promise.resolve({
      tarefa: raizManha2,
      detalhes,
      lembretes: [],
    });
  });

  const salvarDetalhes = vi.fn(
    (
      tarefaId: string,
      entrada: { metadadosVisuais: MetadadosVisuaisTarefa; notasEmBlocos: BlocoNota[] },
    ): Promise<DetalhesTarefa> => {
      notasSalvas = entrada.notasEmBlocos;
      return Promise.resolve({
        tarefaId,
        usuarioId: 'u-fase16',
        metadadosVisuais: entrada.metadadosVisuais,
        notasEmBlocos: entrada.notasEmBlocos,
        atualizadoEm: '2026-11-22T18:05:00Z',
      });
    },
  );

  const moverTarefa = vi.fn(
    (tarefaId: string, novoPaiId: string | null): Promise<ResultadoMoverTarefa> =>
      Promise.resolve({
        tarefa: {
          ...raizManha2,
          id: tarefaId,
          tarefaPaiId: novoPaiId,
          profundidade: novoPaiId ? 2 : 1,
        },
        ancestraisConcluidos: [],
        ancestraisReabertos: [],
      }),
  );

  const criarEtiqueta = vi.fn((entrada: { nome: string; cor: string }) => {
    const nova: EtiquetaCompleta = {
      id: `etq-${etiquetas.length + 1}`,
      nome: entrada.nome,
      cor: entrada.cor,
      criadoEm: '2026-11-22T18:00:00Z',
    };
    etiquetas = [...etiquetas, nova];
    return Promise.resolve(nova);
  });

  const excluirEtiqueta = vi.fn((id: string) => {
    etiquetas = etiquetas.filter((e) => e.id !== id);
    return Promise.resolve();
  });

  const buscarCidades = vi.fn(() =>
    Promise.resolve([
      {
        cidade: 'Brasilia',
        uf: 'DF',
        pais: 'Brasil',
        latitudeAprox: -15.79,
        longitudeAprox: -47.88,
      },
    ]),
  );

  const atualizarConsentimentoClima = vi.fn((entrada: EntradaConsentimentoClima) => {
    if (!entrada.habilitado) {
      climaAtual = null;
      return Promise.resolve({
        habilitado: false,
        modoLocalizacao: null,
        cidade: null,
        uf: null,
        latitudeAprox: null,
        longitudeAprox: null,
        estadoClimatico: 'limpo' as const,
      });
    }
    climaAtual = {
      habilitado: true,
      cidade: entrada.cidade ?? 'Local aproximado',
      uf: entrada.uf ?? 'DF',
      temperaturaC: 23.4,
      codigoWmo: 61,
      estadoClimatico: 'chuvoso',
      descricao: 'Chuva leve',
      origemCache: false,
      atualizadoEm: '2026-11-22T18:02:00Z',
    };
    return Promise.resolve({
      habilitado: true,
      modoLocalizacao: entrada.modoLocalizacao ?? 'cidade_manual',
      cidade: climaAtual.cidade,
      uf: climaAtual.uf,
      latitudeAprox: entrada.latitudeAprox ?? -15.79,
      longitudeAprox: entrada.longitudeAprox ?? -47.88,
      estadoClimatico: 'chuvoso' as const,
    });
  });

  const consultarClimaAtual = vi.fn(() => {
    if (!climaAtual) {
      return Promise.resolve({ autorizado: false as const, clima: null });
    }
    return Promise.resolve({ autorizado: true as const, clima: climaAtual });
  });

  const servico: ServicoJornadaFrontend = {
    listarTarefas,
    obterTarefa,
    criarTarefa,
    atualizarTarefa: vi.fn((id: string, entrada: EntradaAtualizarTarefa): Promise<TarefaArvore> =>
      Promise.resolve({
        ...raizManha2,
        id,
        titulo: entrada.titulo ?? raizManha2.titulo,
        prioridade: entrada.prioridade ?? raizManha2.prioridade,
        status: entrada.status ?? raizManha2.status,
        turno: entrada.turno ?? raizManha2.turno,
        prazo: entrada.prazo !== undefined ? entrada.prazo : raizManha2.prazo,
        recorrencia: entrada.recorrencia ?? raizManha2.recorrencia,
      }),
    ),
    concluirTarefa,
    desfazerCascata,
    reabrirTarefa: vi.fn((tarefaId: string): Promise<ResultadoReabrirTarefa> =>
      Promise.resolve({
        tarefaId,
        status: 'em_andamento',
        nosReabertos: [tarefaId],
        ancestraisReabertos: [],
      }),
    ),
    moverTarefa,
    reordenarIrmas,
    excluirTarefa,
    salvarDetalhes,
    listarEtiquetas: vi.fn(() => Promise.resolve({ itens: etiquetas, limiteMaximo: 30 })),
    criarEtiqueta,
    atualizarEtiqueta: vi.fn(
      (id: string, entrada: { nome?: string; cor?: string }): Promise<EtiquetaCompleta> =>
        Promise.resolve({
          id,
          nome: entrada.nome ?? 'Etiqueta',
          cor: entrada.cor ?? '#1D5C87',
          criadoEm: null,
        }),
    ),
    excluirEtiqueta,
    buscarCidades,
    atualizarConsentimentoClima,
    consultarClimaAtual,
  };

  return {
    servico,
    spies: {
      listarTarefas,
      criarTarefa,
      concluirTarefa,
      desfazerCascata,
      reordenarIrmas,
      excluirTarefa,
      obterTarefa,
      salvarDetalhes,
      moverTarefa,
      criarEtiqueta,
      excluirEtiqueta,
      buscarCidades,
      atualizarConsentimentoClima,
    },
  };
}

describe('Fase 16 - Jornada do Dia completa em TDD', () => {
  afterEach(() => {
    cleanup();
    useMotorTemporal.setState({ estadoClimaticoReal: 'limpo', climaSimulado: 'automatico' });
    localStorage.clear();
  });

  it('mantem clima opt-in desligado por padrao, permite buscar cidade, usar geolocalizacao e desativar', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = fabricarCenarioJornadaDuble();

    const geoSpy = vi.fn((sucesso: PositionCallback) => {
      sucesso({
        coords: {
          latitude: -15.79423,
          longitude: -47.88217,
          accuracy: 100,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: null,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: { getCurrentPosition: geoSpy },
    });

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarServicoAutenticacaoDuble()}
        servicoJornada={servico}
        rotaInicial="/jornada"
      />,
    );

    expect(await screen.findByText(/clima local desligado por privacidade/i)).toBeInTheDocument();
    expect(geoSpy).not.toHaveBeenCalled();

    const campoCidade = screen.getByLabelText(/buscar cidade para clima/i);
    await usuario.type(campoCidade, 'Brasilia');
    await usuario.click(screen.getByRole('button', { name: /buscar cidade/i }));

    const sugestao = await screen.findByRole('button', { name: /brasilia - df/i });
    await usuario.click(sugestao);

    await waitFor(() => {
      expect(spies.atualizarConsentimentoClima).toHaveBeenCalledWith({
        habilitado: true,
        modoLocalizacao: 'cidade_manual',
        cidade: 'Brasilia',
        uf: 'DF',
        latitudeAprox: -15.79,
        longitudeAprox: -47.88,
      });
    });

    expect(await screen.findByText(/23\.4°C/i)).toBeInTheDocument();
    expect(useMotorTemporal.getState().estadoClimaticoReal).toBe('chuvoso');

    await usuario.click(screen.getByRole('button', { name: /trocar cidade/i }));
    await usuario.click(screen.getByRole('button', { name: /usar minha localização/i }));
    await waitFor(() => {
      expect(geoSpy).toHaveBeenCalledTimes(1);
      expect(spies.atualizarConsentimentoClima).toHaveBeenCalledWith({
        habilitado: true,
        modoLocalizacao: 'geolocalizacao',
        cidade: null,
        uf: null,
        latitudeAprox: -15.79,
        longitudeAprox: -47.88,
      });
    });

    await usuario.click(screen.getByRole('button', { name: /desativar clima/i }));
    await waitFor(() => {
      expect(useMotorTemporal.getState().estadoClimaticoReal).toBe('limpo');
    });
    expect(await screen.findByText(/clima local desligado por privacidade/i)).toBeInTheDocument();
  });

  it('renderiza 5 niveis, bloqueia subtarefa no nivel 5, conclui em cascata/desfaz e promove filhas ao excluir', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = fabricarCenarioJornadaDuble();

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarServicoAutenticacaoDuble()}
        servicoJornada={servico}
        rotaInicial="/jornada"
      />,
    );

    expect(await screen.findByText('Projeto Web II')).toBeInTheDocument();
    expect(screen.getByText('Folha no nivel maximo 5')).toBeInTheDocument();
    expect(screen.getAllByText(/filha urgente/i).length).toBeGreaterThan(0);

    const btnSubNivel5 = screen.getByRole('button', {
      name: /adicionar subtarefa em folha no nivel maximo 5/i,
    });
    expect(btnSubNivel5).toBeDisabled();

    await usuario.type(screen.getByLabelText(/título da nova tarefa/i), 'Daily tecnica');
    await usuario.selectOptions(screen.getByLabelText(/recorrência/i), 'semanal');
    await usuario.click(screen.getByRole('button', { name: /seg/i }));
    await usuario.click(screen.getByRole('button', { name: /adicionar tarefa/i }));

    await waitFor(() => {
      expect(spies.criarTarefa).toHaveBeenCalledTimes(1);
    });
    const payloadCriacao = spies.criarTarefa.mock.calls[0][0];
    expect(payloadCriacao.titulo).toBe('Daily tecnica');
    expect(payloadCriacao.recorrencia).toEqual({
      tipo: 'semanal',
      diasSemana: [1],
      diaMes: null,
      intervalo: 1,
    });

    await usuario.click(screen.getByRole('button', { name: /concluir projeto web ii/i }));
    expect(await screen.findByText(/confirmar conclusão em cascata/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /concluir tudo em cascata/i }));

    expect(await screen.findByText(/próxima ocorrência recorrente criada/i)).toBeInTheDocument();
    const btnDesfazer = screen.getByRole('button', { name: /desfazer cascata/i });
    await usuario.click(btnDesfazer);

    await waitFor(() => {
      expect(spies.desfazerCascata).toHaveBeenCalledWith('tok-desfazer-16');
    });

    await usuario.click(screen.getByRole('button', { name: /excluir projeto web ii/i }));
    expect(await screen.findByText(/como excluir tarefa com subtarefas/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /promover filhas diretas/i }));

    await waitFor(() => {
      expect(spies.excluirTarefa).toHaveBeenCalledWith('t-raiz-1', 'promover_filhas');
    });
  });

  it('reordena irmas pelo teclado, aplica filtros, gerencia etiquetas, edita notas/lembrete e move na arvore', async () => {
    const usuario = userEvent.setup();
    const { servico, spies } = fabricarCenarioJornadaDuble();

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarServicoAutenticacaoDuble()}
        servicoJornada={servico}
        rotaInicial="/jornada"
      />,
    );

    expect(await screen.findByText('Projeto Web II')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /mover projeto web ii para baixo/i }));
    await waitFor(() => {
      expect(spies.reordenarIrmas).toHaveBeenCalledWith(null, [
        { tarefaId: 't-raiz-2', ordemManual: 0 },
        { tarefaId: 't-raiz-1', ordemManual: 1 },
      ]);
    });

    await usuario.type(screen.getByLabelText(/buscar tarefas/i), 'Recharts');
    await waitFor(() => {
      const ultimaChamada = spies.listarTarefas.mock.calls.at(-1)?.[0];
      expect(ultimaChamada?.busca).toBe('Recharts');
    });
    await usuario.click(screen.getByRole('button', { name: /limpar filtros/i }));

    await usuario.click(screen.getByRole('button', { name: /gerenciar etiquetas/i }));
    await usuario.type(screen.getByLabelText(/nome da nova etiqueta/i), 'Pessoal');
    await usuario.click(screen.getByRole('button', { name: /criar etiqueta/i }));
    await waitFor(() => {
      expect(spies.criarEtiqueta).toHaveBeenCalledTimes(1);
    });
    expect(spies.criarEtiqueta.mock.calls[0][0].nome).toBe('Pessoal');
    await usuario.click(screen.getByRole('button', { name: /fechar janela/i }));

    await usuario.click(
      screen.getByRole('button', { name: /editar e notas de checklist rapido da manha/i }),
    );
    const dialogo = await screen.findByRole('dialog');
    expect(within(dialogo).getByDisplayValue('Checklist rapido da manha')).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole('button', { name: /\+ link/i }));
    const camposConteudo = within(dialogo).getAllByLabelText(/url do link/i);
    await usuario.type(camposConteudo[0], 'javascript:alert(1)');
    await usuario.click(within(dialogo).getByRole('button', { name: /salvar notas em blocos/i }));
    expect(
      await within(dialogo).findByText(/apenas os protocolos http:\/\/ ou https:\/\//i),
    ).toBeInTheDocument();

    await usuario.clear(camposConteudo[0]);
    await usuario.type(camposConteudo[0], 'https://lume.exemplo/guia');
    await usuario.click(within(dialogo).getByRole('button', { name: /salvar notas em blocos/i }));

    await waitFor(() => {
      expect(spies.salvarDetalhes).toHaveBeenCalledTimes(1);
    });
    const [tarefaSalvaId, detalhesSalvos] = spies.salvarDetalhes.mock.calls[0];
    expect(tarefaSalvaId).toBe('t-raiz-2');
    expect(detalhesSalvos.notasEmBlocos).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          tipo: 'codigo_ou_link',
          subtipo: 'link',
          conteudo: 'https://lume.exemplo/guia',
        }),
      ]),
    );

    await usuario.selectOptions(within(dialogo).getByLabelText(/antecedência do lembrete/i), '15');
    expect(within(dialogo).getByText(/previsão do aviso:/i)).toBeInTheDocument();

    await usuario.selectOptions(
      within(dialogo).getByLabelText(/mover para dentro de/i),
      't-raiz-tarde',
    );
    await usuario.click(within(dialogo).getByRole('button', { name: /aplicar movimentação/i }));
    await waitFor(() => {
      expect(spies.moverTarefa).toHaveBeenCalledWith('t-raiz-2', 't-raiz-tarde', null);
    });
  });
});
