const VERSION = 'mlh-v3';
const CODE_FILE = /\.(html|css|js|webmanifest)$/;

const PRECACHE = [
  './',
  'index.html',
  'robot.html',
  'puzzle.html',
  'lucky.html',
  'manifest.webmanifest',
  'css/style.css',
  'js/common.js',
  'js/robot.js',
  'js/puzzle.js',
  'js/lucky.js',
  'assets/web/favicon-32.png',
  'assets/web/favicon-180.png',
  'assets/web/favicon-192.png',
  'assets/web/icon-512.png',
  'assets/web/icon-maskable-512.png',
  'assets/web/ui/logo.png',
  'assets/web/ui/mascota.png',
  'assets/web/ui/1.png',
  'assets/web/ui/6.png',
  'assets/web/ui/12.png',
  'assets/web/robot/iamnotarobot.jpg',
  'assets/web/robot/iamnotarobotGOLD.jpg',
  'assets/web/puzzle/puzzle.jpg',
  'assets/web/lucky/lucky1.jpg',
  'assets/web/lucky/lucky2.jpg',
  'assets/web/lucky/lucky3.jpg',
  'assets/web/lucky/lucky4.jpg',
  'assets/web/lucky/lucky5.jpg',
  'assets/web/lucky/lucky6.jpg',
];

const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  if (req.destination === 'audio' || req.headers.has('range')) return;

  const url = new URL(req.url);
  const sameOrigin = url.origin === self.location.origin;
  if (!sameOrigin && !FONT_HOSTS.includes(url.hostname)) return;

  const isCode = req.mode === 'navigate' || url.pathname.endsWith('/') || CODE_FILE.test(url.pathname);
  event.respondWith(sameOrigin && isCode ? networkFirst(req) : staleWhileRevalidate(event, req));
});

async function networkFirst(req) {
  const cache = await caches.open(VERSION);
  try {
    const res = await fetch(req, { cache: 'no-cache' });
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (err) {
    const cached = await cache.match(req, { ignoreSearch: true });
    if (cached) return cached;
    if (req.mode === 'navigate') {
      const home = await cache.match('index.html');
      if (home) return home;
    }
    return Response.error();
  }
}

async function staleWhileRevalidate(event, req) {
  const cache = await caches.open(VERSION);
  const cached = await cache.match(req, { ignoreSearch: true });

  const network = fetch(req, { cache: 'no-cache' })
    .then((res) => {
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;

  if (req.mode === 'navigate') {
    const home = await cache.match('index.html');
    if (home) return home;
  }
  return Response.error();
}
