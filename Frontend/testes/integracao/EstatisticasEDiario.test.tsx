import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { useMotorTemporal } from '../../src/astronomia/motor-temporal';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type {
  DiarioEventosPaginado,
  EntradaAtualizarPreferencias,
  ParametrosListarDiario,
  ParametrosResumoEstatisticas,
  PreferenciasCenarioFrontend,
  ResumoEstatisticasFrontend,
  ServicoEstatisticasFrontend,
} from '../../src/servicos/tipos-estatisticas';
import type { ServicoJornadaFrontend, TarefaArvore } from '../../src/servicos/tipos-jornada';
import type { BuscadorDeSaude } from '../../src/servicos/tipos-saude';

const BUSCADOR_OK: BuscadorDeSaude = {
  consultarSaude: () =>
    Promise.resolve({
      status: 'ok',
      servico: 'lume-api',
      versao: '0.1.0',
      bancoRelacional: 'conectado',
      bancoDocumental: 'conectado',
      timestamp: '2026-11-23T10:00:00Z',
    }),
};

function criarSessaoAutenticada(): Extract<EstadoSessao, { autenticado: true }> {
  return {
    autenticado: true,
    usuario: {
      id: 'usr-est',
      email: 'athos@exemplo.com',
      nomeExibicao: 'Athos Danilo',
      avatarTipo: 'preset',
      avatarId: 'sol-nascente',
      avatarUrl: '/assets-3d/avatares/sol-nascente.png',
      primeiroAcessoConcluido: true,
    },
    sessao: {
      expiraEm: '2026-11-30T10:00:00Z',
      expiracaoAbsolutaEm: '2026-12-23T10:00:00Z',
    },
  };
}

function criarAuthDuble(): ServicoAutenticacaoFrontend {
  const sessao = criarSessaoAutenticada();
  return {
    consultarSessao: () => Promise.resolve(sessao),
    concluirPrimeiroAcesso: () =>
      Promise.resolve({
        primeiroAcessoConcluido: true,
        arvoreGuiaCriada: true,
        tarefaGuiaId: 'tar-1',
      }),
    obterPerfil: () => Promise.resolve(sessao.usuario),
    atualizarPerfil: () => Promise.resolve(sessao.usuario),
    enviarAvatar: () =>
      Promise.resolve({
        avatarTipo: 'upload',
        avatarUrl: '/assets-3d/avatares/sol-nascente.png',
        largura: 256,
        altura: 256,
      }),
    sair: () => Promise.resolve(),
    sairTodos: () => Promise.resolve(1),
    excluirConta: () => Promise.resolve({ contaExcluida: true, mensagem: 'Excluida.' }),
  };
}

function criarJornadaDuble(): ServicoJornadaFrontend {
  const tarefaBase: TarefaArvore = {
    id: 'tar-1',
    tarefaPaiId: null,
    titulo: 'Revisar Web II',
    prioridade: 'alta',
    status: 'concluida',
    turno: 'manha',
    prazo: null,
    profundidade: 1,
    ordemManual: 1,
    percentualConclusao: 100,
    totalFolhas: 1,
    folhasConcluidas: 1,
    temFilhaUrgenteAberta: false,
    etiquetas: [{ id: 'etq-1', nome: 'Faculdade', cor: '#1D5C87' }],
    recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
    serieRecorrenciaId: null,
    vezesReaberta: 1,
    compartilhada: false,
    responsavel: null,
    lembretesPendentes: 0,
    criadoEm: '2026-11-20T10:00:00Z',
    atualizadoEm: '2026-11-20T12:00:00Z',
    subtarefas: [],
  };

  return {
    listarTarefas: () =>
      Promise.resolve({
        itens: [tarefaBase],
        totais: { ativas: 0, concluidas: 1, limiteAtivas: 250 },
      }),
    obterTarefa: () =>
      Promise.resolve({
        tarefa: tarefaBase,
        detalhes: {
          tarefaId: 'tar-1',
          usuarioId: 'usr-est',
          metadadosVisuais: {},
          notasEmBlocos: [],
          atualizadoEm: null,
        },
        lembretes: [],
      }),
    criarTarefa: () => Promise.resolve({ tarefa: tarefaBase, ancestraisAtualizados: [] }),
    atualizarTarefa: () => Promise.resolve(tarefaBase),
    concluirTarefa: () =>
      Promise.resolve({
        tarefaId: 'tar-1',
        nosConcluidos: ['tar-1'],
        ancestraisAtualizados: [],
        tokenDesfazer: null,
        expiraEm: null,
        proximaOcorrencia: null,
      }),
    desfazerCascata: () => Promise.resolve({ restaurados: 1, tarefaId: 'tar-1' }),
    reabrirTarefa: () =>
      Promise.resolve({
        tarefaId: 'tar-1',
        status: 'pendente',
        nosReabertos: ['tar-1'],
        ancestraisReabertos: [],
      }),
    moverTarefa: () =>
      Promise.resolve({
        tarefa: tarefaBase,
        ancestraisConcluidos: [],
        ancestraisReabertos: [],
      }),
    reordenarIrmas: () => Promise.resolve(0),
    excluirTarefa: () =>
      Promise.resolve({
        estrategiaAplicada: 'cascata',
        tarefasRemovidas: 1,
        filhasPromovidas: 0,
      }),
    salvarDetalhes: () =>
      Promise.resolve({
        tarefaId: 'tar-1',
        usuarioId: 'usr-est',
        metadadosVisuais: {},
        notasEmBlocos: [],
        atualizadoEm: null,
      }),
    listarEtiquetas: () =>
      Promise.resolve({
        itens: [{ id: 'etq-1', nome: 'Faculdade', cor: '#1D5C87', criadoEm: null }],
        limiteMaximo: 40,
      }),
    criarEtiqueta: () =>
      Promise.resolve({ id: 'etq-1', nome: 'Faculdade', cor: '#1D5C87', criadoEm: null }),
    atualizarEtiqueta: () =>
      Promise.resolve({ id: 'etq-1', nome: 'Faculdade', cor: '#1D5C87', criadoEm: null }),
    excluirEtiqueta: () => Promise.resolve(),
    buscarCidades: () => Promise.resolve([]),
    atualizarConsentimentoClima: () =>
      Promise.resolve({
        habilitado: false,
        modoLocalizacao: null,
        cidade: null,
        uf: null,
        latitudeAprox: null,
        longitudeAprox: null,
        estadoClimatico: 'limpo',
      }),
    consultarClimaAtual: () => Promise.resolve({ autorizado: false, clima: null }),
  };
}

function criarServicosEstatisticasDuble() {
  const resumoPadrao: ResumoEstatisticasFrontend = {
    periodo: '30d',
    escopo: 'todas',
    kpis: {
      totalCriadas: 42,
      totalConcluidas: 34,
      taxaConclusaoPct: 81,
      tempoMedioConclusaoHoras: 18.4,
      pontualidadePct: 88,
      sequenciaAtualDias: 6,
      sequenciaRecordeDias: 12,
      minutosFocoTotais: 640,
      taxaFocoConcluidoPct: 85,
    },
    serieTemporal: [
      { data: '2026-11-22', criadas: 3, concluidas: 4, minutosFoco: 50 },
      { data: '2026-11-23', criadas: 2, concluidas: 3, minutosFoco: 75 },
    ],
    mapaCalor: [
      { data: '2026-11-22', intensidade: 3, acoes: 5 },
      { data: '2026-11-23', intensidade: 4, acoes: 6 },
    ],
    porTurno: { manha: 12, tarde: 11, noite: 7, livre: 4 },
    porPrioridade: { baixa: 8, media: 14, alta: 8, urgente: 4 },
    porEtiqueta: [
      {
        etiquetaId: 'etq-1',
        nome: 'Faculdade',
        cor: '#1D5C87',
        concluidas: 15,
      },
    ],
    recorrencias: {
      rotinasAtivas: 4,
      ocorrenciasCumpridas: 22,
      taxaConsistenciaPct: 79,
    },
    repeticoesERetrabalho: {
      totalReaberturas: 5,
      tarefasReabertasDistintas: 3,
      titulosMaisRepetidos: [
        {
          tituloNormalizado: 'revisar resumo de aula',
          ocorrencias: 6,
          concluidas: 5,
        },
      ],
    },
    arvores: {
      constelacoesConcluidas: 3,
      profundidadeMedia: 2.4,
    },
  };

  let preferenciasAtuais: PreferenciasCenarioFrontend = {
    modoTemporal: 'relogio_real',
    horaSimulada: null,
    qualidade3d: 'auto',
    reduzirMovimento: false,
    audio: {
      habilitado: false,
      volumeGeral: 0.7,
      volumeEfeitos: 0.8,
      volumeAmbiente: 0.5,
    },
    tutorial: {
      status: 'pendente',
      etapaAtual: 0,
    },
  };

  const espiaoObterResumo = vi.fn((filtros: ParametrosResumoEstatisticas) =>
    Promise.resolve({
      ...resumoPadrao,
      periodo: filtros.periodo,
      escopo: filtros.escopo,
    }),
  );

  const espiaoListarDiario = vi.fn(
    (filtros: ParametrosListarDiario): Promise<DiarioEventosPaginado> => {
      if (filtros.cursor === 'cur-2') {
        return Promise.resolve({
          itens: [
            {
              eventoId: 'evt-2',
              autorUsuarioId: 'usr-est',
              tarefaId: 'tar-1',
              tarefaRaizId: 'tar-1',
              tipoEvento: 'tarefa_reaberta',
              momentoDoDia: 'manha',
              resumo: 'Reabriu revisão para ajustar referências.',
              detalhes: {},
              criadoEm: '2026-11-22T11:00:00Z',
            },
          ],
          proximoCursor: null,
        });
      }
      return Promise.resolve({
        itens: [
          {
            eventoId: 'evt-1',
            autorUsuarioId: 'usr-est',
            tarefaId: 'tar-1',
            tarefaRaizId: 'tar-1',
            tipoEvento: 'foco_concluido',
            momentoDoDia: 'noite',
            resumo: 'Concluiu sessão imersiva de 25 minutos.',
            detalhes: { duracao_real_seg: 1500 },
            criadoEm: '2026-11-23T22:00:00Z',
          },
        ],
        proximoCursor: 'cur-2',
      });
    },
  );

  const espiaoAtualizarPreferencias = vi.fn((carga: EntradaAtualizarPreferencias) => {
    preferenciasAtuais = {
      ...preferenciasAtuais,
      ...carga,
      audio: { ...preferenciasAtuais.audio, ...(carga.audio ?? {}) },
      tutorial: { ...preferenciasAtuais.tutorial, ...(carga.tutorial ?? {}) },
    };
    return Promise.resolve(preferenciasAtuais);
  });

  const servicoEstatisticas: ServicoEstatisticasFrontend = {
    obterResumo: espiaoObterResumo,
    listarDiario: espiaoListarDiario,
    obterUrlExportacaoDiario: ({ formato }) => `/api/exportacao/diario?formato=${formato}`,
    obterPreferencias: () => Promise.resolve(preferenciasAtuais),
    atualizarPreferencias: espiaoAtualizarPreferencias,
  };

  return {
    servicoEstatisticas,
    espiaoObterResumo,
    espiaoListarDiario,
    espiaoAtualizarPreferencias,
  };
}

afterEach(() => {
  cleanup();
  useMotorTemporal.setState({
    modoTemporal: 'relogio_real',
    qualidade3D: 'auto',
    movimentoReduzido: false,
  });
});

describe('Página de Estatísticas, Diário do Ciclo e Preferências', () => {
  it('exibe KPIs D14, gráficos, mapa de calor, recorrências e repetições respondendo aos filtros', async () => {
    const usuario = userEvent.setup();
    const auth = criarAuthDuble();
    const jornada = criarJornadaDuble();
    const { servicoEstatisticas, espiaoObterResumo } = criarServicosEstatisticasDuble();

    render(
      <Aplicacao
        rotaInicial="/estatisticas"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={auth}
        servicoJornada={jornada}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: /Estatísticas e Diário/i }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /Estatísticas/i }).length).toBeGreaterThanOrEqual(1);
    expect(await screen.findByText('81%')).toBeInTheDocument();
    expect(screen.getByText('88%')).toBeInTheDocument();
    expect(screen.getByText(/revisar resumo de aula/i)).toBeInTheDocument();
    expect(screen.getByText(/Constelações concluídas/i)).toBeInTheDocument();
    expect(screen.getAllByTestId(/celula-calor-/i)).toHaveLength(2);

    // Filtra para 90d e escopo Grupo
    await usuario.click(screen.getByRole('button', { name: '90 dias' }));
    await usuario.click(screen.getByRole('button', { name: 'Grupo' }));

    await waitFor(() => {
      expect(espiaoObterResumo).toHaveBeenCalledWith(
        expect.objectContaining({ periodo: '90d', escopo: 'grupo' }),
      );
    });
  });

  it('pagina o Diário do Ciclo por cursor, aplica busca/tipo e persiste preferências sincronizadas no motor temporal', async () => {
    const usuario = userEvent.setup();
    const auth = criarAuthDuble();
    const jornada = criarJornadaDuble();
    const { servicoEstatisticas, espiaoListarDiario, espiaoAtualizarPreferencias } =
      criarServicosEstatisticasDuble();

    render(
      <Aplicacao
        rotaInicial="/estatisticas"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={auth}
        servicoJornada={jornada}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    expect(await screen.findByText(/Concluiu sessão imersiva de 25 minutos/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Carregar mais eventos/i }));
    expect(
      await screen.findByText(/Reabriu revisão para ajustar referências/i),
    ).toBeInTheDocument();

    const seletorTipo = screen.getByLabelText(/Tipo de evento/i);
    await usuario.selectOptions(seletorTipo, 'foco_concluido');

    await waitFor(() => {
      expect(espiaoListarDiario).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: 'foco_concluido' }),
      );
    });

    // Links de exportacao .md e .json
    expect(screen.getByRole('link', { name: /Exportar Markdown/i })).toHaveAttribute(
      'href',
      '/api/exportacao/diario?formato=md',
    );
    expect(screen.getByRole('link', { name: /Exportar JSON/i })).toHaveAttribute(
      'href',
      '/api/exportacao/diario?formato=json',
    );

    // Preferencias do cenario
    const seletorQualidade = screen.getByLabelText(/Qualidade visual/i);
    await usuario.selectOptions(seletorQualidade, 'desempenho_2d');
    await usuario.click(screen.getByLabelText(/Reduzir animações/i));
    await usuario.click(screen.getByRole('button', { name: /Salvar preferências/i }));

    await waitFor(() => {
      expect(espiaoAtualizarPreferencias).toHaveBeenCalledWith(
        expect.objectContaining({
          qualidade3d: 'desempenho_2d',
          reduzirMovimento: true,
        }),
      );
    });
    expect(useMotorTemporal.getState().qualidade3D).toBe('desempenho_2d');
    expect(useMotorTemporal.getState().movimentoReduzido).toBe(true);
  });
});
