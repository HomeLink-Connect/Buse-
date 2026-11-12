/* Offrez service worker: opens the app with no internet.
   Keep this file next to index.html (same folder). */
const CACHE = 'offrez-shell-v3';
const SHELL = ['./', 'index.html'];
const NEVER_CACHE = /(firestore|identitytoolkit|securetoken|firebaseinstallations|firebasestorage)\.googleapis\.com|www\.googleapis\.com\/(identitytoolkit|oauth2)|apis\.google\.com|accounts\.google\.com|firebaseio\.com|\.firebaseapp\.com\/__\//;

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(SHELL.map(u => c.add(u).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('message', e => {
  if (!e.data || e.data.type !== 'CACHE_URLS') return;
  e.waitUntil(caches.open(CACHE).then(c => Promise.all((e.data.urls || []).filter(u => !NEVER_CACHE.test(u)).map(u =>
    c.match(u).then(hit => hit || fetch(u).then(r => (r && (r.ok || r.type === 'opaque')) ? c.put(u, r) : null)).catch(() => {})))));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || NEVER_CACHE.test(req.url)) return;
  const url = new URL(req.url);
  // Opening the app: try the network briefly, otherwise use the saved copy.
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const net = await Promise.race([fetch(req), new Promise((_, rej) => setTimeout(() => rej(new Error('slow')), 3500))]);
        if (net && net.ok) cache.put('index.html', net.clone());
        return net;
      } catch (err) {
        return (await cache.match('index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
    return;
  }
  // Firebase SDK, fonts and same-site files: saved copy first, refreshed in the background.
  if (url.origin === location.origin || /gstatic\.com|fonts\.googleapis\.com/.test(url.host)) {
    e.respondWith(caches.open(CACHE).then(async cache => {
      const hit = await cache.match(req);
      const refresh = fetch(req).then(r => { if (r && (r.ok || r.type === 'opaque')) cache.put(req, r.clone()); return r; }).catch(() => null);
      return hit || (await refresh) || Response.error();
    }));
  }
});