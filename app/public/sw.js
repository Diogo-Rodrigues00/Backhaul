// Service worker do Backhaul (ADR 0014). Escrito à mão, sem Workbox.
// Ao mudar este arquivo, troque a VERSAO: o `activate` apaga os caches antigos.
const VERSAO = 'v1';
const CACHE = `backhaul-${VERSAO}`;
const PRE_CACHE = ['/', '/entrar'];

self.addEventListener('install', (evento) => {
  evento.waitUntil(
    caches.open(CACHE).then((cache) =>
      // Uma a uma: rota que ainda não existe (404) não pode derrubar a instalação.
      Promise.all(PRE_CACHE.map((url) => cache.add(url).catch(() => undefined))),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches
      .keys()
      .then((nomes) => Promise.all(nomes.filter((n) => n !== CACHE).map((n) => caches.delete(n))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (evento) => {
  const { request } = evento;
  const url = new URL(request.url);

  // Só GET da mesma origem: a API (outra origem) nunca passa por aqui.
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  // Nunca o próprio sw.js nem o worker do MSW.
  if (url.pathname === '/sw.js' || url.pathname === '/mockServiceWorker.js') return;

  if (url.pathname.startsWith('/_expo/static/') || url.pathname.startsWith('/icones/')) {
    evento.respondWith(cacheDepoisRede(request));
  } else if (request.mode === 'navigate') {
    evento.respondWith(redeDepoisCache(request));
  }
});

// Arquivos com hash no nome ou ícones: cache primeiro.
async function cacheDepoisRede(request) {
  const cache = await caches.open(CACHE);
  const guardado = await cache.match(request);
  if (guardado) return guardado;
  const resposta = await fetch(request);
  if (resposta.ok) cache.put(request, resposta.clone());
  return resposta;
}

// Páginas: rede primeiro; sem rede, a última cópia (ou a página inicial).
async function redeDepoisCache(request) {
  const cache = await caches.open(CACHE);
  try {
    const resposta = await fetch(request);
    if (resposta.ok) cache.put(request, resposta.clone());
    return resposta;
  } catch {
    return (await cache.match(request)) || (await cache.match('/')) || Response.error();
  }
}
