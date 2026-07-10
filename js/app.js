// الإقلاع + الراوتر + الشريط العلوي
import { getState, on } from './store.js';
import { levelInfo, touchStreak } from './game.js';
import { renderWelcome } from './screens/welcome.js';
import { renderDiag } from './screens/diag.js';
import { renderHome } from './screens/home.js';
import { renderUnit } from './screens/unit.js';
import { renderLesson } from './screens/lesson.js';
import { renderLabs, renderLab } from './screens/labs.js';
import { renderGlossary } from './screens/glossary.js';
import { renderMe } from './screens/me.js';

const app = document.getElementById('app');
const topbar = document.getElementById('topbar');
const nav = document.getElementById('bottomnav');

const routes = [
  { re: /^#?\/?$/, fn: renderHome, nav: 'home' },
  { re: /^#\/welcome$/, fn: renderWelcome, bare: true },
  { re: /^#\/diag$/, fn: renderDiag, bare: true },
  { re: /^#\/unit\/([\w-]+)$/, fn: renderUnit, nav: 'home' },
  { re: /^#\/lesson\/([\w-]+)$/, fn: renderLesson, bare: true },
  { re: /^#\/labs$/, fn: renderLabs, nav: 'labs' },
  { re: /^#\/lab\/([\w-]+)$/, fn: renderLab, bare: true },
  { re: /^#\/glossary$/, fn: renderGlossary, nav: 'glossary' },
  { re: /^#\/me$/, fn: renderMe, nav: 'me' },
];

let cleanup = null;

function route() {
  const hash = location.hash || '#/';
  const s = getState();

  // لا ملف شخصي بعد → شاشة الترحيب دائمًا
  if (!s.profile && hash !== '#/welcome') { location.hash = '#/welcome'; return; }

  for (const r of routes) {
    const m = hash.match(r.re);
    if (!m) continue;
    if (typeof cleanup === 'function') { try { cleanup(); } catch {} }
    cleanup = null;
    app.innerHTML = '';
    app.classList.toggle('fullscreen', !!r.bare);
    topbar.classList.toggle('hidden', !!r.bare);
    nav.classList.toggle('hidden', !!r.bare);
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.dataset.nav === r.nav));
    cleanup = r.fn(app, m[1]) || null;
    app.scrollTop = 0;
    window.scrollTo(0, 0);
    return;
  }
  location.hash = '#/';
}

function updateTopbar() {
  const s = getState();
  const li = levelInfo();
  document.getElementById('tb-xp').textContent = `⚡ ${s.xp}`;
  document.getElementById('tb-streak').textContent = `🔥 ${s.streak.count || 0}`;
  document.getElementById('tb-level').textContent = `${li.cur.icon} ${li.cur.rank}`;
  document.getElementById('tb-levelfill').style.width = li.pct + '%';
}

// ---- الإقلاع ----
window.addEventListener('hashchange', route);
on('xp', updateTopbar);
on('reset', () => { location.hash = '#/welcome'; route(); updateTopbar(); });

if ('serviceWorker' in navigator && location.protocol !== 'file:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

touchStreak();
updateTopbar();
route();

// PWA مفتوح عبر منتصف الليل: حدّث السلسلة عند العودة للتطبيق
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) touchStreak();
});

// إخفاء شاشة البداية
setTimeout(() => {
  const sp = document.getElementById('splash');
  sp.classList.add('out');
  setTimeout(() => sp.remove(), 450);
}, 600);
