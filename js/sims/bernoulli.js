// خزان برنولي: تحول الطاقة بين الوضع والضغط والحركة في خزان بفتحة جانبية
import { SimKit, label, arrow, waterGrad } from './simkit.js';
import { el } from '../ui.js';

const G = 9.81; // تسارع الجاذبية m/s²

const POINT_IDS = ['A', 'B', 'C'];
const POINT_COLORS = { A: '#34d399', B: '#38bdf8', C: '#fbbf24' };
const CAPTIONS = {
  A: 'النقطة A عند السطح: كل الطاقة هنا <span class="term">طاقة وضع <i>Elevation Head</i></span>، والضغط فوق السطح جوي فقط، والماء شبه ساكن.',
  B: 'النقطة B عند عمق الفتحة داخل الخزان: طاقة الوضع تحوّلت كلها إلى <span class="term">طاقة ضغط <i>Pressure Head</i></span> — تذكّر P = ρ × g × h.',
  C: 'النقطة C في النافورة خارج الفتحة: الضغط عاد جويًا، وكل الطاقة صارت <span class="term">طاقة حركة <i>Velocity Head</i></span> — لهذا v = √(2gh).',
};
const BAR_NAMES = ['وضع', 'ضغط', 'حركة'];
const BAR_COLORS = ['#34d399', '#38bdf8', '#fbbf24'];

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.8 });
  const read = kit.readout();

  let sel = 'A';                    // النقطة المختارة
  const disp = [0, 0, 0];           // أعمدة الطاقة المعروضة (م عمود ماء) — تتحرك بنعومة
  let hd = 1.5;                     // مستوى الماء المرسوم (يلحق بالمنزلق بنعومة)
  const drops = [];                 // جسيمات النفث
  let spawnT = 0;
  const pts = { A: { x: 0, y: 0 }, B: { x: 0, y: 0 }, C: { x: 0, y: 0 } };

  const hSl = kit.slider({
    label: 'مستوى الماء h',
    min: 0.5, max: 4, step: 0.1, value: 1.5, unit: 'm',
    fmt: v => v.toFixed(1),
    oninput: update,
  });

  const btns = kit.buttons([
    { label: 'A السطح', onclick: () => select('A') },
    { label: 'B الفتحة', onclick: () => select('B') },
    { label: 'C النافورة', onclick: () => select('C') },
  ]);

  const caption = el('div', { class: 'small muted', style: 'line-height:1.9; padding:2px 4px' });
  kit.controls.append(caption);

  function vJet(h) { return Math.sqrt(2 * G * h); }

  function update() {
    const h = hSl.value;
    const v = vJet(h);
    read.set([
      { label: 'سرعة النفث v', value: v.toFixed(2) + ' m/s', color: '#fbbf24' },
      { label: 'العمق h', value: h.toFixed(1) + ' m' },
      { label: 'الطاقة الكلية', value: h.toFixed(1) + ' m', color: '#34d399' },
    ]);
    if (v > 7 && !ctx.isMissionDone('jet7')) ctx.completeMission('jet7');
  }

  function select(p) {
    sel = p;
    btns.forEach((b, i) => { b.className = 'btn sm ' + (POINT_IDS[i] === p ? 'amber' : 'secondary'); });
    caption.innerHTML = CAPTIONS[p];
    if (p === 'C' && !ctx.isMissionDone('pointc')) ctx.completeMission('pointc');
  }

  const onTap = (e) => {
    const r = kit.canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    for (const p of POINT_IDS) {
      const q = pts[p];
      if ((x - q.x) * (x - q.x) + (y - q.y) * (y - q.y) < 26 * 26) { select(p); return; }
    }
  };
  kit.canvas.addEventListener('pointerdown', onTap);

  update();
  select('A');

  kit.loop((c, dt, t) => {
    const W = kit.W, H = kit.H;
    const h = hSl.value;
    hd += (h - hd) * Math.min(1, dt * 5);

    // ---- الهندسة (تُحسب كل إطار لتصمد أمام تغيير المقاس) ----
    const ground = H - 14;
    const tankW = Math.min(W * 0.34, 150);
    const tankX = W - tankW - 12;
    const tankTop = 20;
    const oy = ground - Math.max(30, H * 0.13);      // ارتفاع الفتحة
    const S = (oy - tankTop - 10) / 4;               // بكسل لكل متر
    const surfY = oy - hd * S;                        // سطح الماء
    const jx = tankX - 8;                             // بداية النفث بعد الفوهة
    const vd = vJet(Math.max(hd, 0.05));              // سرعة النفث المرسومة

    // ---- الأرض ----
    c.strokeStyle = 'rgba(148,163,184,.35)';
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(8, ground); c.lineTo(W - 8, ground); c.stroke();

    // ---- ماء الخزان + موجة السطح ----
    c.fillStyle = waterGrad(c, surfY, ground);
    c.fillRect(tankX + 2, surfY, tankW - 4, ground - surfY);
    c.strokeStyle = 'rgba(224,242,254,.55)';
    c.lineWidth = 2;
    c.beginPath();
    for (let i = 0; i <= 10; i++) {
      const x = tankX + 2 + (tankW - 4) * i / 10;
      const y = surfY + Math.sin(t * 2.4 + i) * 1.4;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();

    // ---- جدران الخزان (مفتوح من أعلى، فتحة في الجدار الأيسر) ----
    c.strokeStyle = '#8fa3bf';
    c.lineWidth = 3;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(tankX, tankTop); c.lineTo(tankX, oy - 7);
    c.moveTo(tankX, oy + 7); c.lineTo(tankX, ground);
    c.lineTo(tankX + tankW, ground);
    c.lineTo(tankX + tankW, tankTop);
    c.stroke();
    c.lineWidth = 2.5;
    c.beginPath();
    c.moveTo(tankX, oy - 7); c.lineTo(jx, oy - 7);
    c.moveTo(tankX, oy + 7); c.lineTo(jx, oy + 7);
    c.stroke();

    // ---- سهم العمق h داخل الخزان ----
    const ax = tankX + tankW - 16;
    arrow(c, ax, surfY + 6, ax, oy - 2, { color: 'rgba(251,191,36,.85)', width: 1.5, head: 5 });
    arrow(c, ax, oy - 2, ax, surfY + 6, { color: 'rgba(251,191,36,.85)', width: 1.5, head: 5 });
    label(c, 'h', ax - 8, (surfY + oy) / 2, { size: 12, color: '#fbbf24' });

    // ---- النفث المكافئ: x = v·t ، سقوط y = ½·g·t² ----
    const hf = (ground - oy) / S;                     // ارتفاع السقوط بالمتر
    const tf = Math.sqrt(2 * hf / G);                 // زمن الوصول للأرض
    c.strokeStyle = 'rgba(56,189,248,.45)';
    c.lineWidth = 5;
    c.beginPath();
    for (let i = 0; i <= 14; i++) {
      const tt = tf * i / 14;
      const x = jx - vd * tt * S;
      const y = oy + 0.5 * G * tt * tt * S;
      if (i) c.lineTo(x, y); else c.moveTo(x, y);
    }
    c.stroke();

    // جسيمات النفث
    spawnT -= dt;
    while (spawnT <= 0) {
      spawnT += 0.045;
      if (drops.length < 30) drops.push({ t: Math.random() * 0.03, j: (Math.random() - 0.5) * 3 });
    }
    c.fillStyle = 'rgba(224,242,254,.95)';
    for (const d of drops) {
      d.t += dt;
      if (d.t > tf) d.t -= tf;                        // يعود إلى الفوهة
      const x = jx - vd * d.t * S;
      const y = oy + 0.5 * G * d.t * d.t * S + d.j;
      c.beginPath(); c.arc(x, y, 2.1, 0, 7); c.fill();
    }

    // رذاذ الارتطام بالأرض
    const xland = jx - vd * tf * S;
    const rp = (t * 26) % 16;
    c.strokeStyle = 'rgba(56,189,248,' + (0.55 * (1 - rp / 16)).toFixed(2) + ')';
    c.lineWidth = 2;
    c.beginPath();
    c.ellipse(xland, ground, 4 + rp, (4 + rp) * 0.3, 0, Math.PI, Math.PI * 2);
    c.stroke();

    // ---- مواقع النقاط الثلاث ----
    pts.A.x = tankX + tankW / 2; pts.A.y = surfY;
    pts.B.x = tankX + 22;        pts.B.y = oy;
    const tc = 30 / (vd * S);                         // زمن وصول النفث لموضع C
    pts.C.x = jx - 30;           pts.C.y = oy + 0.5 * G * tc * tc * S;

    label(c, 'السطح', pts.A.x, surfY - 20, { size: 11, align: 'center' });
    label(c, 'الفتحة', pts.B.x + 2, oy + 24, { size: 11, align: 'center' });
    label(c, 'النافورة', pts.C.x - 4, pts.C.y - 20, { size: 11, align: 'center' });

    for (const p of POINT_IDS) {
      const q = pts[p];
      const on = p === sel;
      if (on) {
        c.beginPath();
        c.arc(q.x, q.y, 15 + Math.sin(t * 5) * 2.5, 0, 7);
        c.strokeStyle = POINT_COLORS[p] + '88';
        c.lineWidth = 2;
        c.stroke();
      }
      c.beginPath(); c.arc(q.x, q.y, 12, 0, 7);
      c.fillStyle = on ? POINT_COLORS[p] : '#1b2742';
      c.fill();
      c.lineWidth = 2;
      c.strokeStyle = on ? '#fff' : POINT_COLORS[p];
      c.stroke();
      label(c, p, q.x, q.y + 1, { size: 12, color: on ? '#06283d' : '#e2e8f0', align: 'center', weight: 800 });
    }

    // ---- ميزان الطاقة: 3 أعمدة مجموعها ثابت = h ----
    const tg = sel === 'A' ? [h, 0, 0] : sel === 'B' ? [0, h, 0] : [0, 0, h];
    for (let i = 0; i < 3; i++) disp[i] += (tg[i] - disp[i]) * Math.min(1, dt * 6);

    const bw = 24, gap = 16;
    const panelW = 3 * bw + 2 * gap;
    const px0 = 16;
    const barMax = H * 0.42;
    const bBase = 28 + barMax;
    const bScale = barMax / 4.6; // متسع علوي كي لا تتصادم التسميات مع العنوان عند h القصوى

    label(c, 'ميزان الطاقة (m ماء)', px0 + panelW / 2, 14, { size: 11.5, align: 'center' });
    for (let i = 0; i < 3; i++) {
      const bx = px0 + (2 - i) * (bw + gap);          // ترتيب من اليمين لليسار
      c.fillStyle = 'rgba(255,255,255,.06)';
      c.fillRect(bx, bBase - barMax, bw, barMax);
      const bh = disp[i] * bScale;
      c.fillStyle = BAR_COLORS[i];
      c.fillRect(bx, bBase - bh, bw, bh);
      label(c, BAR_NAMES[i], bx + bw / 2, bBase + 12, { size: 11.5, color: BAR_COLORS[i], align: 'center' });
      if (disp[i] > 0.1) label(c, disp[i].toFixed(1), bx + bw / 2, bBase - bh - 9, { size: 10.5, color: '#e2e8f0', align: 'center' });
    }

    // خط الإجمالي: لا يتغير مهما بدّلت النقطة
    const tot = disp[0] + disp[1] + disp[2];
    const ty = bBase - tot * bScale;
    c.setLineDash([5, 4]);
    c.strokeStyle = 'rgba(251,191,36,.8)';
    c.lineWidth = 1.5;
    c.beginPath(); c.moveTo(px0 - 6, ty); c.lineTo(px0 + panelW + 6, ty); c.stroke();
    c.setLineDash([]);
    label(c, 'الإجمالي ' + tot.toFixed(1), px0 + panelW / 2, Math.max(ty - 10, 26), { size: 10.5, color: '#fbbf24', align: 'center' });
  });

  return {
    destroy() {
      kit.canvas.removeEventListener('pointerdown', onTap);
      kit.destroy();
    },
  };
}
