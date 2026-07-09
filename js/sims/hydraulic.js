// المكبس الهيدروليكي: قاعدة باسكال — قوة يد صغيرة ترفع سيارة كاملة
import { SimKit, label, arrow } from './simkit.js';
import { el } from '../ui.js';

const W_CAR = 8000;        // وزن السيارة (N)
const D_BIG_CM = 3;        // شوط المكبس الكبير الحقيقي لكل رفعة (cm)

// مستطيل بزوايا دائرية (مسار فقط)
function rr(c, x, y, w, h, r) {
  const k = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + k, y);
  c.arcTo(x + w, y, x + w, y + h, k);
  c.arcTo(x + w, y + h, x, y + h, k);
  c.arcTo(x, y + h, x, y, k);
  c.arcTo(x, y, x + w, y, k);
  c.closePath();
}

// سيارة صغيرة فوق المكبس الكبير — ترجع إحداثية أعلى نقطة فيها
function drawCar(c, cx, baseY, w) {
  const r = w * 0.085 + 3;
  const bodyH = w * 0.15 + 9;
  const bodyY = baseY - r - bodyH;
  const cabinH = bodyH * 0.85;
  c.fillStyle = '#f87171';
  rr(c, cx - w / 2, bodyY, w, bodyH + r * 0.5, 7); c.fill();
  rr(c, cx - w * 0.30, bodyY - cabinH, w * 0.56, cabinH + 4, 6); c.fill();
  c.fillStyle = 'rgba(11,18,32,.8)';
  rr(c, cx - w * 0.24, bodyY - cabinH + 4, w * 0.20, cabinH - 7, 3); c.fill();
  rr(c, cx + w * 0.02, bodyY - cabinH + 4, w * 0.20, cabinH - 7, 3); c.fill();
  for (const dx of [-w * 0.29, w * 0.29]) {
    c.beginPath(); c.arc(cx + dx, baseY - r, r, 0, 7);
    c.fillStyle = '#0b1220'; c.fill();
    c.lineWidth = 2; c.strokeStyle = '#64748b'; c.stroke();
    c.beginPath(); c.arc(cx + dx, baseY - r, r * 0.35, 0, 7);
    c.fillStyle = '#94a3b8'; c.fill();
  }
  return bodyY - cabinH;
}

const fmtF = n => n >= 1000 ? (n / 1000).toFixed(n >= 99500 ? 0 : 1) + ' kN' : Math.round(n) + ' N';
const fmtX = n => n >= 100 ? String(Math.round(n)) : String(Math.round(n * 10) / 10);
const fmtLen = cm => cm >= 100 ? (Math.round(cm / 10) / 10) + ' m' : Math.round(cm) + ' cm';

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.7 });
  const read = kit.readout();

  const sA1 = kit.slider({ label: 'مساحة الصغير A1', min: 5, max: 100, step: 1, value: 25, unit: 'cm²' });
  const sA2 = kit.slider({ label: 'مساحة الكبير A2', min: 200, max: 5000, step: 25, value: 500, unit: 'cm²' });
  const sF1 = kit.slider({ label: 'قوة اليد F1', min: 10, max: 500, step: 5, value: 50, unit: 'N' });

  container.append(el('div', {
    class: 'muted small', style: 'margin-top:10px',
    html: '💡 <span class="term">قاعدة باسكال <i>Pascal</i></span>: الضغط في الزيت المحبوس ينتقل بالتساوي في كل الاتجاهات، لذلك F2 = F1 × (A2 ÷ A1). الثمن؟ المكبس الصغير يقطع مسافة أكبر بنفس النسبة — ولهذا تضخ <span class="term">الرافعة الهيدروليكية <i>Hydraulic Jack</i></span> عدة ضخّات لرفعة واحدة.',
  }));

  let lift = 0;                                   // 0..1 حركة الرفع
  let doneLift = !!ctx.isMissionDone?.('lift');
  let doneRatio = !!ctx.isMissionDone?.('ratio50');
  let lastKey = '';
  const dots = Array.from({ length: 7 }, (_, i) => ({ p: i / 7, off: ((i * 37) % 3 - 1) * 4 }));

  kit.loop((c, dt, t) => {
    const A1 = sA1.value, A2 = sA2.value, F1 = sF1.value;
    const eps = A2 / A1;                          // الفائدة الآلية
    const F2 = F1 * eps;                          // قوة المكبس الكبير
    const P = F1 * 10 / A1;                       // الضغط في الزيت (kPa)
    const lifted = F2 >= W_CAR;
    lift += ((lifted ? 1 : 0) - lift) * Math.min(dt * 2.5, 1);

    // ---- المهام ----
    if (!doneRatio && eps >= 50) { doneRatio = true; ctx.completeMission('ratio50'); }
    if (!doneLift && lifted && F1 <= 100 && lift > 0.5) { doneLift = true; ctx.completeMission('lift'); }

    // ---- شريط القراءات (يُحدَّث فقط عند تغير القيم) ----
    const key = A1 + '|' + A2 + '|' + F1;
    if (key !== lastKey) {
      lastKey = key;
      read.set([
        { label: 'F2', value: fmtF(F2), color: lifted ? '#34d399' : '#38bdf8' },
        { label: 'الفائدة الآلية ε', value: '×' + fmtX(eps) },
        { label: 'ضغط الزيت P', value: fmtX(P) + ' kPa' },
        { label: 'الشوط صغير:كبير', value: fmtX(eps) + ' : 1' },
      ]);
    }

    // ---- الهندسة ----
    const Wc = kit.W, H = kit.H;
    const groundY = H - 14, chTop = H - 44;
    const bx = Wc * 0.30, sx = Wc * 0.80;
    const wB = 24 + Math.sqrt(A2) * 1.4, wS = 14 + Math.sqrt(A1) * 2;
    const bWallTop = H * 0.50, sWallTop = H * 0.28;
    const bRest = H * 0.60, sRest = H * 0.40;
    const bStrokeVis = H * 0.09;
    const sStrokeVis = Math.min(chTop - 16 - sRest, 10 + eps * 0.8);
    const plateY = bRest - lift * bStrokeVis;      // أعلى المكبس الكبير
    const sPistY = sRest + lift * sStrokeVis;      // أعلى المكبس الصغير
    const handleY = sPistY - 26;

    // ---- الأرضية ----
    c.fillStyle = '#152036';
    c.fillRect(0, groundY, Wc, H - groundY);

    // ---- الزيت الهيدروليكي ----
    const g = c.createLinearGradient(0, H * 0.35, 0, groundY);
    g.addColorStop(0, 'rgba(251,191,36,.40)');
    g.addColorStop(1, 'rgba(245,158,11,.72)');
    c.fillStyle = g;
    c.fillRect(bx - wB / 2, plateY + 10, wB, groundY - plateY - 10);
    c.fillRect(sx - wS / 2, sPistY + 10, wS, groundY - sPistY - 10);
    c.fillRect(bx - wB / 2, chTop, (sx + wS / 2) - (bx - wB / 2), groundY - chTop);

    // ---- نقاط الجريان في قناة الوصل ----
    const v = ((lifted ? 1 : 0) - lift) * 2.2;
    for (const d of dots) d.p = (d.p + v * dt * 1.1 + 1) % 1;
    if (Math.abs(v) > 0.02) {
      c.fillStyle = 'rgba(226,232,240,.55)';
      for (const d of dots) {
        c.beginPath();
        c.arc(sx + (bx - sx) * d.p, (chTop + groundY) / 2 + d.off, 2.2, 0, 7);
        c.fill();
      }
    }

    // ---- جدران الأسطوانتين والقناة ----
    c.strokeStyle = 'rgba(255,255,255,.28)'; c.lineWidth = 3; c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx - wB / 2, bWallTop); c.lineTo(bx - wB / 2, groundY);   // جدار الكبير الخارجي
    c.moveTo(bx + wB / 2, bWallTop); c.lineTo(bx + wB / 2, chTop);     // جدار الكبير الداخلي
    c.moveTo(sx + wS / 2, sWallTop); c.lineTo(sx + wS / 2, groundY);   // جدار الصغير الخارجي
    c.moveTo(sx - wS / 2, sWallTop); c.lineTo(sx - wS / 2, chTop);     // جدار الصغير الداخلي
    c.moveTo(bx + wB / 2, chTop); c.lineTo(sx - wS / 2, chTop);        // سقف القناة
    c.moveTo(bx - wB / 2, groundY); c.lineTo(sx + wS / 2, groundY);    // قاع القناة
    c.stroke();

    // ---- خطوط وضع البداية (لإظهار فرق الشوط) ----
    if (lift > 0.05) {
      c.save();
      c.setLineDash([3, 4]); c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,.30)';
      c.beginPath();
      c.moveTo(sx - wS / 2 + 2, sRest); c.lineTo(sx + wS / 2 - 2, sRest);
      c.moveTo(bx - wB / 2 + 2, bRest); c.lineTo(bx + wB / 2 - 2, bRest);
      c.stroke();
      c.restore();
    }

    // ---- المكبس الصغير + الذراع واليد ----
    const piston = (cx, w, y) => {
      c.fillStyle = '#cbd5e1'; rr(c, cx - w / 2 + 1, y, w - 2, 10, 3); c.fill();
      c.fillStyle = 'rgba(0,0,0,.25)'; c.fillRect(cx - w / 2 + 1, y + 7, w - 2, 3);
    };
    piston(sx, wS, sPistY);
    c.fillStyle = '#94a3b8';
    c.fillRect(sx - 3, handleY, 6, sPistY - handleY);
    rr(c, sx - 16, handleY - 6, 32, 7, 3); c.fill();
    const bob = lifted ? 0 : Math.sin(t * 2.2) * 1.5;
    label(c, '✋', sx, handleY - 16 + bob, { size: 18, align: 'center' });

    // ---- المكبس الكبير + السيارة ----
    piston(bx, wB, plateY);
    const carW = Math.max(wB * 1.05, 76);
    c.fillStyle = '#cbd5e1'; rr(c, bx - carW / 2, plateY - 6, carW, 6, 2); c.fill();
    c.save();
    if (lift > 0.6) { c.shadowColor = 'rgba(52,211,153,.7)'; c.shadowBlur = 14; }
    const carTop = drawCar(c, bx, plateY - 6, carW);
    c.restore();
    label(c, 'W = 8000 N', bx, carTop - 10, { size: 11, color: '#94a3b8', align: 'center' });

    // ---- الأسهم: F1 هابط و F2 صاعد بأطوال تناسب القوتين ----
    const xF1 = sx + wS / 2 + 13;
    const lenF1 = 16 + (F1 / 500) * 44;
    arrow(c, xF1, Math.max(handleY - 6 - lenF1, 6), xF1, handleY - 4,
      { color: '#fbbf24', width: 2.5 + F1 / 200 });
    label(c, 'F1', xF1 + 6, Math.max(handleY - 4 - lenF1 / 2, 16), { size: 12, color: '#fbbf24', align: 'left' });
    const xF2 = bx - wB / 2 - 13;
    const lenF2 = 16 + Math.min(F2 / W_CAR, 2) * 28;
    const f2Col = lifted ? '#34d399' : '#38bdf8';
    arrow(c, xF2, plateY + 8 + lenF2, xF2, plateY + 6,
      { color: f2Col, width: 2.5 + Math.min(F2 / W_CAR, 3) });
    label(c, 'F2', xF2 - 6, plateY + 8 + lenF2 / 2, { size: 12, color: f2Col, align: 'right' });

    // ---- تسميات المساحات والضغط ----
    label(c, 'A1 = ' + A1 + ' cm²', sx - wS / 2 - 6, sWallTop + 12, { size: 11, align: 'right' });
    label(c, 'A2 = ' + A2 + ' cm²', bx + wB / 2 + 8, bWallTop + 10, { size: 11, align: 'left' });
    label(c, 'نفس P في كل الزيت: ' + fmtX(P) + ' kPa', (bx + sx) / 2, (chTop + groundY) / 2,
      { size: 10.5, color: '#e2e8f0', align: 'center' });

    // ---- شريط الحالة ----
    if (lifted) {
      label(c, 'ارتفعت السيارة! قوة صغيرة × مساحة كبيرة ✅', Wc / 2, 16,
        { size: 13, color: '#34d399', align: 'center' });
      label(c, 'الكبير ارتفع ' + D_BIG_CM + ' cm فقط… والصغير نزل ' + fmtLen(D_BIG_CM * eps), Wc / 2, 34,
        { size: 11.5, color: '#94a3b8', align: 'center' });
    } else {
      label(c, 'F2 = ' + fmtF(F2) + ' — تحتاج 8 kN لرفع السيارة', Wc / 2, 16,
        { size: 12.5, color: '#94a3b8', align: 'center' });
      label(c, 'زد قوة اليد أو كبّر النسبة A2 ÷ A1', Wc / 2, 34,
        { size: 11.5, color: 'rgba(148,163,184,.7)', align: 'center' });
    }
  });

  return { destroy() { kit.destroy(); } };
}
