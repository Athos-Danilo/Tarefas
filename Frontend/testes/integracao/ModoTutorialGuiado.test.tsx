import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
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

function criarSessaoAutenticada(): Extract<EstadoSessao, { autenticado: true }> {
  return {
    autenticado: true,
    usuario: {
      id: 'usr-tut',
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
    titulo: 'Organizar semana de estudos',
    prioridade: 'media',
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
        totais: { ativas: 1, concluidas: 0, limiteAtivas: 250 },
      }),
    obterTarefa: () =>
      Promise.resolve({
        tarefa: tarefaBase,
        detalhes: {
          tarefaId: 'tar-1',
          usuarioId: 'usr-tut',
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
        usuarioId: 'usr-tut',
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

function criarEstatisticasTutorialDuble(
  statusInicial: 'pendente' | 'pulado' | 'concluido',
  etapaInicial = 0,
) {
  let preferencias: PreferenciasCenarioFrontend = {
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
      status: statusInicial,
      etapaAtual: etapaInicial,
    },
  };

  const espiaoAtualizarPreferencias = vi.fn((entrada: EntradaAtualizarPreferencias) => {
    preferencias = {
      ...preferencias,
      ...entrada,
      audio: { ...preferencias.audio, ...(entrada.audio ?? {}) },
      tutorial: { ...preferencias.tutorial, ...(entrada.tutorial ?? {}) },
    };
    return Promise.resolve(preferencias);
  });

  const servicoEstatisticas: ServicoEstatisticasFrontend = {
    obterResumo: () =>
      Promise.resolve({
        periodo: '30d',
        escopo: 'todas',
        kpis: {
          totalCriadas: 0,
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
    obterPreferencias: () => Promise.resolve(preferencias),
    atualizarPreferencias: espiaoAtualizarPreferencias,
  };

  return {
    servicoEstatisticas,
    espiaoAtualizarPreferencias,
    lerPreferencias: () => preferencias,
  };
}

afterEach(() => {
  cleanup();
});

describe('Fase 22 - Modo Tutorial Guiado em 6 passos', () => {
  it('inicia automaticamente em /jornada para conta nova e conclui os 6 passos com teclado e botoes', async () => {
    const usuario = userEvent.setup();
    const { servicoEstatisticas, espiaoAtualizarPreferencias, lerPreferencias } =
      criarEstatisticasTutorialDuble('pendente', 0);

    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    const dialogo = await screen.findByRole('dialog', { name: /Tour guiado/i });
    expect(dialogo).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 6')).toBeInTheDocument();

    // Avanca para passo 2 pelo botao Proximo
    await usuario.click(screen.getByRole('button', { name: /Próximo/i }));
    expect(await screen.findByText('Passo 2 de 6')).toBeInTheDocument();

    // Testa botao Voltar
    await usuario.click(screen.getByRole('button', { name: /Voltar/i }));
    expect(await screen.findByText('Passo 1 de 6')).toBeInTheDocument();

    // Navega com seta direita do teclado ate o passo 6
    await usuario.keyboard('{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}{ArrowRight}');
    expect(await screen.findByText('Passo 6 de 6')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Concluir tutorial/i }));

    await waitFor(() => {
      expect(espiaoAtualizarPreferencias).toHaveBeenCalledWith({
        tutorial: { status: 'concluido', etapaAtual: 6 },
      });
    });
    expect(lerPreferencias().tutorial).toEqual({ status: 'concluido', etapaAtual: 6 });
    expect(screen.queryByRole('dialog', { name: /Tour guiado/i })).not.toBeInTheDocument();
  });

  it('permite pular com Esc e nao reabre em novos logins ou outros dispositivos', async () => {
    const usuario = userEvent.setup();
    const { servicoEstatisticas, espiaoAtualizarPreferencias, lerPreferencias } =
      criarEstatisticasTutorialDuble('pendente', 0);

    const primeiraRender = render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    await screen.findByRole('dialog', { name: /Tour guiado/i });
    await usuario.click(screen.getByRole('button', { name: /Próximo/i }));
    expect(await screen.findByText('Passo 2 de 6')).toBeInTheDocument();

    await usuario.keyboard('{Escape}');

    await waitFor(() => {
      expect(espiaoAtualizarPreferencias).toHaveBeenCalledWith({
        tutorial: { status: 'pulado', etapaAtual: 2 },
      });
    });
    expect(lerPreferencias().tutorial.status).toBe('pulado');
    expect(screen.queryByRole('dialog', { name: /Tour guiado/i })).not.toBeInTheDocument();

    primeiraRender.unmount();

    // Simula novo login / novo dispositivo usando os dados persistidos no servidor
    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    expect(await screen.findByRole('heading', { name: /Olá, Athos Danilo/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Tour guiado/i })).not.toBeInTheDocument();
  });

  it('nao abre automaticamente fora da Jornada nem quando conta ja concluiu', async () => {
    const pendenteEmPerfil = criarEstatisticasTutorialDuble('pendente', 0);
    const { unmount } = render(
      <Aplicacao
        rotaInicial="/perfil"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={pendenteEmPerfil.servicoEstatisticas}
      />,
    );

    expect(await screen.findByRole('heading', { name: /Meu perfil e conta/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Tour guiado/i })).not.toBeInTheDocument();
    unmount();

    const contaConcluida = criarEstatisticasTutorialDuble('concluido', 6);
    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={contaConcluida.servicoEstatisticas}
      />,
    );

    expect(await screen.findByRole('heading', { name: /Olá, Athos Danilo/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog', { name: /Tour guiado/i })).not.toBeInTheDocument();
  });

  it('permite acionar Rever tutorial no Perfil e revisar sem perder status concluido', async () => {
    const usuario = userEvent.setup();
    const { servicoEstatisticas, espiaoAtualizarPreferencias, lerPreferencias } =
      criarEstatisticasTutorialDuble('concluido', 6);

    render(
      <Aplicacao
        rotaInicial="/perfil"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={criarJornadaDuble()}
        servicoEstatisticas={servicoEstatisticas}
      />,
    );

    await screen.findByRole('heading', { name: /Meu perfil e conta/i });
    await usuario.click(screen.getByRole('button', { name: /Rever tutorial/i }));
    expect(
      await screen.findByText(/Modo tutorial marcado para exibição ao voltar para sua Jornada/i),
    ).toBeInTheDocument();

    await usuario.click(screen.getByRole('link', { name: /Abrir Jornada e iniciar tour/i }));

    expect(await screen.findByRole('dialog', { name: /Tour guiado/i })).toBeInTheDocument();
    expect(screen.getByText('Passo 1 de 6')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Pular tutorial/i }));
    expect(screen.queryByRole('dialog', { name: /Tour guiado/i })).not.toBeInTheDocument();
    expect(lerPreferencias().tutorial).toEqual({ status: 'concluido', etapaAtual: 6 });
    expect(espiaoAtualizarPreferencias).not.toHaveBeenCalled();
  });
});
