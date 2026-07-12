// عامل الخدمة: كاش كامل للعمل دون اتصال
const CACHE_VERSION = 'fm-v4';

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/main.css',
  './fonts/cairo-arabic.woff2',
  './fonts/cairo-latin.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './js/app.js',
  './js/store.js',
  './js/game.js',
  './js/ui.js',
  './js/quiz.js',
  './js/personalize.js',
  './js/simhost.js',
  './js/screens/welcome.js',
  './js/screens/diag.js',
  './js/screens/home.js',
  './js/screens/unit.js',
  './js/screens/lesson.js',
  './js/screens/labs.js',
  './js/screens/glossary.js',
  './js/screens/me.js',
  './js/sims/simkit.js',
  './js/sims/registry.js',
  './js/sims/density.js',
  './js/sims/viscosity.js',
  './js/sims/boiling.js',
  './js/sims/pressure.js',
  './js/sims/hydraulic.js',
  './js/sims/buoyancy.js',
  './js/sims/manometer.js',
  './js/sims/continuity.js',
  './js/sims/bernoulli.js',
  './js/sims/venturi.js',
  './js/sims/reynolds.js',
  './js/sims/friction.js',
  './js/sims/fan.js',
  './js/sims/pump.js',
  './data/course.js',
  './data/quizzes.js',
  './data/glossary.js',
  './data/unit1.js',
  './data/unit2.js',
  './data/unit3.js',
  './data/unit4.js',
];

// ملاحظة: بدون skipWaiting — النسخة الجديدة تعمل في الزيارة التالية،
// كي لا تختلط وحدات محمّلة كسولًا من نسختين مختلفتين في جلسة مفتوحة.
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_VERSION).then(c => c.addAll(ASSETS)));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// شبكة أولًا للتنقل (لالتقاط التحديثات)، كاش أولًا للأصول
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return;

  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
          return res;
        })
        .catch(() => caches.match(e.request).then(r => r || caches.match('./index.html')))
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).then(res => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then(c => c.put(e.request, copy));
      }
      return res;
    }))
  );
});
