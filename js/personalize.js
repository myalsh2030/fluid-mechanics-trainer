// منطق التخصيص: نتائج التشخيصي والقبلي → خطة شخصية
import { getState } from './store.js';

// حالة وحدة بعد التشخيصي: 'priority' | 'normal' | 'strong' | null
export function unitStatus(unitId) {
  const s = getState();
  const us = s.diag?.unitScores?.[unitId];
  if (!us || !us.total) return null;
  const pct = us.ok / us.total;
  if (pct < 0.5) return 'priority';
  if (pct < 0.8) return 'normal';
  return 'strong';
}

export function unitStatusChip(status) {
  if (status === 'priority') return { cls: 'hot', txt: '🔥 أولوية لك' };
  if (status === 'strong') return { cls: 'ok', txt: '✅ نقطة قوة' };
  if (status === 'normal') return { cls: 'water', txt: '📌 مهم' };
  return null;
}

// أولوية درس داخل وحدة بعد القبلي: 'high' | 'med' | 'low' | null
export function lessonPriority(unitId, lesson) {
  const s = getState();
  const pre = s.pre?.[unitId];
  if (!pre?.conceptOk) return null;
  const tags = lesson.concepts || [];
  const known = tags.filter(c => pre.conceptOk[c] === true).length;
  const asked = tags.filter(c => c in pre.conceptOk).length;
  if (!asked) return 'med';
  if (known === asked) return 'low';
  if (known === 0) return 'high';
  return 'med';
}

export function lessonPriorityChip(p) {
  if (p === 'high') return { cls: 'hot', txt: '🔥 ركّز هنا' };
  if (p === 'low') return { cls: 'ok', txt: '⚡ تبدو متمكنًا' };
  return null;
}

// ترتيب دروس الوحدة: العالية أولًا ثم المتوسطة ثم المنخفضة (مع بقاء ترتيب المنهج داخل كل فئة)
export function orderLessons(unitId, lessons) {
  const rank = { high: 0, med: 1, low: 2 };
  const withP = lessons.map((l, i) => ({ l, i, p: lessonPriority(unitId, l) }));
  if (withP.every(x => x.p === null)) return lessons; // لا قبلي بعد
  return withP
    .sort((a, b) => (rank[a.p ?? 'med'] - rank[b.p ?? 'med']) || (a.i - b.i))
    .map(x => x.l);
}

// ---- نموذج المراحل التسلسلية: كل درس «مرحلة» تُفتح بإنجاز سابقتها ----
export function flatLessons(course) {
  const out = [];
  course.units.forEach(u => u.lessons.forEach(l => out.push({ unit: u, lesson: l })));
  return out;
}

export function isLessonUnlocked(course, lessonId) {
  const flat = flatLessons(course);
  const i = flat.findIndex(x => x.lesson.id === lessonId);
  if (i <= 0) return i === 0; // الأولى مفتوحة دائمًا
  const prev = flat[i - 1].lesson.id;
  return !!getState().lessons[prev]?.done;
}

// المرحلة الحالية: أول درس غير مكتمل
export function currentLesson(course) {
  const flat = flatLessons(course);
  return flat.find(x => !getState().lessons[x.lesson.id]?.done) || flat[flat.length - 1];
}

// نجوم المرحلة من نتيجة نقطة التفتيش: 3 كاملة، 2 من 70%، 1 لأقل
export function lessonStars(lessonId) {
  const q = getState().lessons[lessonId]?.quiz;
  if (!q || !q.total) return 0;
  const pct = q.score / q.total * 100;
  return pct >= 100 ? 3 : pct >= 70 ? 2 : 1;
}

// المستوى العام بعد التشخيصي: نسبة إجمالية + وصف
export function overallDiagLevel() {
  const d = getState().diag;
  if (!d?.answers?.length) return null;
  const ok = d.answers.filter(a => a.ok).length;
  const pct = Math.round(ok / d.answers.length * 100);
  const tier = pct >= 70 ? { label: 'مستوى قوي', icon: '🏆' }
    : pct >= 40 ? { label: 'مستوى متوسط', icon: '💪' }
    : { label: 'قاعدة تتأسس', icon: '🌱' };
  return { pct, ok, total: d.answers.length, ...tier };
}

// الوحدة المقترح البدء بها بعد التشخيصي
export function recommendedUnit(course) {
  const s = getState();
  if (!s.diag) return course.units[0];
  let worst = null, worstPct = 2;
  for (const u of course.units) {
    const us = s.diag.unitScores?.[u.id];
    if (!us?.total) continue;
    const pct = us.ok / us.total;
    if (pct < worstPct) { worstPct = pct; worst = u; }
  }
  return worst || course.units[0];
}

// تجميع نتيجة اختبار إلى unitScores + conceptOk
export function tallyByUnit(answers) {
  const unitScores = {};
  for (const a of answers) {
    if (!a.unit) continue;
    const u = unitScores[a.unit] ||= { ok: 0, total: 0 };
    u.total++;
    if (a.ok) u.ok++;
  }
  return unitScores;
}

export function tallyConcepts(answers) {
  const conceptOk = {};
  for (const a of answers) {
    if (!a.concept) continue;
    // إن سُئل عن المفهوم أكثر من مرة: يعتبر متمكنًا فقط إن أصاب كل مراته
    conceptOk[a.concept] = (conceptOk[a.concept] ?? true) && a.ok;
  }
  return conceptOk;
}
