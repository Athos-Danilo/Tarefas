import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  calcularInstanteDisparoLembrete,
  converterChaveVapidParaUint8Array,
  detectarPlataformaDispositivo,
  ehDispositivoIos,
  estaEmModoStandalone,
  exigeInstalacaoIosParaPush,
  extrairChavesInscricaoPush,
  sugerirRotuloDispositivo,
} from '../../src/pwa/logica-pwa-push';
import { criarServicoPush } from '../../src/servicos/cliente-push';

describe('Logica pura de PWA instalavel e Web Push', () => {
  it('detecta modo standalone via matchMedia ou navigator.standalone', () => {
    expect(estaEmModoStandalone(true, false)).toBe(true);
    expect(estaEmModoStandalone(false, true)).toBe(true);
    expect(estaEmModoStandalone(false, false)).toBe(false);
  });

  it('detecta iOS (incluindo iPadOS Safari moderno) e exige instalacao antes do push', () => {
    const uaIphone =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1';
    const uaIpadDesktop =
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15';
    const uaDesktopWin =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131.0.0.0 Safari/537.36';
    const uaAndroid =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/131.0.0.0 Mobile Safari/537.36';

    expect(ehDispositivoIos(uaIphone, 5)).toBe(true);
    expect(ehDispositivoIos(uaIpadDesktop, 5)).toBe(true);
    expect(ehDispositivoIos(uaDesktopWin, 0)).toBe(false);
    expect(ehDispositivoIos(uaAndroid, 5)).toBe(false);

    expect(exigeInstalacaoIosParaPush(uaIphone, 5, false)).toBe(true);
    expect(exigeInstalacaoIosParaPush(uaIphone, 5, true)).toBe(false);
    expect(exigeInstalacaoIosParaPush(uaAndroid, 5, false)).toBe(false);

    expect(detectarPlataformaDispositivo(uaIphone, 5)).toBe('ios');
    expect(detectarPlataformaDispositivo(uaAndroid, 5)).toBe('android');
    expect(detectarPlataformaDispositivo(uaDesktopWin, 0)).toBe('desktop');

    expect(sugerirRotuloDispositivo('ios')).toBe('iPhone / iPad');
    expect(sugerirRotuloDispositivo('android')).toBe('Celular Android');
    expect(sugerirRotuloDispositivo('desktop')).toBe('Navegador no computador');
  });

  it('converte chave publica VAPID Base64 URL-safe para Uint8Array', () => {
    const chave =
      'BEl62iUYgUivxIkv69yViEuiBIa-Ib9-SkvMeAtA3LFgDzkrxZJjSgSnfckjBJuBkr3qBUYIHBQFLXYp5Nksh8AA';
    const bytes = converterChaveVapidParaUint8Array(chave.slice(0, 87));
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBe(65);
    expect(bytes[0]).toBe(0x04);
  });

  it('calcula instante ISO do lembrete e extrai chaves p256dh/auth da inscricao', () => {
    const dispararEm = calcularInstanteDisparoLembrete('2026-11-30T15:00:00.000Z', 15);
    expect(dispararEm).toBe('2026-11-30T14:45:00.000Z');
    expect(calcularInstanteDisparoLembrete(null, 15)).toBeNull();

    const assinaturaMock = {
      endpoint: 'https://push.exemplo/abc',
      toJSON: () => ({
        endpoint: 'https://push.exemplo/abc',
        keys: {
          p256dh: 'chave-p256dh-teste',
          auth: 'chave-auth-teste',
        },
      }),
    } as unknown as PushSubscription;

    expect(extrairChavesInscricaoPush(assinaturaMock)).toEqual({
      endpoint: 'https://push.exemplo/abc',
      chaves: {
        p256dh: 'chave-p256dh-teste',
        auth: 'chave-auth-teste',
      },
    });
  });
});

describe('Cliente HTTP de Web Push e Lembretes', () => {
  it('consome endpoints de push e lembretes mapeando snake_case para camelCase', async () => {
    const respostas: Record<string, unknown> = {
      'GET /api/push/chave-publica': { chave_publica: 'VAPID_PUB', habilitado: true },
      'GET /api/push/dispositivos': {
        itens: [
          {
            id: 'd-1',
            rotulo_dispositivo: 'Notebook',
            plataforma: 'desktop',
            criado_em: '2026-11-23T12:00:00Z',
            ultimo_envio_em: null,
          },
        ],
        limite_maximo: 10,
      },
      'POST /api/push/dispositivos': {
        id: 'd-2',
        rotulo_dispositivo: 'Pixel 8',
        plataforma: 'android',
        criado_em: '2026-11-23T12:05:00Z',
        ultimo_envio_em: null,
      },
      'POST /api/tarefas/t-1/lembretes': {
        id: 'lem-1',
        tarefa_id: 't-1',
        disparar_em: '2026-11-30T14:45:00Z',
        antecedencia_min: 15,
        status: 'pendente',
        enviado_em: null,
        criado_em: '2026-11-23T12:10:00Z',
      },
    };

    const chamadas: Array<{ url: string; metodo: string }> = [];
    const fetchMock = vi.fn((url: RequestInfo | URL, init?: RequestInit) => {
      const metodo = (init?.method ?? 'GET').toUpperCase();
      const caminho = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url;
      chamadas.push({ url: caminho, metodo });
      if (metodo === 'DELETE') {
        return Promise.resolve(new Response(null, { status: 204 }));
      }
      const corpo = respostas[`${metodo} ${caminho}`];
      return Promise.resolve(
        new Response(JSON.stringify(corpo), {
          status: metodo === 'POST' ? 201 : 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      );
    }) as unknown as typeof fetch;

    const servico = criarServicoPush(fetchMock);
    const chave = await servico.obterChavePublica();
    expect(chave).toEqual({ chavePublica: 'VAPID_PUB', habilitado: true });

    const listaDisp = await servico.listarDispositivos();
    expect(listaDisp.limiteMaximo).toBe(10);
    expect(listaDisp.itens[0].rotuloDispositivo).toBe('Notebook');

    const novoDisp = await servico.registrarDispositivo({
      endpoint: 'https://push.exemplo/pixel',
      chaves: { p256dh: 'p256dh-abc', auth: 'auth-abc' },
      rotuloDispositivo: 'Pixel 8',
      plataforma: 'android',
    });
    expect(novoDisp.id).toBe('d-2');

    await servico.revogarDispositivo('d-2');

    const lembreteCriado = await servico.criarLembrete('t-1', {
      dispararEm: '2026-11-30T14:45:00Z',
      antecedenciaMin: 15,
    });
    expect(lembreteCriado.id).toBe('lem-1');
    expect(lembreteCriado.antecedenciaMin).toBe(15);

    await servico.cancelarLembrete('lem-1');
    expect(chamadas.map((c) => `${c.metodo} ${c.url}`)).toEqual([
      'GET /api/push/chave-publica',
      'GET /api/push/dispositivos',
      'POST /api/push/dispositivos',
      'DELETE /api/push/dispositivos/d-2',
      'POST /api/tarefas/t-1/lembretes',
      'DELETE /api/lembretes/lem-1',
    ]);
  });
});

interface ClienteJanelaMock {
  url: string;
  focus: ReturnType<typeof vi.fn>;
  navigate?: ReturnType<typeof vi.fn>;
}

describe('Service Worker public/sw.js (push e notificationclick)', () => {
  const descRegistration = Object.getOwnPropertyDescriptor(globalThis, 'registration');
  const descClients = Object.getOwnPropertyDescriptor(globalThis, 'clients');
  const descSkipWaiting = Object.getOwnPropertyDescriptor(globalThis, 'skipWaiting');
  const descCaches = Object.getOwnPropertyDescriptor(globalThis, 'caches');

  afterEach(() => {
    vi.restoreAllMocks();
    const restaurar = (chave: string, desc: PropertyDescriptor | undefined) => {
      if (desc) {
        Object.defineProperty(globalThis, chave, desc);
      } else {
        Reflect.deleteProperty(globalThis, chave);
      }
    };
    restaurar('registration', descRegistration);
    restaurar('clients', descClients);
    restaurar('skipWaiting', descSkipWaiting);
    restaurar('caches', descCaches);
  });

  it('exibe notificacao estruturada no evento push e foca aba aberta ou abre nova no clique', async () => {
    const handlers: Record<string, (evento: unknown) => void> = {};
    vi.spyOn(window, 'addEventListener').mockImplementation((tipo: string, ouvinte: unknown) => {
      if (typeof ouvinte === 'function') {
        handlers[tipo] = ouvinte as (evento: unknown) => void;
      }
    });

    const showNotification = vi.fn(() => Promise.resolve());
    const openWindow = vi.fn(() => Promise.resolve(null));
    let janelasAbertas: ClienteJanelaMock[] = [];
    const matchAll = vi.fn(() => Promise.resolve(janelasAbertas));

    Object.defineProperty(globalThis, 'registration', {
      configurable: true,
      value: { showNotification },
    });
    Object.defineProperty(globalThis, 'clients', {
      configurable: true,
      value: {
        claim: vi.fn(() => Promise.resolve()),
        matchAll,
        openWindow,
      },
    });
    Object.defineProperty(globalThis, 'skipWaiting', {
      configurable: true,
      value: vi.fn(() => Promise.resolve()),
    });
    Object.defineProperty(globalThis, 'caches', {
      configurable: true,
      value: {
        open: vi.fn(),
        keys: vi.fn(() => Promise.resolve([])),
        delete: vi.fn(),
        match: vi.fn(),
      },
    });

    await import('../../public/sw.js');

    const esperaPush: Promise<unknown>[] = [];
    handlers.push({
      data: {
        json: () => ({
          titulo: 'Lembrete: Prova Web II',
          corpo: 'Aviso agendado (15 min antes).',
          url: '/jornada?tarefa=123',
          tag: 'lembrete-123',
        }),
        text: () => '',
      },
      waitUntil: (p: Promise<unknown>) => esperaPush.push(p),
    });
    await Promise.all(esperaPush);

    expect(showNotification).toHaveBeenCalledWith(
      'Lembrete: Prova Web II',
      expect.objectContaining({
        body: 'Aviso agendado (15 min antes).',
        icon: '/favicons/favicon-lume-manha.png',
        badge: '/favicons/favicon-lume-manha.png',
        tag: 'lembrete-123',
        data: { url: '/jornada?tarefa=123' },
      }),
    );

    // 1) Sem janela aberta -> abre nova janela via clients.openWindow
    const fechar1 = vi.fn();
    const esperaClique1: Promise<unknown>[] = [];
    handlers.notificationclick({
      notification: { close: fechar1, data: { url: '/jornada?tarefa=123' } },
      waitUntil: (p: Promise<unknown>) => esperaClique1.push(p),
    });
    await Promise.all(esperaClique1);
    expect(fechar1).toHaveBeenCalledTimes(1);
    expect(openWindow).toHaveBeenCalledWith('/jornada?tarefa=123');

    // 2) Com janela aberta na mesma origem -> foca e navega sem abrir nova janela
    const origem =
      window.location.origin && window.location.origin !== 'null' ? window.location.origin : '';
    const focusFn = vi.fn(() => Promise.resolve());
    const navigateFn = vi.fn(() => Promise.resolve());
    janelasAbertas = [
      {
        url: `${origem}/perfil`,
        focus: focusFn,
        navigate: navigateFn,
      },
    ];
    openWindow.mockClear();

    const esperaClique2: Promise<unknown>[] = [];
    handlers.notificationclick({
      notification: { close: vi.fn(), data: { url: '/jornada?tarefa=123' } },
      waitUntil: (p: Promise<unknown>) => esperaClique2.push(p),
    });
    await Promise.all(esperaClique2);
    expect(focusFn).toHaveBeenCalledTimes(1);
    const esperadoUrl = origem ? `${origem}/jornada?tarefa=123` : '/jornada?tarefa=123';
    expect(navigateFn).toHaveBeenCalledWith(esperadoUrl);
    expect(openWindow).not.toHaveBeenCalled();
  });
});
