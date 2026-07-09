// الاختبار التشخيصي الشامل → الخطة الشخصية
import { el } from '../ui.js';
import { getState, save } from '../store.js';
import { runQuiz, resultCard } from '../quiz.js';
import { award, grantBadge, XP } from '../game.js';
import { tallyByUnit, recommendedUnit } from '../personalize.js';
import { QUIZZES } from '../../data/quizzes.js';
import { COURSE } from '../../data/course.js';

export function renderDiag(app) {
  const s = getState();
  if (s.diag) { renderPlan(app); return; }

  const intro = el('div', { class: 'ob-wrap' },
    el('div', { class: 'ob-emoji' }, '🧭'),
    el('h1', { class: 'ob-title' }, 'مهمة تحديد الموقع'),
    el('p', { class: 'ob-sub' },
      `أهلًا ${s.profile.name}! قبل الانطلاق، أجب عن ${QUIZZES.diag.questions.length} سؤالًا سريعًا.`,
      el('br'),
      'ليست درجة ولا امتحانًا — إنها بوصلة ترسم خطتك الشخصية وتحدد أهم المواضيع لك.'),
    el('button', { class: 'btn wide', onclick: startQuiz }, 'جاهز، لنبدأ 🎯'),
    el('button', {
      class: 'btn ghost wide', style: 'margin-top:10px',
      onclick: skip,
    }, 'تخطَّ الآن (يمكنك لاحقًا من ملفي)'),
  );
  app.append(intro);

  function skip() {
    location.hash = '#/';
  }

  function startQuiz() {
    app.innerHTML = '';
    const head = el('div', { class: 'lp-head' },
      el('button', { class: 'lp-close', onclick: () => { location.hash = '#/'; } }, '✕'),
      el('div', { style: 'flex:1; font-weight:800; font-size:15px' }, '🧭 الاختبار التشخيصي'),
    );
    const stage = el('div');
    app.append(head, stage);

    runQuiz(stage, QUIZZES.diag, {
      xpPerCorrect: 0, // لا XP على أسئلة التشخيص كي لا يتأثر بالتخمين
      onDone(result) {
        const st = getState();
        st.diag = {
          answers: result.answers,
          unitScores: tallyByUnit(result.answers),
          done: Date.now(),
        };
        save();
        award(XP.diagDone, 'إتمام التشخيصي');
        grantBadge('diag');
        renderPlan(app);
      },
    });
  }
}

// خطة شخصية بعد التشخيصي
export function renderPlan(app) {
  app.innerHTML = '';
  const s = getState();
  const rec = recommendedUnit(COURSE);

  const rows = COURSE.units.map(u => {
    const us = s.diag.unitScores[u.id] || { ok: 0, total: 0 };
    const pct = us.total ? Math.round(us.ok / us.total * 100) : 0;
    const level = pct >= 80 ? ['✅ نقطة قوة', 'var(--c-ok)'] : pct >= 50 ? ['📌 جيد — يحتاج صقلًا', 'var(--c-water)'] : ['🔥 أولوية قصوى لك', '#fb923c'];
    return el('div', { class: 'plan-unit' },
      el('div', { class: 'pu-ic' }, u.icon),
      el('div', { class: 'pu-b' },
        el('div', { class: 'pu-t' }, u.title),
        el('div', { class: 'small', style: `color:${level[1]}; font-weight:700` }, level[0]),
        el('div', { class: 'pbar' }, el('div', { style: `width:${pct}%` })),
      ),
      el('div', { style: 'font-weight:800; font-size:14px; flex:none' }, `${us.ok}/${us.total}`),
    );
  });

  app.append(
    el('div', { style: 'padding-top:16px' },
      el('div', { class: 'center', style: 'font-size:52px' }, '🗺️'),
      el('h1', { class: 'page-title center' }, 'خطتك الشخصية جاهزة!'),
      el('p', { class: 'page-sub center' }, 'حددنا لك أين تركّز طاقتك. المواضيع المعلّمة بالنار 🔥 هي الأهم لك.'),
      el('div', { class: 'card' }, rows),
      el('div', { class: 'card', style: 'border-color: rgba(251,191,36,.4)' },
        el('div', { style: 'font-weight:800; color:var(--c-amber)' }, '⭐ نقطة الانطلاق المقترحة'),
        el('div', {}, `${rec.icon} ${rec.title}`),
      ),
      el('button', { class: 'btn wide', onclick: () => { location.hash = '#/'; } }, 'إلى خريطة الرحلة 🚀'),
    )
  );
}
