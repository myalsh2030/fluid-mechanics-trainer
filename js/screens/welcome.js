// شاشة الترحيب وإنشاء الملف الشخصي
import { el } from '../ui.js';
import { getState, save } from '../store.js';

const AVATARS = ['🧑‍🔧', '👷', '🦾', '🤖', '🦅'];

export function renderWelcome(app) {
  const s = getState();
  let avatar = s.profile?.avatar || AVATARS[0];

  const nameInput = el('input', {
    class: 'ob-input', type: 'text', maxlength: '20',
    placeholder: 'اكتب اسمك أو لقبك…', value: s.profile?.name || '',
  });

  const picks = AVATARS.map(a =>
    el('button', { class: `avatar-pick ${a === avatar ? 'sel' : ''}`, onclick: (e) => {
      avatar = a;
      picks.forEach(p => p.classList.remove('sel'));
      e.currentTarget.classList.add('sel');
    }}, a)
  );

  const startBtn = el('button', { class: 'btn wide', onclick: start }, 'ابدأ الرحلة 🚀');

  function start() {
    const name = nameInput.value.trim() || 'البطل';
    const first = !getState().profile;
    getState().profile = { name, avatar, created: Date.now() };
    save();
    location.hash = first && !getState().diag ? '#/diag' : '#/';
  }

  nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') start(); });

  app.append(
    el('div', { class: 'ob-wrap' },
      el('div', { class: 'ob-emoji' }, '💧⚙️'),
      el('h1', { class: 'ob-title' }, 'أساسيات ميكانيكا الموائع'),
      el('p', { class: 'ob-sub' },
        'رحلة تدريبية تفاعلية لفنيي الصيانة الميكانيكية: مضخات، ضواغط، مراوح وتوربينات. ',
        el('br'),
        'تقدمك يُحفظ على جهازك فقط — لا حسابات ولا إنترنت مطلوب بعد التحميل الأول.'),
      nameInput,
      el('div', { class: 'center small muted', style: 'margin-bottom:8px' }, 'اختر شخصيتك:'),
      el('div', { class: 'avatar-row' }, picks),
      startBtn,
    )
  );
  setTimeout(() => nameInput.focus(), 300);
}
