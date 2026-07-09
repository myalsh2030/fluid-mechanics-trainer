// الأنبوب اللامّ — معادلة الاستمرارية: Q = A×v ثابت مهما ضاق الأنبوب
// المدخل ثابت 100 mm، المخرج والتدفق بيد المتدرب — والسرعة تنطلق أمام عينيه
import { SimKit, label, arrow, waterGrad } from './simkit.js';
import { el } from '../ui.js';

const D1MM = 100;                       // قطر المدخل الثابت mm
const A1 = Math.PI / 4 * 0.1 * 0.1;     // مساحة المدخل m²

function areaOf(dmm) { return Math.PI / 4 * Math.pow(dmm / 1000, 2); }

// أزرق الماء → كهرمان الطاقة كلما زادت السرعة
function speedColor(v) {
  const t = Math.max(0, Math.min(1, (v - 3) / 9));
  const r = Math.round(56 + 195 * t);
  const g = Math.round(189 + 2 * t);
  const b = Math.round(248 - 212 * t);
  return 'rgb(' + r + ',' + g + ',' + b + ')';
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.6 });
  const read = kit.readout();

  let d2 = 100;   // قطر المخرج mm
  let Q = 20;     // التدفق L/s
  const done = {
    x4: !!(ctx.isMissionDone && ctx.isMissionDone('x4')),
    q50: !!(ctx.isMissionDone && ctx.isMissionDone('q50')),
  };

  function calc() {
    const q = Q / 1000;                 // m³/s
    const v1 = q / A1;
    const v2 = q / areaOf(d2);
    return { v1, v2, ratio: v2 / v1 };
  }

  function check() {
    if (!done.x4 && calc().ratio >= 4) { done.x4 = true; ctx.completeMission('x4'); }
    if (!done.q50 && Q >= 48 && Q <= 52) { done.q50 = true; ctx.completeMission('q50'); }
  }

  kit.slider({
    label: 'قطر المخرج d2', min: 20, max: 100, step: 1, value: d2, unit: 'mm',
    oninput: v => { d2 = v; check(); },
  });
  kit.slider({
    label: 'التدفق Q', min: 5, max: 80, step: 1, value: Q, unit: 'L/s',
    oninput: v => { Q = v; check(); },
  });

  // ربط بالكتاب: خرطوم الحديقة وإصبعك (مثال 3-2)
  container.append(el('div', {
    class: 'small muted',
    style: 'margin-top:10px; background:var(--c-surface2); border:1px solid var(--c-border); border-radius:12px; padding:10px 14px;',
    html: '🚿 <b>خرطوم الحديقة وإصبعك:</b> سُدّ جزءًا من فوهة الخرطوم بإصبعك — صغّرت '
      + '<span class="term">المساحة <i>Area</i></span> فانطلقت '
      + '<span class="term">السرعة <i>Velocity</i></span>! هذا بالضبط '
      + '<span class="term">مبدأ الاستمرارية <i>Continuity</i></span> '
      + 'في مثال الكتاب 3-2 (أنبوب يضيق من قطر 0.46 m إلى 0.15 m). المقياس مختلف والقاعدة واحدة: '
      + '<b>Q = A × v</b> ثابت — ما دام السائل لا يُضغط ولا يتسرّب.',
  }));

  // ---------- الجسيمات: التباعد والسرعة يتبعان v المحلية ----------
  const parts = [];
  for (let i = 0; i < 34; i++) {
    parts.push({ x: 6 + Math.random() * (kit.W - 20), lane: (Math.random() * 2 - 1) * 0.8 });
  }

  // هندسة الأنبوب (الجريان من اليمين إلى اليسار — إحساس RTL)
  function geom() {
    const W = kit.W, H = kit.H;
    const cy = H * 0.52;
    const R1 = H * 0.21;
    return {
      W, H, cy, R1,
      R2: R1 * d2 / D1MM,
      xIn: W - 12,          // المدخل يمينًا
      xOut: 40,             // نهاية الأنبوب يسارًا
      xEnd: 6,              // نهاية النفث الخارج
      tR: W * 0.60, tL: W * 0.38,   // منطقة التضييق
    };
  }

  function radiusAt(g, x) {
    if (x >= g.tR) return g.R1;
    if (x <= g.tL) return g.R2;
    const t = (g.tR - x) / (g.tR - g.tL);
    const s = t * t * (3 - 2 * t);    // انتقال ناعم
    return g.R1 + (g.R2 - g.R1) * s;
  }

  function drawPipe(c, g) {
    const step = 8;
    c.save();
    c.beginPath();
    c.moveTo(g.xIn, g.cy - g.R1);
    for (let x = g.xIn; x >= g.xOut; x -= step) c.lineTo(x, g.cy - radiusAt(g, x));
    c.lineTo(g.xOut, g.cy - g.R2);
    c.lineTo(g.xOut, g.cy + g.R2);
    for (let x = g.xOut; x <= g.xIn; x += step) c.lineTo(x, g.cy + radiusAt(g, x));
    c.closePath();
    c.fillStyle = waterGrad(c, g.cy - g.R1, g.cy + g.R1, 0.3, 0.45);
    c.fill();
    c.strokeStyle = '#64748b';
    c.lineWidth = 3;
    c.stroke();
    // خطوط انسياب خافتة تتقارب في القسم الضيق
    c.strokeStyle = 'rgba(255,255,255,.09)';
    c.lineWidth = 1;
    for (const f of [-0.5, 0, 0.5]) {
      c.beginPath();
      for (let x = g.xIn; x >= g.xOut; x -= step) {
        const y = g.cy + f * radiusAt(g, x) * 0.9;
        if (x === g.xIn) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.stroke();
    }
    c.restore();
  }

  function drawParticles(c, g, dt, v1) {
    c.save();
    c.lineCap = 'round';
    for (const p of parts) {
      const r = radiusAt(g, p.x);
      const v = v1 * Math.pow(g.R1 / r, 2);           // v المحلية بالفعل m/s
      const px = Math.min(g.W * 0.05 * v + g.W * 0.03, g.W * 1.5); // سرعة رسم مقيدة
      p.x -= px * dt;
      if (p.x < g.xEnd) {                             // إعادة تدوير عند المخرج
        p.x = g.xIn - Math.random() * 16;
        p.lane = (Math.random() * 2 - 1) * 0.8;
      }
      const y = g.cy + p.lane * r * 0.85;
      c.strokeStyle = speedColor(v);
      c.lineWidth = p.x < g.tL ? 2.5 : 2;
      c.beginPath();
      c.moveTo(p.x, y);
      c.lineTo(p.x + 4 + px * 0.05, y);               // ذيل أطول = أسرع
      c.stroke();
    }
    c.restore();
  }

  function drawInfo(c, g, cc) {
    const yTop = g.cy - g.R1 - 13;
    const yBot = g.cy + g.R1 + 16;
    label(c, 'المدخل d1 = 100 mm', g.xIn, yTop, { size: 12 });
    label(c, 'المخرج d2 = ' + d2 + ' mm', g.xOut + 2, yTop, { size: 12, align: 'left', color: '#e2e8f0' });
    label(c, 'v1 = ' + cc.v1.toFixed(2) + ' m/s', g.xIn, yBot, { size: 12, color: '#38bdf8' });
    label(c, 'v2 = ' + cc.v2.toFixed(2) + ' m/s', g.xOut + 2, yBot, { size: 12, align: 'left', color: speedColor(cc.v2) });
    // نسبة التسارع أعلى المنتصف
    const hot = cc.ratio >= 4;
    label(c, 'التسارع ×' + cc.ratio.toFixed(1) + (hot ? ' 🚀' : ''), g.W / 2, g.H * 0.11,
      { size: hot ? 16 : 14, align: 'center', color: hot ? '#fbbf24' : '#94a3b8', weight: 800 });
    // اتجاه الجريان أسفل المنتصف
    arrow(c, g.W * 0.56, yBot, g.W * 0.44, yBot, { color: '#22d3ee', width: 2 });
    label(c, 'اتجاه الجريان', g.W / 2, Math.min(yBot + 15, g.H - 8), { size: 11, align: 'center' });
  }

  let lastKey = '';
  function updateRead(cc) {
    const key = d2 + '|' + Q;
    if (key === lastKey) return;
    lastKey = key;
    read.set([
      { label: 'v<sub>1</sub>', value: cc.v1.toFixed(2) + ' m/s', color: '#38bdf8' },
      { label: 'v<sub>2</sub>', value: cc.v2.toFixed(2) + ' m/s', color: cc.v2 >= 8 ? '#fbbf24' : '#22d3ee' },
      { label: 'نسبة التسارع v2/v1', value: '×' + cc.ratio.toFixed(1), color: cc.ratio >= 4 ? '#fbbf24' : '#a78bfa' },
      { label: 'A×v ثابت دائمًا', value: Q + ' L/s', color: '#34d399' },
    ]);
  }

  kit.loop((c, dt) => {
    const cc = calc();
    updateRead(cc);
    const g = geom();
    drawPipe(c, g);
    drawParticles(c, g, dt, cc.v1);
    drawInfo(c, g, cc);
  });

  return { destroy() { kit.destroy(); } };
}
