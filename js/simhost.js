// مضيف المحاكاة: يحمّل وحدة المحاكاة ويدير قائمة المهام والمكافآت
import { el, toast, confetti } from './ui.js';
import { getState, save } from './store.js';
import { award, XP, checkBadges } from './game.js';
import { loadSim } from './sims/registry.js';
import { COURSE } from '../data/course.js';

// container: عنصر — simId — missions: [{id, text}] — يرجع {destroy}
export function hostSim(container, simId, missions = []) {
  const s = getState();
  s.simsVisited[simId] = true;
  save();
  checkBadges();

  const simWrap = el('div', { class: 'sim-wrap' });
  const missionEls = {};
  let missionBox = null;

  if (missions.length) {
    missionBox = el('div', { class: 'missions' },
      el('div', { class: 'm-head' }, '🎯 مهام الاستكشاف'),
      missions.map(m => {
        const done = !!s.missions[`${simId}:${m.id}`];
        const node = el('div', { class: `mission ${done ? 'done' : ''}` },
          el('span', { class: 'm-ic' }, done ? '✅' : '⭕'),
          el('span', { class: 'm-txt' }, m.text),
        );
        missionEls[m.id] = node;
        return node;
      }),
    );
  }

  container.append(simWrap, missionBox || '');

  const ctx = {
    missions,
    isMissionDone: (mid) => !!getState().missions[`${simId}:${mid}`],
    completeMission(mid) {
      const st = getState();
      const key = `${simId}:${mid}`;
      if (st.missions[key]) return;
      st.missions[key] = true;
      save();
      const node = missionEls[mid];
      if (node) {
        node.classList.add('done');
        node.querySelector('.m-ic').textContent = '✅';
      }
      award(XP.mission, 'مهمة استكشاف');
      confetti(16);
      checkBadges(COURSE);
    },
  };

  let instance = null;
  let destroyed = false;

  loadSim(simId).then(mod => {
    if (destroyed) return;
    if (!mod?.mount) {
      simWrap.append(el('div', { class: 'card muted center' }, 'تعذر تحميل المحاكاة'));
      return;
    }
    try { instance = mod.mount(simWrap, ctx); }
    catch (e) {
      console.error('sim mount failed:', simId, e);
      simWrap.append(el('div', { class: 'card muted center' }, 'حدث خطأ في تشغيل المحاكاة'));
    }
  }).catch(e => {
    console.error('sim load failed:', simId, e);
    if (!destroyed) simWrap.append(el('div', { class: 'card muted center' }, 'تعذر تحميل المحاكاة'));
  });

  return {
    destroy() {
      destroyed = true;
      try { instance?.destroy?.(); } catch {}
    },
  };
}
