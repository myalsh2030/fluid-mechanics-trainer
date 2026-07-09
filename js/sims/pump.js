// منظومة الضخ: نقطة التشغيل والكفاءة وخطر التكهف — درس الورشة: لا تخنق السحب أبدًا، اخنق الدفع
import { SimKit, label, arrow, waterGrad } from './simkit.js';
import { el, toast } from '../ui.js';

// أوضاع صمام السحب (Suction Valve)
const SUCTION = [
  { label: 'كامل', open: 1 },
  { label: 'فتحة ½', open: 0.5 },
  { label: 'فتحة ¼', open: 0.25 },
];

// خزان بجدران وسطح ماء متموج
function tank(c, x0, y0, x1, y1, lvl, t) {
  const wl = y1 - (y1 - y0 - 8) * lvl + Math.sin(t * 1.7 + x0) * 1.2;
  c.fillStyle = waterGrad(c, wl, y1);
  c.fillRect(x0, wl, x1 - x0, y1 - wl);
  c.strokeStyle = 'rgba(125,211,252,.5)'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(x0, wl); c.lineTo(x1, wl); c.stroke();
  c.strokeStyle = '#475569'; c.lineWidth = 3; c.lineJoin = 'round';
  c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0, y1); c.lineTo(x1, y1); c.lineTo(x1, y0); c.stroke();
}

// رمز محبس: فراشة + ساق تنزل مع الإغلاق
function valveSym(c, x, y, open, color) {
  c.save();
  c.strokeStyle = color; c.lineWidth = 2; c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - 9, y - 8); c.lineTo(x - 9, y + 8);
  c.lineTo(x + 9, y - 8); c.lineTo(x + 9, y + 8);
  c.closePath(); c.stroke();
  c.fillStyle = '#cbd5e1';
  c.fillRect(x - 2.5, y - 15, 5, Math.max((1 - open) * 15, 3));
  c.restore();
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.85 });
  const read = kit.readout();
  let sucIdx = 0, st = null, cavSeen = false;
  let q20T = 0, sweetT = 0, imp = 0, elev = 0.5, suc = 0.75;
  let doneQ20 = ctx.isMissionDone('q20'), doneCav = ctx.isMissionDone('cavit'), doneSweet = ctx.isMissionDone('sweet');

  function compute() {
    const s = sSpeed.value / 100;                    // نسبة السرعة 0.6..1.1
    const open = Math.max(sValve.value / 100, 0.1);  // فتحة صمام الدفع
    const kd = 0.008 / (open * open);                // مقاومة النظام
    const shut = 35 * s * s;                         // رفع الإغلاق التام
    const Q = shut > 15 ? Math.sqrt((shut - 15) / (0.02 + kd)) : 0;  // نقطة التشغيل L/s
    const sucOpen = SUCTION[sucIdx].open;
    const cav = sucOpen <= 0.25 && Q > 0.1;          // تكهف عند خنق السحب لربع فتحة
    const npshLow = sucOpen === 0.5;
    const H = (shut - 0.02 * Q * Q) * (cav ? 0.8 : 1);  // التكهف يهبط بالرفع 20%
    const Qbep = 22 * s;                             // تدفق أفضل كفاءة
    const eta = 0.75 * Math.max(0, 1 - Math.pow((Q - Qbep) / Qbep, 2));
    const P = eta > 0.02 && Q > 0 ? 9.81 * Q * H / eta / 1000 : 0;   // kW (ρ=1000)
    st = { s, open, kd, Q, H, Qbep, eta, P, cav, npshLow, sucOpen };
  }

  function updateReadout() {
    const status = st.cav ? { label: 'الحالة', value: 'تكهف!', color: '#f87171' }
      : st.npshLow ? { label: 'الحالة', value: 'NPSH منخفض', color: '#fbbf24' }
        : { label: 'الحالة', value: 'سليم ✓', color: '#34d399' };
    read.set([
      { label: 'Q', value: st.Q.toFixed(1) + ' L/s', color: '#38bdf8' },
      { label: 'H', value: st.H.toFixed(1) + ' m', color: '#22d3ee' },
      { label: 'η', value: Math.round(st.eta * 100) + '%', color: st.eta >= 0.675 ? '#34d399' : '#e2e8f0' },
      { label: 'P', value: st.P > 0 ? st.P.toFixed(1) + ' kW' : '—', color: '#fbbf24' },
      status,
    ]);
  }

  const onChange = () => { compute(); updateReadout(); };
  const sSpeed = kit.slider({ label: 'سرعة المضخة', min: 60, max: 110, step: 1, value: 75, unit: '%', oninput: onChange });
  const sValve = kit.slider({ label: 'صمام الدفع', min: 10, max: 100, step: 1, value: 25, unit: '%', oninput: onChange });

  kit.controls.append(el('div', { style: 'font-size:13px;font-weight:700;color:#94a3b8' }, '🚰 صمام السحب (Suction Valve):'));
  let sucBtns = [];
  function selectSuction(i) {
    sucIdx = i;
    sucBtns.forEach((b, j) => { b.className = 'btn sm ' + (j === i ? 'amber' : 'secondary'); });
    compute(); updateReadout();
    if (st.cav) toast('💥 تكهف! فقاعات بخار تنهار داخل المضخة — اسمع الطقطقة وشاهد الرفع يهبط');
    else if (st.npshLow) toast('⚠️ هامش السحب انخفض — القاعدة الذهبية: لا تخنق السحب أبدًا، اخنق الدفع');
  }
  sucBtns = kit.buttons(SUCTION.map((v, i) => ({
    label: v.label, cls: i === 0 ? 'amber' : 'secondary', onclick: () => selectSuction(i),
  })));

  compute(); updateReadout();

  // جسيمات الجريان في الأنابيب + فقاعات التكهف عند عين الدافعة
  const parts = Array.from({ length: 18 }, (_, i) => ({ u: i / 18, o: Math.random() * 2 - 1 }));
  const bubs = Array.from({ length: 10 }, () => ({ a: Math.random() * 6.28, r: 4 + Math.random() * 9, s: 1 + Math.random() * 1.5, ph: Math.random() * 6.28 }));

  kit.loop((c, dt, t) => {
    const W = kit.W, H2 = kit.H;
    // ===== الهندسة: خزان سحب يمين → مضخة → أنبوب دفع صاعد → خزان علوي يسار =====
    const py = H2 - 56, px = W * 0.40, pr = 19;
    const ex0 = 14, ex1 = 100, etop = 14, ebot = 60, dy = ebot - 10;
    const tx0 = W - 104, tx1 = W - 14, ttop = py - 60, tbot = py + 26;
    const vx = (tx0 + px + pr) / 2, dvx = (px + ex1) / 2;
    imp += dt * st.s * 9;
    elev += ((0.4 + st.Q / 40 * 0.45) - elev) * Math.min(dt * 2, 1);
    suc += ((0.78 - st.Q / 40 * 0.15) - suc) * Math.min(dt * 2, 1);

    // ===== مخطط H-Q المصغر =====
    const cx0 = px + 26, cx1 = W - 14, cy0 = 14, cy1 = Math.min(H2 * 0.40, 126);
    const cw = cx1 - cx0, chh = cy1 - cy0;
    const X = q => cx0 + q / 40 * cw, Y = h => cy1 - Math.min(h, 45) / 45 * chh;
    const bw = st.Qbep * 0.316;                       // نطاق η ≥ 90% من الذروة
    c.fillStyle = 'rgba(52,211,153,.13)';
    c.fillRect(X(Math.max(st.Qbep - bw, 0)), cy0, (Math.min(st.Qbep + bw, 40) - Math.max(st.Qbep - bw, 0)) / 40 * cw, chh);
    label(c, 'BEP', X(st.Qbep), cy0 + 8, { align: 'center', size: 8.5, color: 'rgba(52,211,153,.85)' });
    c.strokeStyle = 'rgba(148,163,184,.4)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(cx0, cy0); c.lineTo(cx0, cy1); c.lineTo(cx1, cy1); c.stroke();
    [0, 20, 40].forEach(q => label(c, '' + q, X(q), cy1 + 8, { align: 'center', size: 8.5, color: '#64748b' }));
    [20, 40].forEach(h => label(c, '' + h, cx0 - 3, Y(h), { align: 'right', size: 8.5, color: '#64748b' }));
    c.lineWidth = 2; c.lineCap = 'round';
    c.strokeStyle = '#38bdf8'; c.beginPath();        // منحنى المضخة
    for (let q = 0, first = true; q <= 40; q += 2) {
      const h = 35 * st.s * st.s - 0.02 * q * q;
      if (h < 0) break;
      first ? c.moveTo(X(q), Y(h)) : c.lineTo(X(q), Y(h)); first = false;
    }
    c.stroke();
    c.strokeStyle = '#fbbf24'; c.beginPath();        // منحنى النظام
    for (let q = 0, first = true; q <= 40; q += 2) {
      const h = 15 + st.kd * q * q;
      if (h > 45) break;
      first ? c.moveTo(X(q), Y(h)) : c.lineTo(X(q), Y(h)); first = false;
    }
    c.stroke();
    const opr = 3 + Math.abs(Math.sin(t * 4)) * 2;   // نقطة التشغيل النابضة
    c.fillStyle = st.cav ? '#f87171' : '#34d399';
    c.beginPath(); c.arc(X(st.Q), Y(st.H), opr, 0, 6.283); c.fill();
    c.strokeStyle = st.cav ? 'rgba(248,113,113,.4)' : 'rgba(52,211,153,.4)';
    c.beginPath(); c.arc(X(st.Q), Y(st.H), opr + 3, 0, 6.283); c.stroke();
    label(c, 'التدفق L/s', (cx0 + cx1) / 2, cy1 + 19, { align: 'center', size: 9.5 });
    label(c, 'الرفع m', cx0 + 5, cy0 + 7, { align: 'left', size: 9.5 });

    // ===== الأنابيب =====
    const pipeSeg = (x1, y1, x2, y2) => { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke(); };
    c.lineCap = 'butt';
    for (const [sw, col] of [[12, '#475569'], [7, 'rgba(12,74,110,.95)']]) {
      c.strokeStyle = col; c.lineWidth = sw;
      pipeSeg(tx0 + 2, py, px, py);                  // السحب
      pipeSeg(px, py, px, dy);                       // الدفع الرأسي
      pipeSeg(px, dy, ex1 + 4, dy);                  // الدفع الأفقي
    }

    // ===== الخزانات =====
    tank(c, ex0, etop, ex1, ebot, elev, t);          // الخزان العلوي
    tank(c, tx0, ttop, tx1, tbot, suc, t);           // خزان السحب
    label(c, 'الخزان العلوي', (ex0 + ex1) / 2, ebot + 10, { align: 'center', size: 10 });
    label(c, 'خزان السحب', (tx0 + tx1) / 2, ttop - 8, { align: 'center', size: 10 });

    // ===== جسيمات الجريان (سرعتها ∝ Q وتتوقف عند صفر) =====
    const path = [[tx0 + 2, py, px + pr, py], [px, py - pr, px, dy], [px, dy, ex1 + 2, dy]];
    const lens = path.map(sg => Math.hypot(sg[2] - sg[0], sg[3] - sg[1]));
    const total = lens[0] + lens[1] + lens[2];
    const vp = st.Q > 0 ? 24 + st.Q * 3.2 : 0;
    c.fillStyle = 'rgba(125,211,252,.9)';
    for (const p of parts) {
      p.u = (p.u + vp * dt / total) % 1;
      let d = p.u * total, i = 0;
      while (i < 2 && d > lens[i]) { d -= lens[i]; i++; }
      const sg = path[i], L = lens[i], ux = (sg[2] - sg[0]) / L, uy = (sg[3] - sg[1]) / L;
      c.beginPath(); c.arc(sg[0] + ux * d - uy * p.o * 2.2, sg[1] + uy * d + ux * p.o * 2.2, 2, 0, 6.283); c.fill();
    }

    // ===== المحابس =====
    valveSym(c, vx, py, st.sucOpen, st.sucOpen <= 0.25 ? '#f87171' : st.sucOpen < 1 ? '#fbbf24' : '#34d399');
    valveSym(c, dvx, dy, st.open, '#fbbf24');
    label(c, 'صمام السحب', vx, py + 23, { align: 'center', size: 9.5 });
    label(c, 'صمام الدفع', dvx, dy - 22, { align: 'center', size: 9.5 });

    // ===== المضخة: غلاف + دافعة دوارة (ترتج عند التكهف) =====
    const ox = st.cav ? Math.sin(t * 37) * 1.3 : 0, oy = st.cav ? Math.cos(t * 29) * 1 : 0;
    c.save(); c.translate(px + ox, py + oy);
    c.fillStyle = '#0f172a';
    c.beginPath(); c.arc(0, 0, pr, 0, 6.283); c.fill();
    c.strokeStyle = st.cav ? '#f87171' : '#64748b'; c.lineWidth = 3; c.stroke();
    c.strokeStyle = '#94a3b8'; c.lineWidth = 2.5; c.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = imp + i * Math.PI / 2;
      c.beginPath(); c.moveTo(Math.cos(a) * 4, Math.sin(a) * 4);
      c.lineTo(Math.cos(a + 0.5) * (pr - 5), Math.sin(a + 0.5) * (pr - 5)); c.stroke();
    }
    c.fillStyle = '#cbd5e1';
    c.beginPath(); c.arc(0, 0, 3.5, 0, 6.283); c.fill();
    if (st.cav) {                                    // فقاعات ترتج عند عين الدافعة
      c.fillStyle = 'rgba(226,240,255,.85)';
      for (const b of bubs) {
        const bx = Math.cos(b.a + t * b.s) * b.r * 0.8 + Math.sin(t * 30 + b.ph) * 1.5;
        const by = Math.sin(b.a + t * b.s * 1.3) * b.r * 0.6 + Math.cos(t * 26 + b.ph) * 1.5;
        c.beginPath(); c.arc(bx, by, 1.2 + Math.abs(Math.sin(t * 12 + b.ph)), 0, 6.283); c.fill();
      }
    }
    c.restore();
    label(c, 'مضخة طرد مركزي', px - pr - 8, py + 2, { align: 'right', size: 10 });

    // ===== أسهم اتجاه الجريان =====
    arrow(c, vx + 32, py - 14, vx + 4, py - 14, { color: '#38bdf8', width: 2, head: 6 });
    arrow(c, px - 14, py - pr - 6, px - 14, dy + 16, { color: '#38bdf8', width: 2, head: 6 });

    // ===== التحذيرات والدرس =====
    const wx = (cx0 + cx1) / 2;
    if (st.cav) {
      const fl = 0.55 + 0.45 * Math.sin(t * 9);
      label(c, '⚠️ تكهف! Cavitation 🔊', wx, cy1 + 38, { align: 'center', size: 13, color: `rgba(248,113,113,${fl.toFixed(2)})` });
    } else if (st.npshLow) {
      label(c, '⚠️ هامش السحب منخفض NPSH', wx, cy1 + 38, { align: 'center', size: 11.5, color: '#fbbf24' });
    }
    if (sucIdx > 0) label(c, 'لا تخنق السحب أبدًا — اخنق الدفع', W / 2, H2 - 9, { align: 'center', size: 11, color: '#fbbf24' });

    // ===== المهام =====
    if (!doneQ20) {
      if (st.Q >= 19 && st.Q <= 21) {
        q20T += dt;
        if (q20T >= 0.5) { doneQ20 = true; ctx.completeMission('q20'); toast('🎯 ثبّت التدفق على 20 لتر/ثانية — هذا هو المطلوب تمامًا!'); }
      } else q20T = 0;
    }
    if (!doneSweet) {
      if (!st.cav && st.eta >= 0.675) {
        sweetT += dt;
        if (sweetT >= 0.6) { doneSweet = true; ctx.completeMission('sweet'); toast('🍀 تشغيل داخل منطقة أفضل كفاءة BEP — مضختك تشكرك!'); }
      } else sweetT = 0;
    }
    if (st.cav) cavSeen = true;
    if (!doneCav && cavSeen && sucIdx === 0 && !st.cav) {
      doneCav = true; ctx.completeMission('cavit');
      toast('🛠️ فتحت السحب كاملًا فزال التكهف — هكذا يتصرف فني الصيانة المحترف!');
    }
  });

  return { destroy() { kit.destroy(); } };
}
