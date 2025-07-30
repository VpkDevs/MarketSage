const CACHE_NAME = 'marketsage-v1';
const MODEL_CACHE = 'marketsage-models-v1';

const STATIC_RESOURCES = [
  '/popup.html',
  '/popup.js',
  '/content.js',
  '/background.js',
  '/icons/icon16.png',
  '/icons/icon48.png',
  '/icons/icon128.png'
];

const MODEL_URLS = [
  'https://storage.marketsage.com/models/scam-detector-v1/model.json',
  'https://storage.marketsage.com/models/seller-dna-v1/model.json'
];

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_RESOURCES)),
      caches.open(MODEL_CACHE).then(cache => cache.addAll(MODEL_URLS))
    ])
  );
});

self.addEventListener('fetch', (event: FetchEvent) => {
  const url = new URL(event.request.url);
  
  // Handle model files
  if (url.pathname.includes('/models/')) {
    event.respondWith(
      caches.open(MODEL_CACHE)
        .then(cache => cache.match(event.request))
        .then(response => response || fetch(event.request))
    );
    return;
  }

  // Handle static resources
  event.respondWith(
    caches.open(CACHE_NAME)
      .then(cache => cache.match(event.request))
      .then(response => response || fetch(event.request))
  );
});

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    Promise.all([
      caches.keys().then(keys => Promise.all(
        keys.filter(key => key !== CACHE_NAME && key !== MODEL_CACHE)
            .map(key => caches.delete(key))
      ))
    ])
  );
});