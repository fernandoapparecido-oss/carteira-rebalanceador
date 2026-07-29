// Service worker mínimo — habilita instalação como PWA e um cache leve do
// "shell" do app. NÃO intercepta cotações (worker Cloudflare / Tesouro), que
// são cross-origin e passam direto pela rede.
const CACHE = 'carteira-shell-v2';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((c) => c.add(new Request(self.registration.scope, { cache: 'reload' })))
      .catch(() => {})
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // cotações/CSV: sempre rede

  // Navegação: rede primeiro, cai no shell em cache se offline
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(() => caches.match(self.registration.scope)));
    return;
  }

  // Demais assets same-origin: stale-while-revalidate
  event.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const cached = await cache.match(req);
      const network = fetch(req)
        .then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; })
        .catch(() => cached);
      return cached || network;
    })
  );
});
