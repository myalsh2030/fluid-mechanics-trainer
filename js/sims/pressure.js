// الغوّاص والضغط: شاهد P = ρ·g·h يعمل أمام عينيك في مقطع بحري حي
import { SimKit, label } from './simkit.js';

const G = 9.81;          // m/s²
const PATM = 101.325;    // kPa — الضغط الجوي القياسي

const FLUIDS = [
  { id: 'sea',   name: 'ماء البحر', rho: 1023,  top: 'rgba(56,189,248,.72)',  bot: 'rgba(7,58,102,.97)',  gmax: 400,  tick: 100  },
  { id: 'fresh', name: 'ماء عذب',   rho: 1000,  top: 'rgba(34,211,238,.65)',  bot: 'rgba(8,80,104,.96)',  gmax: 400,  tick: 100  },
  { id: 'hg',    name: 'زئبق',      rho: 13600, top: 'rgba(203,213,225,.82)', bot: 'rgba(64,76,96,.98)',  gmax: 4500, tick: 1500 },
];

const fmtP = v => (v >= 1000 ? String(Math.round(v)) : v.toFixed(1));

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.85 });
  let fluid = FLUIDS[0];
  let depth = 5;          // m
  let dragging = false;
  let touched = false;    // هل حرّك المتدرب شيئًا؟
  const bubbles = [];
  let bubbleTimer = 0;
  const doneLocal = new Set();

  function done(id) {
    if (doneLocal.has(id)) return;
    if (ctx.isMissionDone && ctx.isMissionDone(id)) { doneLocal.add(id); return; }
    doneLocal.add(id);
    ctx.completeMission(id);
  }

  const read = kit.readout();

  const depthSlider = kit.slider({
    label: 'العمق h', min: 0, max: 30, step: 0.5, value: depth, unit: 'm',
    fmt: v => v.toFixed(1),
    oninput: v => { depth = v; touched = true; },
  });

  // أزرار اختيار السائل
  const fluidBtns = kit.buttons(FLUIDS.map((f, i) => ({
    label: `${f.name} ρ=${f.rho}`,
    onclick: () => pickFluid(i),
  })));
  function styleBtns() {
    fluidBtns.forEach((b, i) => { b.className = 'btn sm' + (FLUIDS[i] === fluid ? '' : ' secondary'); });
  }
  function pickFluid(i) {
    fluid = FLUIDS[i];
    touched = true;
    styleBtns();
    if (fluid.id === 'hg') done('hgcol');
  }
  styleBtns();

  // ---- سحب الغوّاص عموديًا (لمس أو فأرة) ----
  const cv = kit.canvas;
  const geo = () => {
    const ySurf = kit.H * 0.13, yBot = kit.H * 0.97;
    return { ySurf, yBot, pxPerM: (yBot - ySurf) / 30 };
  };
  function setDepthFromY(y) {
    const { ySurf, pxPerM } = geo();
    depth = Math.round(Math.max(0, Math.min(30, (y - ySurf) / pxPerM)) * 2) / 2;
    depthSlider.set(depth);
    touched = true;
  }
  const evY = e => e.clientY - cv.getBoundingClientRect().top;
  const onDown = e => { dragging = true; if (cv.setPointerCapture) try { cv.setPointerCapture(e.pointerId); } catch (_) {} setDepthFromY(evY(e)); };
  const onMove = e => { if (dragging) { setDepthFromY(evY(e)); e.preventDefault(); } };
  const onUp = () => { dragging = false; };
  cv.addEventListener('pointerdown', onDown);
  cv.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);

  // ---- ساعة الضغط ----
  function drawGauge(c, gx, gy, R, Pk) {
    const a0 = Math.PI * 0.75, sweep = Math.PI * 1.5, gmax = fluid.gmax;
    const aOf = p => a0 + Math.min(p / gmax, 1) * sweep;
    c.save();
    c.beginPath(); c.arc(gx, gy, R, 0, Math.PI * 2);
    c.fillStyle = 'rgba(10,21,38,.9)'; c.fill();
    c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 1.5; c.stroke();
    // المسار + التعبئة
    c.lineCap = 'round';
    c.beginPath(); c.arc(gx, gy, R * 0.78, a0, a0 + sweep);
    c.strokeStyle = 'rgba(255,255,255,.10)'; c.lineWidth = R * 0.15; c.stroke();
    if (Pk > 0) {
      c.beginPath(); c.arc(gx, gy, R * 0.78, a0, aOf(Pk));
      c.strokeStyle = Pk > 300 ? '#34d399' : '#fbbf24'; c.lineWidth = R * 0.15; c.stroke();
    }
    // التدريجات
    c.lineWidth = 1.5;
    for (let v = 0; v <= gmax; v += fluid.tick) {
      const a = aOf(v), ca = Math.cos(a), sa = Math.sin(a);
      c.beginPath();
      c.moveTo(gx + ca * R * 0.88, gy + sa * R * 0.88);
      c.lineTo(gx + ca * R * 0.70, gy + sa * R * 0.70);
      c.strokeStyle = 'rgba(226,232,240,.6)'; c.stroke();
      label(c, String(v), gx + ca * R * 0.52, gy + sa * R * 0.52, { size: Math.max(8, R * 0.14), color: 'rgba(148,163,184,.9)', align: 'center', weight: 700 });
    }
    // علامة مهمة 300 kPa
    const am = aOf(300), cm = Math.cos(am), sm = Math.sin(am);
    c.beginPath();
    c.moveTo(gx + cm * R * 0.90, gy + sm * R * 0.90);
    c.lineTo(gx + cm * R * 0.66, gy + sm * R * 0.66);
    c.strokeStyle = '#f87171'; c.lineWidth = 3; c.stroke();
    // الإبرة
    const an = aOf(Pk);
    c.beginPath();
    c.moveTo(gx - Math.cos(an) * R * 0.12, gy - Math.sin(an) * R * 0.12);
    c.lineTo(gx + Math.cos(an) * R * 0.62, gy + Math.sin(an) * R * 0.62);
    c.strokeStyle = '#e2e8f0'; c.lineWidth = 2.5; c.lineCap = 'round'; c.stroke();
    c.beginPath(); c.arc(gx, gy, R * 0.07, 0, Math.PI * 2); c.fillStyle = '#fbbf24'; c.fill();
    label(c, 'kPa', gx, gy - R * 0.32, { size: Math.max(8, R * 0.15), color: '#94a3b8', align: 'center' });
    label(c, fmtP(Pk), gx, gy + R * 0.62, { size: Math.max(10, R * 0.2), color: Pk > 300 ? '#34d399' : '#fbbf24', align: 'center', weight: 800 });
    c.restore();
  }

  kit.loop((c, dt, t) => {
    const W = kit.W, H = kit.H;
    const { ySurf, yBot, pxPerM } = geo();
    const Pk = fluid.rho * G * depth / 1000;       // الضغط المقاس kPa
    const Pabs = Pk + PATM;                        // الضغط المطلق kPa
    const hEq = 101325 / (fluid.rho * G);          // العمود المكافئ للضغط الجوي m

    // السماء + الشمس
    c.fillStyle = '#101f38'; c.fillRect(0, 0, W, ySurf + 4);
    c.beginPath(); c.arc(W * 0.06, ySurf * 0.4, 7, 0, Math.PI * 2); c.fillStyle = 'rgba(251,191,36,.9)'; c.fill();
    label(c, `${fluid.name} — ρ = ${fluid.rho} kg/m³`, W * 0.11, ySurf * 0.45, { size: 11, color: '#e2e8f0', align: 'left' });
    label(c, 'P = ρ·g·h', W - 10, ySurf * 0.45, { size: 12, color: 'rgba(226,232,240,.65)', align: 'right' });

    // جسم السائل بسطح متموج + تدرج يزداد قتامة مع العمق
    const grad = c.createLinearGradient(0, ySurf, 0, yBot);
    grad.addColorStop(0, fluid.top); grad.addColorStop(1, fluid.bot);
    c.fillStyle = grad;
    c.beginPath(); c.moveTo(0, ySurf);
    for (let x = 0; x <= W; x += 8) c.lineTo(x, ySurf + Math.sin(x * 0.05 + t * 2.2) * 2.5);
    c.lineTo(W, H); c.lineTo(0, H); c.closePath(); c.fill();

    // مسطرة الأعماق (يمين)
    for (let m = 0; m <= 30; m += 5) {
      const y = ySurf + m * pxPerM;
      c.beginPath(); c.moveTo(W, y); c.lineTo(W - 8, y);
      c.strokeStyle = 'rgba(255,255,255,.35)'; c.lineWidth = 1; c.stroke();
      label(c, String(m), W - 12, y, { size: 9.5, color: 'rgba(226,232,240,.55)' });
    }

    // العمود المكافئ للضغط الجوي (يسار — بالبرتقالي)
    const x0 = W * 0.09;
    const yEq = ySurf + Math.min(hEq, 30) * pxPerM;
    c.save();
    c.strokeStyle = '#fbbf24'; c.lineWidth = 2.5; c.lineCap = 'round';
    c.beginPath(); c.moveTo(x0, ySurf + 3); c.lineTo(x0, yEq); c.stroke();
    c.beginPath(); c.moveTo(x0 - 7, yEq); c.lineTo(x0 + 7, yEq); c.stroke();
    c.beginPath(); c.moveTo(x0 - 7, ySurf + 3); c.lineTo(x0 + 7, ySurf + 3); c.stroke();
    c.restore();
    const yTxt = Math.max(yEq + 13, ySurf + 26);
    label(c, 'عمود يعادل الضغط الجوي', x0 + 12, yTxt - 13, { size: 10.5, color: '#fbbf24', align: 'left' });
    label(c, hEq.toFixed(2) + ' m', x0 + 12, yTxt, { size: 11, color: '#fde68a', align: 'left', weight: 800 });

    // خط العمق المتقطع عند الغوّاص
    const dx = W * 0.48;
    const dy = Math.max(ySurf + 8, ySurf + depth * pxPerM + Math.sin(t * 2) * 2);
    c.save();
    c.setLineDash([5, 5]); c.strokeStyle = 'rgba(251,191,36,.35)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(dx + 20, dy); c.lineTo(W - 10, dy); c.stroke();
    c.restore();
    label(c, depth.toFixed(1) + ' m', W - 22, dy - 10, { size: 10.5, color: '#fbbf24' });

    // فقاعات صاعدة
    bubbleTimer -= dt;
    if (bubbleTimer <= 0 && depth > 0.5) {
      bubbles.push({ x: dx + (Math.random() * 16 - 8), y: dy - 12, r: 1.5 + Math.random() * 2, v: 22 + Math.random() * 18 });
      if (bubbles.length > 14) bubbles.shift();
      bubbleTimer = 0.35;
    }
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.lineWidth = 1;
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.v * dt;
      if (b.y < ySurf + 5) { bubbles.splice(i, 1); continue; }
      c.beginPath(); c.arc(b.x, b.y, b.r, 0, Math.PI * 2); c.stroke();
    }

    // الغوّاص + هالة نجاح المهمة
    if (Pk > 300) {
      c.beginPath(); c.arc(dx, dy, 24 + Math.sin(t * 5) * 2, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(52,211,153,.6)'; c.lineWidth = 2; c.stroke();
    }
    c.save();
    c.font = '30px serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.fillText('🤿', dx, dy);
    c.restore();
    if (!touched) label(c, 'اسحب الغوّاص لأسفل أو حرّك المنزلق', dx, dy + 28, { size: 11.5, color: '#e2e8f0', align: 'center' });

    // ساعة الضغط (يمين أعلى)
    const R = Math.min(Math.min(W, H) * 0.17, 62);
    drawGauge(c, W * 0.80, ySurf + R + 14, R, Pk);
    label(c, 'الضغط المقاس', W * 0.80, ySurf + 2 * R + 26, { size: 10.5, color: '#94a3b8', align: 'center' });

    // القراءات الحية + فحص المهام
    read.set([
      { label: 'العمق h', value: depth.toFixed(1) + ' m', color: '#38bdf8' },
      { label: 'المقاس ρgh', value: fmtP(Pk) + ' kPa', color: '#fbbf24' },
      { label: 'المطلق', value: fmtP(Pabs) + ' kPa', color: '#e2e8f0' },
      { label: 'عمود الجو المكافئ', value: hEq.toFixed(2) + ' m', color: '#a78bfa' },
    ]);
    if (Pk > 300) done('deep300');
  });

  return {
    destroy() {
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      kit.destroy();
    },
  };
}
