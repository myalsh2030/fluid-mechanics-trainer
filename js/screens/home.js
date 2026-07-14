// الشاشة الرئيسية: خريطة الرحلة
import { el, icon } from '../ui.js';
import { getState } from '../store.js';
import { unitProgress, isLessonDone } from '../store.js';
import { unitStatus, unitStatusChip, recommendedUnit, lessonPriority, lessonPriorityChip } from '../personalize.js';
import { COURSE } from '../../data/course.js';

export function renderHome(app) {
  const s = getState();
  const rec = recommendedUnit(COURSE);

  // البطل: تحية + خطة
  const totalLessons = COURSE.units.reduce((n, u) => n + u.lessons.length, 0);
  const doneLessons = COURSE.units.reduce((n, u) => n + u.lessons.filter(l => isLessonDone(l.id)).length, 0);

  const hero = el('div', { class: 'hero' },
    el('p', { class: 'hi' }, `${s.profile.avatar} أهلًا ${s.profile.name}!`),
    el('div', { class: 'pbar', style: 'margin:10px 0 4px' }, el('div', { style: `width:${totalLessons ? doneLessons / totalLessons * 100 : 0}%` })),
    el('div', { class: 'small muted' }, `${doneLessons} من ${totalLessons} درسًا مكتمل`),
    !s.diag
      ? el('div', { style: 'margin-top:12px' },
          el('p', { class: 'plan-note' }, '🧭 لم تحدد موقعك بعد — اختبار سريع يرسم خطتك الشخصية:'),
          el('a', { class: 'btn amber sm', href: '#/diag', style: 'margin-top:8px' }, 'ابدأ الاختبار التشخيصي'))
      : el('p', { class: 'plan-note' }, '⭐ خطتك تقترح البدء بـ: ', icon(rec.icon, 'sm'), ' ' + rec.title),
  );
  app.append(hero);

  // الوحدات
  let firstUndone = null;
  for (const u of COURSE.units) {
    const prog = unitProgress(u);
    const status = unitStatus(u.id);
    const chip = unitStatusChip(status);

    const head = el('div', { class: 'unit-head' },
      el('div', { class: 'u-ic' }, icon(u.icon, 'lg')),
      el('div', { class: 'u-t' },
        el('div', { class: 'u-title' }, u.title),
        el('div', { class: 'u-sub' }, `${prog.done}/${prog.total} دروس`, chip ? ' · ' : '', chip ? el('span', { class: `chip ${chip.cls}` }, chip.txt) : ''),
      ),
      el('a', { class: 'btn ghost sm', href: `#/unit/${u.id}` }, 'فتح'),
    );

    const sec = el('div', { class: 'unit-sec' }, head);

    for (const l of u.lessons) {
      const done = isLessonDone(l.id);
      const p = lessonPriority(u.id, l);
      const pchip = lessonPriorityChip(p);
      const isNext = !done && !firstUndone;
      if (isNext) firstUndone = l;

      sec.append(el('a', {
        class: `lesson-node ${done ? 'done' : ''} ${isNext ? 'recommended' : ''}`,
        href: `#/lesson/${l.id}`,
      },
        el('div', { class: 'ln-status' }, done ? icon('circle-check') : (isNext ? icon('play') : icon('book'))),
        el('div', { class: 'ln-body' },
          el('div', { class: 'ln-title' }, l.title),
          el('div', { class: 'ln-meta' },
            `⏱️ ${l.minutes} د`,
            pchip ? el('span', { class: `chip ${pchip.cls}` }, pchip.txt) : '',
            isNext ? el('span', { class: 'chip water' }, '⭐ التالي المقترح') : '',
          ),
        ),
        el('div', { class: 'ln-xp' }, done ? '⚡' : `+${lessonXp(l)}`),
      ));
    }
    app.append(sec);
  }
}

function lessonXp(l) {
  // تقدير XP الدرس للعرض: أنشطة + أسئلة + إتمام
  let xp = 20;
  for (const b of l.blocks || []) {
    if (['flip', 'match', 'order'].includes(b.t)) xp += 10;
    if (b.t === 'sim') xp += (b.missions?.length || 0) * 15;
  }
  return xp;
}
