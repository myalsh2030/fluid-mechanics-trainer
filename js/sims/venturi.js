// فنشوري وبيتوت — قياس التدفق من فرق المانوميتر، وقياس السرعة من ارتفاع العمود
// فيزياء المحاكاة: Δp = ρ/2 (v2² − v1²) ثم Δh = Δp / ((ρHg − ρ) g) — وبيتوت h = v²/2g
// مرتبطة بمثالي الكتاب 3-8 و3-9
import { SimKit, label, arrow, waterGrad } from './simkit.js';
import { el } from '../ui.js';

const G = 9.81;          // عجلة الجاذبية m/s2
const RHO = 1000;        // كثافة الماء kg/m3
const RHO_HG = 13600;    // كثافة الزئبق kg/m3
const D1 = 0.100;        // قطر المدخل m
const D2 = 0.050;        // قطر العنق m
const A1 = Math.PI * D1 * D1 / 4;
const A2 = Math.PI * D2 * D2 / 4;

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);
const fmtH = h => h < 0.1 ? (h * 100).toFixed(1) + ' cm' : h.toFixed(2) + ' m';

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.8 });
  let mode = 'venturi';
  let dhShown = 0;   // فرق الزئبق المعروض mm (حركة سلسة)
  let hShown = 0;    // ارتفاع عمود بيتوت المعروض m
  let lastRead = '';
  const done = {};
  const fire = id => {
    if (done[id]) return;
    done[id] = true;
    if (!(ctx.isMissionDone && ctx.isMissionDone(id))) ctx.completeMission(id);
  };

  // جسيمات قليلة (أداء 60fps على جوال متواضع)
  const parts = Array.from({ length: 24 }, () => ({ s: Math.random(), off: Math.random() * 2 - 1 }));

  const read = kit.readout();

  const [btnV, btnP] = kit.buttons([
    { label: '⏳ فنشوري', cls: 'amber', onclick: () => setMode('venturi') },
    { label: '✈️ بيتوت', onclick: () => setMode('pitot') },
  ]);
  btnV.parentElement.prepend(
    el('label', { style: 'font-size:13px; font-weight:700; color:var(--c-text2); align-self:center' }, 'الوضع:')
  );

  const sQ = kit.slider({
    label: 'التدفق Q', min: 2, max: 30, step: 0.5, value: 8, unit: 'L/s',
    fmt: v => v.toFixed(1),
  });
  const sV = kit.slider({
    label: 'سرعة التيار', min: 0.5, max: 8, step: 0.1, value: 2, unit: 'm/s',
    fmt: v => v.toFixed(1),
    oninput: () => { if (mode === 'pitot') fire('pitot'); },
  });
  const rowQ = sQ.input.closest('.sim-row');
  const rowV = sV.input.closest('.sim-row');

  kit.controls.append(el('div', { style: 'font-size:12px; color:#94a3b8' },
    '📘 كما في مثالي الكتاب 3-8 و3-9 — الرسم تقريبي والأرقام دقيقة'));

  function setMode(m) {
    mode = m;
    btnV.className = 'btn sm ' + (m === 'venturi' ? 'amber' : 'secondary');
    btnP.className = 'btn sm ' + (m === 'pitot' ? 'amber' : 'secondary');
    rowQ.style.display = m === 'venturi' ? '' : 'none';
    rowV.style.display = m === 'pitot' ? '' : 'none';
    parts.forEach(p => { p.s = Math.random(); });
  }
  setMode('venturi');

  // ================= وضع الفنشوري =================
  function drawVenturi(c, dt) {
    const W = kit.W, H = kit.H;
    const Q = sQ.value / 1000;                       // m3/s
    const v1 = Q / A1;                               // سرعة المدخل m/s
    const v2 = Q / A2;                               // سرعة العنق m/s
    const dp = RHO / 2 * (v2 * v2 - v1 * v1);        // فرق الضغط Pa
    const dh = dp / ((RHO_HG - RHO) * G) * 1000;     // فرق الزئبق mm
    dhShown += (dh - dhShown) * Math.min(1, dt * 4);
    if (dh > 100) fire('dm100');

    // هندسة الأنبوب — الجريان من اليمين إلى اليسار
    const yPipe = H * 0.25;
    const h1 = H * 0.115, h2 = h1 / 2;
    const xIn = W - 14, xOut = 14, span = xIn - xOut;
    const xAt = u => xIn - u * span;
    const halfAt = u => u < 0.3 ? h1
      : u < 0.42 ? lerp(h1, h2, smooth((u - 0.3) / 0.12))
      : u < 0.58 ? h2
      : u < 0.74 ? lerp(h2, h1, smooth((u - 0.58) / 0.16))
      : h1;

    // جسم الأنبوب
    c.beginPath();
    for (let i = 0; i <= 50; i++) {
      const u = i / 50;
      if (i) c.lineTo(xAt(u), yPipe - halfAt(u)); else c.moveTo(xAt(u), yPipe - halfAt(u));
    }
    for (let i = 50; i >= 0; i--) { const u = i / 50; c.lineTo(xAt(u), yPipe + halfAt(u)); }
    c.closePath();
    c.fillStyle = waterGrad(c, yPipe - h1, yPipe + h1);
    c.fill();
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 2; c.stroke();

    // جسيمات تتسارع داخل العنق (v تتناسب مع 1/D²)
    c.fillStyle = 'rgba(224,242,254,.85)';
    for (const p of parts) {
      const vloc = v1 * Math.pow(h1 / halfAt(p.s), 2);
      p.s += dt * vloc * 46 / span;
      if (p.s > 1) { p.s -= 1; p.off = Math.random() * 2 - 1; }
      c.beginPath();
      c.arc(xAt(p.s), yPipe + p.off * (halfAt(p.s) - 5), 2.2, 0, 6.283);
      c.fill();
    }

    // اتجاه الجريان + الأقطار
    arrow(c, xAt(0.78), yPipe - h1 - 12, xAt(0.93), yPipe - h1 - 12);
    label(c, 'D1 = 100 mm', xAt(0.14), yPipe - h1 - 12, { size: 11, align: 'center' });
    label(c, 'D2 = 50 mm', xAt(0.5), yPipe - h2 - 12, { size: 11, align: 'center', color: '#fbbf24' });

    // المانوميتر U: ساق تحت المدخل (ضغط عالٍ) وساق تحت العنق (ضغط منخفض)
    const xHi = xAt(0.15), xLo = xAt(0.5), legW = 13;
    const yTop = H * 0.56, yBot = H - 16, y0 = H * 0.74;
    const shift = Math.min(40, 1.35 * Math.sqrt(Math.max(dhShown, 0)));
    const yHi = y0 + shift;   // الزئبق ينخفض في جهة الضغط العالي
    const yLo = y0 - shift;   // ويرتفع في جهة العنق

    // أنبوبا التوصيل (مملوءان بالماء)
    c.strokeStyle = 'rgba(56,189,248,.7)'; c.lineWidth = 4;
    c.beginPath(); c.moveTo(xHi, yPipe + halfAt(0.15)); c.lineTo(xHi, yTop + 2); c.stroke();
    c.beginPath(); c.moveTo(xLo, yPipe + halfAt(0.5)); c.lineTo(xLo, yTop + 2); c.stroke();

    // قاع الأنبوب U
    c.fillStyle = '#cbd5e1';
    c.fillRect(xLo - legW / 2, yBot - 10, xHi - xLo + legW, 10);

    const leg = (x, yLevel) => {
      c.fillStyle = 'rgba(56,189,248,.5)';                       // ماء فوق الزئبق
      c.fillRect(x - legW / 2, yTop, legW, yLevel - yTop);
      c.fillStyle = '#cbd5e1';                                   // الزئبق
      c.fillRect(x - legW / 2, yLevel, legW, yBot - yLevel);
      c.strokeStyle = 'rgba(255,255,255,.25)'; c.lineWidth = 1.5;
      c.strokeRect(x - legW / 2, yTop, legW, yBot - yTop);
    };
    leg(xHi, yHi);
    leg(xLo, yLo);

    // شرطتا المستويين وسهم Δh
    const xm = (xHi + xLo) / 2;
    c.strokeStyle = '#fbbf24'; c.lineWidth = 1; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(xLo + legW / 2, yLo); c.lineTo(xm + 20, yLo); c.stroke();
    c.beginPath(); c.moveTo(xHi - legW / 2, yHi); c.lineTo(xm - 20, yHi); c.stroke();
    c.setLineDash([]);
    if (yHi - yLo > 16) {
      const ym = (yHi + yLo) / 2;
      arrow(c, xm, ym, xm, yLo + 3, { width: 1.5, head: 5 });
      arrow(c, xm, ym, xm, yHi - 3, { width: 1.5, head: 5 });
    }
    const dhOk = dh > 100;
    label(c, 'Δh = ' + dh.toFixed(0) + ' mm' + (dhOk ? ' ✓' : ''), xLo - legW - 6, y0,
      { color: dhOk ? '#34d399' : '#fbbf24', size: 12 });
    label(c, 'زئبق', xHi + legW / 2 + 6, yBot - 20, { align: 'left', size: 11 });

    setRead([
      { label: 'التدفق Q', value: sQ.value.toFixed(1) + ' L/s' },
      { label: 'سرعة المدخل v1', value: v1.toFixed(2) + ' m/s' },
      { label: 'سرعة العنق v2', value: v2.toFixed(2) + ' m/s', color: '#fbbf24' },
      { label: 'الفرق Δh', value: dh.toFixed(0) + ' mm', color: dhOk ? '#34d399' : '#38bdf8' },
    ]);
  }

  // ================= وضع بيتوت =================
  function drawPitot(c, dt, t) {
    const W = kit.W, H = kit.H;
    const v = sV.value;
    const h = v * v / (2 * G);              // الارتفاع m
    const vCalc = Math.sqrt(2 * G * h);     // السرعة المحسوبة من الارتفاع
    hShown += (h - hShown) * Math.min(1, dt * 4);

    const yS = H * 0.5, yB = H - 14;
    c.fillStyle = '#1e293b';
    c.fillRect(0, yB, W, H - yB);           // القاع
    c.fillStyle = waterGrad(c, yS, yB);
    c.fillRect(0, yS, W, yB - yS);          // القناة المفتوحة
    c.strokeStyle = 'rgba(224,242,254,.55)'; c.lineWidth = 2;
    c.beginPath(); c.moveTo(0, yS); c.lineTo(W, yS); c.stroke();

    // جسيمات التيار (من اليمين إلى اليسار)
    c.fillStyle = 'rgba(224,242,254,.8)';
    for (const p of parts) {
      p.s -= dt * v * 40 / W;
      if (p.s < 0) p.s += 1;
      const y = yS + 12 + (p.off * 0.5 + 0.5) * (yB - yS - 24);
      c.beginPath(); c.arc(p.s * W, y, 2.2, 0, 6.283); c.fill();
    }
    arrow(c, W - 18, yS + 20, W - 62, yS + 20);
    label(c, 'التيار', W - 68, yS + 20, { size: 11 });

    // أنبوب بيتوت: ساق رأسية وفتحة تواجه التيار
    const xP = W * 0.42, tw = 10;
    const yArm = yS + (yB - yS) * 0.45;
    const yTopTube = yS - (H * 0.34 + 10);
    const colTop = yS - Math.min(H * 0.34, 50 * Math.sqrt(Math.max(hShown, 0)));

    c.lineJoin = 'round'; c.lineCap = 'round';
    c.strokeStyle = 'rgba(203,213,225,.9)'; c.lineWidth = tw;    // جدار الأنبوب
    c.beginPath(); c.moveTo(xP, yTopTube); c.lineTo(xP, yArm); c.lineTo(xP + 28, yArm); c.stroke();
    c.strokeStyle = '#0b1220'; c.lineWidth = tw - 5;             // التجويف
    c.beginPath(); c.moveTo(xP, yTopTube); c.lineTo(xP, yArm); c.lineTo(xP + 28, yArm); c.stroke();
    c.lineCap = 'butt';
    c.strokeStyle = '#38bdf8'; c.lineWidth = tw - 5;             // عمود الماء الصاعد
    c.beginPath(); c.moveTo(xP + 28, yArm); c.lineTo(xP, yArm); c.lineTo(xP, colTop); c.stroke();
    c.lineCap = 'round';

    // نقطة الركود المتوهجة عند الفتحة
    c.fillStyle = 'rgba(251,191,36,.65)';
    c.beginPath(); c.arc(xP + 30, yArm, 3 + Math.sin(t * 4) * 1.2, 0, 6.283); c.fill();

    // سهم الارتفاع h فوق سطح الماء
    c.strokeStyle = '#fbbf24'; c.lineWidth = 1; c.setLineDash([4, 3]);
    c.beginPath(); c.moveTo(xP - tw / 2 - 26, colTop); c.lineTo(xP, colTop); c.stroke();
    c.beginPath(); c.moveTo(xP - tw / 2 - 26, yS); c.lineTo(xP - tw / 2, yS); c.stroke();
    c.setLineDash([]);
    if (yS - colTop > 16) {
      const ym = (yS + colTop) / 2, xa = xP - tw / 2 - 16;
      arrow(c, xa, ym, xa, colTop + 3, { width: 1.5, head: 5 });
      arrow(c, xa, ym, xa, yS - 3, { width: 1.5, head: 5 });
    }
    label(c, 'h = ' + fmtH(h), xP - tw - 24, (yS + colTop) / 2, { color: '#fbbf24', size: 12 });
    label(c, 'أنبوب بيتوت', xP + 14, yTopTube + 2, { align: 'left', size: 11 });
    label(c, 'سطح الماء', 8, yS - 10, { align: 'left', size: 11 });
    label(c, 'h = v² ÷ 2g', W - 12, 16, { color: '#fbbf24', size: 13 });

    setRead([
      { label: 'سرعة التيار v', value: v.toFixed(1) + ' m/s' },
      { label: 'الارتفاع h', value: fmtH(h), color: '#fbbf24' },
      { label: 'v المحسوبة √(2gh)', value: vCalc.toFixed(2) + ' m/s', color: '#34d399' },
    ]);
  }

  // تحديث الشرائح فقط عند تغيّر القيم (توفير أداء)
  function setRead(items) {
    const key = items.map(i => i.label + i.value + (i.color || '')).join('|');
    if (key === lastRead) return;
    lastRead = key;
    read.set(items);
  }

  kit.loop((c, dt, t) => {
    if (mode === 'venturi') drawVenturi(c, dt); else drawPitot(c, dt, t);
  });

  return { destroy() { kit.destroy(); } };
}
