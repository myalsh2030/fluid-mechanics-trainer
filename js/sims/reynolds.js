// آلة رينولدز: خيط الحبر داخل أنبوب زجاجي يكشف نظام الجريان — رقائقي، انتقالي، مضطرب
import { SimKit, label, arrow } from './simkit.js';
import { el } from '../ui.js';

const LAM = 2100, TURB = 10000;

const FLUIDS = {
  water: { name: 'ماء', rho: 1000, mu: 0.001, muTxt: '0.001', tint: 'rgba(56,189,248,.16)' },
  air: { name: 'هواء', rho: 1.2, mu: 0.000018, muTxt: '1.8×10⁻⁵', tint: 'rgba(226,232,240,.05)' },
  oil: { name: 'زيت', rho: 900, mu: 0.3, muTxt: '0.3', tint: 'rgba(251,191,36,.13)' },
};

const fmtRe = n => Math.round(n).toLocaleString('en-US');

function smooth(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
}

function zoneOf(re) {
  if (re < LAM) return { name: 'رقائقي', color: '#38bdf8', emoji: '🪶' };
  if (re < TURB) return { name: 'انتقالي', color: '#94a3b8', emoji: '〰️' };
  return { name: 'مضطرب', color: '#fb923c', emoji: '🌀' };
}

// مستطيل بزوايا دائرية (مسار فقط)
function rr(g, x, y, w, h, r) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}

// اضطراب عشوائي المظهر لكنه سلس زمنيًا (مجموع جيوب)
function chaos(s, p) {
  return 0.5 * Math.sin(s * 23 - p * 2.6)
    + 0.32 * Math.sin(s * 41 - p * 4.1 + Math.sin(s * 13 + p * 1.7) * 1.8)
    + 0.18 * Math.sin(s * 67 - p * 6.3);
}

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.7 });
  let fluid = 'water';
  let interacted = false;
  let needleX = null;
  let phase = 0;
  let lastRe = '', lastFluid = '';
  const dwell = { laminar: 0, turb: 0, oilmax: 0 };
  const specks = Array.from({ length: 30 }, () => ({ s: Math.random(), yf: (Math.random() - 0.5) * 0.3 }));

  const read = kit.readout();

  const keys = ['water', 'air', 'oil'];
  const btns = kit.buttons([
    { label: '💧 ماء', cls: 'secondary', onclick: () => pick('water') },
    { label: '🌬️ هواء', cls: 'secondary', onclick: () => pick('air') },
    { label: '🛢️ زيت', cls: 'secondary', onclick: () => pick('oil') },
  ]);
  function styleBtns() {
    keys.forEach((k, i) => { btns[i].className = 'btn sm' + (k === fluid ? '' : ' secondary'); });
  }
  function pick(k) { fluid = k; interacted = true; styleBtns(); }
  styleBtns();

  const sV = kit.slider({
    label: 'السرعة v', min: 0.05, max: 5, step: 0.05, value: 0.15, unit: 'm/s',
    fmt: v => v.toFixed(2), oninput: () => { interacted = true; },
  });
  const sD = kit.slider({
    label: 'القطر d', min: 5, max: 200, step: 1, value: 30, unit: 'mm',
    oninput: () => { interacted = true; },
  });

  kit.controls.append(el('div', { class: 'small muted', html:
    'عدد رينولدز <span class="term">Re <i>Reynolds Number</i></span> يحدد نظام الجريان: ' +
    '<span class="term">رقائقي <i>Laminar</i></span> · ' +
    '<span class="term">انتقالي <i>Transitional</i></span> · ' +
    '<span class="term">مضطرب <i>Turbulent</i></span>',
  }));

  function chk(id, cond, dt) {
    if (ctx.isMissionDone(id)) return;
    if (cond) {
      dwell[id] += dt;
      if (dwell[id] > 0.5) ctx.completeMission(id);
    } else dwell[id] = 0;
  }

  kit.loop((g, dt) => {
    const W = kit.W, H = kit.H;
    const f = FLUIDS[fluid];
    const v = sV.value, dmm = sD.value;
    const Re = f.rho * v * (dmm / 1000) / f.mu;
    const z = zoneOf(Re);
    const tWave = smooth(2000, 3500, Re);
    const tTurb = smooth(6000, 12000, Re);
    phase += dt * (1 + v * 2.2);

    // ---- خزان الحبر والإبرة ----
    const tw = 46, tx = W - tw - 16, ty = 6, th = 24;
    const ix = tx + tw / 2; // نقطة الحقن
    g.fillStyle = 'rgba(167,139,250,.22)'; rr(g, tx, ty, tw, th, 6); g.fill();
    g.strokeStyle = 'rgba(167,139,250,.7)'; g.lineWidth = 1.2; g.stroke();
    g.fillStyle = '#a78bfa'; rr(g, tx + 4, ty + 10, tw - 8, th - 14, 3); g.fill();
    label(g, 'حبر', tx - 6, ty + th / 2, { size: 11, color: '#a78bfa' });

    // ---- الأنبوب الزجاجي ----
    const pipeH = 12 + (dmm - 5) / 195 * (H * 0.34 - 12);
    const cy = H * 0.36;
    const px0 = 12, px1 = W - 12;
    g.fillStyle = f.tint;
    g.fillRect(px0, cy - pipeH / 2, px1 - px0, pipeH);
    g.strokeStyle = 'rgba(255,255,255,.30)'; g.lineWidth = 1.5;
    g.beginPath();
    g.moveTo(px0, cy - pipeH / 2); g.lineTo(px1, cy - pipeH / 2);
    g.moveTo(px0, cy + pipeH / 2); g.lineTo(px1, cy + pipeH / 2);
    g.stroke();
    g.strokeStyle = 'rgba(255,255,255,.10)';
    g.beginPath(); g.moveTo(px0 + 4, cy - pipeH / 2 + 3); g.lineTo(px1 - 4, cy - pipeH / 2 + 3); g.stroke();

    // أنبوب الحقن النازل من الخزان
    g.strokeStyle = '#a78bfa'; g.lineWidth = 2;
    g.beginPath(); g.moveTo(ix, ty + th); g.lineTo(ix, cy); g.stroke();

    // مؤشر القطر d
    if (pipeH >= 34) {
      arrow(g, px0 + 14, cy - 2, px0 + 14, cy - pipeH / 2 + 2, { color: '#fbbf24', width: 1.5, head: 5 });
      arrow(g, px0 + 14, cy + 2, px0 + 14, cy + pipeH / 2 - 2, { color: '#fbbf24', width: 1.5, head: 5 });
      label(g, 'd', px0 + 26, cy, { size: 12, color: '#fbbf24', align: 'center' });
    }

    // ---- خيط الحبر ----
    const sx0 = ix, sx1 = px0 + 8;
    const ampWave = pipeH * 0.16 * tWave * (1 - tTurb * 0.5);
    const ampTurb = pipeH * 0.38 * tTurb;
    const fy = (s) => {
      const env = Math.min(1, s * 2.4);
      const y = cy + env * (ampWave * Math.sin(s * 9 - phase * 2) + ampTurb * chaos(s, phase))
        + Math.sin(s * 31 - phase * 1.3) * 0.5;
      const lim = pipeH / 2 - 2.5;
      return Math.max(cy - lim, Math.min(cy + lim, y));
    };
    const N = 60, B = 6, per = N / B;
    let pxl = sx0, pyl = fy(0);
    g.lineCap = 'round'; g.lineJoin = 'round';
    for (let b = 0; b < B; b++) {
      const sm = (b + 0.5) / B;
      g.strokeStyle = `rgba(167,139,250,${(0.92 - tTurb * 0.6 * sm).toFixed(3)})`;
      g.lineWidth = 2.2 + tTurb * (1.5 + 9 * sm);
      g.beginPath();
      g.moveTo(pxl, pyl);
      for (let i = b * per + 1; i <= (b + 1) * per; i++) {
        const s = i / N;
        pxl = sx0 + (sx1 - sx0) * s;
        pyl = fy(s);
        g.lineTo(pxl, pyl);
      }
      g.stroke();
    }

    // ---- بقع الانتشار (المضطرب فقط) ----
    for (const sp of specks) {
      sp.s += dt * (0.05 + v * 0.06);
      if (sp.s > 1) { sp.s = 0; sp.yf = (Math.random() - 0.5) * 0.2; }
      sp.yf += (Math.random() - 0.5) * dt * 7 * tTurb;
      sp.yf = Math.max(-0.85, Math.min(0.85, sp.yf));
      if (tTurb > 0.04) {
        g.globalAlpha = 0.5 * tTurb * Math.min(1, sp.s * 3);
        g.fillStyle = '#a78bfa';
        g.fillRect(sx0 + (sx1 - sx0) * sp.s, cy + sp.yf * pipeH / 2, 2.5, 2.5);
      }
    }
    g.globalAlpha = 1;

    // ---- عناوين علوية ----
    label(g, 'Re = ρ·v·d / μ', 14, 16, { size: 12, color: '#fbbf24', align: 'left' });
    label(g, z.emoji + ' جريان ' + z.name, W / 2, 16, { size: 14, color: z.color, align: 'center' });

    // ---- سهم اتجاه الجريان ----
    const ay = H * 0.57;
    const alen = 30 + v * 13;
    arrow(g, W / 2 + alen / 2, ay, W / 2 - alen / 2, ay, { color: 'rgba(148,163,184,.8)', width: 2, head: 6 });
    label(g, 'اتجاه الجريان', W / 2, ay + 12, { size: 10.5, align: 'center' });

    // ---- شريط مناطق Re (مقياس لوغاريتمي 10 → 1,000,000) ----
    const bx0 = 16, bx1 = W - 16, bw = bx1 - bx0;
    const barY = H * 0.72, bh = 12;
    const lx = re => bx0 + (Math.min(6, Math.max(1, Math.log10(re))) - 1) / 5 * bw;
    g.save();
    rr(g, bx0, barY, bw, bh, 6); g.clip();
    g.fillStyle = 'rgba(56,189,248,.8)'; g.fillRect(bx0, barY, lx(LAM) - bx0, bh);
    g.fillStyle = 'rgba(148,163,184,.5)'; g.fillRect(lx(LAM), barY, lx(TURB) - lx(LAM), bh);
    g.fillStyle = 'rgba(251,146,60,.8)'; g.fillRect(lx(TURB), barY, bx1 - lx(TURB), bh);
    g.restore();
    rr(g, bx0, barY, bw, bh, 6);
    g.strokeStyle = 'rgba(255,255,255,.15)'; g.lineWidth = 1; g.stroke();
    // علامات الحدود
    for (const [tv, txt] of [[LAM, '2,100'], [TURB, '10,000']]) {
      const x = lx(tv);
      g.strokeStyle = 'rgba(226,232,240,.5)';
      g.beginPath(); g.moveTo(x, barY - 5); g.lineTo(x, barY); g.stroke();
      label(g, txt, x, barY - 13, { size: 9.5, align: 'center' });
    }
    label(g, 'رقائقي', (bx0 + lx(LAM)) / 2, barY + bh + 13, { size: 11, color: '#38bdf8', align: 'center' });
    label(g, 'انتقالي', (lx(LAM) + lx(TURB)) / 2, barY + bh + 13, { size: 10, color: '#94a3b8', align: 'center' });
    label(g, 'مضطرب', (lx(TURB) + bx1) / 2, barY + bh + 13, { size: 11, color: '#fb923c', align: 'center' });
    // الإبرة
    const target = lx(Re);
    needleX = needleX === null ? target : needleX + (target - needleX) * Math.min(1, dt * 10);
    g.fillStyle = z.color;
    g.beginPath();
    g.moveTo(needleX, barY + 1); g.lineTo(needleX - 5, barY - 9); g.lineTo(needleX + 5, barY - 9);
    g.closePath(); g.fill();
    g.fillRect(needleX - 1, barY, 2, bh);

    // ---- لحظة تعليمية: الزيت عند أقصى سرعة ----
    const oilMoment = fluid === 'oil' && v >= 4.95 && Re < LAM;
    if (oilMoment) {
      g.fillStyle = 'rgba(251,191,36,.12)';
      rr(g, W / 2 - 118, H - 27, 236, 22, 11); g.fill();
      g.strokeStyle = 'rgba(251,191,36,.5)'; g.lineWidth = 1; g.stroke();
      label(g, '💡 الزيت اللزج يقاوم الاضطراب!', W / 2, H - 16, { size: 12.5, color: '#fbbf24', align: 'center' });
    }

    // ---- القراءات الحية ----
    const reStr = fmtRe(Re);
    if (reStr !== lastRe || fluid !== lastFluid) {
      lastRe = reStr; lastFluid = fluid;
      read.set([
        { label: 'عدد رينولدز', value: reStr, color: z.color },
        { label: 'النظام', value: z.emoji + ' ' + z.name, color: z.color },
        { label: 'ρ', value: f.rho + ' kg/m³' },
        { label: 'μ', value: f.muTxt + ' Pa·s' },
      ]);
    }

    // ---- المهام ----
    if (interacted) {
      chk('laminar', Re < LAM, dt);
      chk('turb', fluid === 'water' && Re > TURB, dt);
      chk('oilmax', oilMoment, dt);
    }
  });

  return { destroy() { kit.destroy(); } };
}
