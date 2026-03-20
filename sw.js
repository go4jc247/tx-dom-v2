// ============================================================
// TX-Dom-Dev Service Worker
// Version: v13.2.0 — MyClaude / Claude Code build
// UPDATE CACHE_NAME every release to bust old caches
// ============================================================

const CACHE_NAME = 'tx-dom-v13.2.0';
const urlsToCache = [
  './index.html',
  './sw.js',
  // CSS
  './assets/css/styles.css',
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

// Install — cache all files
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => c.addAll(urlsToCache))
  );
  self.skipWaiting();
});

// Activate — delete any old caches from previous versions
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — network first, fall back to cache
self.addEventListener('fetch', e => {
  e.respondWith(
    fetch(e.request)
      .then(r => {
        const rc = r.clone();
        caches.open(CACHE_NAME).then(c => c.put(e.request, rc));
        return r;
      })
      .catch(() => caches.match(e.request))
  );
});
