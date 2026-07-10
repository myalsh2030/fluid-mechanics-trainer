// محرك التلعيب: نقاط الخبرة، المستويات، الأوسمة، المواظبة
import { getState, save, emit } from './store.js';
import { toast, confetti, levelUpOverlay } from './ui.js';

export const XP = {
  activity: 10,      // نشاط تفاعلي (flip/match/order)
  mission: 15,       // مهمة محاكاة
  correct: 5,        // إجابة صحيحة
  lessonDone: 20,    // إتمام درس
  unitDone: 50,      // إتمام وحدة
  diagDone: 30,      // إتمام التشخيصي
  preDone: 15,       // إتمام قبلي الوحدة
};

export const LEVELS = [
  { at: 0,    rank: 'قطرة ماء',      icon: '💧' },
  { at: 100,  rank: 'مبتدئ الورشة',  icon: '🔧' },
  { at: 250,  rank: 'فني ناشئ',      icon: '⚙️' },
  { at: 500,  rank: 'فني موائع',     icon: '🌊' },
  { at: 900,  rank: 'فني أول',       icon: '🛠️' },
  { at: 1400, rank: 'خبير مضخات',    icon: '🚀' },
  { at: 2000, rank: 'أسطورة الورشة', icon: '🏆' },
];

export const BADGES = [
  { id: 'diag',      icon: '🧭', title: 'بوصلة البداية', desc: 'أكملتَ الاختبار التشخيصي' },
  { id: 'first',     icon: '🥇', title: 'أول خطوة',      desc: 'أكملتَ أول درس' },
  { id: 'perfect',   icon: '✨', title: 'علامة كاملة',    desc: '100% في اختبار درس' },
  { id: 'lab5',      icon: '🔬', title: 'مستكشف المختبر', desc: 'جرّبتَ 5 محاكيات' },
  { id: 'mission10', icon: '🎯', title: 'صائد المهام',    desc: 'أنجزتَ 10 مهام استكشاف' },
  { id: 'streak3',   icon: '🔥', title: 'مواظب',          desc: '3 أيام تدريب متتالية' },
  { id: 'u1',        icon: '🧪', title: 'عالم الخواص',    desc: 'أكملتَ الوحدة الأولى' },
  { id: 'u2',        icon: '⚖️', title: 'سيد السكون',     desc: 'أكملتَ الوحدة الثانية' },
  { id: 'u3',        icon: '🌀', title: 'راكب التيار',    desc: 'أكملتَ الوحدة الثالثة' },
  { id: 'u4',        icon: '⚙️', title: 'محرّك الآلات',   desc: 'أكملتَ الوحدة الرابعة' },
  { id: 'glossary',  icon: '📖', title: 'لغوي التقنية',   desc: 'تصفحتَ مسرد المصطلحات' },
  { id: 'master',    icon: '👑', title: 'الإتقان الكامل', desc: 'أكملتَ كل الدروس' },
];

export function levelInfo(xp = getState().xp) {
  let idx = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].at) idx = i;
  const cur = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  const base = cur.at;
  const span = next ? next.at - base : 1;
  const pct = next ? Math.min(100, Math.round((xp - base) / span * 100)) : 100;
  return { idx, cur, next, pct };
}

export function award(amount, label) {
  const s = getState();
  const before = levelInfo(s.xp);
  s.xp += amount;
  const after = levelInfo(s.xp);
  save();
  toast(`+${amount} XP ${label ? '· ' + label : ''}`, 'xp');
  emit('xp');
  if (after.idx > before.idx) {
    setTimeout(() => {
      confetti();
      levelUpOverlay(after.cur);
      emit('xp');
    }, 450);
  }
}

export function grantBadge(id) {
  const s = getState();
  if (s.badges.includes(id)) return false;
  const b = BADGES.find(x => x.id === id);
  if (!b) return false;
  s.badges.push(id);
  save();
  setTimeout(() => {
    confetti();
    toast(`${b.icon} وسام جديد: ${b.title}`, 'badge-t');
  }, 650);
  emit('badge', id);
  return true;
}

// تُستدعى عند فتح التطبيق وعند العودة إليه: تحديث سلسلة الأيام (بالتوقيت المحلي)
const dayKey = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;

export function touchStreak() {
  const s = getState();
  const today = dayKey(new Date());
  if (s.streak.last === today) return;
  const y = dayKey(new Date(Date.now() - 86400000));
  s.streak.count = (s.streak.last === y) ? s.streak.count + 1 : 1;
  s.streak.last = today;
  save();
  if (s.streak.count >= 3) grantBadge('streak3');
  emit('xp');
}

// فحوصات أوسمة تُستدعى بعد الأحداث المهمة
export function checkBadges(course) {
  const s = getState();
  if (Object.keys(s.simsVisited).length >= 5) grantBadge('lab5');
  if (Object.keys(s.missions).length >= 10) grantBadge('mission10');
  if (course) {
    let allDone = true;
    for (const u of course.units) {
      const unitDone = u.lessons.every(l => s.lessons[l.id]?.done);
      if (unitDone) grantBadge(u.id); else allDone = false;
    }
    if (allDone) grantBadge('master');
  }
}
