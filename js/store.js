// الحالة المركزية + التخزين المحلي + بث الأحداث
const KEY = 'fm.v1';

const DEFAULTS = {
  profile: null,            // {name, avatar, created}
  diag: null,               // {answers:[{unit,concept,ok}], unitScores:{u1:{ok,total}}, done:ts}
  pre: {},                  // u1:{answers:[{concept,ok}], conceptOk:{density:true}, done:ts}
  lessons: {},              // u1l1:{stepsDone:n, done:bool, quiz:{score,total,perfect}, xp:n}
  missions: {},             // 'simId:missionId': true
  simsVisited: {},          // simId: true
  xp: 0,
  badges: [],               // ['first-steps', ...]
  streak: { last: '', count: 0 },
  glossaryVisited: false,
};

let state = load();
const listeners = {};

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULTS);
    const parsed = JSON.parse(raw);
    return Object.assign(structuredClone(DEFAULTS), parsed);
  } catch {
    return structuredClone(DEFAULTS);
  }
}

export function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { /* مساحة ممتلئة */ }
}

export function getState() { return state; }

export function resetAll() {
  state = structuredClone(DEFAULTS);
  try { localStorage.removeItem(KEY); } catch {}
  emit('reset');
}

export function on(event, fn) {
  (listeners[event] ||= []).push(fn);
  return () => { listeners[event] = (listeners[event] || []).filter(f => f !== fn); };
}

export function emit(event, data) {
  (listeners[event] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } });
}

// ----- مساعدات درس -----
export function lessonState(id) {
  return state.lessons[id] ||= { stepsDone: 0, done: false, quiz: null, xp: 0 };
}

export function isLessonDone(id) {
  return !!state.lessons[id]?.done;
}

export function unitProgress(unit) {
  const total = unit.lessons.length;
  const done = unit.lessons.filter(l => isLessonDone(l.id)).length;
  return { done, total, pct: total ? Math.round(done / total * 100) : 0 };
}
