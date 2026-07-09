// المانوميتر U: اقرأ ضغط خزان الغاز من فرق عمودَي الزئبق — كما في عدادات الورشة
import { SimKit, label, arrow } from './simkit.js';
import { el } from '../ui.js';

const RHO = 13600;   // كثافة الزئبق kg/m³
const G = 9.81;      // عجلة الجاذبية m/s²
const AMBER = '#fbbf24', PURPLE = '#a78bfa', OK = '#34d399', TEXT2 = '#94a3b8';

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.8 });
  let P = 0;        // ضغط الخزان المقاس kPa (Gauge)
  let hAnim = 0;    // فرق العمودين المتحرك mm
  let lastKey = '';

  // جزيئات الغاز داخل الخزان (حركة خفيفة توحي بالضغط)
  const parts = [];
  for (let i = 0; i < 14; i++) {
    const a = Math.random() * Math.PI * 2;
    parts.push({ x: 0.1 + Math.random() * 0.8, y: 0.1 + Math.random() * 0.8, vx: Math.cos(a), vy: Math.sin(a) });
  }

  const read = kit.readout();
  const slider = kit.slider({
    label: 'ضغط الخزان',
    min: -60, max: 60, step: 0.5, value: 0, unit: 'kPa',
    fmt: v => (v > 0 ? '+' : '') + v.toFixed(1),
    oninput: v => { P = v; },
  });
  const setP = v => { P = v; slider.set(v); };
  kit.buttons([
    { label: 'جوي (صفر)', onclick: () => setP(0) },
    { label: '+27 kPa (مثال الكتاب)', cls: 'amber', onclick: () => setP(27) },
    { label: 'تفريغ', cls: 'ghost', onclick: () => setP(-40) },
  ]);
  kit.controls.append(el('div', { class: 'sim-row', style: 'font-size:12px; color:#94a3b8; line-height:1.7' },
    'الرموز: P الضغط (Pa) — ρ كثافة الزئبق 13600 kg/m³ — g الجاذبية 9.81 m/s² — h فرق العمودين (m)'));

  const hOfP = p => p * 1e6 / (RHO * G);   // kPa → فرق عمودين mm
  const done = id => (ctx.isMissionDone ? ctx.isMissionDone(id) : false);

  kit.loop((c, dt, t) => {
    const W = kit.W, H = kit.H;
    const hT = hOfP(P);
    hAnim += (hT - hAnim) * Math.min(1, dt * 3.5);
    if (Math.abs(hAnim - hT) < 0.05) hAnim = hT;

    // المهام (حسب قيمة المنزلق المستهدفة لا الحركة العابرة)
    const absT = Math.abs(hT);
    if (!done('read200') && absT >= 190 && absT <= 210) ctx.completeMission('read200');
    if (!done('vacuum') && P < -5) ctx.completeMission('vacuum');

    // الهندسة
    const tank = { x: W * 0.04, y: H * 0.16, w: W * 0.24, h: H * 0.26 };
    const xL = W * 0.46, xR = W * 0.74, xM = (xL + xR) / 2;
    const tw = Math.max(14, Math.min(24, W * 0.055));
    const yPipe = tank.y + tank.h * 0.55;
    const yTopR = H * 0.10;
    const y0 = H * 0.50, yBot = H * 0.84;
    const r = (xR - xL) / 2, yBend = yBot - r;
    const pxPerMm = (H * 0.29) / 450;
    const yL = y0 + (hAnim * pxPerMm) / 2;   // ضغط موجب: يهبط عمود جهة الخزان
    const yR = y0 - (hAnim * pxPerMm) / 2;   // ...ويرتفع العمود المفتوح
    const vac = P < -0.25;
    const gasCol = vac ? 'rgba(167,139,250,.28)' : 'rgba(251,191,36,.22)';

    // شريط الحالة أعلى اللوحة
    if (vac) label(c, 'تفريغ Vacuum — انعكس العمودان!', W * 0.5, H * 0.045, { color: PURPLE, size: 13.5, align: 'center', weight: 800 });

    // الخزان
    rr(c, tank.x, tank.y, tank.w, tank.h, 10);
    c.fillStyle = '#141e33'; c.fill();
    c.strokeStyle = vac ? PURPLE : (P > 0.25 ? AMBER : 'rgba(255,255,255,.2)');
    c.lineWidth = 2; c.stroke();
    const spd = 0.25 + 0.9 * (P + 60) / 120;
    const n = vac ? 7 : 14;
    c.fillStyle = vac ? 'rgba(167,139,250,.55)' : 'rgba(251,191,36,.75)';
    for (let i = 0; i < n; i++) {
      const p = parts[i];
      p.x += p.vx * dt * spd; p.y += p.vy * dt * spd;
      if (p.x < 0.07) { p.x = 0.07; p.vx *= -1; } else if (p.x > 0.93) { p.x = 0.93; p.vx *= -1; }
      if (p.y < 0.1) { p.y = 0.1; p.vy *= -1; } else if (p.y > 0.9) { p.y = 0.9; p.vy *= -1; }
      c.beginPath();
      c.arc(tank.x + p.x * tank.w, tank.y + p.y * tank.h, 2, 0, 6.2832);
      c.fill();
    }
    label(c, 'خزان الغاز', tank.x + tank.w / 2, tank.y - 11, { align: 'center', size: 12 });
    label(c, (P > 0 ? '+' : '') + P.toFixed(1) + ' kPa', tank.x + tank.w / 2, tank.y + tank.h / 2,
      { align: 'center', size: 15, weight: 800, color: vac ? PURPLE : (P > 0.25 ? AMBER : '#e2e8f0') });

    // أنبوب التوصيل من الخزان إلى الفرع الأيسر
    const tankR = tank.x + tank.w;
    strokeLine(c, tankR, yPipe, xL, yPipe, tw * 0.55 + 4, 'rgba(148,163,184,.35)');
    strokeLine(c, tankR, yPipe, xL, yPipe, tw * 0.55, '#0d1526');
    strokeLine(c, tankR, yPipe, xL, yPipe, Math.max(3, tw * 0.55 - 4), gasCol);

    // زجاج الأنبوب U
    tube(c, xL, yPipe, xR, yTopR, xM, yBend, r, tw + 5, 'rgba(148,163,184,.35)');
    tube(c, xL, yPipe, xR, yTopR, xM, yBend, r, tw, '#0d1526');

    // عمود الغاز فوق الزئبق (الفرع الأيسر)
    strokeLine(c, xL, yPipe, xL, yL, tw - 4, gasCol);

    // الزئبق
    const mg = c.createLinearGradient(0, Math.min(yL, yR), 0, yBot);
    mg.addColorStop(0, '#cbd5e1'); mg.addColorStop(1, '#64748b');
    c.strokeStyle = mg; c.lineWidth = tw - 4; c.lineCap = 'butt';
    c.beginPath();
    c.moveTo(xL, yL); c.lineTo(xL, yBend);
    c.arc(xM, yBend, r, Math.PI, 0, true);
    c.lineTo(xR, yR);
    c.stroke();
    // لمعة سطح الزئبق
    const sh = 0.6 + 0.25 * Math.sin(t * 2.2);
    c.fillStyle = 'rgba(226,232,240,' + sh.toFixed(2) + ')';
    surf(c, xL, yL, (tw - 4) / 2);
    surf(c, xR, yR, (tw - 4) / 2);
    label(c, 'زئبق', xM, yBend + r * 0.5, { align: 'center', size: 12, color: '#cbd5e1' });

    // فوهة الفرع المفتوح
    c.strokeStyle = 'rgba(148,163,184,.6)'; c.lineWidth = 2;
    strokeLine(c, xR - tw / 2 - 1, yTopR, xR - tw / 2 - 6, yTopR - 7, 2, 'rgba(148,163,184,.6)');
    strokeLine(c, xR + tw / 2 + 1, yTopR, xR + tw / 2 + 6, yTopR - 7, 2, 'rgba(148,163,184,.6)');
    label(c, 'مفتوح للجو', xR, yTopR - 15, { align: 'center', size: 11 });

    // خطوط الأبعاد وقراءة h
    const hShow = Math.abs(Math.round(hAnim));
    if (Math.abs(hAnim) > 6) {
      const hit = hShow >= 190 && hShow <= 210;
      const col = hit ? OK : (vac ? PURPLE : AMBER);
      c.save();
      c.setLineDash([5, 4]);
      c.strokeStyle = TEXT2; c.lineWidth = 1;
      c.beginPath(); c.moveTo(xL - tw, yL); c.lineTo(xM + 4, yL); c.stroke();
      c.beginPath(); c.moveTo(xM - 4, yR); c.lineTo(xR + tw, yR); c.stroke();
      c.restore();
      const mid = (yL + yR) / 2;
      arrow(c, xM, mid, xM, yL + (yL > mid ? -2 : 2), { color: col, width: 2, head: 6 });
      arrow(c, xM, mid, xM, yR + (yR > mid ? -2 : 2), { color: col, width: 2, head: 6 });
      label(c, 'h = ' + hShow + ' mm', xM, Math.min(yL, yR) - 12, { align: 'center', size: 13, weight: 800, color: col });
    } else {
      label(c, 'مستويان متساويان', xM, y0 - 16, { align: 'center', size: 11, color: TEXT2 });
    }

    // المعادلة الحية أسفل اللوحة
    const hM = Math.abs(hAnim) / 1000;
    const Pc = RHO * G * hM / 1000;
    const eq = 'P = ρ·g·h = 13600 × 9.81 × ' + hM.toFixed(3) + ' = ' + (hAnim < 0 ? '−' : '') + Pc.toFixed(1) + ' kPa';
    label(c, eq, W * 0.5, H * 0.94, { align: 'center', size: 12.5, weight: 700, color: vac ? PURPLE : AMBER });

    // شريط القراءات (يُحدَّث عند التغيّر فقط)
    const key = hShow + '|' + P + '|' + (vac ? 1 : 0);
    if (key !== lastKey) {
      lastKey = key;
      const st = vac ? ['تفريغ ⚠️', PURPLE] : (P > 0.25 ? ['ضغط موجب', AMBER] : ['جوي', TEXT2]);
      read.set([
        { label: 'ضغط الخزان', value: (P > 0 ? '+' : '') + P.toFixed(1) + ' kPa', color: st[1] },
        { label: 'فرق العمودين h', value: hShow + ' mm', color: '#38bdf8' },
        { label: 'الحالة', value: st[0], color: st[1] },
      ]);
    }
  });

  return { destroy() { kit.destroy(); } };
}

// ===== أدوات رسم صغيرة =====
function strokeLine(c, x1, y1, x2, y2, w, color) {
  c.strokeStyle = color; c.lineWidth = w; c.lineCap = 'butt';
  c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
}

// مسار الأنبوب U: فرعان رأسيان + انحناء نصف دائري سفلي
function tube(c, xL, y1, xR, y2, xM, yBend, r, width, color) {
  c.beginPath();
  c.moveTo(xL, y1);
  c.lineTo(xL, yBend);
  c.arc(xM, yBend, r, Math.PI, 0, true);
  c.lineTo(xR, y2);
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'butt'; c.lineJoin = 'round';
  c.stroke();
}

// مستطيل بزوايا دائرية (مسار فقط)
function rr(c, x, y, w, h, rad) {
  c.beginPath();
  c.moveTo(x + rad, y);
  c.arcTo(x + w, y, x + w, y + h, rad);
  c.arcTo(x + w, y + h, x, y + h, rad);
  c.arcTo(x, y + h, x, y, rad);
  c.arcTo(x, y, x + w, y, rad);
  c.closePath();
}

// سطح الزئبق اللامع
function surf(c, x, y, rx) {
  c.beginPath();
  c.ellipse(x, y, rx, 2.2, 0, 0, 6.2832);
  c.fill();
}
