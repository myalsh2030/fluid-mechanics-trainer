// مسرد المصطلحات الثنائي
import { el } from '../ui.js';
import { getState, save } from '../store.js';
import { grantBadge } from '../game.js';
import { GLOSSARY } from '../../data/glossary.js';

export function renderGlossary(app) {
  const s = getState();
  if (!s.glossaryVisited) { s.glossaryVisited = true; save(); grantBadge('glossary'); }

  const search = el('input', { class: 'glo-search', type: 'search', placeholder: '🔍 ابحث عن مصطلح عربي أو إنجليزي…' });
  const list = el('div');

  function draw(q = '') {
    list.innerHTML = '';
    const norm = q.trim().toLowerCase();
    const items = GLOSSARY.filter(g =>
      !norm || g.ar.includes(norm) || g.en.toLowerCase().includes(norm) || (g.def || '').includes(norm)
    );
    if (!items.length) {
      list.append(el('div', { class: 'card center muted' }, 'لا نتائج — جرّب كلمة أخرى'));
      return;
    }
    for (const g of items) {
      list.append(el('div', { class: 'glo-item' },
        el('div', { class: 'g-ar' }, g.ar),
        el('div', { class: 'g-en' }, g.en),
        el('div', { class: 'g-def' }, g.def || ''),
      ));
    }
  }

  search.addEventListener('input', () => draw(search.value));

  app.append(
    el('h1', { class: 'page-title' }, '📖 مسرد المصطلحات'),
    el('p', { class: 'page-sub' }, 'المصطلحات التي ستقابلها في كتالوجات المعدات ولوحات المضخات'),
    search,
    list,
  );
  draw();
}
