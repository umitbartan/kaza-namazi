// İhyâ Service Worker — Offline destek
const CACHE_NAME = 'ihya-v20';
const STATIK_DOSYALAR = [
  './',
  './index.html',
  './manifest.json',
  './icon-180.png',
  './icon-192.png',
  './icon-512.png',
  './icon-167.png',
  './favicon-32.png',
  // iOS Splash screen
  './splash/splash-1320x2868.png',
  './splash/splash-1290x2796.png',
  './splash/splash-1284x2778.png',
  './splash/splash-1242x2688.png',
  './splash/splash-1242x2208.png',
  './splash/splash-1206x2622.png',
  './splash/splash-1179x2556.png',
  './splash/splash-1170x2532.png',
  './splash/splash-1125x2436.png',
  './splash/splash-828x1792.png',
  './splash/splash-750x1334.png',
  './splash/splash-640x1136.png'
];

// Yükleme: kritik dosyaları cache'le
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(STATIK_DOSYALAR);
    })
  );
  self.skipWaiting();
});

// Aktifleştirme: eski cache'i temizle
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch stratejisi: önce cache, sonra ağ (statik için), network-first (API için)
self.addEventListener('fetch', event => {
  const url = event.request.url;

  // API çağrıları (aladhan vb.) için network-first
  if (url.includes('aladhan.com') || url.includes('fonts.googleapis.com') || url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  // Kur'an verisi (Diyanet / jsdelivr / fastly / github raw) ve audio (everyayah) — stale-while-revalidate
  if (url.includes('t061.diyanet.gov.tr') || url.includes('jsdelivr.net/gh/fawazahmed0/quran-api') || url.includes('raw.githubusercontent.com/fawazahmed0/quran-api') || url.includes('everyayah.com')) {
    event.respondWith(
      caches.open(CACHE_NAME + '-kuran').then(cache =>
        cache.match(event.request).then(cached => {
          const fetchPromise = fetch(event.request).then(resp => {
            if (resp && resp.status === 200) cache.put(event.request, resp.clone());
            return resp;
          }).catch(() => cached);
          return cached || fetchPromise;
        })
      )
    );
    return;
  }

  // Statik dosyalar için cache-first
  event.respondWith(
    caches.match(event.request).then(cached => {
      return cached || fetch(event.request).then(response => {
        // Başarılı yanıtları cache'e ekle
        if (response && response.status === 200 && response.type === 'basic') {
          const cloned = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, cloned));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback için index.html dön
      if (event.request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
