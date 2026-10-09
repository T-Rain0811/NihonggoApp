// Service Worker for JLPT N2 Mastery Offline Cache
const CACHE_NAME = 'jlpt-n2-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './css/style.css',
  './js/app.js',
  './js/speech.js',
  './js/views/home.js',
  './js/views/vocab.js',
  './js/views/grammar.js',
  './js/views/customVocab.js',
  './js/views/drill.js',
  './js/views/extraVocab.js',
  './data/vocab_data.json',
  './data/grammar_data.json',
  './data/extra_vocab_data.json',
  './data/meta.json',
  './data/drills_vocab_list.json',
  './data/drills_grammar_list.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((k) => {
          if (k !== CACHE_NAME) {
            return caches.delete(k);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(e.request).then((networkResponse) => {
        return networkResponse;
      }).catch(() => {
        // Fallback if offline
        return caches.match('./index.html');
      });
    })
  );
});
