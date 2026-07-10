// مجرى الهواء والمروحة — القطر المكافئ De = 4A/P ثم Δp = f·(L/De)·(ρv²/2) وقدرة المروحة P = Δp×Q
// الهواء ρ = 1.2 kg/m³ — معامل الاحتكاك f = 0.02 (تقريب تدريبي ثابت)
import { SimKit, label, arrow } from './simkit.js';
import { el, toast } from '../ui.js';

const RHO = 1.2;
const F = 0.02;

function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }
function fmtDp(dp) { return dp >= 1000 ? (dp / 1000).toFixed(1) + ' kPa' : Math.round(dp) + ' Pa'; }
function fmtPw(p) { return p >= 1000 ? (p / 1000).toFixed(2) + ' kW' : (p >= 10 ? Math.round(p) : p.toFixed(1)) + ' W'; }

// لون الهواء: سماوي هادئ يميل إلى الكهرمان كلما اشتدت السرعة
function airColor(v, a) {
  const t = clamp((v - 4) / 20, 0, 1);
  const r = Math.round(140 + 111 * t);
  const g = Math.round(224 - 33 * t);
  const b = Math.round(255 - 200 * t);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.7 });
  const read = kit.readout();

  let w = 0.8, hh = 0.5, L = 30, Q = 2;
  let spin = 0;
  const press = { sq: false, flat: false, lastKind: '' };
  const done = {
    kw1: !!(ctx.isMissionDone && ctx.isMissionDone('kw1')),
    shape: !!(ctx.isMissionDone && ctx.isMissionDone('shape')),
  };

  function calc() {
    const A = w * hh;                          // مساحة المقطع m²
    const Per = 2 * (w + hh);                  // المحيط m
    const De = 4 * A / Per;                    // القطر المكافئ m
    const v = Q / A;                           // سرعة الهواء m/s
    const dp = F * (L / De) * (RHO * v * v / 2); // فقد الضغط Pa
    return { A, De, v, dp, Pw: dp * Q };       // القدرة W
  }

  function check() {
    if (!done.kw1 && calc().Pw > 1000) { done.kw1 = true; ctx.completeMission('kw1'); }
  }

  const sW = kit.slider({ label: 'العرض w', min: 0.2, max: 2, step: 0.01, value: w, unit: 'm', fmt: x => x.toFixed(2), oninput: x => { w = x; check(); } });
  const sH = kit.slider({ label: 'الارتفاع h', min: 0.1, max: 1, step: 0.01, value: hh, unit: 'm', fmt: x => x.toFixed(2), oninput: x => { hh = x; check(); } });
  kit.slider({ label: 'الطول L', min: 5, max: 100, step: 1, value: L, unit: 'm', oninput: x => { L = x; check(); } });
  kit.slider({ label: 'تدفق الهواء Q', min: 0.2, max: 6, step: 0.1, value: Q, unit: 'm³/s', fmt: x => x.toFixed(1), oninput: x => { Q = x; check(); } });

  // إعادة تشكيل المقطع مع الحفاظ على نفس المساحة A قدر الإمكان
  function applyPreset(kind) {
    const A = w * hh;
    let nh = kind === 'sq' ? Math.sqrt(A) : Math.sqrt(A / 4); // مربع: w=h=√A — مسطّح: w=4h
    nh = clamp(nh, 0.1, 1);
    const nw = clamp(A / nh, 0.2, 2);
    nh = clamp(A / nw, 0.1, 1);
    w = Math.round(nw * 100) / 100;
    hh = Math.round(nh * 100) / 100;
    sW.set(w); sH.set(hh);
    press[kind] = true; // سُجّل استخدام هذا الزر
    if (press.sq && press.flat && press.lastKind !== kind) {
      // مقارنة حيّة بقيم اللحظة الحالية (لا قيم مخزنة من ضغطة سابقة قد تكون بمعطيات مختلفة)
      const A2 = w * hh;
      const shapeDp = (targetH) => {
        let th = clamp(targetH, 0.1, 1);
        const tw = clamp(A2 / th, 0.2, 2);
        th = clamp(A2 / tw, 0.1, 1);
        const De2 = 4 * (tw * th) / (2 * (tw + th));
        const v2 = Q / (tw * th);
        return F * (L / De2) * (RHO * v2 * v2 / 2);
      };
      const a = shapeDp(Math.sqrt(A2)), b = shapeDp(Math.sqrt(A2 / 4));
      if (b > a * 1.03) {
        toast('🏆 بنفس المساحة: فقد المربع ' + fmtDp(a) + ' مقابل ' + fmtDp(b) + ' للمسطّح — المربع يوفّر ' + Math.round((1 - a / b) * 100) + '%!');
        // المهمة تُنجز فقط عند معاينة فرق حقيقي بين الشكلين
        if (!done.shape) { done.shape = true; ctx.completeMission('shape'); }
      } else {
        toast('⚖️ حدود المنزلقات قصّت الشكلين هنا — جرّب مساحة أصغر لترى الفرق');
      }
    }
    press.lastKind = kind;
    check();
  }

  kit.buttons([
    { label: '⬜ مربّع (نفس A)', onclick: () => applyPreset('sq') },
    { label: '▭ مسطّح عريض (نفس A)', onclick: () => applyPreset('flat') },
  ]);

  // بطاقة تعليمية: لماذا يهم شكل المقطع؟
  container.append(el('div', {
    class: 'small muted',
    style: 'margin-top:10px; background:var(--c-surface2); border:1px solid var(--c-border); border-radius:12px; padding:10px 14px;',
    html: '<span class="chip water">💡 نفس المساحة ≠ نفس الفقد!</span> كلما ابتعد مقطع '
      + '<span class="term">المجرى <i>Duct</i></span> عن المربع زاد محيطه، فيصغر '
      + '<span class="term">القطر المكافئ <i>Equivalent Diameter</i></span> De = 4A/P ويرتفع '
      + '<span class="term">فقد الضغط <i>Pressure Drop</i></span> Δp — فتدفع '
      + '<span class="term">المروحة <i>Fan</i></span> فاتورة أكبر: P = Δp × Q. '
      + '(نستخدم معامل الاحتكاك f = 0.02 كتقريب تدريبي ثابت)',
  }));

  // ---------- رشقات الهواء داخل المجرى ----------
  const streaks = [];
  for (let i = 0; i < 26; i++) {
    streaks.push({ u: Math.random(), lane: Math.random() * 2 - 1, q: Math.random() });
  }

  // هندسة الرسم: مجرى مجسّم بإسقاط مائل — العمق ∝ العرض w والواجهة ∝ الارتفاع h
  function geom() {
    const W = kit.W, H = kit.H;
    const hPix = H * (0.16 + 0.28 * (hh - 0.1) / 0.9);
    // سقف للعمق كي لا يُقص الوجه الخلفي وملصق Δp خارج يسار اللوحة
    const d = Math.min(16 + (H * 0.22 - 16) * (w - 0.2) / 1.8, (46 - 6) / 0.62);
    const cy = H * 0.56;
    return {
      W, H, cy, hPix,
      dx: -d * 0.62, dy: -d * 0.5,
      xL: 46, xR: W - 86,
      yT: cy - hPix / 2, yB: cy + hPix / 2,
    };
  }

  function silhouette(c, g) {
    c.beginPath();
    c.moveTo(g.xR, g.yB);
    c.lineTo(g.xR, g.yT);
    c.lineTo(g.xR + g.dx, g.yT + g.dy);
    c.lineTo(g.xL + g.dx, g.yT + g.dy);
    c.lineTo(g.xL + g.dx, g.yB + g.dy);
    c.lineTo(g.xL, g.yB);
    c.closePath();
  }

  function drawDuct(c, g, cc) {
    // الوجه العلوي
    c.beginPath();
    c.moveTo(g.xR, g.yT); c.lineTo(g.xR + g.dx, g.yT + g.dy);
    c.lineTo(g.xL + g.dx, g.yT + g.dy); c.lineTo(g.xL, g.yT);
    c.closePath();
    c.fillStyle = 'rgba(148,163,184,.15)'; c.fill();
    c.strokeStyle = 'rgba(100,116,139,.7)'; c.lineWidth = 1.5; c.stroke();
    // وجه المخرج (يسارًا)
    c.beginPath();
    c.moveTo(g.xL, g.yT); c.lineTo(g.xL + g.dx, g.yT + g.dy);
    c.lineTo(g.xL + g.dx, g.yB + g.dy); c.lineTo(g.xL, g.yB);
    c.closePath();
    c.fillStyle = 'rgba(56,189,248,.10)'; c.fill();
    c.stroke();
    // الوجه الأمامي الزجاجي + احمرار خفيف كلما ارتفع الفقد
    c.fillStyle = 'rgba(13,23,42,.42)';
    c.fillRect(g.xL, g.yT, g.xR - g.xL, g.hPix);
    const heat = Math.min(0.16, cc.dp / 9000);
    if (heat > 0.01) {
      c.fillStyle = 'rgba(248,113,113,' + heat.toFixed(3) + ')';
      c.fillRect(g.xL, g.yT, g.xR - g.xL, g.hPix);
    }
  }

  function drawStreaks(c, g, cc, dt) {
    const span = g.xR - g.xL;
    const pxV = clamp(26 + cc.v * 13, 26, g.W * 1.4);  // سرعة الرسم ∝ v
    const tail = 7 + Math.min(cc.v, 28) * 1.2;         // ذيل أطول = أسرع
    c.save();
    silhouette(c, g);
    c.clip();
    c.lineCap = 'round';
    for (const s of streaks) {
      s.u += (pxV * dt) / span;
      if (s.u > 1.02) { s.u = -Math.random() * 0.06; s.lane = Math.random() * 2 - 1; s.q = Math.random(); }
      const x = g.xR - s.u * span + s.q * g.dx * 0.85;
      const y = g.cy + s.lane * (g.hPix / 2 - 6) + s.q * g.dy * 0.85;
      c.strokeStyle = airColor(cc.v, (0.8 - s.q * 0.45).toFixed(2));
      c.lineWidth = 2.2 - s.q;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + tail, y); c.stroke();
    }
    c.restore();
    // حواف الواجهة فوق الرشقات + سهم خروج الهواء
    c.strokeStyle = '#64748b'; c.lineWidth = 2;
    c.strokeRect(g.xL, g.yT, g.xR - g.xL, g.hPix);
    arrow(c, g.xL - 4, g.cy, g.xL - 22, g.cy, { color: '#22d3ee', width: 2, head: 6 });
  }

  function drawFan(c, g, cc, t) {
    const cx = g.xR + 38, cyF = g.cy;
    const rf = clamp(g.hPix * 0.6, 18, 40);
    c.save();
    c.translate(cx, cyF);
    if (cc.Pw > 1000) { // توهج نبضي عند تجاوز 1 kW
      c.beginPath(); c.arc(0, 0, rf + 5, 0, Math.PI * 2);
      c.strokeStyle = 'rgba(251,191,36,' + (0.35 + 0.2 * Math.sin(t * 5)).toFixed(2) + ')';
      c.lineWidth = 5; c.stroke();
    }
    c.beginPath(); c.arc(0, 0, rf, 0, Math.PI * 2);
    c.fillStyle = '#101b30'; c.fill();
    c.strokeStyle = cc.Pw > 1000 ? '#fbbf24' : '#64748b'; c.lineWidth = 3; c.stroke();
    c.rotate(spin);
    c.fillStyle = 'rgba(251,191,36,.85)';
    for (let i = 0; i < 4; i++) {
      c.rotate(Math.PI / 2);
      c.beginPath(); c.ellipse(rf * 0.52, 0, rf * 0.4, rf * 0.15, 0.45, 0, Math.PI * 2); c.fill();
    }
    c.beginPath(); c.arc(0, 0, rf * 0.17, 0, Math.PI * 2);
    c.fillStyle = '#94a3b8'; c.fill();
    c.restore();
    label(c, 'مروحة ' + fmtPw(cc.Pw), cx, cyF + rf + 13,
      { size: 11.5, align: 'center', color: cc.Pw > 1000 ? '#fbbf24' : '#94a3b8' });
  }

  function drawInfo(c, g, cc) {
    label(c, 'المقطع w × h: ' + w.toFixed(2) + ' × ' + hh.toFixed(2) + ' m', g.W / 2, 16,
      { size: 12.5, align: 'center', color: '#e2e8f0' });
    if (cc.v > 30) {
      label(c, '🚫 خارج نطاق التصميم الواقعي — المجاري الحقيقية لا تتجاوز ~20 m/s', g.W / 2, 34,
        { size: 11.5, align: 'center', color: '#f87171' });
    } else if (cc.v > 15) {
      label(c, '⚠️ السرعة عالية جدًا — ضوضاء واهتزاز!', g.W / 2, 34,
        { size: 12, align: 'center', color: '#f87171' });
    }
    label(c, 'Δp = ' + fmtDp(cc.dp), g.xL + g.dx, g.yT + g.dy - 11,
      { size: 12, align: 'left', color: cc.dp > 500 ? '#f87171' : '#fbbf24' });
    // بُعد الطول أسفل المجرى
    const yL = g.yB + 14;
    arrow(c, g.W / 2 - 26, yL, g.xL, yL, { color: '#94a3b8', width: 1.5, head: 5 });
    arrow(c, g.W / 2 + 26, yL, g.xR, yL, { color: '#94a3b8', width: 1.5, head: 5 });
    label(c, 'L = ' + L + ' m', g.W / 2, yL + 1, { size: 11.5, align: 'center', color: '#94a3b8' });
  }

  let lastKey = '';
  function updateRead(cc) {
    const key = w + '|' + hh + '|' + L + '|' + Q;
    if (key === lastKey) return;
    lastKey = key;
    read.set([
      { label: 'المساحة A', value: cc.A.toFixed(2) + ' m²', color: '#22d3ee' },
      { label: 'المكافئ De', value: cc.De.toFixed(2) + ' m', color: '#a78bfa' },
      { label: 'السرعة v', value: cc.v.toFixed(1) + ' m/s', color: cc.v > 15 ? '#f87171' : '#38bdf8' },
      { label: 'الفقد Δp', value: fmtDp(cc.dp), color: '#fbbf24' },
      { label: '⚡ القدرة', value: fmtPw(cc.Pw), color: cc.Pw > 1000 ? '#f87171' : '#34d399' },
    ]);
  }

  kit.loop((c, dt, t) => {
    const cc = calc();
    updateRead(cc);
    spin = (spin + dt * clamp(2.5 + cc.v * 0.45, 2.5, 16)) % (Math.PI * 2);
    const g = geom();
    drawDuct(c, g, cc);
    drawStreaks(c, g, cc, dt);
    drawFan(c, g, cc, t);
    drawInfo(c, g, cc);
  });

  return { destroy() { kit.destroy(); } };
}
