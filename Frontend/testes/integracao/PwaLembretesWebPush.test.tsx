import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Aplicacao } from '../../src/aplicacao/Aplicacao';
import type { ServicoAutenticacaoFrontend } from '../../src/servicos/tipos-conta';
import type {
  DispositivoPush,
  EntradaRegistrarDispositivoPush,
  LembreteDetalhado,
  ServicoPushFrontend,
} from '../../src/servicos/tipos-push';
import type {
  DetalhesTarefa,
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
      timestamp: '2026-11-23T15:00:00Z',
    }),
};

function criarAutenticacaoDuble(): ServicoAutenticacaoFrontend {
  return {
    consultarSessao: () =>
      Promise.resolve({
        autenticado: true,
        usuario: {
          id: 'u-f24',
          email: 'athos.push@lume.dev',
          nomeExibicao: 'Athos Push',
          avatarTipo: 'preset',
          avatarId: 'sol-nascente',
          avatarUrl: '/assets-3d/avatares/sol-nascente.png',
          primeiroAcessoConcluido: true,
        },
        sessao: {
          expiraEm: '2026-11-30T15:00:00Z',
          expiracaoAbsolutaEm: '2026-12-23T15:00:00Z',
        },
      }),
    concluirPrimeiroAcesso: () =>
      Promise.resolve({
        primeiroAcessoConcluido: true,
        arvoreGuiaCriada: false,
        tarefaGuiaId: null,
      }),
    obterPerfil: () =>
      Promise.resolve({
        id: 'u-f24',
        email: 'athos.push@lume.dev',
        nomeExibicao: 'Athos Push',
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

function criarTarefaExemplo(lembretesPendentes = 0): TarefaArvore {
  return {
    id: 't-f24-1',
    tarefaPaiId: null,
    titulo: 'Revisar entrega Web II',
    prioridade: 'alta',
    status: 'pendente',
    turno: 'manha',
    prazo: '2026-11-30T18:00:00.000Z',
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
    lembretesPendentes,
    criadoEm: '2026-11-23T10:00:00Z',
    atualizadoEm: '2026-11-23T10:00:00Z',
    subtarefas: [],
  };
}

function fabricarServicoJornadaDuble(lembretesLista: LembreteDetalhado[]): ServicoJornadaFrontend {
  const tarefaBase = criarTarefaExemplo(lembretesLista.length);
  const detalhesBase: DetalhesTarefa = {
    tarefaId: tarefaBase.id,
    usuarioId: 'u-f24',
    metadadosVisuais: { formaBotanica: 'girassol' },
    notasEmBlocos: [],
    atualizadoEm: '2026-11-23T10:00:00Z',
  };

  return {
    listarTarefas: () =>
      Promise.resolve({
        itens: [{ ...tarefaBase, lembretesPendentes: lembretesLista.length }],
        totais: { ativas: 1, concluidas: 0, limiteAtivas: 200 },
      }),
    criarTarefa: () => Promise.reject(new Error('Nao usado')),
    obterTarefa: () =>
      Promise.resolve({
        tarefa: tarefaBase,
        detalhes: detalhesBase,
        lembretes: lembretesLista.map((l) => ({
          id: l.id,
          dispararEm: l.dispararEm,
          antecedenciaMin: l.antecedenciaMin,
          status: l.status,
        })),
      }),
    atualizarTarefa: () => Promise.resolve(tarefaBase),
    concluirTarefa: () => Promise.reject(new Error('Nao usado')),
    desfazerCascata: () => Promise.reject(new Error('Nao usado')),
    reabrirTarefa: () => Promise.reject(new Error('Nao usado')),
    moverTarefa: () => Promise.reject(new Error('Nao usado')),
    reordenarIrmas: () => Promise.resolve(1),
    excluirTarefa: () => Promise.reject(new Error('Nao usado')),
    salvarDetalhes: () => Promise.resolve(detalhesBase),
    listarEtiquetas: () => Promise.resolve({ itens: [], limiteMaximo: 20 }),
    criarEtiqueta: () => Promise.reject(new Error('Nao usado')),
    atualizarEtiqueta: () => Promise.reject(new Error('Nao usado')),
    excluirEtiqueta: () => Promise.resolve(),
    consultarClimaAtual: () => Promise.resolve({ autorizado: false, clima: null }),
    atualizarConsentimentoClima: () => Promise.reject(new Error('Nao usado')),
    buscarCidades: () => Promise.resolve([]),
  };
}

function fabricarServicoPushDuble(estado?: {
  dispositivosIniciais?: DispositivoPush[];
  lembretesIniciais?: LembreteDetalhado[];
}) {
  let dispositivos: DispositivoPush[] = [...(estado?.dispositivosIniciais ?? [])];
  const lembretes = estado?.lembretesIniciais ?? [];

  const registrarDispositivo = vi.fn((entrada: EntradaRegistrarDispositivoPush) => {
    const novo: DispositivoPush = {
      id: `disp-${dispositivos.length + 1}`,
      rotuloDispositivo: entrada.rotuloDispositivo ?? 'Computador',
      plataforma: entrada.plataforma,
      criadoEm: '2026-11-23T15:00:00Z',
      ultimoEnvioEm: null,
    };
    dispositivos = [...dispositivos, novo];
    return Promise.resolve(novo);
  });

  const revogarDispositivo = vi.fn((id: string) => {
    dispositivos = dispositivos.filter((d) => d.id !== id);
    return Promise.resolve();
  });

  const criarLembrete = vi.fn(
    (tarefaId: string, entrada: { dispararEm: string; antecedenciaMin: number }) => {
      const novo: LembreteDetalhado = {
        id: `lem-${lembretes.length + 1}`,
        tarefaId,
        dispararEm: entrada.dispararEm,
        antecedenciaMin: entrada.antecedenciaMin,
        status: 'pendente',
        enviadoEm: null,
        criadoEm: '2026-11-23T15:05:00Z',
      };
      lembretes.push(novo);
      return Promise.resolve(novo);
    },
  );

  const cancelarLembrete = vi.fn((id: string) => {
    const indice = lembretes.findIndex((l) => l.id === id);
    if (indice !== -1) {
      lembretes.splice(indice, 1);
    }
    return Promise.resolve();
  });

  const servico: ServicoPushFrontend = {
    obterChavePublica: vi.fn(() =>
      Promise.resolve({
        chavePublica:
          'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8',
        habilitado: true,
      }),
    ),
    listarDispositivos: vi.fn(() => Promise.resolve({ itens: dispositivos, limiteMaximo: 10 })),
    registrarDispositivo,
    revogarDispositivo,
    listarLembretes: vi.fn(() => Promise.resolve({ itens: lembretes, limiteMaximo: 3 })),
    criarLembrete,
    atualizarLembrete: vi.fn((id, entrada) => {
      const atual = lembretes.find((l) => l.id === id) ?? lembretes[0];
      return Promise.resolve({ ...atual, ...entrada });
    }),
    cancelarLembrete,
  };

  return {
    servico,
    lembretesRef: lembretes,
    spies: { registrarDispositivo, revogarDispositivo, criarLembrete, cancelarLembrete },
  };
}

const descUaOriginal = Object.getOwnPropertyDescriptor(window.navigator, 'userAgent');
const descTouchOriginal = Object.getOwnPropertyDescriptor(window.navigator, 'maxTouchPoints');

describe('Fase 24: PWA instalavel, guia iOS 16.4+, Web Push opt-in e Lembretes na Gaveta', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    if (descUaOriginal) {
      Object.defineProperty(window.navigator, 'userAgent', descUaOriginal);
    }
    if (descTouchOriginal) {
      Object.defineProperty(window.navigator, 'maxTouchPoints', descTouchOriginal);
    }
    vi.unstubAllGlobals();
  });

  it('oferece botao Instalar PWA no beforeinstallprompt, guia visual iOS e opt-in Web Push multi-dispositivo', async () => {
    const usuario = userEvent.setup();
    const { servico: servicoPush, spies } = fabricarServicoPushDuble();

    const requestPermissionSpy = vi.fn(() => Promise.resolve('granted' as NotificationPermission));
    const pushSubscribeSpy = vi.fn(() =>
      Promise.resolve({
        endpoint: 'https://fcm.googleapis.com/fcm/send/device-pc',
        toJSON: () => ({
          endpoint: 'https://fcm.googleapis.com/fcm/send/device-pc',
          keys: { p256dh: 'p256dh-pc-key-1234', auth: 'auth-pc-1234' },
        }),
      }),
    );

    vi.stubGlobal('Notification', {
      permission: 'default',
      requestPermission: requestPermissionSpy,
    });
    vi.stubGlobal('PushManager', function PushManagerMock() {});
    Object.defineProperty(window.navigator, 'serviceWorker', {
      configurable: true,
      value: {
        ready: Promise.resolve({
          pushManager: {
            getSubscription: vi.fn(() => Promise.resolve(null)),
            subscribe: pushSubscribeSpy,
          },
        }),
      },
    });
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0',
    });

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAutenticacaoDuble()}
        servicoPush={servicoPush}
        rotaInicial="/perfil"
      />,
    );

    expect(
      await screen.findByText(/aplicativo \(pwa\) e notificações web push/i),
    ).toBeInTheDocument();
    // Garantia estrita de opt-in: nunca pedir permissao automaticamente ao montar
    expect(requestPermissionSpy).not.toHaveBeenCalled();

    // Disparo simulado de beforeinstallprompt exibe o botao de instalacao
    const promptInstallSpy = vi.fn(() => Promise.resolve());
    const eventoInstall = Object.assign(new Event('beforeinstallprompt'), {
      preventDefault: vi.fn(),
      prompt: promptInstallSpy,
      userChoice: Promise.resolve({ outcome: 'accepted' as const, platform: 'web' }),
    });
    fireEvent(window, eventoInstall);

    const btnInstalar = await screen.findByRole('button', { name: /instalar aplicativo lume/i });
    await usuario.click(btnInstalar);
    await waitFor(() => {
      expect(promptInstallSpy).toHaveBeenCalledTimes(1);
    });

    // Ativa Web Push neste aparelho com rotulo personalizado
    const campoRotulo = screen.getByLabelText(/nome deste aparelho/i);
    await usuario.clear(campoRotulo);
    await usuario.type(campoRotulo, 'Notebook Trabalho');

    await usuario.click(
      screen.getByRole('button', { name: /ativar notificações neste aparelho/i }),
    );

    await waitFor(() => {
      expect(requestPermissionSpy).toHaveBeenCalledTimes(1);
      expect(pushSubscribeSpy).toHaveBeenCalledTimes(1);
      expect(spies.registrarDispositivo).toHaveBeenCalledWith(
        expect.objectContaining({
          endpoint: 'https://fcm.googleapis.com/fcm/send/device-pc',
          rotuloDispositivo: 'Notebook Trabalho',
          plataforma: 'desktop',
        }),
      );
    });

    expect(await screen.findByText('Notebook Trabalho')).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /revogar notebook trabalho/i }));
    await waitFor(() => {
      expect(spies.revogarDispositivo).toHaveBeenCalledWith('disp-1');
    });

    cleanup();

    // Simula iOS 16.4+ fora do modo standalone: exibe guia visual de 2 passos
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15',
    });
    Object.defineProperty(window.navigator, 'maxTouchPoints', {
      configurable: true,
      value: 5,
    });

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAutenticacaoDuble()}
        servicoPush={servicoPush}
        rotaInicial="/perfil"
      />,
    );

    expect(
      await screen.findByText(/guia rápido para iphone e ipad \(ios 16\.4\+\)/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/toque em compartilhar/i)).toBeInTheDocument();
    expect(screen.getByText(/adicionar à tela de início/i)).toBeInTheDocument();
  });

  it('agenda e cancela lembrete real da tarefa na Gaveta de Edicao', async () => {
    const usuario = userEvent.setup();
    const lembretesLista: LembreteDetalhado[] = [];
    const servicoJornada = fabricarServicoJornadaDuble(lembretesLista);
    const { servico: servicoPush, spies } = fabricarServicoPushDuble({
      lembretesIniciais: lembretesLista,
    });

    render(
      <Aplicacao
        buscadorDeSaude={BUSCADOR_OK}
        servicoAutenticacao={criarAutenticacaoDuble()}
        servicoJornada={servicoJornada}
        servicoPush={servicoPush}
        rotaInicial="/jornada"
      />,
    );

    expect(await screen.findByText('Revisar entrega Web II')).toBeInTheDocument();
    await usuario.click(
      screen.getByRole('button', { name: /editar e notas de revisar entrega web ii/i }),
    );

    const dialogo = await screen.findByRole('dialog');
    await usuario.selectOptions(within(dialogo).getByLabelText(/antecedência do lembrete/i), '15');
    expect(within(dialogo).getByText(/previsão do aviso:/i)).toBeInTheDocument();

    await usuario.click(within(dialogo).getByRole('button', { name: /agendar lembrete/i }));

    await waitFor(() => {
      expect(spies.criarLembrete).toHaveBeenCalledWith(
        't-f24-1',
        expect.objectContaining({
          antecedenciaMin: 15,
          dispararEm: '2026-11-30T17:45:00.000Z',
        }),
      );
    });

    const btnCancelar = await within(dialogo).findByRole('button', { name: /cancelar lembrete/i });
    await usuario.click(btnCancelar);

    await waitFor(() => {
      expect(spies.cancelarLembrete).toHaveBeenCalledWith('lem-1');
    });
  });
});
