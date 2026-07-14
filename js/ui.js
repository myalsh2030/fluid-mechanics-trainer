// مكوّنات واجهة مشتركة: توست، كونفيتي، مودال، أدوات DOM
export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v !== null && v !== undefined) node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c === null || c === undefined || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

export function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export function toast(msg, cls = '') {
  const root = document.getElementById('toasts');
  const t = el('div', { class: `toast ${cls}` }, msg);
  root.append(t);
  setTimeout(() => t.classList.add('out'), 2100);
  setTimeout(() => t.remove(), 2600);
}

export function confetti(n = 34) {
  const colors = ['#38bdf8', '#22d3ee', '#fbbf24', '#34d399', '#a78bfa', '#f87171'];
  const W = window.innerWidth;
  for (let i = 0; i < n; i++) {
    const bit = el('div', { class: 'confetti-bit' });
    const size = 6 + Math.random() * 7;
    Object.assign(bit.style, {
      left: Math.random() * W + 'px',
      width: size + 'px',
      height: size * (0.6 + Math.random() * 0.8) + 'px',
      background: colors[i % colors.length],
      transform: `rotate(${Math.random() * 360}deg)`,
    });
    document.body.append(bit);
    const dur = 1300 + Math.random() * 1300;
    bit.animate([
      { transform: bit.style.transform, opacity: 1, top: '-12px' },
      { transform: `rotate(${Math.random() * 720 - 360}deg)`, opacity: 0.9, top: '105vh' },
    ], { duration: dur, easing: 'cubic-bezier(.2,.6,.4,1)' });
    setTimeout(() => bit.remove(), dur);
  }
}

export function levelUpOverlay(level) {
  const ov = el('div', { class: 'levelup' },
    el('div', { class: 'lu-ic' }, level.icon),
    el('div', { class: 'lu-t' }, 'مستوى جديد!'),
    el('div', { class: 'lu-rank' }, level.rank),
    el('button', { class: 'btn amber', style: 'margin-top:18px' }, 'واصل التقدم 🚀'),
  );
  ov.querySelector('button').addEventListener('click', () => ov.remove());
  document.body.append(ov);
}

export function modal(contentNode, { closable = true } = {}) {
  const root = document.getElementById('modal-root');
  const back = el('div', { class: 'modal-back' }, el('div', { class: 'modal' }, contentNode));
  if (closable) back.addEventListener('click', e => { if (e.target === back) back.remove(); });
  root.append(back);
  return { close: () => back.remove() };
}

// أرقام بأسلوب عربي مع فواصل
export function fmt(n, digits = 0) {
  return Number(n).toLocaleString('ar-EG', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

// خلط فيشر-ييتس غير منحاز؛ يرجع نسخة جديدة
export function shuffled(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// أيقونة من السبرايت icons.svg
export function icon(id, cls = '') {
  const t = document.createElement('template');
  t.innerHTML = `<svg class="icon${cls ? ' ' + cls : ''}" aria-hidden="true" focusable="false"><use href="icons.svg#${id}"></use></svg>`;
  return t.content.firstChild;
}
