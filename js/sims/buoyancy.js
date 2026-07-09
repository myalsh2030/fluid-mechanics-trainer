// مختبر الطفو — قاعدة أرشميدس: يطفو، يتعلق، أم يغوص؟
// الفيزياء: الوزن W = ρs·V·g — قوة الطفو Fb = ρf·V(المغمور)·g — الوزن الظاهري W′ = W − Fb
import { SimKit, label, arrow } from './simkit.js';
import { el } from '../ui.js';

const G = 9.81;      // تسارع الجاذبية m/s²
const VOL = 0.001;   // حجم الجسم = 1 لتر (مكعب 10 سم)

const OBJECTS = [
  { name: 'خشب', rho: 600, fill: '#b45309', edge: '#92400e', txt: '#fef3c7', icon: '🪵' },
  { name: 'جليد', rho: 917, fill: '#bae6fd', edge: '#7dd3fc', txt: '#0c4a6e', icon: '🧊' },
  { name: 'بلاستيك', rho: 950, fill: '#f472b6', edge: '#be185d', txt: '#500724', icon: '🧴' },
  { name: 'حديد', rho: 7870, fill: '#94a3b8', edge: '#475569', txt: '#0f172a', icon: '🔩' },
];
const LIQUIDS = [
  { name: 'زيت', rho: 800 },
  { name: 'ماء', rho: 1000 },
  { name: 'ماء مالح', rho: 1100 },
  { name: 'زئبق', rho: 13600 },
];

// منزلق لوغاريتمي: دقة عالية عند الكثافات الصغيرة حيث يحدث التعلم
const RMIN = 600, RMAX = 14000, SPAN = Math.log(RMAX / RMIN);
const rhoOf = p => Math.round((RMIN * Math.exp(SPAN * p / 10000)) / 5) * 5;
const posOf = r => Math.round(10000 * Math.log(r / RMIN) / SPAN);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const f1 = x => Math.round(x * 10) / 10;

function mixC(a, b, t) { return a.map((v, i) => Math.round(v + (b[i] - v) * t)); }
// لون السائل يتغير مع كثافته: زيت كهرماني → ماء أزرق → زئبق فضي
function liquidColors(rho) {
  const AMB = [217, 119, 6], AMB2 = [146, 64, 14];
  const BLU = [56, 189, 248], BLU2 = [14, 116, 178];
  const SIL = [203, 213, 225], SIL2 = [100, 116, 139];
  let top, bot;
  if (rho <= 850) { top = AMB; bot = AMB2; }
  else if (rho < 1050) { const t = (rho - 850) / 200; top = mixC(AMB, BLU, t); bot = mixC(AMB2, BLU2, t); }
  else if (rho <= 2000) { top = BLU; bot = BLU2; }
  else { const t = clamp((rho - 2000) / 11600, 0, 1); top = mixC(BLU, SIL, t); bot = mixC(BLU2, SIL2, t); }
  return ['rgba(' + top + ',.55)', 'rgba(' + bot + ',.85)'];
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.75 });
  const ro = kit.readout();

  let sel = 0;              // الجسم المختار
  let rhoF = 1000;          // كثافة السائل kg/m³
  let y = 20;               // موضع مركز الجسم (بكسل) — يبدأ فوق السطح ليسقط
  let prevYB = 0, splashT = -9, suspendHold = 0, roAcc = 1;

  const doneLocal = new Set();
  const isDone = id => doneLocal.has(id) || (ctx.isMissionDone && ctx.isMissionDone(id));
  const finish = id => { if (!isDone(id)) { doneLocal.add(id); ctx.completeMission(id); } };

  // أزرار اختيار الجسم — إعادة الاختيار تُسقطه من جديد في الخزان
  const objBtns = kit.buttons(OBJECTS.map((o, i) => ({
    label: o.icon + ' ' + o.name + ' ' + o.rho,
    onclick: () => { sel = i; y = 20; paint(); },
  })));

  const sl = kit.slider({
    label: 'كثافة السائل ρf',
    min: 0, max: 10000, step: 1, value: posOf(1000),
    unit: 'kg/m³',
    fmt: p => rhoOf(p),
    oninput: p => { rhoF = rhoOf(p); paint(); },
  });

  function setRho(r) { rhoF = clamp(Math.round(r / 5) * 5, RMIN, RMAX); sl.set(posOf(rhoF)); paint(); }

  const liqBtns = kit.buttons(LIQUIDS.map(l => ({
    label: l.name + ' ' + l.rho,
    onclick: () => setRho(l.rho),
  })));
  kit.buttons([
    { label: '+10 أدق', cls: 'ghost', onclick: () => setRho(rhoF + 10) },
    { label: '−10 أدق', cls: 'ghost', onclick: () => setRho(rhoF - 10) },
  ]);

  function paint() {
    objBtns.forEach((b, i) => { b.className = 'btn sm ' + (i === sel ? 'amber' : 'secondary'); });
    liqBtns.forEach((b, i) => { b.className = 'btn sm ' + (LIQUIDS[i].rho === rhoF ? 'amber' : 'secondary'); });
  }
  paint();

  kit.controls.append(el('div', {
    class: 'sim-row', style: 'font-size:12px; color:var(--c-text2); line-height:1.7',
    html: 'قاعدة <span class="term">أرشميدس <i>Archimedes</i></span>: قوة <span class="term">الطفو <i>Buoyancy</i></span> ' +
      'تساوي وزن السائل المُزاح — والوزن الظاهري على الميزان: W′ = W − Fb',
  }));

  const ST = {
    float: ['يطفو 🚢', '#34d399'],
    suspend: ['يتعلق ⚖️', '#fbbf24'],
    sink: ['يغوص ⚓', '#f87171'],
  };

  kit.loop((g, dt, t) => {
    const CW = kit.W, CH = kit.H;
    const x0 = 16, x1 = CW - 16, top = 26, bot = CH - 12;
    const surfY = top + (bot - top) * 0.22;
    const s = clamp((x1 - x0) * 0.19, 40, 64);
    const cx = (x0 + x1) / 2;
    const o = OBJECTS[sel], rhoS = o.rho;

    // الحالة الفيزيائية: تعلق إذا |ρs−ρf|/ρf < 3%
    const near = Math.abs(rhoS - rhoF) / rhoF < 0.03;
    const state = near ? 'suspend' : (rhoS < rhoF ? 'float' : 'sink');
    const frac = state === 'float' ? rhoS / rhoF : 1; // الجزء المغمور عند الاتزان

    // الموضع الهدف + حركة ناعمة وتمايل خفيف
    let ty;
    if (state === 'float') ty = surfY + frac * s - s / 2 + Math.sin(t * 1.7) * 2;
    else if (state === 'suspend') ty = (surfY + bot) / 2 + Math.sin(t * 1.2) * 3;
    else ty = bot - s / 2 - 2;
    y += (ty - y) * Math.min(1, dt * 3.5);
    const yTop = y - s / 2, yBot = y + s / 2;
    if (prevYB < surfY && yBot >= surfY) splashT = t; // لحظة ملامسة السطح
    prevYB = yBot;

    // القوى (من الموضع الحالي — صحيحة حتى أثناء الحركة)
    const visFrac = clamp((yBot - surfY) / s, 0, 1);
    const Wt = rhoS * VOL * G;
    const Fb = rhoF * VOL * visFrac * G;
    const Wp = Math.max(0, Wt - Fb);

    // خلفية الخزان
    g.fillStyle = 'rgba(255,255,255,.03)';
    g.fillRect(x0, top, x1 - x0, bot - top);

    // الجسم (يُرسم قبل السائل ليظهر مصبوغًا تحت السطح)
    g.fillStyle = o.fill; g.strokeStyle = o.edge; g.lineWidth = 2;
    g.fillRect(cx - s / 2, yTop, s, s);
    g.strokeRect(cx - s / 2, yTop, s, s);
    label(g, o.name, cx, y - 7, { align: 'center', color: o.txt, size: 12 });
    label(g, 'ρ = ' + rhoS, cx, y + 9, { align: 'center', color: o.txt, size: 10, weight: 400 });

    // السائل بسطح متموج
    const cols = liquidColors(rhoF);
    const grad = g.createLinearGradient(0, surfY, 0, bot);
    grad.addColorStop(0, cols[0]); grad.addColorStop(1, cols[1]);
    g.beginPath(); g.moveTo(x0, bot);
    for (let x = x0; x <= x1; x += 12) g.lineTo(x, surfY + Math.sin(x * 0.08 + t * 2.2) * 1.6);
    g.lineTo(x1, surfY + Math.sin(x1 * 0.08 + t * 2.2) * 1.6);
    g.lineTo(x1, bot); g.closePath();
    g.fillStyle = grad; g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 1.5;
    g.beginPath();
    for (let x = x0; x <= x1; x += 12) {
      const yy = surfY + Math.sin(x * 0.08 + t * 2.2) * 1.6;
      if (x === x0) g.moveTo(x, yy); else g.lineTo(x, yy);
    }
    g.stroke();

    // تموجات السقوط
    const rs = t - splashT;
    if (rs < 0.9) {
      g.save(); g.strokeStyle = 'rgba(226,232,240,' + (0.6 * (1 - rs / 0.9)).toFixed(2) + ')'; g.lineWidth = 1.5;
      for (const k of [0, 0.25]) {
        const rr = rs - k;
        if (rr <= 0) continue;
        g.beginPath(); g.ellipse(cx, surfY, s * 0.4 + rr * 60, 4 + rr * 8, 0, 0, Math.PI * 2); g.stroke();
      }
      g.restore();
    }

    // جدران الخزان
    g.strokeStyle = 'rgba(148,163,184,.9)'; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, top); g.lineTo(x0, bot); g.lineTo(x1, bot); g.lineTo(x1, top); g.stroke();

    // سهم الوزن (أحمر لأسفل) وسهم الطفو (أخضر لأعلى) — الطول ∝ √القوة
    const axW = cx - s / 2 - 16, axB = cx + s / 2 + 16;
    const Lw = clamp(8 + 3.8 * Math.sqrt(Wt), 8, CH - 4 - y);
    arrow(g, axW, y, axW, y + Lw, { color: '#f87171', width: 3 });
    label(g, 'W', axW - 8, y + Lw - 5, { align: 'right', color: '#f87171', size: 12 });
    if (Fb > 0.05) {
      const Lb = clamp(8 + 3.8 * Math.sqrt(Fb), 8, y - 6);
      arrow(g, axB, y, axB, y - Lb, { color: '#34d399', width: 3 });
      label(g, 'Fb', axB + 8, y - Lb + 5, { align: 'left', color: '#34d399', size: 12 });
    }

    // ميزان نابضي للجسم الغارق: يقرأ الوزن الظاهري W′
    if (state === 'sink' && Math.abs(y - ty) < 4 && yTop > 50) {
      g.save(); g.strokeStyle = '#cbd5e1'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(cx - 12, 6); g.lineTo(cx + 12, 6); g.stroke();
      const yEnd = yTop - 2, n = 8, seg = (yEnd - 10) / n;
      g.beginPath(); g.moveTo(cx, 6); g.lineTo(cx, 10);
      let yy = 10;
      for (let i = 0; i < n; i++) { g.lineTo(cx + (i % 2 ? -6 : 6), yy + seg / 2); yy += seg; g.lineTo(cx, yy); }
      g.stroke(); g.restore();
      label(g, 'الميزان: ' + f1(Wp) + ' N', cx + 14, (10 + yEnd) / 2, { align: 'left', color: '#fbbf24', size: 11 });
    }

    // شريط الحالة أعلى اللوحة
    const st = ST[state];
    label(g, st[0], x1 - 2, 12, { align: 'right', size: 14, color: st[1] });
    label(g, 'ρf = ' + rhoF + ' kg/m³', x0 + 2, 12, { align: 'left', size: 11, color: '#94a3b8' });

    // المهام
    if (state === 'suspend') { suspendHold += dt; if (suspendHold > 0.7) finish('neutral'); }
    else suspendHold = 0;
    if (rhoS === 7870 && state === 'float') finish('ironfloat');

    // القراءات الحية (كل 150ms توفيرًا)
    roAcc += dt;
    if (roAcc > 0.15) {
      roAcc = 0;
      ro.set([
        { label: 'الحالة', value: st[0], color: st[1] },
        { label: 'الوزن W', value: f1(Wt) + ' N', color: '#f87171' },
        { label: 'الطفو Fb', value: f1(Fb) + ' N', color: '#34d399' },
        { label: 'الظاهري W′', value: f1(Wp) + ' N', color: '#fbbf24' },
        { label: 'المغمور', value: Math.round(visFrac * 100) + '%', color: '#38bdf8' },
      ]);
    }
  });

  return { destroy() { kit.destroy(); } };
}
