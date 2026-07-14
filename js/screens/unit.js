// شاشة الوحدة: الاختبار القبلي + الدروس مرتبة حسب الخطة
import { el, icon, toast } from '../ui.js';
import { getState, save, isLessonDone } from '../store.js';
import { runQuiz, resultCard } from '../quiz.js';
import { award, XP } from '../game.js';
import { tallyConcepts, isLessonUnlocked, lessonStars, lessonPriority, lessonPriorityChip, unitStatus, unitStatusChip } from '../personalize.js';
import { COURSE } from '../../data/course.js';
import { QUIZZES } from '../../data/quizzes.js';

export function renderUnit(app, unitId) {
  const u = COURSE.units.find(x => x.id === unitId);
  if (!u) { location.hash = '#/'; return; }
  const s = getState();
  const preQuiz = QUIZZES[`${unitId}pre`];
  const preDone = !!s.pre[unitId];

  app.append(
    el('div', { class: 'lp-head' },
      el('button', { class: 'lp-close', onclick: () => { location.hash = '#/'; } }, '→'),
      el('div', { style: 'flex:1' },
        el('div', { style: 'font-weight:800; font-size:17px' }, icon(u.icon, 'sm'), ' ' + u.title),
        el('div', { class: 'small muted' }, u.tagline || ''),
      ),
    )
  );

  const body = el('div');
  app.append(body);

  function renderBody() {
    body.innerHTML = '';
    const st = getState();

    // بطاقة القبلي
    if (preQuiz && !st.pre[unitId]) {
      body.append(el('div', { class: 'card', style: 'border-color: rgba(251,191,36,.45)' },
        el('h3', {}, '🎯 اختبار قبلي سريع'),
        el('p', { class: 'small muted', style: 'margin:4px 0 12px' },
          `${preQuiz.questions.length} أسئلة تكشف ما تعرفه مسبقًا، فنرتب لك دروس الوحدة ونوفر وقتك.`),
        el('button', { class: 'btn amber', onclick: startPre }, 'ابدأ (دقيقتان)'),
        el('button', { class: 'btn ghost sm', style: 'margin-inline-start:8px', onclick: () => {
          st.pre[unitId] = { skipped: true, conceptOk: null, done: Date.now() };
          save(); renderBody();
        } }, 'تخطَّ'),
      ));
    }

    // الدروس
    u.lessons.forEach(l => {
      const done = isLessonDone(l.id);
      const unlocked = isLessonUnlocked(COURSE, l.id);
      const p = lessonPriority(unitId, l);
      const pchip = lessonPriorityChip(p);
      const titleLine = el('div', { class: 'ln-title' }, l.title,
        done ? el('span', { class: 'chip ok' }, '★'.repeat(lessonStars(l.id)) || '✓') : '');
      const nodeChildren = [
        el('div', { class: 'ln-status' }, unlocked ? (done ? icon('circle-check') : icon('book')) : '🔒'),
        el('div', { class: 'ln-body' },
          titleLine,
          el('div', { class: 'ln-meta' },
            `⏱️ ${l.minutes} د`,
            pchip ? el('span', { class: `chip ${pchip.cls}` }, pchip.txt) : '',
          ),
        ),
      ];
      if (unlocked) {
        body.append(el('a', { class: `lesson-node ${done ? 'done' : ''}`, href: `#/lesson/${l.id}` }, nodeChildren));
      } else {
        body.append(el('div', {
          class: 'lesson-node', style: 'opacity:.55',
          onclick: () => toast('أكمل المرحلة السابقة أولًا 🔒'),
        }, nodeChildren));
      }
    });
  }

  function startPre() {
    body.innerHTML = '';
    const stage = el('div');
    body.append(stage);
    runQuiz(stage, preQuiz, {
      xpPerCorrect: 0,
      onDone(result) {
        const st = getState();
        st.pre[unitId] = {
          conceptOk: tallyConcepts(result.answers),
          score: result.score, total: result.total,
          done: Date.now(),
        };
        save();
        award(XP.preDone, 'الاختبار القبلي');
        stage.innerHTML = '';
        stage.append(resultCard(result, {
          msg: result.pct >= 80
            ? 'رائع! ستجد بعض الدروس معلّمة بـ«تبدو متمكنًا» — يمكنك المرور عليها سريعًا.'
            : 'تم ضبط ترتيب الدروس حسب حاجتك. ركّز على المعلّم بالنار 🔥',
          actions: [el('button', { class: 'btn wide', onclick: renderBody }, 'عرض خطة الوحدة ✨')],
        }));
      },
    });
  }

  renderBody();
}
