// الملف الشخصي: إحصاءات، أوسمة، إعدادات
import { el, modal } from '../ui.js';
import { getState, resetAll, isLessonDone } from '../store.js';
import { BADGES, LEVELS, levelInfo } from '../game.js';
import { COURSE } from '../../data/course.js';

export function renderMe(app) {
  const s = getState();
  const li = levelInfo();
  const totalLessons = COURSE.units.reduce((n, u) => n + u.lessons.length, 0);
  const doneLessons = COURSE.units.reduce((n, u) => n + u.lessons.filter(l => isLessonDone(l.id)).length, 0);
  const missions = Object.keys(s.missions).length;

  app.append(
    el('div', { class: 'card center', style: 'padding:24px' },
      el('div', { style: 'font-size:56px' }, s.profile.avatar),
      el('div', { style: 'font-weight:800; font-size:20px; margin-top:4px' }, s.profile.name),
      el('div', { style: 'color:var(--c-amber); font-weight:700' }, `${li.cur.icon} ${li.cur.rank}`),
      li.next
        ? el('div', { class: 'small muted', style: 'margin-top:6px' }, `${s.xp} XP — يفصلك ${li.next.at - s.xp} XP عن رتبة «${li.next.rank}»`)
        : el('div', { class: 'small muted', style: 'margin-top:6px' }, `${s.xp} XP — بلغت أعلى رتبة! 🏆`),
      el('div', { class: 'pbar', style: 'margin-top:10px' }, el('div', { style: `width:${li.pct}%` })),
    ),

    el('div', { class: 'stat-grid' },
      stat(`${doneLessons}/${totalLessons}`, 'درس مكتمل'),
      stat(s.xp, 'نقطة خبرة'),
      stat(missions, 'مهمة استكشاف'),
      stat(s.streak.count || 0, 'يوم متتالي 🔥'),
    ),

    el('h2', { style: 'font-size:17px; margin:18px 0 10px' }, '🏅 الأوسمة'),
    el('div', { class: 'badge-grid' },
      BADGES.map(b => el('div', { class: `badge ${s.badges.includes(b.id) ? 'won' : ''}` },
        el('div', { class: 'b-ic' }, b.icon),
        el('div', { class: 'b-t' }, b.title),
        el('div', { class: 'b-d' }, b.desc),
      )),
    ),

    el('div', { class: 'card', style: 'margin-top:18px' },
      el('h3', {}, '⚙️ خيارات'),
      !s.diag ? el('a', { class: 'btn amber sm', href: '#/diag', style: 'margin:6px 0; display:inline-flex' }, '🧭 خُض الاختبار التشخيصي') : '',
      el('div', { class: 'small muted', style: 'margin: 8px 0' },
        'كل بياناتك محفوظة على هذا الجهاز فقط. لا يُرسل أي شيء للإنترنت.'),
      el('button', { class: 'btn ghost sm', style: 'border-color:rgba(248,113,113,.4); color:var(--c-bad)', onclick: confirmReset }, '🗑️ تصفير التقدم والبدء من جديد'),
    ),
  );

  function stat(v, l) {
    return el('div', { class: 'stat' }, el('div', { class: 's-v' }, String(v)), el('div', { class: 's-l' }, l));
  }

  function confirmReset() {
    const m = modal(el('div', { class: 'center' },
      el('div', { style: 'font-size:44px' }, '⚠️'),
      el('h3', {}, 'هل أنت متأكد؟'),
      el('p', { class: 'small muted' }, 'سيُحذف كل تقدمك ونقاطك وأوسمتك نهائيًا من هذا الجهاز.'),
      el('div', { style: 'display:flex; gap:10px; margin-top:14px' },
        el('button', { class: 'btn secondary', style: 'flex:1', onclick: () => m.close() }, 'تراجع'),
        el('button', { class: 'btn', style: 'flex:1; background:var(--c-bad); color:#fff', onclick: () => { m.close(); resetAll(); } }, 'نعم، صفّر'),
      ),
    ), { closable: true });
  }
}
