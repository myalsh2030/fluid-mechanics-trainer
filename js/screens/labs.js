// مختبر المحاكاة: كل المحاكيات متاحة بحرية
import { el, icon } from '../ui.js';
import { SIMS } from '../sims/registry.js';
import { hostSim } from '../simhost.js';
import { getState } from '../store.js';

export function renderLabs(app) {
  app.append(
    el('h1', { class: 'page-title' }, icon('flask-conical', 'lg'), ' مختبر المحاكاة'),
    el('p', { class: 'page-sub' }, 'جرّب، اعبث بالمنزلقات، وأنجز مهام الاستكشاف لتكسب XP'),
  );
  const s = getState();
  for (const sim of SIMS) {
    const doneCount = (sim.missions || []).filter(m => s.missions[`${sim.id}:${m.id}`]).length;
    const total = (sim.missions || []).length;
    app.append(el('a', { class: 'lab-card', href: `#/lab/${sim.id}` },
      el('div', { class: 'lc-ic' }, icon(sim.icon, 'lg')),
      el('div', { style: 'flex:1; min-width:0' },
        el('div', { class: 'lc-t' }, sim.title),
        el('div', { class: 'lc-d' }, sim.desc),
      ),
      total ? el('span', { class: `chip ${doneCount === total ? 'ok' : ''}` }, `🎯 ${doneCount}/${total}`) : '',
    ));
  }
}

export function renderLab(app, simId) {
  const sim = SIMS.find(x => x.id === simId);
  if (!sim) { location.hash = '#/labs'; return; }

  app.append(
    el('div', { class: 'lp-head' },
      el('button', { class: 'lp-close', onclick: () => { location.hash = '#/labs'; } }, '→'),
      el('div', { style: 'flex:1' },
        el('div', { style: 'font-weight:800; font-size:16px' }, icon(sim.icon, 'sm'), ' ' + sim.title),
        el('div', { class: 'small muted' }, sim.desc),
      ),
    ),
  );
  const body = el('div');
  app.append(body);
  const host = hostSim(body, sim.id, sim.missions || []);
  return () => host.destroy();
}
