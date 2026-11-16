// Service worker: makes the app installable and usable offline.
// - Same-origin files: network first (so updates show up), cache as fallback.
// - Google Fonts: cache first (they never change for a given URL).
//
// Bump CACHE when the SHELL list changes. `npm run check` verifies that every
// file in js/ and css/ is listed here.

const CACHE = 'lofi-pomodoro-v5';
const SHELL = [
  './',
  'index.html',
  'manifest.webmanifest',
  'icon.svg',
  'icon-512.png',
  'css/tokens.css',
  'css/base.css',
  'css/scene.css',
  'css/layout.css',
  'css/components.css',
  'css/dialog.css',
  'css/a11y.css',
  'js/main.js',
  'js/config.js',
  'js/dom.js',
  'js/favicon.js',
  'js/notify.js',
  'js/timer.js',
  'js/log.js',
  'js/storage.js',
  'js/audio.js',
  'js/wake-lock.js',
  'js/ui/timer-view.js',
  'js/ui/stats-view.js',
  'js/ui/controls.js',
  'js/ui/ambience.js',
  'js/ui/settings-dialog.js',
  'js/ui/focus-mode.js',
  'js/ui/task-suggest.js',
  'js/ui/summary.js',
];
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);

  if (FONT_HOSTS.includes(url.hostname)) {
    event.respondWith(cacheFirst(request));
  } else if (url.origin === self.location.origin) {
    event.respondWith(networkFirst(request));
  }
});

async function cacheFirst(request) {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok || response.type === 'opaque') cache.put(request, response.clone());
  return response;
}

async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) cache.put(request, response.clone());
    return response;
  } catch (err) {
    const hit = (await cache.match(request, { ignoreSearch: true })) ||
      (request.mode === 'navigate' ? await cache.match('index.html') : undefined);
    if (hit) return hit;
    throw err;
  }
}
