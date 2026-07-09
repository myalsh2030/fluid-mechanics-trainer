// مختبر الكثافة: خزان أسطواني + سوائل جدول 1-1 — V و m و γ و SG أمام عينيك
import { SimKit, label, arrow, waterGrad } from './simkit.js';

const G = 9.81; // تسارع الجاذبية m/s²

// سوائل من جدول 1-1 في الكتاب (الكثافة kg/m³ عند الظروف القياسية)
const FLUIDS = [
  { name: 'ماء', rho: 1000, top: 'rgba(56,189,248,.75)', bot: 'rgba(14,116,178,.95)', surf: 'rgba(125,211,252,.9)', ink: '#f8fafc' },
  { name: 'زيت برافين', rho: 800, top: 'rgba(251,191,36,.72)', bot: 'rgba(146,64,14,.92)', surf: 'rgba(253,224,71,.85)', ink: '#fef9c3' },
  { name: 'جلسرين', rho: 1260, top: 'rgba(236,233,244,.5)', bot: 'rgba(155,148,190,.78)', surf: 'rgba(241,245,249,.8)', ink: '#f1f5f9' },
  { name: 'زئبق', rho: 13600, top: 'rgba(241,245,249,.95)', mid: 'rgba(148,163,184,.96)', bot: 'rgba(71,85,105,.98)', surf: 'rgba(248,250,252,.95)', ink: '#1e293b' },
];

export function mount(container, ctx) {
  const kit = new SimKit(container, { ratio: 0.7 });
  const read = kit.readout();

  let idx = 0;               // السائل المختار
  let level = 1.5;           // ارتفاع السطح المتحرك (أنيميشن)
  let pulse = 0;             // وهج احتفالي عند إنجاز مهمة
  let lastKey = '';          // لتحديث القراءات فقط عند التغيير
  const done = new Set();

  const complete = id => {
    if (done.has(id) || ctx.isMissionDone?.(id)) return;
    done.add(id);
    pulse = 1;
    ctx.completeMission(id);
  };

  // أزرار اختيار السائل
  const fluidBtns = kit.buttons(FLUIDS.map((f, i) => ({
    label: `${f.name} ${f.rho}`,
    onclick: () => { idx = i; paint(); if (FLUIDS[i].rho > 13000) complete('mercury'); },
  })));
  const paint = () => fluidBtns.forEach((b, i) => { b.className = `btn sm ${i === idx ? '' : 'secondary'}`; });
  paint();

  // منزلقا الأبعاد
  const dSl = kit.slider({ label: 'قطر الخزان d', min: 0.5, max: 4, step: 0.1, value: 1.2, unit: 'm', fmt: v => v.toFixed(1) });
  const hSl = kit.slider({ label: 'ارتفاع التعبئة h', min: 0.2, max: 4, step: 0.1, value: 1.5, unit: 'm', fmt: v => v.toFixed(1) });

  // زر مثال الكتاب 1-1: خزان d=2m و h=3.6m → V ≈ 11.31 m³
  kit.buttons([{
    label: 'جرّب مثال الكتاب 1-1 📖', cls: 'ghost',
    onclick: () => { dSl.set(2); hSl.set(3.6); },
  }]);

  kit.loop((c, dt, t) => {
    const W = kit.W, H = kit.H;
    const d = dSl.value, h = hSl.value, f = FLUIDS[idx];

    // ===== الفيزياء (كما في الكتاب، بلا اشتقاق) =====
    const V = Math.PI / 4 * d * d * h;   // الحجم m³
    const m = f.rho * V;                 // الكتلة kg
    const gamma = f.rho * G / 1000;      // الوزن النوعي kN/m³
    const sg = f.rho / 1000;             // الكثافة النسبية

    if (V > 10) complete('vol10');

    // أنيميشن مستوى السطح نحو h
    level += (h - level) * Math.min(1, dt * 4);

    // ===== مقاسات الرسم =====
    const s = Math.min((W * 0.62) / 4, (H - 88) / 4); // مقياس: بكسل لكل متر
    const rw = d * s / 2;                  // نصف عرض الأسطوانة
    const tankH = 4 * s;                   // جدار الخزان يمثل 4 أمتار
    const ry = Math.max(6, rw * 0.22);     // تفلطح الفوهة (منظور)
    const cx = W * 0.42;
    const botY = H - 30;
    const topY = botY - tankH;
    const surfY = botY - Math.min(level, 4) * s + Math.sin(t * 2.4) * 1.2;

    // جسم الخزان الفارغ (زجاج خافت)
    c.fillStyle = 'rgba(255,255,255,.03)';
    body(c, cx, rw, ry, topY, botY);
    c.fill();

    // ===== السائل =====
    let grad;
    if (idx === 0) grad = waterGrad(c, surfY, botY);
    else {
      grad = c.createLinearGradient(0, surfY, 0, botY);
      grad.addColorStop(0, f.top);
      if (f.mid) grad.addColorStop(0.45, f.mid);
      grad.addColorStop(1, f.bot);
    }
    c.fillStyle = grad;
    body(c, cx, rw, ry, surfY, botY);
    c.fill();

    // سطح السائل (قطع ناقص كامل بلون أفتح)
    c.fillStyle = f.surf;
    c.beginPath();
    c.ellipse(cx, surfY, rw, ry, 0, 0, Math.PI * 2);
    c.fill();

    // اسم السائل وكثافته داخله
    const fillPx = botY - surfY;
    if (fillPx > 46 && rw > 34) {
      label(c, f.name, cx, surfY + fillPx * 0.45, { size: 14, color: f.ink, align: 'center', weight: 800 });
      label(c, `ρ = ${f.rho} kg/m³`, cx, surfY + fillPx * 0.45 + 18, { size: 12, color: f.ink, align: 'center', weight: 700 });
    }

    // لمعة زجاجية على الجدار
    c.fillStyle = 'rgba(255,255,255,.06)';
    c.fillRect(cx - rw * 0.62, topY + ry, rw * 0.16, tankH - ry);

    // ===== هيكل الخزان =====
    c.strokeStyle = pulse > 0 ? `rgba(52,211,153,${0.35 + 0.5 * pulse})` : 'rgba(226,232,240,.55)';
    c.lineWidth = pulse > 0 ? 2.5 : 1.6;
    c.beginPath(); c.moveTo(cx - rw, topY); c.lineTo(cx - rw, botY); c.stroke();
    c.beginPath(); c.moveTo(cx + rw, topY); c.lineTo(cx + rw, botY); c.stroke();
    c.beginPath(); c.ellipse(cx, botY, rw, ry, 0, Math.PI, 0, true); c.stroke();
    c.beginPath(); c.ellipse(cx, topY, rw, ry, 0, 0, Math.PI * 2); c.stroke();
    if (pulse > 0) pulse = Math.max(0, pulse - dt * 1.4);

    // ===== سهم القطر d فوق الفوهة =====
    const dy = topY - ry - 12;
    arrow(c, cx, dy, cx - rw, dy, { color: '#fbbf24' });
    arrow(c, cx, dy, cx + rw, dy, { color: '#fbbf24' });
    label(c, `d = ${d.toFixed(1)} m`, cx, dy - 12, { size: 12.5, color: '#fbbf24', align: 'center' });

    // ===== سهم الارتفاع h يمين الخزان =====
    const hx = cx + rw + 18;
    const midY = (surfY + botY) / 2;
    if (botY - surfY > 26) {
      arrow(c, hx, midY, hx, surfY + 3, { color: '#38bdf8' });
      arrow(c, hx, midY, hx, botY - 3, { color: '#38bdf8' });
    }
    label(c, `h = ${h.toFixed(1)} m`, hx + 8, midY - 9, { size: 12.5, color: '#38bdf8', align: 'left' });
    label(c, 'التعبئة', hx + 8, midY + 9, { size: 11, color: '#94a3b8', align: 'left' });

    // إشارة مثال الكتاب عند V ≈ 11.31
    if (Math.abs(V - 11.31) < 0.15)
      label(c, '✓ مطابق لمثال الكتاب 1-1: V ≈ 11.31 m³', W / 2, 14, { size: 12.5, color: '#34d399', align: 'center' });
    else if (V > 10)
      label(c, '🏆 خزان عملاق! تجاوزت 10 m³', W / 2, 14, { size: 12.5, color: '#34d399', align: 'center' });

    // مقارنة ورشة: الكتلة بعدد السيارات (سيارة ≈ 1500 kg)
    if (m >= 1500) {
      const cars = m / 1500;
      label(c, `الكتلة تعادل ≈ ${cars >= 10 ? Math.round(cars) : cars.toFixed(1)} سيارة! 🚗`, W / 2, H - 10, { size: 12, color: '#94a3b8', align: 'center' });
    }

    // ===== القراءات الحية =====
    const key = `${idx}|${d}|${h}`;
    if (key !== lastKey) {
      lastKey = key;
      read.set([
        { label: 'الحجم V', value: `${V.toFixed(2)} m³`, color: '#fbbf24' },
        { label: 'الكتلة m', value: m >= 1000 ? `${(m / 1000).toFixed(2)} t` : `${Math.round(m)} kg`, color: '#38bdf8' },
        { label: 'γ الوزن النوعي', value: `${gamma.toFixed(2)} kN/m³`, color: '#34d399' },
        { label: 'SG', value: `${sg}`, color: '#a78bfa' },
      ]);
    }
  });

  return { destroy() { kit.destroy(); } };
}

// مسار جسم أسطواني بين ارتفاعين (بمنظور بيضاوي)
function body(c, cx, rw, ry, yTop, yBot) {
  c.beginPath();
  c.moveTo(cx - rw, yTop);
  c.lineTo(cx - rw, yBot);
  c.ellipse(cx, yBot, rw, ry, 0, Math.PI, 0, true); // قاع منتفخ
  c.lineTo(cx + rw, yTop);
  c.ellipse(cx, yTop, rw, ry, 0, 0, Math.PI);       // حافة السطح العلوية
  c.closePath();
}
