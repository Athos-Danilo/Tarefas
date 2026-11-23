import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { calcularFaseLunar } from '../../src/astronomia/fase-lunar';
import { PaginaModoFoco } from '../../src/dominios/foco/PaginaModoFoco';
import { ErroApi } from '../../src/servicos/cliente-http';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type {
  HistoricoFoco,
  EntradaIniciarSessaoFoco,
  ServicoFocoFrontend,
  SessaoFoco,
} from '../../src/servicos/tipos-foco';
import type { PainelDesempenhoGrupo, ServicoGruposFrontend } from '../../src/servicos/tipos-grupos';
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

function criarSessaoAutenticada(): Extract<EstadoSessao, { autenticado: true }> {
  return {
    autenticado: true,
    usuario: {
      id: 'usr-foco',
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
        tarefaGuiaId: 'raiz-1',
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

function criarArvoreFocoExemplo(): TarefaArvore[] {
  return [
    {
      id: 'raiz-1',
      tarefaPaiId: null,
      titulo: 'Implementar Modo Foco',
      prioridade: 'alta',
      status: 'em_andamento',
      turno: 'tarde',
      prazo: '2026-11-30T23:59:00Z',
      profundidade: 0,
      ordemManual: 0,
      percentualConclusao: 0,
      totalFolhas: 2,
      folhasConcluidas: 0,
      temFilhaUrgenteAberta: true,
      etiquetas: [],
      recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
      serieRecorrenciaId: null,
      vezesReaberta: 0,
      compartilhada: false,
      responsavel: null,
      lembretesPendentes: 0,
      criadoEm: '2026-11-23T09:00:00Z',
      atualizadoEm: '2026-11-23T09:00:00Z',
      subtarefas: [
        {
          id: 'sub-1',
          tarefaPaiId: 'raiz-1',
          titulo: 'Escrever testes do temporizador',
          prioridade: 'urgente',
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
          criadoEm: '2026-11-23T09:05:00Z',
          atualizadoEm: '2026-11-23T09:05:00Z',
          subtarefas: [],
        },
        {
          id: 'sub-2',
          tarefaPaiId: 'raiz-1',
          titulo: 'Validar histórico no MongoDB',
          prioridade: 'media',
          status: 'concluida',
          turno: 'noite',
          prazo: null,
          profundidade: 1,
          ordemManual: 1,
          percentualConclusao: 100,
          totalFolhas: 1,
          folhasConcluidas: 1,
          temFilhaUrgenteAberta: false,
          etiquetas: [],
          recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
          serieRecorrenciaId: null,
          vezesReaberta: 0,
          compartilhada: false,
          responsavel: null,
          lembretesPendentes: 0,
          criadoEm: '2026-11-23T09:10:00Z',
          atualizadoEm: '2026-11-23T09:10:00Z',
          subtarefas: [],
        },
      ],
    },
  ];
}

function criarServicosFocoDuble(opcoes?: {
  tarefas?: TarefaArvore[];
  sessaoAtivaInicial?: SessaoFoco | null;
  erroAoIniciar?: ErroApi | null;
}) {
  let arvore = opcoes?.tarefas ?? criarArvoreFocoExemplo();
  let sessaoAtiva: SessaoFoco | null = opcoes?.sessaoAtivaInicial ?? null;
  let historico: SessaoFoco[] = [
    {
      id: 'ses-antiga',
      tarefaId: 'raiz-1',
      tarefaTitulo: 'Revisão anterior',
      duracaoPlanejadaSeg: 1500,
      duracaoRealSeg: 1500,
      iniciadaEm: '2026-11-23T08:00:00Z',
      encerradaEm: '2026-11-23T08:25:00Z',
      status: 'concluida',
    },
  ];

  const encontrarNo = (lista: readonly TarefaArvore[], id: string): TarefaArvore | null => {
    for (const item of lista) {
      if (item.id === id) {
        return item;
      }
      const sub = encontrarNo(item.subtarefas, id);
      if (sub) {
        return sub;
      }
    }
    return null;
  };

  const espiaoConcluirTarefa = vi.fn((tarefaId: string) => {
    const marcar = (lista: TarefaArvore[]): TarefaArvore[] =>
      lista.map((item) => ({
        ...item,
        status: item.id === tarefaId ? 'concluida' : item.status,
        subtarefas: marcar(item.subtarefas),
      }));
    arvore = marcar(arvore);
    return Promise.resolve({
      tarefaId,
      nosConcluidos: [tarefaId],
      ancestraisAtualizados: [],
      tokenDesfazer: null,
      expiraEm: null,
      proximaOcorrencia: null,
    });
  });

  const detalhePadrao = (id: string): DetalheTarefaCompleta => ({
    tarefa: encontrarNo(arvore, id) ?? arvore[0],
    detalhes: {
      tarefaId: id,
      usuarioId: 'usr-foco',
      metadadosVisuais: {},
      notasEmBlocos: [],
      atualizadoEm: null,
    },
    lembretes: [],
  });

  const servicoJornada: ServicoJornadaFrontend = {
    listarTarefas: () =>
      Promise.resolve({
        itens: arvore,
        totais: { ativas: 2, concluidas: 1, limiteAtivas: 250 },
      }),
    obterTarefa: (id) => Promise.resolve(detalhePadrao(id)),
    criarTarefa: () =>
      Promise.resolve({
        tarefa: arvore[0],
        ancestraisAtualizados: [],
      }),
    atualizarTarefa: (id) => Promise.resolve(encontrarNo(arvore, id) ?? arvore[0]),
    concluirTarefa: espiaoConcluirTarefa,
    desfazerCascata: () => Promise.resolve({ restaurados: 1, tarefaId: 'raiz-1' }),
    reabrirTarefa: (id) =>
      Promise.resolve({
        tarefaId: id,
        status: 'pendente',
        nosReabertos: [id],
        ancestraisReabertos: [],
      }),
    moverTarefa: (id) =>
      Promise.resolve({
        tarefa: encontrarNo(arvore, id) ?? arvore[0],
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
    salvarDetalhes: (id, entrada) =>
      Promise.resolve({
        tarefaId: id,
        usuarioId: 'usr-foco',
        metadadosVisuais: entrada.metadadosVisuais,
        notasEmBlocos: entrada.notasEmBlocos,
        atualizadoEm: '2026-11-23T12:00:00Z',
      }),
    listarEtiquetas: () => Promise.resolve({ itens: [], limiteMaximo: 40 }),
    criarEtiqueta: () => Promise.resolve({ id: 'etq', nome: 'A', cor: '#4F8FEA', criadoEm: null }),
    atualizarEtiqueta: () =>
      Promise.resolve({ id: 'etq', nome: 'A', cor: '#4F8FEA', criadoEm: null }),
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

  const painelGrupo: PainelDesempenhoGrupo = {
    tarefaRaizId: 'raiz-1',
    titulo: 'Implementar Modo Foco',
    meuPapel: 'lider',
    linkConviteAtivo: false,
    codigoToken: null,
    resumoGeral: { totalSubtarefasFolha: 2, folhasConcluidas: 1, percentualGeral: 50 },
    integrantes: [],
    vagasAbertas: [],
    atividadeRecente: [],
  };

  const servicoGrupos: ServicoGruposFrontend = {
    compartilharTarefa: () =>
      Promise.resolve({
        tarefaRaizId: 'raiz-1',
        compartilhada: true,
        meuPapel: 'lider',
        codigoToken: 'tok',
        linkConvite: '/convite/tok',
      }),
    criarVaga: () =>
      Promise.resolve({
        id: 'v1',
        tarefaRaizId: 'raiz-1',
        nomeExibicao: 'A',
        emailOpcional: null,
        ocupadaPorUsuarioId: null,
        criadaEm: '2026-11-23T10:00:00Z',
      }),
    excluirVaga: () => Promise.resolve(),
    regenerarConvite: () =>
      Promise.resolve({ codigoToken: 'tok', linkConvite: '/convite/tok', ativo: true }),
    revogarConvites: () => Promise.resolve(),
    obterPreviaConvite: () =>
      Promise.resolve({
        tarefaRaizId: 'raiz-1',
        titulo: 'Implementar Modo Foco',
        liderNome: 'Athos',
        membrosAtivos: [],
        vagasDisponiveis: [],
        jaEMembro: true,
      }),
    entrarPorConvite: () =>
      Promise.resolve({
        tarefaRaizId: 'raiz-1',
        papel: 'colaborador',
        vagaVinculadaId: null,
        subtarefasHerdadas: 0,
        jaEraMembro: true,
      }),
    atribuirResponsavel: () => Promise.resolve(arvore[0]),
    obterDesempenhoGrupo: () => Promise.resolve(painelGrupo),
    transferirLideranca: () =>
      Promise.resolve({ liderancaTransferida: true, novoLiderUsuarioId: 'usr-2' }),
    removerMembro: () => Promise.resolve(),
    sairDoGrupo: () => Promise.resolve({ saiuDoGrupo: true, subtarefasDesvinculadas: 0 }),
  };

  const espiaoIniciarSessao = vi.fn((entrada: EntradaIniciarSessaoFoco): Promise<SessaoFoco> => {
    if (opcoes?.erroAoIniciar) {
      return Promise.reject(opcoes.erroAoIniciar);
    }
    const alvo = encontrarNo(arvore, entrada.tarefaId);
    const nova: SessaoFoco = {
      id: 'ses-nova-1',
      tarefaId: entrada.tarefaId,
      tarefaTitulo: alvo?.titulo ?? 'Implementar Modo Foco',
      duracaoPlanejadaSeg: entrada.duracaoPlanejadaSeg,
      duracaoRealSeg: null,
      iniciadaEm: new Date().toISOString(),
      encerradaEm: null,
      status: 'em_andamento',
    };
    sessaoAtiva = nova;
    return Promise.resolve(nova);
  });

  const espiaoConcluirSessao = vi.fn(
    (sessaoId: string, duracaoRealSeg?: number): Promise<SessaoFoco> => {
      const atual = sessaoAtiva;
      const encerrada: SessaoFoco = {
        id: sessaoId,
        tarefaId: atual?.tarefaId ?? 'raiz-1',
        tarefaTitulo: atual?.tarefaTitulo ?? 'Implementar Modo Foco',
        duracaoPlanejadaSeg: atual?.duracaoPlanejadaSeg ?? 1500,
        duracaoRealSeg: duracaoRealSeg ?? 1500,
        iniciadaEm: atual?.iniciadaEm ?? '2026-11-23T10:00:00Z',
        encerradaEm: '2026-11-23T10:25:00Z',
        status: 'concluida',
      };
      sessaoAtiva = null;
      historico = [encerrada, ...historico];
      return Promise.resolve(encerrada);
    },
  );

  const espiaoInterromperSessao = vi.fn(
    (sessaoId: string, duracaoRealSeg?: number): Promise<SessaoFoco> => {
      const atual = sessaoAtiva;
      const encerrada: SessaoFoco = {
        id: sessaoId,
        tarefaId: atual?.tarefaId ?? 'raiz-1',
        tarefaTitulo: atual?.tarefaTitulo ?? 'Implementar Modo Foco',
        duracaoPlanejadaSeg: atual?.duracaoPlanejadaSeg ?? 1500,
        duracaoRealSeg: duracaoRealSeg ?? 300,
        iniciadaEm: atual?.iniciadaEm ?? '2026-11-23T10:00:00Z',
        encerradaEm: '2026-11-23T10:05:00Z',
        status: 'interrompida',
      };
      sessaoAtiva = null;
      historico = [encerrada, ...historico];
      return Promise.resolve(encerrada);
    },
  );

  const servicoFoco: ServicoFocoFrontend = {
    obterSessaoAtiva: () => Promise.resolve(sessaoAtiva),
    iniciarSessao: espiaoIniciarSessao,
    concluirSessao: espiaoConcluirSessao,
    interromperSessao: espiaoInterromperSessao,
    listarHistorico: (): Promise<HistoricoFoco> =>
      Promise.resolve({
        itens: historico,
        totalSegundosConcluidos: historico
          .filter((item) => item.status === 'concluida')
          .reduce((soma, item) => soma + (item.duracaoRealSeg ?? 0), 0),
      }),
  };

  return {
    servicoJornada,
    servicoGrupos,
    servicoFoco,
    espiaoConcluirTarefa,
    espiaoIniciarSessao,
    espiaoConcluirSessao,
    espiaoInterromperSessao,
  };
}

describe('Modo Foco Imersivo (/foco)', () => {
  afterEach(() => {
    cleanup();
  });

  it('navega pelo link Foco, inicia sessão contemplativa, conclui subtarefa imediata, pausa e conclui', async () => {
    const usuario = userEvent.setup();
    const dubles = criarServicosFocoDuble();

    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dubles.servicoJornada}
        servicoGrupos={dubles.servicoGrupos}
        servicoFoco={dubles.servicoFoco}
      />,
    );

    const navLateral = await screen.findByRole('navigation', { name: 'Visões do Lume' });
    await usuario.click(within(navLateral).getByRole('link', { name: 'Foco' }));

    expect(await screen.findByRole('heading', { name: /Modo Foco Imersivo/i })).toBeInTheDocument();
    expect(screen.getByText('Revisão anterior')).toBeInTheDocument();
    expect(screen.queryByTestId('veu-contemplativo-foco')).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: '45 min' }));
    await usuario.click(screen.getByRole('button', { name: /Iniciar foco/i }));

    await waitFor(() => {
      expect(dubles.espiaoIniciarSessao).toHaveBeenCalledWith({
        tarefaId: 'raiz-1',
        duracaoPlanejadaSeg: 2700,
      });
    });

    expect(await screen.findByTestId('veu-contemplativo-foco')).toBeInTheDocument();
    expect(screen.getByText('Escrever testes do temporizador')).toBeInTheDocument();

    await usuario.click(
      screen.getByRole('button', {
        name: /Concluir subtarefa Escrever testes do temporizador/i,
      }),
    );
    await waitFor(() => {
      expect(dubles.espiaoConcluirTarefa).toHaveBeenCalledWith('sub-1', false);
    });

    await usuario.click(screen.getByRole('button', { name: /^Pausar$/i }));
    expect(screen.getByRole('button', { name: /^Retomar$/i })).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /^Retomar$/i }));

    await usuario.click(screen.getByRole('button', { name: /Concluir sessão/i }));
    await waitFor(() => {
      expect(dubles.espiaoConcluirSessao).toHaveBeenCalledTimes(1);
    });
    await waitFor(() => {
      expect(screen.queryByTestId('veu-contemplativo-foco')).not.toBeInTheDocument();
    });
  });

  it('alterna entre Temporizador solar de dia e Temporizador lunar à noite', async () => {
    const dubles = criarServicosFocoDuble();
    const fase = calcularFaseLunar(new Date(2026, 10, 23, 21, 0, 0));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider>
          <MemoryRouter>
            <PaginaModoFoco
              momentoDoDia="tarde"
              faseLunar={fase}
              reduzirMovimento={false}
              servicoJornada={dubles.servicoJornada}
              servicoFoco={dubles.servicoFoco}
            />
          </MemoryRouter>
        </Tooltip.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Temporizador solar')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider>
          <MemoryRouter>
            <PaginaModoFoco
              momentoDoDia="noite"
              faseLunar={fase}
              reduzirMovimento={false}
              servicoJornada={dubles.servicoJornada}
              servicoFoco={dubles.servicoFoco}
            />
          </MemoryRouter>
        </Tooltip.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Temporizador lunar')).toBeInTheDocument();
  });

  it('retoma sessão ativa vinda da API e permite interrompê-la', async () => {
    const usuario = userEvent.setup();
    const dubles = criarServicosFocoDuble({
      sessaoAtivaInicial: {
        id: 'ses-ativa-9',
        tarefaId: 'raiz-1',
        tarefaTitulo: 'Implementar Modo Foco',
        duracaoPlanejadaSeg: 1500,
        duracaoRealSeg: null,
        iniciadaEm: new Date(Date.now() - 120_000).toISOString(),
        encerradaEm: null,
        status: 'em_andamento',
      },
    });

    render(
      <Aplicacao
        rotaInicial="/foco"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dubles.servicoJornada}
        servicoGrupos={dubles.servicoGrupos}
        servicoFoco={dubles.servicoFoco}
      />,
    );

    expect(await screen.findByTestId('veu-contemplativo-foco')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /Interromper sessão/i }));
    await waitFor(() => {
      expect(dubles.espiaoInterromperSessao).toHaveBeenCalledTimes(1);
    });
    expect(dubles.espiaoInterromperSessao.mock.calls[0]?.[0]).toBe('ses-ativa-9');
  });

  it('exibe erro quando sessão já estiver ativa no servidor e orienta quando sem tarefas', async () => {
    const usuario = userEvent.setup();
    const dublesErro = criarServicosFocoDuble({
      erroAoIniciar: new ErroApi(409, 'SESSAO_FOCO_JA_ATIVA', 'Já existe uma sessão em andamento.'),
    });

    const { unmount } = render(
      <Aplicacao
        rotaInicial="/foco"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dublesErro.servicoJornada}
        servicoGrupos={dublesErro.servicoGrupos}
        servicoFoco={dublesErro.servicoFoco}
      />,
    );

    await screen.findByRole('heading', { name: /Modo Foco Imersivo/i });
    await usuario.click(screen.getByRole('button', { name: /Iniciar foco/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      /Já existe uma sessão em andamento/i,
    );

    unmount();

    const dublesVazio = criarServicosFocoDuble({ tarefas: [] });
    render(
      <Aplicacao
        rotaInicial="/foco"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dublesVazio.servicoJornada}
        servicoGrupos={dublesVazio.servicoGrupos}
        servicoFoco={dublesVazio.servicoFoco}
      />,
    );

    expect(
      await screen.findByText(/Nenhuma tarefa disponível para iniciar uma sessão de foco/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para Jornada do Dia/i })).toHaveAttribute(
      'href',
      '/jornada',
    );
  });
});
