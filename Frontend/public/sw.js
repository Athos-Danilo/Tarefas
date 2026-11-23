const NOME_CACHE = 'lume-shell-v2';
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

self.addEventListener('push', (evento) => {
  let dados = {
    titulo: 'Lume - Horizonte Vivo',
    corpo: 'Voce tem um lembrete de tarefa no Lume.',
    url: '/jornada',
    tag: 'lume-notificacao',
  };

  if (evento.data) {
    try {
      const recebido = evento.data.json();
      if (recebido && typeof recebido.titulo === 'string') {
        dados = {
          titulo: recebido.titulo,
          corpo: typeof recebido.corpo === 'string' ? recebido.corpo : dados.corpo,
          url: typeof recebido.url === 'string' ? recebido.url : '/jornada',
          tag: typeof recebido.tag === 'string' ? recebido.tag : dados.tag,
        };
      }
    } catch {
      const texto = evento.data.text();
      if (texto) {
        dados.corpo = texto;
      }
    }
  }

  evento.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: '/favicons/favicon-lume-manha.png',
      badge: '/favicons/favicon-lume-manha.png',
      tag: dados.tag,
      data: { url: dados.url },
    }),
  );
});

self.addEventListener('notificationclick', (evento) => {
  evento.notification.close();
  const destinoBruto = (evento.notification.data && evento.notification.data.url) || '/jornada';
  const origem =
    self.location && self.location.origin && self.location.origin !== 'null'
      ? self.location.origin
      : '';
  const urlCompleta = origem ? new URL(destinoBruto, origem).href : destinoBruto;

  evento.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (janelas) => {
      const abertaMesmaOrigem = janelas.find(
        (cliente) => !origem || (typeof cliente.url === 'string' && cliente.url.startsWith(origem)),
      );
      if (abertaMesmaOrigem) {
        if (typeof abertaMesmaOrigem.focus === 'function') {
          await abertaMesmaOrigem.focus();
        }
        if (
          typeof abertaMesmaOrigem.navigate === 'function' &&
          abertaMesmaOrigem.url !== urlCompleta
        ) {
          await abertaMesmaOrigem.navigate(urlCompleta);
        }
        return abertaMesmaOrigem;
      }
      return self.clients.openWindow(destinoBruto);
    }),
  );
});
