// مستكشف فقد الضغط: من يسرق ضغط مضختك؟ الطول، القطر، السرعة، الصدأ، والمحبس
import { SimKit, label, arrow } from './simkit.js';
import { el, toast } from '../ui.js';

const RHO = 998;      // كثافة الماء kg/m³
const MU = 0.001;     // لزوجة الماء Pa·s
const G = 9.81;       // الجاذبية m/s²
const GMAX = 600;     // أقصى تدريج للساعة kPa
const P_OUT = 60;     // ضغط المخرج الثابت kPa

// جدول المحبس الجاروري (Gate Valve) من الكتاب
const VALVES = [
  { label: 'فتح كامل', k: 0.2, open: 1 },
  { label: 'فتحة ¾', k: 1.15, open: 0.75 },
  { label: 'فتحة ½', k: 5.6, open: 0.5 },
  { label: 'فتحة ¼', k: 24, open: 0.25 },
];

function drawGauge(c, x, y, r, val, name) {
  c.save();
  c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2);
  c.fillStyle = '#0f172a'; c.fill();
  c.lineWidth = 2; c.strokeStyle = 'rgba(255,255,255,.16)'; c.stroke();
  const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25;
  c.strokeStyle = 'rgba(226,232,240,.5)'; c.lineWidth = 1.5;
  for (let i = 0; i <= 6; i++) {
    const a = a0 + (a1 - a0) * (i / 6);
    c.beginPath();
    c.moveTo(x + Math.cos(a) * (r - 7), y + Math.sin(a) * (r - 7));
    c.lineTo(x + Math.cos(a) * (r - 3), y + Math.sin(a) * (r - 3));
    c.stroke();
  }
  const over = val > GMAX;
  const col = over ? '#f87171' : '#fbbf24';
  const a = a0 + (a1 - a0) * Math.min(val / GMAX, 1);
  c.strokeStyle = col; c.lineWidth = 3; c.lineCap = 'round';
  c.beginPath(); c.moveTo(x, y);
  c.lineTo(x + Math.cos(a) * (r - 9), y + Math.sin(a) * (r - 9)); c.stroke();
  c.beginPath(); c.arc(x, y, 3.5, 0, Math.PI * 2); c.fillStyle = col; c.fill();
  c.restore();
  label(c, Math.round(val) + ' kPa', x, y + r * 0.55, { align: 'center', size: 10, color: over ? '#f87171' : '#e2e8f0' });
  label(c, name, x, y + r + 11, { align: 'center', size: 11, color: '#94a3b8' });
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.75 });
  const read = kit.readout();
  let valveIdx = 0;
  let st = null;

  function compute() {
    const L = sL.value, dmm = sD.value, v = sV.value, age = sAge.value;
    const d = dmm / 1000;
    const epsMm = 0.046 + 0.05 * age;              // خشونة الفولاذ التجاري مع الصدأ
    const Re = RHO * v * d / MU;
    const lam = Re < 2100;
    const f = lam
      ? 64 / Re
      : Math.pow(-1.8 * Math.log10(Math.pow((epsMm / 1000) / d / 3.7, 1.11) + 6.9 / Re), -2);
    const k = VALVES[valveIdx].k;
    const hf = f * (L / d) * v * v / (2 * G);
    const hv = k * v * v / (2 * G);
    const htot = hf + hv;
    const dp = RHO * G * htot / 1000;              // kPa
    st = { dmm, v, age, epsMm, Re, lam, f, k, hf, hv, htot, dp };
  }

  function updateReadout() {
    read.set([
      { label: 'Re', value: Math.round(st.Re).toLocaleString('en-US'), color: st.lam ? '#34d399' : '#fbbf24' },
      { label: 'الجريان', value: st.lam ? 'رقائقي' : 'مضطرب', color: st.lam ? '#34d399' : '#fbbf24' },
      { label: 'f', value: st.f.toFixed(4) },
      { label: 'فقد الأنبوب h_f', value: st.hf.toFixed(2) + ' m', color: '#38bdf8' },
      { label: 'فقد المحبس', value: st.hv.toFixed(2) + ' m', color: '#a78bfa' },
      { label: 'Δp', value: (st.dp >= 100 ? Math.round(st.dp) : st.dp.toFixed(1)) + ' kPa', color: st.dp > GMAX ? '#f87171' : '#e2e8f0' },
    ]);
  }

  const onChange = () => { compute(); updateReadout(); };
  const sL = kit.slider({ label: 'الطول L', min: 10, max: 500, step: 10, value: 100, unit: 'm', oninput: onChange });
  const sD = kit.slider({ label: 'القطر d', min: 25, max: 300, step: 5, value: 100, unit: 'mm', oninput: onChange });
  const sV = kit.slider({ label: 'السرعة v', min: 0.3, max: 5, step: 0.1, value: 1.5, unit: 'm/s', fmt: x => x.toFixed(1), oninput: onChange });
  const sAge = kit.slider({
    label: 'عمر الأنبوب', min: 0, max: 30, step: 1, value: 0, unit: 'سنة',
    oninput: (val) => {
      onChange();
      if (val >= 20 && !ctx.isMissionDone('age20')) {
        ctx.completeMission('age20');
        toast('🧱 بعد 20 سنة صدأ: الخشونة صارت أكثر من ×20 مقارنة بأنبوب جديد!');
      }
    },
  });

  kit.controls.append(el('div', { style: 'font-size:13px;font-weight:700;color:#94a3b8' }, '🔧 وضع المحبس الجاروري (Gate Valve):'));
  let valveBtns = [];
  function selectValve(i) {
    valveIdx = i;
    valveBtns.forEach((b, j) => { b.className = 'btn sm ' + (j === i ? 'amber' : 'secondary'); });
    compute(); updateReadout();
    if (i === 3 && !ctx.isMissionDone('choke')) {
      ctx.completeMission('choke');
      toast('🥵 ربع فتحة فقط: k قفز إلى 24 — هذا هو الاختناق الذي يتعب المضخة!');
    }
  }
  valveBtns = kit.buttons(VALVES.map((vd, i) => ({
    label: vd.label + ' (k=' + vd.k + ')',
    cls: i === 0 ? 'amber' : 'secondary',
    onclick: () => selectValve(i),
  })));

  function doubleSpeed() {
    const v2 = Math.round(sV.value * 2 * 10) / 10;
    if (v2 > 5) { toast('⚠️ السرعة قرب الحد الأقصى — خفّضها أولًا ثم جرّب المضاعفة'); return; }
    const hf0 = st.hf;
    sV.set(v2);
    compute(); updateReadout();
    const ratio = hf0 > 0 ? st.hf / hf0 : 0;
    toast('⚡ الفقد قفز من ' + hf0.toFixed(2) + ' m إلى ' + st.hf.toFixed(2) + ' m — تقريبًا ×' + ratio.toFixed(1) + '!');
    ctx.completeMission('v2x');
  }
  kit.controls.append(el('button', { class: 'btn amber wide', onclick: doubleSpeed }, '⚡ ضاعف السرعة'));

  compute(); updateReadout();

  // جسيمات الماء داخل الأنبوب
  const parts = Array.from({ length: 16 }, () => ({
    fx: Math.random(), fo: Math.random() * 2 - 1, ph: Math.random() * 6.28,
  }));

  kit.loop((c, dt, t) => {
    const W = kit.W, H = kit.H;
    const xL = 26, xR = W - 26, xV = (xL + xR) / 2;
    const th = 9 + (st.dmm - 25) / 275 * 15;       // نصف سماكة الأنبوب بالبكسل
    const pipeY = H * 0.52;
    const turb = !st.lam;

    // ===== خط الانحدار الهيدروليكي HGL =====
    const topY = 22;
    const zone = (pipeY - th - 16) - topY;
    const dropPx = zone * (st.htot / (st.htot + 12));  // مقياس مشبع كي لا يخرج عن اللوحة
    const fShare = st.htot > 0 ? st.hf / st.htot : 0;
    const yIn = topY;
    const yV1 = topY + dropPx * fShare * 0.5;          // نصف فقد الاحتكاك حتى المحبس
    const yV2 = yV1 + dropPx * (1 - fShare);           // هبطة المحبس المفاجئة
    const yOut = topY + dropPx;
    c.save();
    c.setLineDash([2, 5]); c.strokeStyle = 'rgba(148,163,184,.35)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(xL, yIn); c.lineTo(xR, yIn); c.stroke();  // خط مرجعي بلا فقد
    c.setLineDash([6, 4]); c.strokeStyle = '#fbbf24'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(xR, yIn); c.lineTo(xV, yV1); c.stroke();
    c.beginPath(); c.moveTo(xV, yV2); c.lineTo(xL, yOut); c.stroke();
    if (yV2 - yV1 > 2) {  // هبطة المحبس بلون التحذير
      c.strokeStyle = '#f87171';
      c.beginPath(); c.moveTo(xV, yV1); c.lineTo(xV, yV2); c.stroke();
    }
    c.setLineDash([]);
    c.fillStyle = '#fbbf24';
    c.beginPath(); c.arc(xR, yIn, 3, 0, Math.PI * 2); c.fill();
    c.beginPath(); c.arc(xL, yOut, 3, 0, Math.PI * 2); c.fill();
    c.restore();
    label(c, 'HGL', xL + 2, Math.max(yOut - 10, topY + 8), { align: 'left', size: 10, color: '#fbbf24' });
    label(c, 'الفقد الكلي ' + st.htot.toFixed(1) + ' m', xV, yIn + 11, { align: 'center', size: 10, color: '#94a3b8' });

    // ===== جسم الأنبوب =====
    c.fillStyle = 'rgba(12,74,110,.55)';
    c.fillRect(xL, pipeY - th, xR - xL, th * 2);
    c.fillStyle = '#475569';
    c.fillRect(xL, pipeY - th - 4, xR - xL, 4);
    c.fillRect(xL, pipeY + th, xR - xL, 4);
    if (st.age > 0) {  // طبقة الصدأ تنمو مع العمر
      const ra = st.age / 30;
      c.fillStyle = 'rgba(180,83,9,' + (0.25 + 0.5 * ra).toFixed(2) + ')';
      const rh = 1.5 + ra * th * 0.45;
      c.fillRect(xL, pipeY - th, xR - xL, rh);
      c.fillRect(xL, pipeY + th - rh, xR - xL, rh);
      c.fillRect(xL, pipeY - th - 4, xR - xL, 4);
      c.fillRect(xL, pipeY + th, xR - xL, 4);
    }
    label(c, 'ε = ' + st.epsMm.toFixed(2) + ' mm', xR - 2, pipeY - th - 10,
      { align: 'right', size: 10, color: st.age >= 10 ? '#fb923c' : '#94a3b8' });

    // ===== الجسيمات (الجريان من اليمين إلى اليسار) =====
    const spd = (30 + st.v * 30) * dt / (xR - xL);
    c.fillStyle = 'rgba(56,189,248,.85)';
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      p.fx -= spd;
      if (p.fx < 0) p.fx += 1;
      const jit = turb ? Math.sin(t * 8 + p.ph) * 2.5 : 0;
      const py = pipeY + p.fo * (th - 5) + jit;
      c.beginPath(); c.arc(xL + p.fx * (xR - xL), py, 2.4, 0, Math.PI * 2); c.fill();
    }
    arrow(c, xV + 34, pipeY + th + 14, xV - 34, pipeY + th + 14, { color: '#38bdf8', width: 2, head: 6 });

    // ===== المحبس =====
    c.save();
    c.strokeStyle = '#fbbf24'; c.lineWidth = 2; c.lineJoin = 'round';
    c.beginPath();
    c.moveTo(xV - 14, pipeY - th - 5); c.lineTo(xV - 14, pipeY + th + 5);
    c.lineTo(xV + 14, pipeY - th - 5); c.lineTo(xV + 14, pipeY + th + 5);
    c.closePath(); c.stroke();
    const depth = (1 - VALVES[valveIdx].open) * (th * 2 + 4);
    c.fillStyle = '#cbd5e1';
    c.fillRect(xV - 3, pipeY - th - 2, 6, Math.max(depth, 3));
    c.restore();
    label(c, 'محبس: ' + VALVES[valveIdx].label, xV, pipeY + th + 28, { align: 'center', size: 11, color: '#e2e8f0' });

    // ===== ساعات الضغط =====
    const r = Math.min(30, W * 0.085);
    const gy = H - r - 24;
    const gxIn = xR - r - 4, gxOut = xL + r + 4;
    c.strokeStyle = '#475569'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(gxIn, pipeY + th + 4); c.lineTo(gxIn, gy - r); c.stroke();
    c.beginPath(); c.moveTo(gxOut, pipeY + th + 4); c.lineTo(gxOut, gy - r); c.stroke();
    drawGauge(c, gxIn, gy, r, P_OUT + st.dp, 'مدخل');
    drawGauge(c, gxOut, gy, r, P_OUT, 'مخرج');
  });

  return { destroy() { kit.destroy(); } };
}
