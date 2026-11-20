const CACHE = 'mi-mercado-v2';
const ASSETS = ['./index.html', './manifest.json', './icon-192.png', './icon-512.png'];
const APP_URL = new URL(ASSETS[0], self.registration.scope).href;
const ASSET_URLS = new Set(ASSETS.map(path => new URL(path, self.registration.scope).href));

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys
      .filter(key => key.startsWith('mi-mercado-') && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  const isAppNavigation = request.mode === 'navigate' &&
    (url.pathname === new URL(self.registration.scope).pathname ||
      url.pathname === new URL(APP_URL).pathname);
  if (url.origin !== self.location.origin || (!isAppNavigation && !ASSET_URLS.has(url.href))) return;

  const key = isAppNavigation ? APP_URL : request;
  const cache = caches.open(CACHE);
  const cached = cache.then(store => store.match(key));
  // Keep the network update alive even when the cached response is returned first.
  const update = fetch(key, { cache: 'no-cache' }).then(async response => {
    if (response.ok) {
      const store = await cache;
      await store.put(key, response.clone());
    }
    return response;
  });
  event.waitUntil(update.catch(() => {}));
  event.respondWith(cached.then(response => response || update));
});
