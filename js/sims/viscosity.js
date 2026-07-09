// سباق اللزوجة: ثلاث كرات فولاذية تسقط في ماء وزيت وعسل — من يصل أولًا؟
// الفيزياء: السرعة الحدية للكرة (قانون ستوكس) تتناسب مع 1/μ، والزمن المعروض
// مضغوط بمقياس لوغاريتمي (أسّي) حتى يبقى السباق مشوقًا وقابلًا للمشاهدة:
// ماء ≈ 1.2ث، زيت ≈ 3.8ث، عسل ≈ 8ث عند 20°C — والترتيب يطابق الواقع تمامًا.
import { SimKit, label } from './simkit.js';
import { el } from '../ui.js';

const LIQUIDS = [
  { id: 'water', name: 'ماء', en: 'Water', mu20: 0.001, c1: 'rgba(56,189,248,.30)', c2: 'rgba(14,116,178,.60)', chip: '#38bdf8' },
  { id: 'oil', name: 'زيت زيتون', en: 'Olive Oil', mu20: 0.084, c1: 'rgba(202,186,60,.35)', c2: 'rgba(133,114,20,.65)', chip: '#fbbf24' },
  { id: 'honey', name: 'عسل', en: 'Honey', mu20: 1.5, c1: 'rgba(217,119,6,.55)', c2: 'rgba(120,53,15,.85)', chip: '#fb923c' },
];
const MEDALS = ['🥇', '🥈', '🥉'];
const T_REF = 7.23, T_EXP = 0.26, T_MIN = 0.7; // معايرة زمن العرض

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.75 });
  const ro = kit.readout();

  let state = 'idle'; // idle | race | done
  let prediction = null;
  let raceT = 0;
  let finishOrder = [];
  let reraceTimer = 0;
  const balls = LIQUIDS.map(() => ({ p: 0, t: 0, v: 0, done: false, tFin: 0, rank: -1 }));

  // ===== الحسابات =====
  // اللزوجة تنخفض للنصف تقريبًا كل +30°C تسخين
  const muAt = i => LIQUIDS[i].mu20 * Math.pow(0.5, (tempS.value - 20) / 30);
  const fallTime = mu => Math.max(T_MIN, T_REF * Math.pow(mu, T_EXP));
  const fmtMu = m => m >= 100 ? Math.round(m) : m >= 10 ? m.toFixed(0) : m >= 1 ? m.toFixed(1) : m.toFixed(2);

  function updateChips() {
    ro.set(LIQUIDS.map((L, i) => ({
      label: 'μ ' + L.name,
      value: fmtMu(muAt(i) * 1000) + ' mPa·s',
      color: L.chip,
    })));
  }

  // ===== التحكمات =====
  const tempS = kit.slider({
    label: 'الحرارة',
    min: 20, max: 80, step: 5, value: 20, unit: '°C',
    oninput: () => {
      updateChips();
      clearTimeout(reraceTimer);
      if (state !== 'idle') reraceTimer = setTimeout(startRace, 500); // إعادة السباق بعد التسخين
    },
  });

  const predBtns = [];
  const predRow = el('div', { class: 'sim-row', style: 'flex-wrap:wrap' }, el('label', {}, 'من يصل أولًا؟'));
  LIQUIDS.forEach(L => {
    const b = el('button', { class: 'btn sm ghost', onclick: () => setPred(L.id, b) }, L.name);
    predBtns.push(b);
    predRow.append(b);
  });
  kit.controls.append(predRow);

  const [startBtn] = kit.buttons([{ label: 'ابدأ السباق 🏁', cls: 'amber', onclick: startRace }]);
  startBtn.disabled = true;

  const rankBox = el('div', { class: 'sim-row', style: 'flex-wrap:wrap; gap:6px' });
  kit.controls.append(rankBox);

  function setPred(id, btn) {
    if (state === 'race') return;
    prediction = id;
    predBtns.forEach(b => { b.className = 'btn sm ghost'; });
    btn.className = 'btn sm';
    startBtn.disabled = false;
  }

  function startRace() {
    if (!prediction) return;
    balls.forEach(b => { b.p = 0; b.t = 0; b.v = 0; b.done = false; b.tFin = 0; b.rank = -1; });
    finishOrder = [];
    raceT = 0;
    state = 'race';
    rankBox.innerHTML = '';
    predBtns.forEach(b => { b.disabled = true; });
    startBtn.textContent = 'إعادة السباق 🔄';
  }

  function finishRace() {
    state = 'done';
    predBtns.forEach(b => { b.disabled = false; });
    const winner = LIQUIDS[finishOrder[0]];
    const hit = prediction === winner.id;
    rankBox.innerHTML =
      finishOrder.map((idx, rank) =>
        `<span class="chip" style="color:${LIQUIDS[idx].chip}">${MEDALS[rank]} ${LIQUIDS[idx].name}: <b style="direction:ltr">${balls[idx].tFin.toFixed(1)} ث</b></span>`
      ).join('') +
      (hit
        ? '<span class="chip ok">توقعك صحيح! 🎯</span>'
        : '<span class="chip hot">لم يُصب التوقع — الأقل لزوجة هو الأسرع</span>');
    if (!ctx.isMissionDone('predict') && prediction === 'water' && finishOrder[0] === 0) ctx.completeMission('predict');
    if (!ctx.isMissionDone('heat') && tempS.value >= 60) ctx.completeMission('heat');
  }

  function step(dt) {
    if (state !== 'race') return;
    raceT += dt;
    let allDone = true;
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      if (b.done) continue;
      b.t += dt;
      const vMax = 1 / fallTime(muAt(i)); // سرعة حدية أبطأ كلما زادت اللزوجة
      b.v = vMax * (1 - Math.exp(-b.t / 0.15)); // تسارع قصير حتى السرعة الحدية
      b.p += b.v * dt;
      if (b.p >= 1) {
        b.p = 1; b.done = true; b.tFin = raceT;
        b.rank = finishOrder.length;
        finishOrder.push(i);
      } else allDone = false;
    }
    if (allDone && finishOrder.length === balls.length) finishRace();
  }

  // ===== الرسم =====
  function rr(c, x, y, w, h, r) {
    c.beginPath();
    c.moveTo(x + r, y);
    c.arcTo(x + w, y, x + w, y + h, r);
    c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r);
    c.arcTo(x, y, x + w, y, r);
    c.closePath();
  }

  function draw(c, t) {
    const W = kit.W, H = kit.H;
    const colW = W / LIQUIDS.length;
    const tubeW = Math.min(colW * 0.46, 70);
    const top = 52, bot = H - 40;
    const temp = tempS.value;

    for (let i = 0; i < LIQUIDS.length; i++) {
      const L = LIQUIDS[i];
      const cx = W - colW * (i + 0.5); // الترتيب من اليمين لليسار
      const x = cx - tubeW / 2;

      // السائل داخل الأنبوب الزجاجي
      const g = c.createLinearGradient(0, top, 0, bot);
      g.addColorStop(0, L.c1);
      g.addColorStop(1, L.c2);
      rr(c, x, top, tubeW, bot - top, 10);
      c.fillStyle = g;
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,.16)';
      c.lineWidth = 2;
      c.stroke();
      // لمعة الزجاج
      c.strokeStyle = 'rgba(255,255,255,.09)';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(x + 7, top + 10);
      c.lineTo(x + 7, bot - 10);
      c.stroke();

      // خط النهاية
      c.setLineDash([4, 3]);
      c.strokeStyle = 'rgba(255,255,255,.35)';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x + 3, bot - 4);
      c.lineTo(x + tubeW - 3, bot - 4);
      c.stroke();
      c.setLineDash([]);

      // فقاعات تسخين (أبطأ في السوائل اللزجة)
      if (temp >= 40) {
        const nb = Math.min(3, Math.floor((temp - 25) / 15));
        c.fillStyle = 'rgba(255,255,255,.18)';
        for (let j = 0; j < nb; j++) {
          const ph = (t * 0.35 / (i * 0.9 + 1) + j * 0.37 + i * 0.23) % 1;
          const byb = bot - 10 - ph * (bot - top - 24);
          const bxb = cx + Math.sin((t + j * 2.1 + i) * 2.6) * tubeW * 0.24;
          c.beginPath();
          c.arc(bxb, byb, 2.2, 0, 7);
          c.fill();
        }
      }

      // الكرة الفولاذية
      const b = balls[i];
      const r = Math.min(tubeW * 0.3, 14);
      const y0 = top + r + 4, y1 = bot - r - 4;
      const by = y0 + b.p * (y1 - y0);
      if (state === 'race' && !b.done && b.v > 0.02) { // أثر الحركة خلف الكرة
        const wl = Math.min(56, b.v * (y1 - y0) * 0.28);
        const wg = c.createLinearGradient(0, by - r - wl, 0, by);
        wg.addColorStop(0, 'rgba(255,255,255,0)');
        wg.addColorStop(1, 'rgba(255,255,255,.22)');
        c.fillStyle = wg;
        c.fillRect(cx - r * 0.4, by - r - wl, r * 0.8, wl);
      }
      if (b.done && b.rank === 0) { // هالة الفائز
        c.strokeStyle = 'rgba(251,191,36,.8)';
        c.lineWidth = 2.5;
        c.beginPath();
        c.arc(cx, by, r + 3.5 + Math.sin(t * 5) * 1.2, 0, 7);
        c.stroke();
      }
      const bg = c.createRadialGradient(cx - r * 0.35, by - r * 0.35, r * 0.15, cx, by, r);
      bg.addColorStop(0, '#f1f5f9');
      bg.addColorStop(0.55, '#94a3b8');
      bg.addColorStop(1, '#475569');
      c.fillStyle = bg;
      c.beginPath();
      c.arc(cx, by, r, 0, 7);
      c.fill();

      // الاسم + المصطلح الإنجليزي
      label(c, L.name, cx, 16, { align: 'center', color: '#e2e8f0', size: 14 });
      label(c, L.en, cx, 34, { align: 'center', color: '#94a3b8', size: 11, weight: 400 });

      // المؤقت / الميدالية
      if (state !== 'idle') {
        const txt = b.done ? MEDALS[b.rank] + ' ' + b.tFin.toFixed(1) + ' ث' : raceT.toFixed(1) + ' ث';
        label(c, txt, cx, H - 16, { align: 'center', color: b.done ? '#fbbf24' : '#94a3b8', size: 13 });
      }
    }

    if (state === 'idle') {
      label(c, 'خمّن الفائز ثم اضغط «ابدأ السباق»', W / 2, H - 16, { align: 'center', color: '#fbbf24', size: 13 });
    }
  }

  updateChips();
  kit.loop((c, dt, t) => {
    step(dt);
    draw(c, t);
  });

  return {
    destroy() {
      clearTimeout(reraceTimer);
      kit.destroy();
    },
  };
}
