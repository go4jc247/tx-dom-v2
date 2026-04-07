// ============================================================
// TX-Dom-Dev Service Worker
// Version: v14.0.0 — AI engine overhaul (signal tracking, lookahead, enhanced play)
// UPDATE CACHE_NAME every release to bust old caches
// ============================================================

const CACHE_NAME = 'tx-dom-v14.0.0';
const urlsToCache = [
  './index.html',
  './sw.js',
  // CSS
  './assets/css/styles.css',
  // JS — core (defer-loaded in order)
  './assets/js/sfx.js',
  './assets/js/game.js',
  './assets/js/multiplayer.js',
  './assets/js/ai-engine.js',
  './assets/js/mp-social.js',
  './assets/js/orientation.js',
  './assets/js/popup-config.js',
  './assets/js/claude-chat.js',
  // JS — lazy-loaded modules (pre-cached for offline)
  './assets/js/monte-carlo.js',
  './assets/js/observer.js',
  './assets/js/replay.js',
  './assets/js/dev-tools.js',
  // Images
  './assets/images/icon-180.png',
  './assets/images/icon-512.png',
  './assets/images/manifest-icon-192.png',
  './assets/images/manifest-icon-512.png',
  './assets/images/splash-bg.png',
  './assets/images/home-logo.png',
  './assets/images/logo-tn51.png',
  './assets/images/logo-t42.png',
  './assets/images/logo-moon.png',
  // SFX
  './assets/audio/sfx-click.mp3',
  './assets/audio/sfx-play1.mp3',
  './assets/audio/sfx-play3.mp3',
  './assets/audio/sfx-shuffle.mp3',
  './assets/audio/sfx-invalid.mp3',
  './assets/audio/sfx-collect.mp3',
  // BGM & result songs
  './assets/audio/bgm1.mp3',
  './assets/audio/bgm2.mp3',
  './assets/audio/bgm3.mp3',
  './assets/audio/win-song.mp3',
  './assets/audio/lose-song.mp3',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(r => { const rc = r.clone(); caches.open(CACHE_NAME).then(c => c.put(e.request, rc)); return r; })
      .catch(() => caches.match(e.request))
  );
});
