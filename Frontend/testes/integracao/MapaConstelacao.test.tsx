import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { calcularFaseLunar } from '../../src/astronomia/fase-lunar';
import { PaginaMapaConstelacao } from '../../src/dominios/mapa/PaginaMapaConstelacao';
import type {
  EntradaSalvarLayoutConstelacao,
  LayoutConstelacao,
  ServicoConstelacoesFrontend,
} from '../../src/servicos/tipos-constelacoes';
import type { EstadoSessao, ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
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
      id: 'usr-lider',
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
    excluirConta: () => Promise.resolve({ contaExcluida: true, mensagem: 'Conta excluida.' }),
  };
}

function criarArvoreMapaExemplo(): TarefaArvore[] {
  return [
    {
      id: 'raiz-1',
      tarefaPaiId: null,
      titulo: 'Lançar TCC Web II',
      prioridade: 'alta',
      status: 'em_andamento',
      turno: 'noite',
      prazo: '2026-11-30T23:59:00Z',
      profundidade: 0,
      ordemManual: 0,
      percentualConclusao: 50,
      totalFolhas: 2,
      folhasConcluidas: 1,
      temFilhaUrgenteAberta: true,
      etiquetas: [{ id: 'etq-1', nome: 'Acadêmico', cor: '#4F8FEA' }],
      recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
      serieRecorrenciaId: null,
      vezesReaberta: 0,
      compartilhada: true,
      responsavel: {
        tipo: 'usuario',
        usuarioId: 'usr-lider',
        vagaId: null,
        nomeExibicao: 'Athos Danilo',
        avatarUrl: '/assets-3d/avatares/sol-nascente.png',
      },
      lembretesPendentes: 0,
      criadoEm: '2026-11-23T09:00:00Z',
      atualizadoEm: '2026-11-23T09:00:00Z',
      subtarefas: [
        {
          id: 'filha-1',
          tarefaPaiId: 'raiz-1',
          titulo: 'Revisar API FastAPI',
          prioridade: 'urgente',
          status: 'pendente',
          turno: 'noite',
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
          compartilhada: true,
          responsavel: {
            tipo: 'usuario',
            usuarioId: 'usr-ana',
            vagaId: null,
            nomeExibicao: 'Ana Costa',
            avatarUrl: '/assets-3d/avatares/flor-sol.png',
          },
          lembretesPendentes: 0,
          criadoEm: '2026-11-23T09:05:00Z',
          atualizadoEm: '2026-11-23T09:05:00Z',
          subtarefas: [],
        },
        {
          id: 'filha-2',
          tarefaPaiId: 'raiz-1',
          titulo: 'Publicar build Vite',
          prioridade: 'media',
          status: 'concluida',
          turno: 'tarde',
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
          compartilhada: true,
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

function criarServicosMapaDuble(iniciais?: TarefaArvore[]) {
  let arvore = iniciais ?? criarArvoreMapaExemplo();

  const layoutBanco: Record<string, LayoutConstelacao> = {
    'raiz-1': {
      tarefaRaizId: 'raiz-1',
      nos: {
        'raiz-1': { x: 400, y: 100, fixado: true },
        'filha-1': { x: 240, y: 280, fixado: true },
        'filha-2': { x: 560, y: 280, fixado: false },
      },
      viewport: { zoom: 1, centroX: 400, centroY: 200 },
      atualizadoEm: '2026-11-23T10:00:00Z',
    },
  };

  const espiaoCriarTarefa = vi.fn((entrada: { titulo: string; tarefaPaiId?: string | null }) => {
    const nova: TarefaArvore = {
      id: 'filha-nova-1',
      tarefaPaiId: entrada.tarefaPaiId ?? null,
      titulo: entrada.titulo,
      prioridade: 'media',
      status: 'pendente',
      turno: 'livre',
      prazo: null,
      profundidade: 1,
      ordemManual: 2,
      percentualConclusao: 0,
      totalFolhas: 1,
      folhasConcluidas: 0,
      temFilhaUrgenteAberta: false,
      etiquetas: [],
      recorrencia: { tipo: 'nenhuma', diasSemana: [], diaMes: null, intervalo: 1 },
      serieRecorrenciaId: null,
      vezesReaberta: 0,
      compartilhada: true,
      responsavel: null,
      lembretesPendentes: 0,
      criadoEm: '2026-11-23T11:00:00Z',
      atualizadoEm: '2026-11-23T11:00:00Z',
      subtarefas: [],
    };
    arvore = arvore.map((raiz) =>
      raiz.id === entrada.tarefaPaiId ? { ...raiz, subtarefas: [...raiz.subtarefas, nova] } : raiz,
    );
    return Promise.resolve({ tarefa: nova, ancestraisAtualizados: [] });
  });

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

  const encontrarNo = (lista: readonly TarefaArvore[], id: string): TarefaArvore | null => {
    for (const item of lista) {
      if (item.id === id) {
        return item;
      }
      const filho = encontrarNo(item.subtarefas, id);
      if (filho) {
        return filho;
      }
    }
    return null;
  };

  const detalhePadrao = (id: string): DetalheTarefaCompleta => {
    const tarefa = encontrarNo(arvore, id) ?? arvore[0];
    return {
      tarefa,
      detalhes: {
        tarefaId: id,
        usuarioId: 'usr-lider',
        metadadosVisuais: {},
        notasEmBlocos: [
          { id: 'blk-1', tipo: 'paragrafo', texto: 'Notas ricas abertas diretamente do mapa.' },
        ],
        atualizadoEm: null,
      },
      lembretes: [],
    };
  };

  const servicoJornada: ServicoJornadaFrontend = {
    listarTarefas: () =>
      Promise.resolve({
        itens: arvore,
        totais: { ativas: 2, concluidas: 1, limiteAtivas: 250 },
      }),
    obterTarefa: (id) => Promise.resolve(detalhePadrao(id)),
    criarTarefa: espiaoCriarTarefa,
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
        usuarioId: 'usr-lider',
        metadadosVisuais: entrada.metadadosVisuais,
        notasEmBlocos: entrada.notasEmBlocos,
        atualizadoEm: '2026-11-23T12:00:00Z',
      }),
    listarEtiquetas: () =>
      Promise.resolve({
        itens: [{ id: 'etq-1', nome: 'Acadêmico', cor: '#4F8FEA', criadoEm: null }],
        limiteMaximo: 40,
      }),
    criarEtiqueta: () =>
      Promise.resolve({ id: 'etq-2', nome: 'Nova', cor: '#4F8FEA', criadoEm: null }),
    atualizarEtiqueta: () =>
      Promise.resolve({ id: 'etq-1', nome: 'Acadêmico', cor: '#4F8FEA', criadoEm: null }),
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
    titulo: 'Lançar TCC Web II',
    meuPapel: 'lider',
    linkConviteAtivo: true,
    codigoToken: 'tok',
    resumoGeral: {
      totalSubtarefasFolha: 2,
      folhasConcluidas: 1,
      percentualGeral: 50,
    },
    integrantes: [
      {
        usuarioId: 'usr-lider',
        nomeExibicao: 'Athos Danilo',
        papel: 'lider',
        avatarUrl: '/assets-3d/avatares/sol-nascente.png',
        atribuidas: 1,
        concluidas: 0,
        percentual: 0,
      },
      {
        usuarioId: 'usr-ana',
        nomeExibicao: 'Ana Costa',
        papel: 'colaborador',
        avatarUrl: '/assets-3d/avatares/flor-sol.png',
        atribuidas: 1,
        concluidas: 0,
        percentual: 0,
      },
    ],
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
        id: 'vaga-1',
        tarefaRaizId: 'raiz-1',
        nomeExibicao: 'Designer',
        emailOpcional: null,
        ocupadaPorUsuarioId: null,
        criadaEm: '2026-11-23T10:00:00Z',
      }),
    excluirVaga: () => Promise.resolve(),
    regenerarConvite: () =>
      Promise.resolve({ codigoToken: 'tok-2', linkConvite: '/convite/tok-2', ativo: true }),
    revogarConvites: () => Promise.resolve(),
    obterPreviaConvite: () =>
      Promise.resolve({
        tarefaRaizId: 'raiz-1',
        titulo: 'Lançar TCC Web II',
        liderNome: 'Athos Danilo',
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
      Promise.resolve({ liderancaTransferida: true, novoLiderUsuarioId: 'usr-ana' }),
    removerMembro: () => Promise.resolve(),
    sairDoGrupo: () => Promise.resolve({ saiuDoGrupo: true, subtarefasDesvinculadas: 0 }),
  };

  const espiaoSalvarLayout = vi.fn(
    (raizId: string, entrada: EntradaSalvarLayoutConstelacao): Promise<LayoutConstelacao> => {
      layoutBanco[raizId] = {
        tarefaRaizId: raizId,
        nos: entrada.nos,
        viewport: entrada.viewport,
        atualizadoEm: '2026-11-23T12:10:00Z',
      };
      return Promise.resolve(layoutBanco[raizId]);
    },
  );

  const espiaoLimparLayout = vi.fn((raizId: string): Promise<void> => {
    delete layoutBanco[raizId];
    return Promise.resolve();
  });

  const servicoConstelacoes: ServicoConstelacoesFrontend = {
    obterLayout: (raizId) =>
      Promise.resolve(
        layoutBanco[raizId] ?? {
          tarefaRaizId: raizId,
          nos: {},
          viewport: { zoom: 1, centroX: 0, centroY: 0 },
          atualizadoEm: null,
        },
      ),
    salvarLayout: espiaoSalvarLayout,
    limparLayout: espiaoLimparLayout,
  };

  return {
    servicoJornada,
    servicoGrupos,
    servicoConstelacoes,
    espiaoSalvarLayout,
    espiaoLimparLayout,
    espiaoCriarTarefa,
    espiaoConcluirTarefa,
  };
}

describe('Mapa Visual de Constelação e Ramos (/mapa)', () => {
  afterEach(() => {
    cleanup();
  });

  it('navega pelo link Mapa na CascaWorkspace, exibe nós com responsável e recolhe/expande ramo', async () => {
    const usuario = userEvent.setup();
    const dubles = criarServicosMapaDuble();

    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dubles.servicoJornada}
        servicoGrupos={dubles.servicoGrupos}
        servicoConstelacoes={dubles.servicoConstelacoes}
      />,
    );

    const navLateral = await screen.findByRole('navigation', { name: 'Visões do Lume' });
    const linkMapa = within(navLateral).getByRole('link', { name: 'Mapa' });
    await usuario.click(linkMapa);

    await screen.findByRole('heading', { name: /Mapa visual/i });
    const noRaiz = await screen.findByTestId('no-mapa-raiz-1');
    expect(within(noRaiz).getByText('Lançar TCC Web II')).toBeInTheDocument();
    expect(screen.getByText('Revisar API FastAPI')).toBeInTheDocument();
    expect(screen.getByText('Publicar build Vite')).toBeInTheDocument();
    expect(screen.getByText('Ana Costa')).toBeInTheDocument();
    expect(screen.getByText(/1\/2 folhas/i)).toBeInTheDocument();
    expect(screen.getByText(/Filha urgente aberta/i)).toBeInTheDocument();

    const botaoRecolher = screen.getByRole('button', {
      name: /Recolher ramo de Lançar TCC Web II/i,
    });
    await usuario.click(botaoRecolher);
    await waitFor(() => {
      expect(screen.queryByText('Revisar API FastAPI')).not.toBeInTheDocument();
    });

    const botaoExpandir = screen.getByRole('button', {
      name: /Expandir ramo de Lançar TCC Web II/i,
    });
    await usuario.click(botaoExpandir);
    expect(await screen.findByText('Revisar API FastAPI')).toBeInTheDocument();
  });

  it('alterna entre Ramos botânicos no dia e Constelação luminosa à noite', async () => {
    const dubles = criarServicosMapaDuble();
    const fase = calcularFaseLunar(new Date(2026, 10, 23, 14, 0, 0));
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { rerender } = render(
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider>
          <MemoryRouter>
            <PaginaMapaConstelacao
              momentoDoDia="tarde"
              faseLunar={fase}
              reduzirMovimento={false}
              servicoJornada={dubles.servicoJornada}
              servicoGrupos={dubles.servicoGrupos}
              servicoConstelacoes={dubles.servicoConstelacoes}
            />
          </MemoryRouter>
        </Tooltip.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Ramos botânicos')).toBeInTheDocument();

    rerender(
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider>
          <MemoryRouter>
            <PaginaMapaConstelacao
              momentoDoDia="noite"
              faseLunar={fase}
              reduzirMovimento={false}
              servicoJornada={dubles.servicoJornada}
              servicoGrupos={dubles.servicoGrupos}
              servicoConstelacoes={dubles.servicoConstelacoes}
            />
          </MemoryRouter>
        </Tooltip.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText('Constelação luminosa')).toBeInTheDocument();
  });

  it('move nó por teclado salvando no MongoDB, reorganiza, cria subtarefa, conclui nó e abre gaveta', async () => {
    const usuario = userEvent.setup();
    const dubles = criarServicosMapaDuble();

    render(
      <Aplicacao
        rotaInicial="/mapa"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dubles.servicoJornada}
        servicoGrupos={dubles.servicoGrupos}
        servicoConstelacoes={dubles.servicoConstelacoes}
      />,
    );

    expect(await screen.findByText('Revisar API FastAPI')).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: 'Mover nó à direita' }));
    await waitFor(() => {
      expect(dubles.espiaoSalvarLayout).toHaveBeenCalledTimes(1);
    });
    const chamadaSalvar = dubles.espiaoSalvarLayout.mock.calls[0];
    expect(chamadaSalvar?.[0]).toBe('raiz-1');
    expect(chamadaSalvar?.[1].nos['raiz-1']).toEqual({ x: 424, y: 100, fixado: true });

    await usuario.click(screen.getByRole('button', { name: /Reorganizar constelação/i }));
    await waitFor(() => {
      expect(dubles.espiaoLimparLayout).toHaveBeenCalledWith('raiz-1');
    });

    const inputSubtarefa = screen.getByLabelText(/Nova subtarefa neste ramo/i);
    await usuario.type(inputSubtarefa, 'Validar atalhos');
    await usuario.click(screen.getByRole('button', { name: /Adicionar ao mapa/i }));
    await waitFor(() => {
      expect(dubles.espiaoCriarTarefa).toHaveBeenCalledTimes(1);
    });
    expect(dubles.espiaoCriarTarefa.mock.calls[0]?.[0]).toMatchObject({
      titulo: 'Validar atalhos',
      tarefaPaiId: 'raiz-1',
    });

    const noRevisar = screen.getByTestId('no-mapa-filha-1');
    await usuario.click(
      within(noRevisar).getByRole('button', { name: /Concluir tarefa Revisar API FastAPI/i }),
    );
    await waitFor(() => {
      expect(dubles.espiaoConcluirTarefa).toHaveBeenCalledWith('filha-1', false);
    });

    await usuario.click(
      within(noRevisar).getByRole('button', { name: /Abrir detalhes de Revisar API FastAPI/i }),
    );
    expect(await screen.findByText('Notas ricas abertas diretamente do mapa.')).toBeInTheDocument();
  });

  it('mostra orientação e link para Jornada quando ainda não existem tarefas raízes', async () => {
    const dubles = criarServicosMapaDuble([]);

    render(
      <Aplicacao
        rotaInicial="/mapa"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dubles.servicoJornada}
        servicoGrupos={dubles.servicoGrupos}
        servicoConstelacoes={dubles.servicoConstelacoes}
      />,
    );

    expect(
      await screen.findByText(/Nenhuma tarefa composta disponível para mapear ainda/i),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Ir para Jornada do Dia/i })).toHaveAttribute(
      'href',
      '/jornada',
    );
  });
});
