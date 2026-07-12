// مشغّل الدرس: بطاقات متتابعة + أنشطة تفاعلية + نقطة تفتيش
import { el, toast, confetti, shuffled } from '../ui.js';
import { getState, save, lessonState } from '../store.js';
import { award, grantBadge, XP, checkBadges } from '../game.js';
import { runQuiz, resultCard } from '../quiz.js';
import { hostSim } from '../simhost.js';
import { COURSE } from '../../data/course.js';
import { QUIZZES } from '../../data/quizzes.js';

export function renderLesson(app, lessonId) {
  let unit = null, lesson = null, lessonIdx = -1;
  for (const u of COURSE.units) {
    const i = u.lessons.findIndex(l => l.id === lessonId);
    if (i >= 0) { unit = u; lesson = u.lessons[i]; lessonIdx = i; break; }
  }
  if (!lesson) { location.hash = '#/'; return; }

  const ls = lessonState(lessonId);
  const blocks = lesson.blocks || [];
  if (!blocks.length) {
    app.append(el('div', { class: 'card center' },
      el('div', { style: 'font-size:40px' }, '🚧'),
      el('p', { class: 'muted' }, 'محتوى هذا الدرس غير متوفر حاليًا.'),
      el('a', { class: 'btn secondary', href: `#/unit/${unit.id}` }, 'العودة للوحدة'),
    ));
    return;
  }
  let cursor = Math.min(ls.stepsDone || 0, Math.max(blocks.length - 1, 0));
  const hosts = []; // محاكيات نشطة للتنظيف

  // مكافأة نشاط تُمنح مرة واحدة فقط مهما أُعيد فتح الدرس (تُحفظ فورًا)
  function awardActivity(i, label) {
    ls.acts ||= {};
    if (ls.acts[i]) return;
    ls.acts[i] = true;
    save();
    award(XP.activity, label);
  }
  const activityDone = (i) => !!ls.acts?.[i];

  const bar = el('div', { class: 'pbar', style: 'flex:1' }, el('div'));
  const count = el('div', { class: 'lp-count' });
  app.append(
    el('div', { class: 'lp-head' },
      el('button', { class: 'lp-close', onclick: exit }, '✕'),
      bar, count,
    ),
    el('div', { style: 'margin:0 2px 12px' },
      el('div', { style: 'font-weight:800; font-size:17px' }, lesson.title),
      el('div', { class: 'small muted' }, `${unit.icon} ${unit.title}`),
    ),
  );

  const stream = el('div');
  const footer = el('div', { style: 'margin-top:6px' });
  app.append(stream, footer);

  function exit() { location.hash = `#/unit/${unit.id}`; }

  function updateBar() {
    const pct = blocks.length ? Math.min(cursor / blocks.length, 1) * 100 : 0;
    bar.firstChild.style.width = pct + '%';
    count.textContent = `${Math.min(cursor + 1, blocks.length)}/${blocks.length}`;
  }

  // عرض كل البطاقات حتى المؤشر (استئناف)، ثم التقدم واحدة واحدة
  for (let i = 0; i <= cursor && i < blocks.length; i++) renderBlock(i, i < cursor);
  updateBar();

  function advance(fromIdx) {
    if (fromIdx !== cursor) return; // تجاهل متأخر
    cursor++;
    ls.stepsDone = Math.max(ls.stepsDone || 0, cursor);
    save();
    updateBar();
    if (cursor < blocks.length) {
      renderBlock(cursor, false);
      // مرر لأعلى البطاقة الجديدة
      setTimeout(() => stream.lastElementChild?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60);
    }
  }

  function continueBtn(idx, label = 'متابعة ⬇️') {
    const b = el('div', { class: 'q-foot', style: 'margin:2px 0 14px' },
      el('button', { class: 'btn sm', onclick: (e) => { e.currentTarget.closest('.q-foot').remove(); advance(idx); } }, label));
    return b;
  }

  function renderBlock(idx, alreadyDone) {
    const b = blocks[idx];
    alreadyDone = alreadyDone || activityDone(idx);
    const isLast = idx === blocks.length - 1;
    let node = null, gate = false; // gate: النشاط يفتح المتابعة بنفسه

    switch (b.t) {
      case 'concept':
        node = el('div', { class: 'card block blk-concept' },
          b.icon ? el('div', { class: 'bc-ic' }, b.icon) : '',
          el('h2', {}, b.title || ''),
          el('div', { class: 'bc-html', html: b.html || '' }),
        );
        break;

      case 'figure':
        node = el('div', { class: 'card block blk-figure' },
          el('div', { html: b.svg || '' }),
          b.caption ? el('div', { class: 'fig-cap' }, b.caption) : '',
        );
        break;

      case 'formula':
        node = el('div', { class: 'card block blk-formula' },
          el('div', { class: 'f-name' }, `📐 ${b.name}`),
          el('div', { class: 'f-expr', html: b.expr }),
          el('div', { class: 'f-terms' },
            (b.terms || []).map(t => el('div', {},
              el('b', { html: t.sym }), el('span', {}, t.ar), t.unit ? el('span', { class: 'u', html: t.unit }) : '')),
          ),
          b.note ? el('div', { class: 'small muted', style: 'margin-top:8px' }, `💡 ${b.note}`) : '',
        );
        break;

      case 'example':
        node = el('div', { class: 'card block blk-example' },
          el('div', { class: 'ex-badge' }, '🧮 مثال من الميدان'),
          el('h3', {}, b.title || ''),
          el('div', { class: 'small' }, el('b', {}, 'المعطيات: '), (b.given || []).join(' · ')),
          el('ol', {}, (b.steps || []).map(s => el('li', { html: s }))),
          el('div', { class: 'ex-ans', html: `✅ ${b.answer}` }),
        );
        break;

      case 'tip':
        node = el('div', { class: 'card block blk-tip' },
          el('div', { class: 'tip-ic' }, '🔧'),
          el('div', {},
            el('div', { class: 'tip-t' }, 'من واقع الصيانة'),
            el('div', { html: b.html }),
          ),
        );
        break;

      case 'flip': {
        gate = !alreadyDone;
        const flipped = new Set();
        const cards = (b.cards || []).map((c, ci) => {
          const fc = el('div', { class: 'flipcard', tabindex: '0', role: 'button',
            onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fc.click(); } } },
            el('div', { class: 'fc-in' },
              el('div', { class: 'fc-face fc-front', html: c.front }),
              el('div', { class: 'fc-face fc-back', html: c.back }),
            ));
          fc.addEventListener('click', () => {
            fc.classList.toggle('flipped');
            if (!flipped.has(ci)) {
              flipped.add(ci);
              if (gate && flipped.size === (b.cards || []).length) unlock();
            }
          });
          return fc;
        });
        node = el('div', { class: 'card block' },
          el('h3', {}, `🃏 ${b.title || 'اقلب البطاقات لتكتشف'}`),
          el('div', { class: 'small muted' }, 'اضغط كل بطاقة لقلبها'),
          el('div', { class: 'flip-grid' }, cards),
        );
        var unlock = () => {
          awardActivity(idx, 'نشاط تفاعلي');
          node.append(continueBtn(idx, isLast ? 'إنهاء' : 'متابعة ⬇️'));
        };
        break;
      }

      case 'match': {
        gate = !alreadyDone;
        node = renderMatch(b, idx, alreadyDone);
        break;
      }

      case 'order': {
        gate = !alreadyDone;
        node = renderOrder(b, idx, alreadyDone);
        break;
      }

      case 'sim': {
        node = el('div', { class: 'card block' },
          el('h3', {}, `🔬 ${b.title || 'محاكاة تدريبية'}`),
          b.desc ? el('div', { class: 'small muted', style: 'margin-bottom:6px' }, b.desc) : '',
        );
        const host = hostSim(node, b.sim, b.missions || []);
        hosts.push(host);
        break;
      }

      case 'quiz': {
        const quiz = QUIZZES[b.ref];
        node = el('div', { class: 'block' });
        if (!quiz) { advance(idx); break; }
        node.append(el('div', { class: 'card', style: 'border-color:rgba(56,189,248,.4)' },
          el('h3', {}, '🏁 نقطة التفتيش'),
          el('div', { class: 'small muted' }, `${quiz.questions.length} أسئلة تثبت ما تعلمته وتمنحك XP`),
        ));
        const stage = el('div');
        node.append(stage);
        // XP للأسئلة في أول محاولة فقط (منع تكرار الكسب بإعادة الدخول)
        const allowQuizXp = !ls.done && !ls.quizTried;
        ls.quizTried = true;
        save();
        runQuiz(stage, quiz, {
          xpPerCorrect: allowQuizXp ? undefined : 0,
          onDone(result) {
            finishLesson(result, stage);
          },
        });
        gate = true; // الكويز يدير نفسه
        break;
      }

      default:
        node = el('div', { class: 'card block muted' }, '');
    }

    if (node) stream.append(node);

    // بطاقات غير تفاعلية أو سبق إتمامها: زر متابعة مباشرة
    if (!gate && b.t !== 'quiz') {
      if (idx === cursor) stream.append(continueBtn(idx, isLast ? 'إنهاء' : 'متابعة ⬇️'));
    }
  }

  // ---- توصيل / ترتيب ----
  function renderMatch(b, idx, alreadyDone) {
    const pairs = b.pairs || [];
    // خلط العمود الثاني؛ نمنع بقاء الترتيب كما هو (كل عنصر مقابل نظيره) عندما يوجد أكثر من زوج
    const rightSrc = pairs.map((p, i) => ({ txt: p.b, i }));
    let right = shuffled(rightSrc);
    while (pairs.length > 1 && right.every((r, k) => r.i === k)) right = shuffled(rightSrc);
    let selA = null, matched = 0;

    const aEls = pairs.map((p, i) => el('button', { class: 'match-item', html: p.a, onclick: (e) => {
      aEls.forEach(x => x.classList.remove('sel'));
      selA = i;
      e.currentTarget.classList.add('sel');
    }}));
    const bEls = right.map((r) => el('button', { class: 'match-item', html: r.txt, onclick: (e) => {
      const target = e.currentTarget; // currentTarget تصبح null بعد انتهاء الحدث
      if (selA === null) { toast('اختر من العمود الأيمن أولًا'); return; }
      if (r.i === selA) {
        target.classList.add('ok');
        aEls[selA].classList.remove('sel');
        aEls[selA].classList.add('ok');
        selA = null;
        matched++;
        if (matched === pairs.length) {
          awardActivity(idx, 'نشاط توصيل');
          confetti(14);
          node.append(continueBtn(idx));
        }
      } else {
        target.classList.add('err');
        setTimeout(() => target.classList.remove('err'), 400);
      }
    }}));

    const node = el('div', { class: 'card block' },
      el('h3', {}, `🔗 ${b.title || 'وصّل كل عنصر بما يناسبه'}`),
      el('div', { class: 'match-cols' },
        el('div', { class: 'match-col' }, aEls),
        el('div', { class: 'match-col' }, bEls),
      ),
    );
    return node;
  }

  function renderOrder(b, idx, alreadyDone) {
    const items = b.items || [];
    // خلط ترتيب العرض؛ نمنع بدء النشاط بترتيب صحيح جاهز عندما يوجد أكثر من عنصر
    const deckSrc = items.map((txt, i) => ({ txt, i }));
    let deck = shuffled(deckSrc);
    while (items.length > 1 && deck.every((it, k) => it.i === k)) deck = shuffled(deckSrc);
    let expect = 0;

    const els = deck.map(it => {
      const n = el('div', { class: 'order-item', tabindex: '0', role: 'button',
        onkeydown: (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); n.click(); } } },
        el('div', { class: 'oi-n' }, '؟'),
        el('div', { html: it.txt }),
      );
      n.addEventListener('click', () => {
        if (n.classList.contains('ok')) return;
        if (it.i === expect) {
          n.classList.add('ok', 'picked');
          n.querySelector('.oi-n').textContent = expect + 1;
          expect++;
          if (expect === items.length) {
            awardActivity(idx, 'ترتيب صحيح');
            confetti(14);
            node.append(continueBtn(idx));
          }
        } else {
          n.classList.add('err');
          setTimeout(() => n.classList.remove('err'), 400);
        }
      });
      return n;
    });

    const node = el('div', { class: 'card block' },
      el('h3', {}, `🔢 ${b.title || 'اضغط العناصر بالترتيب الصحيح'}`),
      el('div', { class: 'order-list' }, els),
    );
    return node;
  }

  // ---- إنهاء الدرس ----
  function finishLesson(result, stage) {
    const st = getState();
    const l = lessonState(lessonId);
    const firstTime = !l.done;
    l.quiz = { score: result.score, total: result.total, perfect: result.score === result.total };
    l.done = true;
    l.stepsDone = blocks.length;
    save();

    if (firstTime) {
      award(XP.lessonDone, 'إتمام الدرس');
      grantBadge('first');
      const unitDone = unit.lessons.every(x => lessonState(x.id).done);
      if (unitDone) award(XP.unitDone, `إتمام ${unit.title}`);
      checkBadges(COURSE);
    }
    if (result.score === result.total && result.total > 0) grantBadge('perfect');
    confetti();

    const next = unit.lessons[lessonIdx + 1];
    const actions = [];
    if (next) actions.push(el('a', { class: 'btn wide', href: `#/lesson/${next.id}` }, `الدرس التالي: ${next.title} ←`));
    actions.push(el('a', { class: 'btn secondary wide', href: `#/unit/${unit.id}` }, 'العودة للوحدة'));

    stage.innerHTML = '';
    stage.append(resultCard(result, {
      msg: result.pct >= 80 ? 'إتقان ممتاز! 🌟' : result.pct >= 50 ? 'جيد جدًا — راجع البطاقات وقتما شئت.' : 'لا بأس! أعد المرور على البطاقات وستتقنها.',
      actions,
    }));
    stage.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  updateBar();
  return () => hosts.forEach(h => { try { h.destroy(); } catch {} });
}
