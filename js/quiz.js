// محرك الاختبارات: يعرض سؤالًا سؤالًا مع تغذية راجعة فورية
import { el } from './ui.js';
import { award, XP } from './game.js';

// container: عنصر DOM — quiz: {title, questions} — opts: {xpPerCorrect, onDone(result)}
export function runQuiz(container, quiz, opts = {}) {
  const questions = quiz.questions || [];
  const answers = [];
  let idx = 0;
  container.innerHTML = '';

  if (!questions.length) {
    opts.onDone?.({ score: 0, total: 0, answers: [], pct: 100 }, container);
    return { getAnswers: () => answers };
  }

  const bar = el('div', { class: 'pbar', style: 'margin-bottom:14px' }, el('div'));
  const stage = el('div');
  container.append(bar, stage);

  function renderQ() {
    bar.firstChild.style.width = (idx / questions.length * 100) + '%';
    const q = questions[idx];
    stage.innerHTML = '';

    // خلط خيارات الاختيار من متعدد (صح/خطأ تبقى بترتيبها الطبيعي)
    let opts_, correctIdx;
    if (q.t === 'tf') {
      opts_ = ['صحيح ✅', 'خطأ ❌'];
      correctIdx = q.correct ? 0 : 1;
    } else {
      const order = q.opts.map((_, i) => i).sort(() => Math.random() - 0.5);
      opts_ = order.map(i => q.opts[i]);
      correctIdx = order.indexOf(q.correct);
    }

    const optBtns = opts_.map((o, i) =>
      el('button', { class: 'q-opt', html: o, onclick: () => pick(i) })
    );

    const card = el('div', { class: 'card q-card' },
      el('div', { class: 'q-num' }, `السؤال ${idx + 1} من ${questions.length}`),
      el('div', { class: 'q-text', html: q.q }),
      el('div', { class: 'q-opts' }, optBtns),
      el('div', { class: 'q-foot' }),
    );
    stage.append(card);

    function pick(i) {
      const ok = i === correctIdx;
      optBtns.forEach((b, j) => {
        b.disabled = true;
        if (j === correctIdx) b.classList.add('correct');
        else if (j === i) b.classList.add('wrong');
      });
      answers.push({ ok, unit: q.unit, concept: q.concept });
      if (ok && opts.xpPerCorrect !== 0) award(opts.xpPerCorrect ?? XP.correct, 'إجابة صحيحة');

      const why = el('div', { class: `q-why ${ok ? 'good' : ''}` },
        el('div', { class: 'qw-head' }, ok ? '✅ أحسنت!' : '💡 تعلّم من هذه'),
        el('div', { html: q.why || '' }),
      );
      card.insertBefore(why, card.querySelector('.q-foot'));

      const isLast = idx === questions.length - 1;
      card.querySelector('.q-foot').append(
        el('button', { class: 'btn sm', onclick: next }, isLast ? 'عرض النتيجة 🏁' : 'التالي ←')
      );
      why.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function next() {
    idx++;
    if (idx < questions.length) renderQ();
    else finish();
  }

  function finish() {
    bar.firstChild.style.width = '100%';
    const score = answers.filter(a => a.ok).length;
    const result = { score, total: questions.length, answers, pct: Math.round(score / questions.length * 100) };
    opts.onDone?.(result, stage);
  }

  renderQ();
  return { getAnswers: () => answers };
}

// شاشة نتيجة جاهزة
export function resultCard({ pct, score, total }, { msg, actions = [] } = {}) {
  const emoji = pct >= 80 ? '🏆' : pct >= 50 ? '💪' : '🌱';
  const defMsg = pct >= 80 ? 'ممتاز! أنت متمكن من هذا الجزء.'
    : pct >= 50 ? 'جيد! تحتاج مراجعة بعض النقاط.'
    : 'بداية الرحلة! سنركّز على هذه المواضيع معًا.';
  return el('div', { class: 'card q-result' },
    el('div', { class: 'qr-emoji' }, emoji),
    el('div', { class: 'qr-score' }, `${score} / ${total}`),
    el('div', { class: 'qr-msg' }, msg || defMsg),
    el('div', { style: 'display:flex; flex-direction:column; gap:10px' }, actions),
  );
}
