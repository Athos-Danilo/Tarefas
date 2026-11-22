const NOME_CACHE = 'lume-shell-v1';
const RECURSOS_BASE = [
  '/',
  '/manifest.webmanifest',
  '/favicons/favicon-lume-manha.png',
  '/favicons/favicon-lume-tarde.png',
  '/favicons/favicon-lume-entardecer.png',
  '/favicons/favicon-lume-noite.png',
];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches
      .open(NOME_CACHE)
      .then((cache) => cache.addAll(RECURSOS_BASE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((chaves) =>
        Promise.all(
          chaves.filter((chave) => chave !== NOME_CACHE).map((chave) => caches.delete(chave)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;
  if (requisicao.method !== 'GET') {
    return;
  }

  const url = new URL(requisicao.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/api/')) {
    return;
  }

  evento.respondWith(
    fetch(requisicao).catch(async () => {
      const encontrado = await caches.match(requisicao);
      return encontrado || Response.error();
    }),
  );
});

// Estrutura base preparada para receber Web Push na Fase 24.
self.addEventListener('push', (evento) => {
  let dados = {
    titulo: 'Lume - Horizonte Vivo',
    corpo: 'Voce tem um lembrete de tarefa no Lume.',
    url: '/',
  };

  if (evento.data) {
    try {
      const recebido = evento.data.json();
      if (recebido && typeof recebido.titulo === 'string') {
        dados = {
          titulo: recebido.titulo,
          corpo: typeof recebido.corpo === 'string' ? recebido.corpo : dados.corpo,
          url: typeof recebido.url === 'string' ? recebido.url : '/',
        };
      }
    } catch {
      dados.corpo = evento.data.text() || dados.corpo;
    }
  }

  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/favicons/favicon-lume-manha.png',
      data: { url: dados.url },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destino = (evento.notification.data && evento.notification.data.url) || '/';
  evento.waitUntil(self.clients.openWindow(destino));
});
