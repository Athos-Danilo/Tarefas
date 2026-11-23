import * as Tooltip from '@radix-ui/react-tooltip';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import { PaginaCalendarioMensal } from '../../src/dominios/calendario/PaginaCalendarioMensal';
import type {
  CalendarioMensal,
  ParametrosConsultaCalendario,
  ServicoCalendarioFrontend,
} from '../../src/servicos/tipos-calendario';
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
      id: 'usr-cal',
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
        tarefaGuiaId: 'tar-real-1',
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

function criarServicosCalendarioDuble() {
  let arvore: TarefaArvore[] = [
    {
      id: 'tar-real-1',
      tarefaPaiId: null,
      titulo: 'Entregar Protótipo Web II',
      prioridade: 'urgente',
      status: 'em_andamento',
      turno: 'noite',
      prazo: '2026-11-25T23:59:00Z',
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
      criadoEm: '2026-11-01T10:00:00Z',
      atualizadoEm: '2026-11-01T10:00:00Z',
      subtarefas: [],
    },
  ];

  const espiaoConcluirTarefa = vi.fn((tarefaId: string) => {
    arvore = arvore.map((item) => (item.id === tarefaId ? { ...item, status: 'concluida' } : item));
    return Promise.resolve({
      tarefaId,
      nosConcluidos: [tarefaId],
      ancestraisAtualizados: [],
      tokenDesfazer: null,
      expiraEm: null,
      proximaOcorrencia: null,
    });
  });

  const espiaoObterTarefa = vi.fn((id: string): Promise<DetalheTarefaCompleta> =>
    Promise.resolve({
      tarefa: arvore.find((item) => item.id === id) ?? arvore[0],
      detalhes: {
        tarefaId: id,
        usuarioId: 'usr-cal',
        metadadosVisuais: {},
        notasEmBlocos: [
          { id: 'blk-cal', tipo: 'paragrafo', texto: 'Nota aberta diretamente do calendário.' },
        ],
        atualizadoEm: null,
      },
      lembretes: [],
    }),
  );

  const servicoJornada: ServicoJornadaFrontend = {
    listarTarefas: () =>
      Promise.resolve({
        itens: arvore,
        totais: { ativas: 1, concluidas: 0, limiteAtivas: 250 },
      }),
    obterTarefa: espiaoObterTarefa,
    criarTarefa: () => Promise.resolve({ tarefa: arvore[0], ancestraisAtualizados: [] }),
    atualizarTarefa: () => Promise.resolve(arvore[0]),
    concluirTarefa: espiaoConcluirTarefa,
    desfazerCascata: () => Promise.resolve({ restaurados: 1, tarefaId: 'tar-real-1' }),
    reabrirTarefa: (id) =>
      Promise.resolve({
        tarefaId: id,
        status: 'pendente',
        nosReabertos: [id],
        ancestraisReabertos: [],
      }),
    moverTarefa: () =>
      Promise.resolve({
        tarefa: arvore[0],
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
        usuarioId: 'usr-cal',
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
    tarefaRaizId: 'tar-real-1',
    titulo: 'Entregar Protótipo Web II',
    meuPapel: 'lider',
    linkConviteAtivo: false,
    codigoToken: null,
    resumoGeral: { totalSubtarefasFolha: 1, folhasConcluidas: 0, percentualGeral: 0 },
    integrantes: [],
    vagasAbertas: [],
    atividadeRecente: [],
  };

  const servicoGrupos: ServicoGruposFrontend = {
    compartilharTarefa: () =>
      Promise.resolve({
        tarefaRaizId: 'tar-real-1',
        compartilhada: true,
        meuPapel: 'lider',
        codigoToken: 'tok',
        linkConvite: '/convite/tok',
      }),
    criarVaga: () =>
      Promise.resolve({
        id: 'v1',
        tarefaRaizId: 'tar-real-1',
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
        tarefaRaizId: 'tar-real-1',
        titulo: 'Entregar Protótipo Web II',
        liderNome: 'Athos',
        membrosAtivos: [],
        vagasDisponiveis: [],
        jaEMembro: true,
      }),
    entrarPorConvite: () =>
      Promise.resolve({
        tarefaRaizId: 'tar-real-1',
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

  const espiaoConsultarMensal = vi.fn(
    (params: ParametrosConsultaCalendario): Promise<CalendarioMensal> => {
      const mm = String(params.mes).padStart(2, '0');
      const dia18 = `${params.ano}-${mm}-18`;
      const dia25 = `${params.ano}-${mm}-25`;
      const concluida = arvore[0]?.status === 'concluida';

      const itensBase = [
        {
          data: dia18,
          totalTarefas: 1,
          maiorPrioridade: 'urgente' as const,
          temAtrasada: !concluida,
          temRecorrente: true,
          tarefas: [
            {
              id: 'tar-real-1',
              titulo: 'Entregar Protótipo Web II',
              prioridade: 'urgente' as const,
              status: concluida ? ('concluida' as const) : ('em_andamento' as const),
              turno: 'noite' as const,
              prazo: `${dia18}T23:59:00Z`,
              atrasada: !concluida,
              recorrente: false,
              ehProjecao: false,
            },
            {
              id: 'tar-rec-1',
              titulo: 'Revisão recorrente da sprint',
              prioridade: 'alta' as const,
              status: 'pendente' as const,
              turno: 'manha' as const,
              prazo: `${dia18}T14:00:00Z`,
              atrasada: false,
              recorrente: true,
              ehProjecao: true,
            },
          ].filter(
            (item) =>
              (!params.prioridade || item.prioridade === params.prioridade) &&
              (!params.turno || item.turno === params.turno),
          ),
        },
        {
          data: dia25,
          totalTarefas: 1,
          maiorPrioridade: 'media' as const,
          temAtrasada: false,
          temRecorrente: false,
          tarefas: [
            {
              id: 'tar-media-1',
              titulo: 'Revisar notas',
              prioridade: 'media' as const,
              status: 'pendente' as const,
              turno: 'tarde' as const,
              prazo: `${dia25}T15:00:00Z`,
              atrasada: false,
              recorrente: false,
              ehProjecao: false,
            },
          ].filter(
            (item) =>
              (!params.prioridade || item.prioridade === params.prioridade) &&
              (!params.turno || item.turno === params.turno),
          ),
        },
      ].filter((d) => d.tarefas.length > 0);

      return Promise.resolve({
        ano: params.ano,
        mes: params.mes,
        fusoHorario: params.fusoHorario ?? 'America/Sao_Paulo',
        dias: itensBase,
      });
    },
  );

  const servicoCalendario: ServicoCalendarioFrontend = {
    consultarMensal: espiaoConsultarMensal,
  };

  return {
    servicoJornada,
    servicoGrupos,
    servicoCalendario,
    espiaoConsultarMensal,
    espiaoConcluirTarefa,
    espiaoObterTarefa,
  };
}

describe('Calendário Mensal dos Prazos (/calendario)', () => {
  afterEach(() => {
    cleanup();
  });

  it('navega pelo link Calendário na CascaWorkspace, exibe fases lunares e conclui/edita tarefa do dia', async () => {
    const usuario = userEvent.setup();
    const dubles = criarServicosCalendarioDuble();

    render(
      <Aplicacao
        rotaInicial="/jornada"
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAuthDuble()}
        servicoJornada={dubles.servicoJornada}
        servicoGrupos={dubles.servicoGrupos}
        servicoCalendario={dubles.servicoCalendario}
      />,
    );

    const navLateral = await screen.findByRole('navigation', { name: 'Visões do Lume' });
    await usuario.click(within(navLateral).getByRole('link', { name: 'Calendário' }));

    expect(await screen.findByRole('heading', { name: /Calendário Mensal/i })).toBeInTheDocument();
    const grade = await screen.findByRole('grid');
    expect(within(grade).getAllByRole('gridcell').length).toBeGreaterThanOrEqual(28);

    const botaoDia18 = await screen.findByRole('button', { name: /^Dia 18,/i });
    await usuario.click(botaoDia18);

    expect(await screen.findByText('Entregar Protótipo Web II')).toBeInTheDocument();
    expect(screen.getByText('Revisão recorrente da sprint')).toBeInTheDocument();
    expect(screen.getByText(/Ocorrência recorrente prevista/i)).toBeInTheDocument();
    expect(screen.getByText(/iluminada/i)).toBeInTheDocument();

    await usuario.click(
      screen.getByRole('button', { name: /Concluir tarefa Entregar Protótipo Web II/i }),
    );
    await waitFor(() => {
      expect(dubles.espiaoConcluirTarefa).toHaveBeenCalledWith('tar-real-1', false);
    });

    await usuario.click(
      screen.getByRole('button', { name: /Abrir detalhes de Entregar Protótipo Web II/i }),
    );
    expect(await screen.findByText('Nota aberta diretamente do calendário.')).toBeInTheDocument();
  });

  it('navega meses (incluindo virada de ano), navega dias por teclado e aplica filtros', async () => {
    const usuario = userEvent.setup();
    const dubles = criarServicosCalendarioDuble();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <Tooltip.Provider>
          <MemoryRouter>
            <PaginaCalendarioMensal
              reduzirMovimento={false}
              servicoJornada={dubles.servicoJornada}
              servicoGrupos={dubles.servicoGrupos}
              servicoCalendario={dubles.servicoCalendario}
              dataReferenciaInicial={new Date(2026, 11, 15, 12, 0, 0)}
            />
          </MemoryRouter>
        </Tooltip.Provider>
      </QueryClientProvider>,
    );

    expect(await screen.findByText(/Dezembro de 2026/i)).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /Próximo mês/i }));
    await waitFor(() => {
      expect(screen.getByText(/Janeiro de 2027/i)).toBeInTheDocument();
    });
    expect(dubles.espiaoConsultarMensal).toHaveBeenLastCalledWith(
      expect.objectContaining({ ano: 2027, mes: 1 }),
    );

    await usuario.click(screen.getByRole('button', { name: /Mês anterior/i }));
    await waitFor(() => {
      expect(screen.getByText(/Dezembro de 2026/i)).toBeInTheDocument();
    });

    await usuario.selectOptions(screen.getByLabelText(/Filtrar prioridade/i), 'urgente');
    await usuario.selectOptions(screen.getByLabelText(/Filtrar turno/i), 'noite');
    await waitFor(() => {
      expect(dubles.espiaoConsultarMensal).toHaveBeenLastCalledWith(
        expect.objectContaining({
          ano: 2026,
          mes: 12,
          prioridade: 'urgente',
          turno: 'noite',
        }),
      );
    });

    const botaoDia10 = screen.getByRole('button', { name: /^Dia 10,/i });
    botaoDia10.focus();
    await usuario.keyboard('{ArrowRight}');
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Dia 11,/i })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
    });
  });
});
