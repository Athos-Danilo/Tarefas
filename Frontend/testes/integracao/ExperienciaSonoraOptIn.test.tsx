import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { useMotorTemporal } from '../../src/astronomia/motor-temporal';
import { definirFabricaAudioParaTeste, useEstadoAudio } from '../../src/audio/estado-audio';
import type { BufferAudioMinimo, ContextoAudioMinimo } from '../../src/audio/motor-web-audio';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type {
  EntradaAtualizarPreferencias,
  PreferenciasCenarioFrontend,
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

function instalarFabricaAudioMock() {
  const chamadasClose: number[] = [];
  let totalOsciladores = 0;

  const fabrica = vi.fn((): ContextoAudioMinimo => {
    const contexto = {
      state: 'running' as const,
      currentTime: 0,
      sampleRate: 44100,
      destination: { connect: vi.fn(), disconnect: vi.fn() },
      createGain: () => ({
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          cancelScheduledValues: vi.fn(),
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createOscillator: () => {
        totalOsciladores += 1;
        return {
          type: 'sine',
          frequency: { value: 220, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
          connect: vi.fn(),
          disconnect: vi.fn(),
          start: vi.fn(),
          stop: vi.fn(),
          onended: null,
        };
      },
      createBiquadFilter: () => ({
        type: 'lowpass',
        frequency: { value: 400, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
        Q: { value: 1 },
        connect: vi.fn(),
        disconnect: vi.fn(),
      }),
      createBuffer: (_c: number, t: number) => ({ getChannelData: () => new Float32Array(t) }),
      createBufferSource: () => ({
        buffer: null as BufferAudioMinimo | null,
        loop: false,
        connect: vi.fn(),
        disconnect: vi.fn(),
        start: vi.fn(),
        stop: vi.fn(),
      }),
      suspend: vi.fn(() => Promise.resolve()),
      resume: vi.fn(() => Promise.resolve()),
      close: vi.fn(() => {
        chamadasClose.push(1);
        return Promise.resolve();
      }),
    };
    return contexto;
  });

  definirFabricaAudioParaTeste(fabrica);
  return {
    fabrica,
    lerTotalClose: () => chamadasClose.length,
    lerTotalOsciladores: () => totalOsciladores,
  };
}

function criarAuthDuble(): ServicoAutenticacaoFrontend {
  const sessao: Extract<EstadoSessao, { autenticado: true }> = {
    autenticado: true,
    usuario: {
      id: 'usr-audio',
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
  let tarefaBase: TarefaArvore = {
    id: 'tar-1',
    tarefaPaiId: null,
    titulo: 'Estudar síntese Web Audio',
    prioridade: 'alta',
    status: 'pendente',
    turno: 'manha',
    prazo: null,
    profundidade: 1,
    ordemManual: 1,
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
  };

  return {
    listarTarefas: () =>
      Promise.resolve({
        itens: [tarefaBase],
        totais: {
          ativas: tarefaBase.status === 'concluida' ? 0 : 1,
          concluidas: tarefaBase.status === 'concluida' ? 1 : 0,
          limiteAtivas: 250,
        },
      }),
    obterTarefa: () =>
      Promise.resolve({
        tarefa: tarefaBase,
        detalhes: {
          tarefaId: 'tar-1',
          usuarioId: 'usr-audio',
          metadadosVisuais: {},
          notasEmBlocos: [],
          atualizadoEm: null,
        },
        lembretes: [],
      }),
    criarTarefa: () => Promise.resolve({ tarefa: tarefaBase, ancestraisAtualizados: [] }),
    atualizarTarefa: () => Promise.resolve(tarefaBase),
    concluirTarefa: (id) => {
      tarefaBase = { ...tarefaBase, status: 'concluida', percentualConclusao: 100 };
      return Promise.resolve({
        tarefaId: id,
        nosConcluidos: [id],
        ancestraisAtualizados: [],
        tokenDesfazer: null,
        expiraEm: null,
        proximaOcorrencia: null,
      });
    },
    desfazerCascata: () => Promise.resolve({ restaurados: 1, tarefaId: 'tar-1' }),
    reabrirTarefa: (id) => {
      tarefaBase = { ...tarefaBase, status: 'em_andamento', percentualConclusao: 0 };
      return Promise.resolve({
        tarefaId: id,
        status: 'em_andamento',
        nosReabertos: [id],
        ancestraisReabertos: [],
      });
    },
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
        usuarioId: 'usr-audio',
        metadadosVisuais: {},
        notasEmBlocos: [],
        atualizadoEm: null,
      }),
    listarEtiquetas: () => Promise.resolve({ itens: [], limiteMaximo: 40 }),
    criarEtiqueta: () => Promise.resolve({ id: 'etq', nome: 'A', cor: '#1D5C87', criadoEm: null }),
    atualizarEtiqueta: () =>
      Promise.resolve({ id: 'etq', nome: 'A', cor: '#1D5C87', criadoEm: null }),
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

function criarEstatisticasAudioDuble(
  audioInicial = {
    habilitado: false,
    volumeGeral: 0.7,
    volumeEfeitos: 0.8,
    volumeAmbiente: 0.5,
  },
) {
  let prefs: PreferenciasCenarioFrontend = {
    modoTemporal: 'relogio_real',
    horaSimulada: null,
    qualidade3d: 'auto',
    reduzirMovimento: false,
    audio: audioInicial,
    tutorial: { status: 'concluido', etapaAtual: 6 },
  };

  const espiaoAtualizarPreferencias = vi.fn((entrada: EntradaAtualizarPreferencias) => {
    prefs = {
      ...prefs,
      ...entrada,
      audio: { ...prefs.audio, ...(entrada.audio ?? {}) },
      tutorial: { ...prefs.tutorial, ...(entrada.tutorial ?? {}) },
    };
    return Promise.resolve(prefs);
  });

  const servicoEstatisticas: ServicoEstatisticasFrontend = {
    obterResumo: () =>
      Promise.resolve({
        periodo: '30d',
        escopo: 'todas',
        kpis: {
          totalCriadas: 1,
          totalConcluidas: 0,
          taxaConclusaoPct: 0,
          tempoMedioConclusaoHoras: 0,
          pontualidadePct: 0,
          sequenciaAtualDias: 0,
          sequenciaRecordeDias: 0,
          minutosFocoTotais: 0,
          taxaFocoConcluidoPct: 0,
        },
        serieTemporal: [],
        mapaCalor: [],
        porTurno: { manha: 0, tarde: 0, noite: 0, livre: 0 },
        porPrioridade: { baixa: 0, media: 0, alta: 0, urgente: 0 },
        porEtiqueta: [],
        recorrencias: { rotinasAtivas: 0, ocorrenciasCumpridas: 0, taxaConsistenciaPct: 0 },
        repeticoesERetrabalho: {
          totalReaberturas: 0,
          tarefasReabertasDistintas: 0,
          titulosMaisRepetidos: [],
        },
        arvores: { constelacoesConcluidas: 0, profundidadeMedia: 0 },
      }),
    listarDiario: () => Promise.resolve({ itens: [], proximoCursor: null }),
    obterUrlExportacaoDiario: ({ formato }) => `/api/exportacao/diario?formato=${formato}`,
    obterPreferencias: () => Promise.resolve(prefs),
    atualizarPreferencias: espiaoAtualizarPreferencias,
  };

  return { servicoEstatisticas, espiaoAtualizarPreferencias };
}

afterEach(() => {
  cleanup();
  useEstadoAudio.getState().resetarAudioParaTeste();
  definirFabricaAudioParaTeste(null);
  useMotorTemporal.setState({
    modoTemporal: 'relogio_real',
    climaSimulado: 'automatico',
    qualidade3D: 'auto',
    movimentoReduzido: false,
  });
});

describe('Fase 23 - Experiência Sonora Opt-in e Web Audio API', () => {
  it('inicia silenciada, ativa ao clicar, toca micro-efeito ao concluir tarefa e fecha ao desligar', async () => {
    const usuario = userEvent.setup();
    const audioMock = instalarFabricaAudioMock();
    const { servicoEstatisticas, espiaoAtualizarPreferencias } = criarEstatisticasAudioDuble();

    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    expect(await screen.findByText('Estudar síntese Web Audio')).toBeInTheDocument();

    const botoesDesligado = screen.getAllByRole('button', { name: /Som desligado/i });
    expect(botoesDesligado[0]).toHaveAttribute('aria-pressed', 'false');
    expect(audioMock.fabrica).not.toHaveBeenCalled();

    // Liga o audio opt-in pelo controle da casca
    await usuario.click(botoesDesligado[0]);

    await waitFor(() => {
      expect(audioMock.fabrica).toHaveBeenCalledTimes(1);
    });
    expect(useEstadoAudio.getState().habilitado).toBe(true);
    expect(espiaoAtualizarPreferencias.mock.calls[0]?.[0]?.audio?.habilitado).toBe(true);

    // Concluir tarefa aciona micro-efeito tarefa_concluida
    await usuario.click(
      screen.getByRole('button', { name: /Concluir Estudar síntese Web Audio/i }),
    );
    await waitFor(() => {
      expect(useEstadoAudio.getState().ultimoEfeito).toBe('tarefa_concluida');
    });

    // Alterar clima simulado para chuva atualiza o controlador sem recriar contexto
    useMotorTemporal.getState().definirClimaSimulado('chuvoso');
    expect(audioMock.fabrica).toHaveBeenCalledTimes(1);

    // Desligar libera recursos chamando close()
    const botoesAtivo = screen.getAllByRole('button', { name: /Som ativo/i });
    await usuario.click(botoesAtivo[0]);

    await waitFor(() => {
      expect(audioMock.lerTotalClose()).toBe(1);
    });
    expect(useEstadoAudio.getState().habilitado).toBe(false);
    expect(espiaoAtualizarPreferencias.mock.calls.at(-1)?.[0]?.audio?.habilitado).toBe(false);
  });

  it('sincroniza volumes salvos em Estatísticas e permite prévia Testar som', async () => {
    const usuario = userEvent.setup();
    const audioMock = instalarFabricaAudioMock();
    const { servicoEstatisticas } = criarEstatisticasAudioDuble({
      habilitado: true,
      volumeGeral: 0.6,
      volumeEfeitos: 0.75,
      volumeAmbiente: 0.4,
    });

    render(
      <Aplicacao
        rotaInicial="/estatisticas"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    expect(
      await screen.findByRole('heading', { name: /Estatísticas e Diário/i }),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(useEstadoAudio.getState().volumeGeral).toBe(0.6);
      expect(useEstadoAudio.getState().habilitado).toBe(true);
    });

    const antesOsc = audioMock.lerTotalOsciladores();
    await usuario.click(screen.getByRole('button', { name: /Testar som/i }));
    expect(audioMock.lerTotalOsciladores()).toBeGreaterThan(antesOsc);
    expect(useEstadoAudio.getState().ultimoEfeito).toBe('cascata_concluida');
  });
});
