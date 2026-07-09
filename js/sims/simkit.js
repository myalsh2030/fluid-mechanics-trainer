// عدة المحاكاة: canvas بدقة الشاشة + حلقة رسم + تحكمات لمس جاهزة
import { el } from '../ui.js';

export class SimKit {
  // container: عنصر .sim-wrap — ratio: نسبة ارتفاع/عرض اللوحة
  constructor(container, { ratio = 0.62 } = {}) {
    this.container = container;
    this.stage = el('div', { class: 'sim-stage' });
    this.canvas = document.createElement('canvas');
    this.stage.append(this.canvas);
    this.controls = el('div', { class: 'sim-controls' });
    container.append(this.stage, this.controls);
    this.ctx = this.canvas.getContext('2d');
    this.ratio = ratio;
    this._raf = 0;
    this._running = false;
    this._drawFn = null;
    this._resize = this._resize.bind(this);
    window.addEventListener('resize', this._resize);
    this._resize();
    // إيقاف الرسم عند الخروج من الشاشة (توفير بطارية)
    this._io = new IntersectionObserver(entries => {
      // آخر إدخال هو الأحدث — أخذ الأول قد يعلّق الحلقة على حالة قديمة
      this._visible = entries[entries.length - 1]?.isIntersecting ?? true;
    });
    this._io.observe(this.stage);
    this._visible = true;
  }

  _resize() {
    const w = this.stage.clientWidth || 340;
    const h = Math.round(w * this.ratio);
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(w * dpr);
    this.canvas.height = Math.round(h * dpr);
    this.canvas.style.height = h + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.W = w; this.H = h;
  }

  // fn(ctx, dt, t) — تُستدعى كل إطار
  loop(fn) {
    this._drawFn = fn;
    this._running = true;
    let last = performance.now();
    const tick = (now) => {
      if (!this._running) return;
      this._raf = requestAnimationFrame(tick);
      if (!this._visible) return;
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      this._t = (this._t || 0) + dt;
      this.ctx.clearRect(0, 0, this.W, this.H);
      this._drawFn(this.ctx, dt, this._t);
    };
    this._raf = requestAnimationFrame(tick);
  }

  // منزلق تحكم — يرجع {get value}
  slider({ label, min, max, step = 1, value, unit = '', fmt: fmtFn, oninput }) {
    const out = el('output');
    const input = el('input', { type: 'range', min, max, step, value });
    const show = v => { out.textContent = (fmtFn ? fmtFn(v) : v) + (unit ? ' ' + unit : ''); };
    input.addEventListener('input', () => { show(+input.value); oninput?.(+input.value); });
    show(value);
    this.controls.append(el('div', { class: 'sim-row' }, el('label', {}, label), input, out));
    return { get value() { return +input.value; }, set(v) { input.value = v; show(+v); }, input };
  }

  // أزرار
  buttons(defs) {
    const row = el('div', { class: 'sim-btns' });
    const btns = defs.map(d => {
      const b = el('button', { class: `btn sm ${d.cls || 'secondary'}`, onclick: d.onclick }, d.label);
      row.append(b);
      return b;
    });
    this.controls.append(row);
    return btns;
  }

  // شريط معلومات حي أسفل اللوحة
  readout() {
    const r = el('div', { class: 'sim-row', style: 'flex-wrap:wrap; gap:6px' });
    this.controls.prepend(r);
    return {
      set(items) { // [{label, value, color}]
        r.innerHTML = items.map(i =>
          `<span class="chip" style="${i.color ? 'color:' + i.color : ''}">${i.label}: <b style="direction:ltr; unicode-bidi:isolate">${i.value}</b></span>`
        ).join('');
      }
    };
  }

  destroy() {
    this._running = false;
    cancelAnimationFrame(this._raf);
    window.removeEventListener('resize', this._resize);
    this._io.disconnect();
    this.container.innerHTML = '';
  }
}

// نص عربي على اللوحة (المحاذاة يمين افتراضيًا)
export function label(ctx, text, x, y, { size = 13, color = '#94a3b8', align = 'right', weight = 700 } = {}) {
  ctx.save();
  ctx.font = `${weight} ${size}px Cairo, sans-serif`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y);
  ctx.restore();
}

// سهم بسيط
export function arrow(ctx, x1, y1, x2, y2, { color = '#fbbf24', width = 2.5, head = 7 } = {}) {
  const a = Math.atan2(y2 - y1, x2 - x1);
  ctx.save();
  ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = width; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x2, y2);
  ctx.lineTo(x2 - head * Math.cos(a - 0.45), y2 - head * Math.sin(a - 0.45));
  ctx.lineTo(x2 - head * Math.cos(a + 0.45), y2 - head * Math.sin(a + 0.45));
  ctx.closePath(); ctx.fill();
  ctx.restore();
}

// تدرج ماء جاهز
export function waterGrad(ctx, y0, y1, alphaTop = 0.75, alphaBottom = 0.95) {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  g.addColorStop(0, `rgba(56,189,248,${alphaTop})`);
  g.addColorStop(1, `rgba(14,116,178,${alphaBottom})`);
  return g;
}
