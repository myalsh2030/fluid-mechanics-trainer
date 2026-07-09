// محاكاة: الغليان وضغط البخار — وضع «القِدر» ووضع «مدخل المضخة» (التكهف)
import { SimKit, label, arrow, waterGrad } from './simkit.js';
import { el } from '../ui.js';

// جدول ضغط البخار المشبع للماء (من كتاب المقرر) — T بالسلزيوس، Pv بالكيلوباسكال
const PV = [
  [10, 1.23], [20, 2.34], [30, 4.25], [40, 7.38], [50, 12.35], [60, 19.9],
  [70, 31.2], [80, 47.4], [90, 70.1], [100, 101.3], [110, 143.3], [120, 198.5],
];

// استيفاء أُسّي بين نقاط الجدول (خطي على لوغاريتم الضغط)
function pvap(T) {
  const t = Math.min(120, Math.max(10, T));
  for (let i = 0; i < PV.length - 1; i++) {
    const [t1, p1] = PV[i], [t2, p2] = PV[i + 1];
    if (t <= t2) {
      const f = (t - t1) / (t2 - t1);
      return Math.exp(Math.log(p1) + f * (Math.log(p2) - Math.log(p1)));
    }
  }
  return PV[PV.length - 1][1];
}

// درجة الغليان عند ضغط معيّن (عكس الجدول)
function tboil(P) {
  if (P <= PV[0][1]) return PV[0][0];
  for (let i = 0; i < PV.length - 1; i++) {
    const [t1, p1] = PV[i], [t2, p2] = PV[i + 1];
    if (P <= p2) return t1 + (t2 - t1) * (Math.log(P) - Math.log(p1)) / (Math.log(p2) - Math.log(p1));
  }
  return 120;
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.7 });
  const st = { mode: 'pot', T: 25, P: 101, Tb: 25, thr: 0 };
  let bubbles = [], steam = [], cav = [], flow = [], read = null;

  function hint(html) {
    kit.controls.append(el('div', {
      class: 'sim-row',
      style: 'font-size:12px; color:#94a3b8; line-height:1.7',
      html,
    }));
  }

  function build() {
    kit.controls.innerHTML = '';
    bubbles = []; steam = []; cav = []; flow = [];
    kit.buttons([
      { label: '🍲 القِدر', cls: st.mode === 'pot' ? 'amber' : 'secondary', onclick: () => { if (st.mode !== 'pot') { st.mode = 'pot'; build(); } } },
      { label: '⚙️ مدخل المضخة', cls: st.mode === 'pump' ? 'amber' : 'secondary', onclick: () => { if (st.mode !== 'pump') { st.mode = 'pump'; build(); } } },
    ]);
    if (st.mode === 'pot') {
      kit.slider({ label: 'درجة الحرارة', min: 10, max: 120, step: 1, value: st.T, unit: '°C', oninput: v => { st.T = v; } });
      kit.slider({ label: 'الضغط المحيط', min: 10, max: 200, step: 1, value: st.P, unit: 'kPa', oninput: v => { st.P = v; } });
      hint('الماء يغلي عندما يبلغ <span class="term">ضغط البخار <i>Vapor Pressure</i></span> قيمة الضغط المحيط — جرّب تخفيض الضغط بدل رفع الحرارة!');
    } else {
      kit.slider({ label: 'حرارة السائل', min: 25, max: 90, step: 1, value: st.Tb, unit: '°C', oninput: v => { st.Tb = v; } });
      kit.slider({ label: 'خنق صمام السحب', min: 0, max: 100, step: 1, value: st.thr, unit: '%', oninput: v => { st.thr = v; } });
      hint('خنق السحب يُهبط الضغط عند <span class="term">عين الدافعة <i>Impeller Eye</i></span> — فإذا نزل تحت ضغط البخار بدأ <span class="term">التكهف <i>Cavitation</i></span>!');
    }
    read = kit.readout();
    // إعادة قياس اللوحة بعد تبديل التحكمات
    for (let i = 0; i < 12; i++) flow.push({ x: Math.random(), y: Math.random() });
  }

  // شارة حالة مرسومة على اللوحة
  function badge(g, text, x, y, color, bg) {
    g.save();
    g.font = '800 15px Cairo, sans-serif';
    const w = g.measureText(text).width + 26;
    g.fillStyle = bg; g.strokeStyle = color; g.lineWidth = 1.5;
    g.beginPath();
    if (g.roundRect) g.roundRect(x - w, y - 14, w, 28, 14); else g.rect(x - w, y - 14, w, 28);
    g.fill(); g.stroke();
    g.fillStyle = color; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(text, x - w / 2, y + 1);
    g.restore();
  }

  // ————— وضع القِدر —————
  function drawPot(g, dt, t) {
    const W = kit.W, H = kit.H;
    const Pv = pvap(st.T), boiling = Pv >= st.P;
    const px = W * 0.28, pw = W * 0.44, py = H * 0.34, ph = H * 0.40;
    const surf = py + ph * 0.2;
    // لهب الموقد حسب الحرارة
    const heat = (st.T - 10) / 110;
    for (let i = 0; i < 5; i++) {
      const fx = px + pw * (0.15 + 0.175 * i);
      const fh = (6 + heat * 22) * (0.8 + 0.25 * Math.sin(t * 9 + i * 2.1));
      g.fillStyle = `rgba(251,191,36,${0.25 + heat * 0.6})`;
      g.beginPath();
      g.moveTo(fx - 5, py + ph + 14); g.quadraticCurveTo(fx, py + ph + 14 - fh * 2, fx + 5, py + ph + 14);
      g.fill();
    }
    g.fillStyle = '#334155'; g.fillRect(px - 10, py + ph + 12, pw + 20, 5);
    // جسم القِدر والماء
    g.fillStyle = '#1e293b'; g.strokeStyle = '#475569'; g.lineWidth = 3;
    g.beginPath(); g.rect(px, py, pw, ph); g.fill();
    g.fillStyle = waterGrad(g, surf, py + ph);
    g.fillRect(px + 3, surf, pw - 6, py + ph - surf - 3);
    // اهتزاز سطح الماء عند الغليان
    g.strokeStyle = boiling ? '#7dd3fc' : '#38bdf8'; g.lineWidth = 2;
    g.beginPath();
    for (let x = 0; x <= pw - 6; x += 6) {
      const yy = surf + (boiling ? Math.sin(t * 12 + x * 0.5) * 2.2 : 0);
      x === 0 ? g.moveTo(px + 3, yy) : g.lineTo(px + 3 + x, yy);
    }
    g.stroke();
    g.strokeStyle = '#475569'; g.strokeRect(px, py, pw, ph);
    g.fillStyle = '#475569';
    g.fillRect(px - 14, py + 8, 14, 6); g.fillRect(px + pw, py + 8, 14, 6);
    // أسهم الضغط المحيط تضغط على السطح
    const al = 8 + (st.P / 200) * 26;
    for (let i = 0; i < 3; i++) {
      const ax = px + pw * (0.25 + 0.25 * i);
      arrow(g, ax, surf - al - 8, ax, surf - 8, { color: 'rgba(226,232,240,.6)', width: 2, head: 6 });
    }
    label(g, 'الضغط المحيط', px + pw * 0.5, py - H * 0.14, { align: 'center', size: 12 });
    // فقاعات الغليان
    if (boiling) {
      const inten = Math.min(1.6, 0.5 + (Pv - st.P) / 40);
      if (bubbles.length < 26 && Math.random() < inten * dt * 22)
        bubbles.push({ x: px + 8 + Math.random() * (pw - 16), y: py + ph - 8, r: 2 + Math.random() * 3, v: 30 + Math.random() * 35, ph: Math.random() * 6 });
      if (steam.length < 10 && Math.random() < dt * 6)
        steam.push({ x: px + pw * (0.25 + Math.random() * 0.5), y: surf - 4, r: 3, a: 0.5 });
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i];
      b.y -= b.v * dt; b.x += Math.sin(t * 5 + b.ph) * 0.4; b.r += dt * 2;
      if (b.y <= surf + 4) { bubbles.splice(i, 1); continue; }
      g.strokeStyle = 'rgba(224,242,254,.85)'; g.lineWidth = 1.5;
      g.beginPath(); g.arc(b.x, b.y, b.r, 0, 7); g.stroke();
    }
    for (let i = steam.length - 1; i >= 0; i--) {
      const s = steam[i];
      s.y -= 22 * dt; s.r += 9 * dt; s.a -= 0.25 * dt;
      if (s.a <= 0 || s.y < 6) { steam.splice(i, 1); continue; }
      g.fillStyle = `rgba(226,232,240,${s.a})`;
      g.beginPath(); g.arc(s.x, s.y, s.r, 0, 7); g.fill();
    }
    // الشارة والقراءات
    if (boiling) badge(g, 'يغلي! ♨️', W - 10, 22, '#fbbf24', 'rgba(251,191,36,.12)');
    else badge(g, 'ساكن', W - 10, 22, '#94a3b8', 'rgba(148,163,184,.10)');
    const tb = tboil(st.P);
    read.set([
      { label: 'ضغط البخار Pv', value: Pv.toFixed(1) + ' kPa', color: '#22d3ee' },
      { label: 'الضغط المحيط P', value: st.P + ' kPa' },
      { label: 'يغلي هنا عند', value: (tb >= 120 ? '>120' : Math.round(tb)) + ' °C', color: '#fbbf24' },
    ]);
    if (boiling && st.T < 60 && !ctx.isMissionDone('boil60')) ctx.completeMission('boil60');
  }

  // ————— وضع مدخل المضخة —————
  function drawPump(g, dt, t) {
    const W = kit.W, H = kit.H;
    const Pv = pvap(st.Tb);
    const localP = 101 - (st.thr / 100) * 96; // من 101 حتى 5 kPa
    const cavON = localP <= Pv;
    const pipeY = H * 0.56, ph2 = H * 0.10;
    const tkX = W * 0.68, tkW = W * 0.26, tkY = H * 0.14, tkH = pipeY + ph2 - tkY;
    const pcx = W * 0.17, pcy = pipeY + ph2 / 2, pr = H * 0.15;
    const vx = W * 0.45;
    // الخزان
    g.fillStyle = '#1e293b'; g.fillRect(tkX, tkY, tkW, tkH);
    g.fillStyle = waterGrad(g, tkY + tkH * 0.25, tkY + tkH);
    g.fillRect(tkX + 3, tkY + tkH * 0.25, tkW - 6, tkH * 0.75 - 3);
    g.strokeStyle = '#475569'; g.lineWidth = 3; g.strokeRect(tkX, tkY, tkW, tkH);
    label(g, 'الخزان', tkX + tkW / 2, tkY + tkH * 0.16, { align: 'center', size: 12 });
    // أنبوب السحب: اللون يعكس هبوط الضغط باتجاه المضخة
    const grad = g.createLinearGradient(tkX, 0, pcx, 0);
    grad.addColorStop(0, 'rgba(56,189,248,.9)');
    grad.addColorStop(1, `rgba(56,189,248,${0.25 + 0.65 * (localP / 101)})`);
    g.fillStyle = grad; g.fillRect(pcx, pipeY, tkX - pcx, ph2);
    g.strokeStyle = '#475569'; g.lineWidth = 2.5; g.strokeRect(pcx, pipeY, tkX - pcx, ph2);
    // جسيمات الجريان داخل الأنبوب (تبطؤ مع الخنق)
    const spd = 0.28 * (1 - 0.7 * st.thr / 100);
    for (const f of flow) {
      f.x -= spd * dt; if (f.x < 0) f.x = 1;
      g.fillStyle = 'rgba(224,242,254,.7)';
      g.beginPath();
      g.arc(pcx + 6 + f.x * (tkX - pcx - 12), pipeY + 4 + f.y * (ph2 - 8), 2, 0, 7);
      g.fill();
    }
    // صمام السحب (بوابة تنزل مع الخنق)
    const gate = (st.thr / 100) * (ph2 - 3);
    g.fillStyle = '#f87171'; g.fillRect(vx - 4, pipeY - 12, 8, 12 + gate);
    g.fillStyle = '#94a3b8'; g.fillRect(vx - 10, pipeY - 16, 20, 5);
    label(g, 'صمام السحب', vx, pipeY - 26, { align: 'center', size: 12 });
    // المضخة والدافعة الدوّارة
    g.fillStyle = '#1e293b'; g.strokeStyle = cavON ? '#f87171' : '#475569'; g.lineWidth = 3;
    g.beginPath(); g.arc(pcx, pcy, pr, 0, 7); g.fill(); g.stroke();
    g.fillStyle = '#334155'; g.fillRect(pcx - 8, pcy - pr - H * 0.1, 16, H * 0.1);
    const rot = t * (2.5 - st.thr / 80);
    g.save(); g.translate(pcx, pcy); g.rotate(rot);
    g.strokeStyle = '#38bdf8'; g.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      g.rotate(2.094);
      g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(pr * 0.5, pr * 0.25, pr * 0.75, 0); g.stroke();
    }
    g.restore();
    g.fillStyle = '#fbbf24'; g.beginPath(); g.arc(pcx, pcy, 4, 0, 7); g.fill();
    label(g, 'المضخة', pcx, pcy + pr + 14, { align: 'center', size: 12 });
    // فقاعات التكهف عند عين الدافعة
    if (cavON) {
      if (cav.length < 24 && Math.random() < dt * 30)
        cav.push({ x: pcx + pr * 0.7 + Math.random() * 14, y: pcy - 6 + Math.random() * 12, r: 1.5 + Math.random() * 2.5, life: 0.5 + Math.random() * 0.4 });
      const blink = 0.55 + 0.45 * Math.sin(t * 9);
      g.strokeStyle = `rgba(248,113,113,${blink})`; g.lineWidth = 3;
      g.beginPath(); g.arc(pcx, pcy, pr + 5, 0, 7); g.stroke();
      g.save(); g.font = '800 16px Cairo, sans-serif'; g.textAlign = 'center';
      g.fillStyle = `rgba(248,113,113,${blink})`;
      g.fillText('تكهف Cavitation! ⚠️', W * 0.42, H * 0.14);
      g.restore();
    }
    for (let i = cav.length - 1; i >= 0; i--) {
      const c = cav[i];
      c.life -= dt; c.x -= 26 * dt; c.y += Math.sin(t * 14 + i) * 0.6;
      if (c.life <= 0) { cav.splice(i, 1); continue; }
      g.fillStyle = `rgba(255,255,255,${Math.min(0.9, c.life * 1.8)})`;
      g.beginPath(); g.arc(c.x, c.y, c.r, 0, 7); g.fill();
    }
    // سهم اتجاه السحب + الشارة
    arrow(g, tkX - 8, pipeY - 8, pcx + pr + 18, pipeY - 8, { color: 'rgba(148,163,184,.5)', width: 2, head: 6 });
    if (cavON) badge(g, 'خطر: تكهف!', W - 10, 22, '#f87171', 'rgba(248,113,113,.12)');
    else badge(g, 'سحب سليم ✅', W - 10, 22, '#34d399', 'rgba(52,211,153,.10)');
    read.set([
      { label: 'الضغط عند العين', value: localP.toFixed(1) + ' kPa', color: cavON ? '#f87171' : '#38bdf8' },
      { label: 'ضغط البخار Pv', value: Pv.toFixed(1) + ' kPa', color: '#22d3ee' },
      { label: 'الحالة', value: cavON ? 'تكهف!' : 'سليم', color: cavON ? '#f87171' : '#34d399' },
    ]);
    if (cavON && !ctx.isMissionDone('cavit')) ctx.completeMission('cavit');
  }

  build();
  kit.loop((g, dt, t) => {
    if (st.mode === 'pot') drawPot(g, dt, t); else drawPump(g, dt, t);
  });

  return { destroy() { kit.destroy(); } };
}
