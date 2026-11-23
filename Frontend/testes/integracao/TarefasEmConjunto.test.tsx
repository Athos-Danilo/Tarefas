import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type {
  EntrarConviteResposta,
  PainelDesempenhoGrupo,
  PreviaConviteGrupo,
  ResultadoCompartilharGrupo,
  ResultadoRegenerarConvite,
  ResultadoSairGrupo,
  ResultadoTransferirLideranca,
  ServicoGruposFrontend,
  VagaGrupo,
} from '../../src/servicos/tipos-grupos';
import type {
  DetalheTarefaCompleta,
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
      timestamp: '2026-11-23T10:00:00Z',
    }),
};

function criarSessaoAutenticada(
  usuarioId: string,
  nomeExibicao: string,
  email: string,
): EstadoSessao {
  return {
    autenticado: true,
    usuario: {
      id: usuarioId,
      email,
      nomeExibicao,
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

function criarAuthDuble(sessao: EstadoSessao): ServicoAutenticacaoFrontend {
  return {
    consultarSessao: () => Promise.resolve(sessao),
    concluirPrimeiroAcesso: () =>
      Promise.resolve({
        primeiroAcessoConcluido: true,
        arvoreGuiaCriada: true,
        tarefaGuiaId: 't-guia',
      }),
    obterPerfil: () => {
      if (!sessao.autenticado) {
        return Promise.reject(new Error('Anonimo'));
      }
      return Promise.resolve(sessao.usuario);
    },
    atualizarPerfil: () => Promise.reject(new Error('Nao usado')),
    enviarAvatar: () => Promise.reject(new Error('Nao usado')),
    sair: () => Promise.resolve(),
    sairTodos: () => Promise.resolve(1),
    excluirConta: () => Promise.resolve({ contaExcluida: true, mensagem: 'Excluida' }),
  };
}

function fabricarNo(parcial: Partial<TarefaArvore> & { id: string; titulo: string }): TarefaArvore {
  return {
    tarefaPaiId: null,
    prioridade: 'media',
    status: 'pendente',
    turno: 'tarde',
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
    criadoEm: '2026-11-23T09:00:00Z',
    atualizadoEm: '2026-11-23T09:00:00Z',
    subtarefas: [],
    ...parcial,
  };
}

function fabricarCenarioLider() {
  const subtarefa = fabricarNo({
    id: 'sub-api',
    tarefaPaiId: 'raiz-projeto',
    titulo: 'Construir rotas REST',
    profundidade: 2,
    compartilhada: false,
  });

  let raiz = fabricarNo({
    id: 'raiz-projeto',
    titulo: 'Trabalho em Trio Web II',
    profundidade: 1,
    compartilhada: false,
    totalFolhas: 1,
    subtarefas: [subtarefa],
  });

  let painel: PainelDesempenhoGrupo = {
    tarefaRaizId: 'raiz-projeto',
    titulo: 'Trabalho em Trio Web II',
    meuPapel: 'lider',
    linkConviteAtivo: true,
    codigoToken: 'tok-lider-1',
    resumoGeral: { totalSubtarefasFolha: 2, folhasConcluidas: 1, percentualGeral: 50 },
    integrantes: [
      {
        usuarioId: 'u-lider',
        nomeExibicao: 'Athos Danilo',
        papel: 'lider',
        avatarUrl: '/assets-3d/avatares/sol-nascente.png',
        atribuidas: 1,
        concluidas: 1,
        percentual: 100,
      },
      {
        usuarioId: 'u-maria',
        nomeExibicao: 'Maria Silva',
        papel: 'colaborador',
        avatarUrl: '/assets-3d/avatares/lua-crescente.png',
        atribuidas: 1,
        concluidas: 0,
        percentual: 0,
      },
    ],
    vagasAbertas: [],
    atividadeRecente: [
      {
        eventoId: 'evt-1',
        autorNome: 'Athos Danilo',
        tipoEvento: 'tarefa_concluida',
        resumo: 'Athos concluiu etapa inicial',
        criadoEm: '2026-11-23T09:30:00Z',
      },
    ],
  };

  const listarTarefas = vi.fn(() =>
    Promise.resolve({
      itens: [raiz],
      totais: { ativas: 2, concluidas: 0, limiteAtivas: 200 },
    }),
  );

  const obterTarefa = vi.fn((tarefaId: string): Promise<DetalheTarefaCompleta> =>
    Promise.resolve({
      tarefa: tarefaId === 'sub-api' ? raiz.subtarefas[0] : raiz,
      detalhes: {
        tarefaId,
        usuarioId: 'u-lider',
        metadadosVisuais: {},
        notasEmBlocos: [],
        atualizadoEm: '2026-11-23T09:40:00Z',
      },
      lembretes: [],
    }),
  );

  const servicoJornada: ServicoJornadaFrontend = {
    listarTarefas,
    obterTarefa,
    criarTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    atualizarTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    concluirTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    desfazerCascata: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    reabrirTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    moverTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    reordenarIrmas: vi.fn(() => Promise.resolve(0)),
    excluirTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    salvarDetalhes: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    listarEtiquetas: vi.fn(() => Promise.resolve({ itens: [], limiteMaximo: 30 })),
    criarEtiqueta: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    atualizarEtiqueta: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    excluirEtiqueta: vi.fn(() => Promise.resolve()),
    buscarCidades: vi.fn(() => Promise.resolve([])),
    atualizarConsentimentoClima: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    consultarClimaAtual: vi.fn(() => Promise.resolve({ autorizado: false as const, clima: null })),
  };

  const compartilharTarefa = vi.fn((tarefaRaizId: string): Promise<ResultadoCompartilharGrupo> => {
    raiz = {
      ...raiz,
      compartilhada: true,
      subtarefas: raiz.subtarefas.map((sub) => ({ ...sub, compartilhada: true })),
    };
    return Promise.resolve({
      tarefaRaizId,
      compartilhada: true,
      meuPapel: 'lider',
      codigoToken: 'tok-lider-1',
      linkConvite: '/convites/tok-lider-1',
    });
  });

  const criarVaga = vi.fn(
    (
      tarefaRaizId: string,
      entrada: { nomeExibicao: string; emailOpcional?: string | null },
    ): Promise<VagaGrupo> => {
      const novaId = `vaga-${painel.vagasAbertas.length + 1}`;
      painel = {
        ...painel,
        vagasAbertas: [
          ...painel.vagasAbertas,
          {
            vagaId: novaId,
            nomeExibicao: entrada.nomeExibicao,
            emailOpcional: entrada.emailOpcional ?? null,
            atribuidas: 0,
          },
        ],
      };
      return Promise.resolve({
        id: novaId,
        tarefaRaizId,
        nomeExibicao: entrada.nomeExibicao,
        emailOpcional: entrada.emailOpcional ?? null,
        ocupadaPorUsuarioId: null,
        criadaEm: '2026-11-23T09:45:00Z',
      });
    },
  );

  const regenerarConvite = vi.fn((): Promise<ResultadoRegenerarConvite> => {
    painel = { ...painel, linkConviteAtivo: true, codigoToken: 'tok-lider-novo' };
    return Promise.resolve({
      codigoToken: 'tok-lider-novo',
      linkConvite: '/convites/tok-lider-novo',
      ativo: true,
    });
  });

  const revogarConvites = vi.fn(() => {
    painel = { ...painel, linkConviteAtivo: false };
    return Promise.resolve();
  });

  const atribuirResponsavel = vi.fn(
    (
      tarefaId: string,
      entrada: { responsavelUsuarioId?: string | null; vagaResponsavelId?: string | null },
    ): Promise<TarefaArvore> => {
      const vaga = painel.vagasAbertas.find((v) => v.vagaId === entrada.vagaResponsavelId);
      const responsavel = vaga
        ? {
            tipo: 'vaga' as const,
            usuarioId: null,
            vagaId: vaga.vagaId,
            nomeExibicao: vaga.nomeExibicao,
            avatarUrl: null,
          }
        : null;
      raiz = {
        ...raiz,
        subtarefas: raiz.subtarefas.map((sub) =>
          sub.id === tarefaId ? { ...sub, responsavel } : sub,
        ),
      };
      return Promise.resolve({ ...raiz.subtarefas[0], responsavel });
    },
  );

  const transferirLideranca = vi.fn(
    (_raizId: string, novoLiderId: string): Promise<ResultadoTransferirLideranca> => {
      painel = { ...painel, meuPapel: 'colaborador', codigoToken: null };
      return Promise.resolve({
        liderancaTransferida: true,
        novoLiderUsuarioId: novoLiderId,
      });
    },
  );

  const servicoGrupos: ServicoGruposFrontend = {
    compartilharTarefa,
    criarVaga,
    excluirVaga: vi.fn(() => Promise.resolve()),
    regenerarConvite,
    revogarConvites,
    obterPreviaConvite: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    entrarPorConvite: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    atribuirResponsavel,
    obterDesempenhoGrupo: vi.fn(() => Promise.resolve(painel)),
    transferirLideranca,
    removerMembro: vi.fn(() => Promise.resolve()),
    sairDoGrupo: vi.fn(() => Promise.resolve({ saiuDoGrupo: true, subtarefasDesvinculadas: 0 })),
  };

  return {
    servicoJornada,
    servicoGrupos,
    spies: {
      compartilharTarefa,
      criarVaga,
      regenerarConvite,
      revogarConvites,
      atribuirResponsavel,
      transferirLideranca,
    },
  };
}

function fabricarCenarioColaborador() {
  const minhaEtapa = fabricarNo({
    id: 'sub-maria',
    tarefaPaiId: 'raiz-g',
    titulo: 'Minha etapa no frontend',
    profundidade: 2,
    compartilhada: true,
    responsavel: {
      tipo: 'usuario',
      usuarioId: 'u-maria',
      vagaId: null,
      nomeExibicao: 'Maria Silva',
      avatarUrl: '/assets-3d/avatares/lua-crescente.png',
    },
  });
  const etapaOutro = fabricarNo({
    id: 'sub-athos',
    tarefaPaiId: 'raiz-g',
    titulo: 'Etapa exclusiva do Athos',
    profundidade: 2,
    compartilhada: true,
    responsavel: {
      tipo: 'usuario',
      usuarioId: 'u-lider',
      vagaId: null,
      nomeExibicao: 'Athos Danilo',
      avatarUrl: null,
    },
  });
  const raiz = fabricarNo({
    id: 'raiz-g',
    titulo: 'Projeto Grupo Web II',
    profundidade: 1,
    compartilhada: true,
    totalFolhas: 2,
    subtarefas: [minhaEtapa, etapaOutro],
  });

  const painelColab: PainelDesempenhoGrupo = {
    tarefaRaizId: 'raiz-g',
    titulo: 'Projeto Grupo Web II',
    meuPapel: 'colaborador',
    linkConviteAtivo: true,
    codigoToken: null,
    resumoGeral: { totalSubtarefasFolha: 2, folhasConcluidas: 0, percentualGeral: 0 },
    integrantes: [
      {
        usuarioId: 'u-lider',
        nomeExibicao: 'Athos Danilo',
        papel: 'lider',
        avatarUrl: null,
        atribuidas: 1,
        concluidas: 0,
        percentual: 0,
      },
      {
        usuarioId: 'u-maria',
        nomeExibicao: 'Maria Silva',
        papel: 'colaborador',
        avatarUrl: null,
        atribuidas: 1,
        concluidas: 0,
        percentual: 0,
      },
    ],
    vagasAbertas: [],
    atividadeRecente: [],
  };

  const concluirTarefa = vi.fn((tarefaId: string) =>
    Promise.resolve({
      tarefaId,
      nosConcluidos: [tarefaId],
      ancestraisAtualizados: [],
      tokenDesfazer: null,
      expiraEm: null,
      proximaOcorrencia: null,
    }),
  );

  const listarTarefas = vi.fn(() =>
    Promise.resolve({
      itens: [raiz],
      totais: { ativas: 3, concluidas: 0, limiteAtivas: 200 },
    }),
  );

  const obterDesempenhoGrupo = vi.fn(() => Promise.resolve(painelColab));

  const sairDoGrupo = vi.fn((): Promise<ResultadoSairGrupo> =>
    Promise.resolve({ saiuDoGrupo: true, subtarefasDesvinculadas: 1 }),
  );

  const servicoJornada: ServicoJornadaFrontend = {
    listarTarefas,
    obterTarefa: vi.fn(() =>
      Promise.resolve({
        tarefa: minhaEtapa,
        detalhes: {
          tarefaId: 'sub-maria',
          usuarioId: 'u-maria',
          metadadosVisuais: {},
          notasEmBlocos: [],
          atualizadoEm: null,
        },
        lembretes: [],
      }),
    ),
    criarTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    atualizarTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    concluirTarefa,
    desfazerCascata: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    reabrirTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    moverTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    reordenarIrmas: vi.fn(() => Promise.resolve(0)),
    excluirTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    salvarDetalhes: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    listarEtiquetas: vi.fn(() => Promise.resolve({ itens: [], limiteMaximo: 30 })),
    criarEtiqueta: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    atualizarEtiqueta: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    excluirEtiqueta: vi.fn(() => Promise.resolve()),
    buscarCidades: vi.fn(() => Promise.resolve([])),
    atualizarConsentimentoClima: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    consultarClimaAtual: vi.fn(() => Promise.resolve({ autorizado: false as const, clima: null })),
  };

  const servicoGrupos: ServicoGruposFrontend = {
    compartilharTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    criarVaga: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    excluirVaga: vi.fn(() => Promise.resolve()),
    regenerarConvite: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    revogarConvites: vi.fn(() => Promise.resolve()),
    obterPreviaConvite: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    entrarPorConvite: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    atribuirResponsavel: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    obterDesempenhoGrupo,
    transferirLideranca: vi.fn(() => Promise.reject(new Error('Nao usado'))),
    removerMembro: vi.fn(() => Promise.resolve()),
    sairDoGrupo,
  };

  return {
    servicoJornada,
    servicoGrupos,
    spies: {
      concluirTarefa,
      listarTarefas,
      obterDesempenhoGrupo,
      sairDoGrupo,
    },
  };
}

describe('Fase 17 - Tarefas em Conjunto na UI em TDD', () => {
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('permite ao Lider compartilhar tarefa, gerenciar vagas/link, atribuir vaga e transferir lideranca', async () => {
    const usuario = userEvent.setup();
    const { servicoJornada, servicoGrupos, spies } = fabricarCenarioLider();

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble(
          criarSessaoAutenticada('u-lider', 'Athos Danilo', 'athos@exemplo.com'),
        )}
        servicoJornada={servicoJornada}
        servicoGrupos={servicoGrupos}
        rotaInicial="/jornada"
      />,
    );

    const btnCompartilhar = await screen.findByRole('button', {
      name: /compartilhar trabalho em trio web ii/i,
    });
    await usuario.click(btnCompartilhar);

    await waitFor(() => {
      expect(spies.compartilharTarefa).toHaveBeenCalledWith('raiz-projeto');
    });

    const btnPainel = await screen.findByRole('button', {
      name: /painel da equipe de trabalho em trio web ii/i,
    });
    await usuario.click(btnPainel);

    const dialogoPainel = await screen.findByRole('dialog');
    expect(within(dialogoPainel).getByText(/50%/i)).toBeInTheDocument();
    expect(within(dialogoPainel).getByText(/athos concluiu etapa inicial/i)).toBeInTheDocument();

    await usuario.type(within(dialogoPainel).getByLabelText(/nome da vaga/i), 'Frontend UI');
    await usuario.type(
      within(dialogoPainel).getByLabelText(/e-mail opcional da vaga/i),
      'dev.ui@exemplo.com',
    );
    await usuario.click(within(dialogoPainel).getByRole('button', { name: /criar vaga/i }));

    await waitFor(() => {
      expect(spies.criarVaga).toHaveBeenCalledWith('raiz-projeto', {
        nomeExibicao: 'Frontend UI',
        emailOpcional: 'dev.ui@exemplo.com',
      });
    });

    await usuario.click(within(dialogoPainel).getByRole('button', { name: /regenerar link/i }));
    await waitFor(() => {
      expect(spies.regenerarConvite).toHaveBeenCalledWith('raiz-projeto');
    });

    await usuario.click(within(dialogoPainel).getByRole('button', { name: /revogar link/i }));
    await waitFor(() => {
      expect(spies.revogarConvites).toHaveBeenCalledWith('raiz-projeto');
    });

    await usuario.click(
      within(dialogoPainel).getByRole('button', { name: /fechar painel da equipe/i }),
    );

    await usuario.click(
      screen.getByRole('button', { name: /editar e notas de construir rotas rest/i }),
    );
    const gaveta = await screen.findByRole('dialog');
    const selectResp = within(gaveta).getByLabelText(/responsável pela etapa/i);
    await usuario.selectOptions(selectResp, 'vaga:vaga-1');
    await usuario.click(within(gaveta).getByRole('button', { name: /salvar responsável/i }));

    await waitFor(() => {
      expect(spies.atribuirResponsavel).toHaveBeenCalledWith('sub-api', {
        responsavelUsuarioId: null,
        vagaResponsavelId: 'vaga-1',
      });
    });

    await usuario.click(within(gaveta).getByRole('button', { name: /fechar gaveta de edição/i }));

    await usuario.click(
      screen.getByRole('button', { name: /painel da equipe de trabalho em trio web ii/i }),
    );
    const painelParaTransf = await screen.findByRole('dialog');
    await usuario.click(
      within(painelParaTransf).getByRole('button', {
        name: /transferir liderança para maria silva/i,
      }),
    );

    await waitFor(() => {
      expect(spies.transferirLideranca).toHaveBeenCalledWith('raiz-projeto', 'u-maria');
    });
  });

  it('restringe controles ao Colaborador, recarrega no foco da janela e permite sair do grupo', async () => {
    const usuario = userEvent.setup();
    const { servicoJornada, servicoGrupos, spies } = fabricarCenarioColaborador();

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble(
          criarSessaoAutenticada('u-maria', 'Maria Silva', 'maria@exemplo.com'),
        )}
        servicoJornada={servicoJornada}
        servicoGrupos={servicoGrupos}
        rotaInicial="/jornada"
      />,
    );

    expect(await screen.findByText('Minha etapa no frontend')).toBeInTheDocument();

    const btnConcluirMinha = screen.getByRole('button', {
      name: /concluir minha etapa no frontend/i,
    });
    const btnConcluirOutra = screen.getByRole('button', {
      name: /concluir etapa exclusiva do athos/i,
    });
    expect(btnConcluirMinha).toBeEnabled();
    expect(btnConcluirOutra).toBeDisabled();

    const btnSubOutra = screen.getByRole('button', {
      name: /adicionar subtarefa em etapa exclusiva do athos/i,
    });
    expect(btnSubOutra).toBeDisabled();

    await usuario.click(btnConcluirMinha);
    await waitFor(() => {
      expect(spies.concluirTarefa).toHaveBeenCalledWith('sub-maria', false);
    });

    const chamadasAntesFoco = spies.listarTarefas.mock.calls.length;
    act(() => {
      window.dispatchEvent(new Event('focus'));
    });
    await waitFor(() => {
      expect(spies.listarTarefas.mock.calls.length).toBeGreaterThan(chamadasAntesFoco);
    });

    await usuario.click(
      screen.getByRole('button', { name: /painel da equipe de projeto grupo web ii/i }),
    );
    const painelColab = await screen.findByRole('dialog');
    expect(within(painelColab).queryByRole('button', { name: /criar vaga/i })).toBeNull();
    expect(within(painelColab).queryByRole('button', { name: /revogar link/i })).toBeNull();

    await usuario.click(within(painelColab).getByRole('button', { name: /sair do grupo/i }));
    await waitFor(() => {
      expect(spies.sairDoGrupo).toHaveBeenCalledWith('raiz-g');
    });
  });

  it('solicita Google para visitante no link de convite e vincula colaborador autenticado', async () => {
    const usuario = userEvent.setup();
    const previaMock: PreviaConviteGrupo = {
      tarefaRaizId: 'raiz-convite',
      titulo: 'Projeto Seminario IA',
      liderNome: 'Athos Danilo',
      membrosAtivos: [
        { usuarioId: 'u-lider', nomeExibicao: 'Athos Danilo', avatarUrl: null, papel: 'lider' },
      ],
      vagasDisponiveis: [
        { id: 'v-front', nomeExibicao: 'Frontend React', emailOpcional: 'maria@exemplo.com' },
        { id: 'v-docs', nomeExibicao: 'Documentacao', emailOpcional: null },
      ],
      jaEMembro: false,
    };

    const obterPreviaConvite = vi.fn(() => Promise.resolve(previaMock));
    const entrarPorConvite = vi.fn(
      (_token: string, vagaId: string | null): Promise<EntrarConviteResposta> =>
        Promise.resolve({
          tarefaRaizId: 'raiz-convite',
          papel: 'colaborador',
          vagaVinculadaId: vagaId,
          subtarefasHerdadas: 2,
          jaEraMembro: false,
        }),
    );

    const servicoGruposAnonimo: ServicoGruposFrontend = {
      compartilharTarefa: vi.fn(() => Promise.reject(new Error('Nao usado'))),
      criarVaga: vi.fn(() => Promise.reject(new Error('Nao usado'))),
      excluirVaga: vi.fn(() => Promise.resolve()),
      regenerarConvite: vi.fn(() => Promise.reject(new Error('Nao usado'))),
      revogarConvites: vi.fn(() => Promise.resolve()),
      obterPreviaConvite,
      entrarPorConvite,
      atribuirResponsavel: vi.fn(() => Promise.reject(new Error('Nao usado'))),
      obterDesempenhoGrupo: vi.fn(() => Promise.reject(new Error('Nao usado'))),
      transferirLideranca: vi.fn(() => Promise.reject(new Error('Nao usado'))),
      removerMembro: vi.fn(() => Promise.resolve()),
      sairDoGrupo: vi.fn(() => Promise.resolve({ saiuDoGrupo: true, subtarefasDesvinculadas: 0 })),
    };

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble({ autenticado: false, usuario: null, sessao: null })}
        servicoGrupos={servicoGruposAnonimo}
        rotaInicial="/convite/tok-abc"
      />,
    );

    expect(
      await screen.findByRole('link', { name: /entrar com google para aceitar o convite/i }),
    ).toBeInTheDocument();
    expect(obterPreviaConvite).not.toHaveBeenCalled();

    cleanup();

    const { servicoJornada } = fabricarCenarioColaborador();
    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble(
          criarSessaoAutenticada('u-maria', 'Maria Silva', 'maria@exemplo.com'),
        )}
        servicoJornada={servicoJornada}
        servicoGrupos={servicoGruposAnonimo}
        rotaInicial="/convite/tok-abc"
      />,
    );

    expect(await screen.findByText('Projeto Seminario IA')).toBeInTheDocument();
    expect(screen.getByText(/vínculo automático pelo seu e-mail/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /confirmar entrada no grupo/i }));
    await waitFor(() => {
      expect(entrarPorConvite).toHaveBeenCalledWith('tok-abc', 'v-front');
    });
  });
});
