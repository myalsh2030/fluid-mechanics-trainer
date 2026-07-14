// الشاشة الرئيسية: خريطة الرحلة — مسار مراحل متعرج بنمط الألعاب
import { el, toast, icon } from '../ui.js';
import { getState, isLessonDone } from '../store.js';
import { unitStatus, isLessonUnlocked, currentLesson, lessonStars, overallDiagLevel } from '../personalize.js';
import { COURSE } from '../../data/course.js';

const ROW_H = 96;          // ارتفاع صف المرحلة بالبكسل
const X_RIGHT = 72, X_LEFT = 28; // مواضع التعرج (% من العرض)

export function renderHome(app) {
  const s = getState();
  const totalLessons = COURSE.units.reduce((n, u) => n + u.lessons.length, 0);
  const doneLessons = COURSE.units.reduce((n, u) => n + u.lessons.filter(l => isLessonDone(l.id)).length, 0);
  const cur = currentLesson(COURSE);
  const lvl = overallDiagLevel();

  // ---- البطل ----
  const hero = el('div', { class: 'hero' },
    el('p', { class: 'hi' }, `${s.profile.avatar} أهلًا ${s.profile.name}!`),
    el('div', { class: 'pbar', style: 'margin:10px 0 4px' },
      el('div', { style: `width:${totalLessons ? doneLessons / totalLessons * 100 : 0}%` })),
    el('div', { class: 'small muted' }, `${doneLessons} من ${totalLessons} مرحلة منجزة`),
    !s.diag
      ? el('div', { style: 'margin-top:12px' },
          el('p', { class: 'plan-note' }, '🧭 حدّد مستواك العام أولًا — اختبار سريع لا يقفز بك مراحل، بل يوجّه التركيز داخلها:'),
          el('a', { class: 'btn amber sm', href: '#/diag', style: 'margin-top:8px' }, 'ابدأ الاختبار التشخيصي'))
      : el('p', { class: 'plan-note' },
          `${lvl.icon} مستواك العام: ${lvl.label} (${lvl.pct}%) — التركيز مضبوط على نقاط ضعفك داخل المراحل`),
  );
  app.append(hero);

  // ---- الخريطة: قسم لكل وحدة ----
  let globalIdx = 0; // ترقيم المراحل 1..16 وتعرّج متصل عبر الوحدات
  for (const u of COURSE.units) {
    const st = unitStatus(u.id);
    const doneInUnit = u.lessons.filter(l => isLessonDone(l.id)).length;

    // لافتة المنطقة
    app.append(el('div', { class: 'jmap-zone', style: `--zc:${u.color}` },
      el('span', { class: 'jz-ic' }, icon(u.icon)),
      el('span', { class: 'jz-t' }, u.title),
      el('span', { class: 'jz-p' }, `${doneInUnit}/${u.lessons.length}`),
      st === 'priority' ? el('span', { class: 'chip hot' }, '🔥 ركّز هنا') : '',
    ));

    // مقطع المسار
    const n = u.lessons.length;
    const H = n * ROW_H;
    const sec = el('div', { class: 'jmap-sec', style: `height:${H}px` });

    // نقاط المراكز (٪ أفقي، بكسل رأسي)
    const pts = u.lessons.map((l, i) => ({
      x: ((globalIdx + i) % 2 === 0) ? X_RIGHT : X_LEFT,
      y: i * ROW_H + ROW_H / 2,
    }));

    // مسار متعرج خلف العقد — non-scaling-stroke يحفظ سماكة الخط مع التمدد
    let segs = '';
    for (let i = 0; i < n - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const my = (a.y + b.y) / 2;
      const solid = isLessonDone(u.lessons[i].id);
      segs += `<path d="M ${a.x} ${a.y} C ${a.x} ${my}, ${b.x} ${my}, ${b.x} ${b.y}"
        fill="none" stroke="${u.color}" stroke-width="4" vector-effect="non-scaling-stroke"
        stroke-linecap="round" ${solid ? 'opacity="0.85"' : 'opacity="0.28" stroke-dasharray="2 7"'} />`;
    }
    sec.append(el('div', {
      class: 'jmap-svg',
      html: `<svg viewBox="0 0 100 ${H}" preserveAspectRatio="none" aria-hidden="true">${segs}</svg>`,
    }));

    // العقد
    u.lessons.forEach((l, i) => {
      const num = globalIdx + i + 1;
      const done = isLessonDone(l.id);
      const unlocked = isLessonUnlocked(COURSE, l.id);
      const isCur = cur?.lesson.id === l.id && unlocked;
      const stars = lessonStars(l.id);

      const node = el('button', {
        class: `jmap-node ${done ? 'done' : ''} ${isCur ? 'cur' : ''} ${!unlocked ? 'locked' : ''}`,
        style: `--zc:${u.color}; right:calc(${100 - pts[i].x}% - 34px); top:${pts[i].y - (isCur ? 37 : 31)}px`,
        'aria-label': `المرحلة ${num}: ${l.title}${!unlocked ? ' (مقفلة)' : ''}`,
        onclick: () => {
          if (!unlocked) {
            node.classList.remove('shake'); void node.offsetWidth; node.classList.add('shake');
            toast('أكمل المرحلة السابقة أولًا 🔒');
            return;
          }
          location.hash = `#/lesson/${l.id}`;
        },
      },
        isCur ? el('span', { class: 'jn-me' }, s.profile.avatar) : '',
        el('span', { class: 'jn-circle' }, unlocked ? String(num) : '🔒'),
        el('span', { class: 'jn-stars' },
          done ? '★★★'.slice(0, stars) || '✓' : ''),
        el('span', { class: 'jn-title' }, l.title),
      );
      sec.append(node);
    });

    app.append(sec);
    globalIdx += n;
  }

  // زر متابعة سريع للمرحلة الحالية
  if (cur && !isLessonDone(cur.lesson.id)) {
    app.append(el('div', { class: 'center', style: 'margin:8px 0 4px' },
      el('a', { class: 'btn wide', href: `#/lesson/${cur.lesson.id}` },
        `▶️ تابع المرحلة ${flatIndex(cur.lesson.id) + 1}: ${cur.lesson.title}`)));
  }
}

function flatIndex(lessonId) {
  let i = 0;
  for (const u of COURSE.units) for (const l of u.lessons) { if (l.id === lessonId) return i; i++; }
  return 0;
}
