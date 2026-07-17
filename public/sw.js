/* Service worker DLC — offline shell + cache des assets hashés.
 * Navigations : network-first (jamais de bundle figé), fallback sur le
 * dernier index.html en cache quand le réseau est coupé.
 * /assets/* (fichiers hashés immuables) et Google Fonts : cache-first.
 * Tout le reste (Supabase, /api/*, POST…) : réseau direct, jamais caché.
 */
const CACHE = 'dlc-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Navigations : network-first avec fallback offline sur le shell.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('/', copy));
          return res;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  // Assets hashés du build + polices : cache-first (immuables).
  const isAsset = url.origin === self.location.origin
    && (url.pathname.startsWith('/assets/') || url.pathname.startsWith('/icons/'));
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (isAsset || isFont) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }))
    );
  }
  // Tout le reste (Supabase, /api/*, images produits externes) : réseau direct.
});
