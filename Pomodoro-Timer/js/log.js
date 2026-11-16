// Pure helpers for the daily log and goal. No DOM / storage access, so they are
// unit-tested in Node.

/** Local calendar day as YYYY-MM-DD (the day rolls over at local midnight). */
export function dayKey(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Trim, collapse whitespace and cap the length of a task label. */
export function cleanTask(task) {
  return String(task ?? '').replace(/\s+/g, ' ').trim().slice(0, 60);
}

/** Return a new list with `entry` appended (keeps only the newest `max`). */
export function addEntry(entries, { task, minutes, at }, max = 100) {
  return [...entries, { task: cleanTask(task), minutes: Math.max(0, Math.round(minutes)), at }].slice(-max);
}

/**
 * Most-recently-used task labels: `task` goes to the front, a repeat (ignoring
 * case) is moved rather than duplicated, and only the newest `max` are kept.
 */
export function rememberTask(recent, task, max = 8) {
  const list = Array.isArray(recent) ? recent.map(cleanTask).filter(Boolean) : [];
  const label = cleanTask(task);
  if (!label) return list.slice(0, max);
  const same = label.toLowerCase();
  return [label, ...list.filter((t) => t.toLowerCase() !== same)].slice(0, max);
}

/** Only well-formed entries survive (storage may contain anything). */
export function sanitizeEntries(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((e) => e && Number.isFinite(e.at) && Number.isFinite(e.minutes))
    .map((e) => ({ task: cleanTask(e.task), minutes: Math.max(0, Math.round(e.minutes)), at: e.at }));
}

export function goalProgress(done, goal) {
  const target = Math.max(1, Math.floor(goal) || 1);
  const count = Math.max(0, Math.floor(done) || 0);
  return {
    done: count,
    goal: target,
    pct: Math.min(100, Math.round((count / target) * 100)),
    reached: count >= target,
  };
}

// ---- multi-day history: { 'YYYY-MM-DD': { count, minutes } } ------------------------

/** The day key `n` days before `from` (calendar arithmetic, so DST-safe). */
export function shiftDay(from, n) {
  return dayKey(new Date(from.getFullYear(), from.getMonth(), from.getDate() - n));
}

const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;

export function sanitizeHistory(raw) {
  const out = {};
  if (!raw || typeof raw !== 'object') return out;
  for (const [key, v] of Object.entries(raw)) {
    if (!DAY_RE.test(key) || !v || !Number.isFinite(v.count) || !Number.isFinite(v.minutes)) continue;
    if (v.count > 0) out[key] = { count: Math.floor(v.count), minutes: Math.max(0, Math.round(v.minutes)) };
  }
  return out;
}

/** Return a new history with one day set (an empty day is removed); keeps the newest `keep` days. */
export function recordDay(history, key, { count, minutes }, keep = 60) {
  const next = { ...history };
  if (count > 0) next[key] = { count, minutes };
  else delete next[key];
  const keys = Object.keys(next).sort();
  for (const old of keys.slice(0, Math.max(0, keys.length - keep))) delete next[old];
  return next;
}

/** The last `n` days (oldest first) for the weekly chart. */
export function lastDays(history, n = 7, today = new Date(), locale) {
  const fmt = new Intl.DateTimeFormat(locale, { weekday: 'short' });
  return Array.from({ length: n }, (_, i) => {
    const offset = n - 1 - i;
    const key = shiftDay(today, offset);
    const [y, m, d] = key.split('-').map(Number);
    const day = history[key] ?? { count: 0, minutes: 0 };
    return { key, weekday: fmt.format(new Date(y, m - 1, d)), count: day.count, minutes: day.minutes, isToday: offset === 0 };
  });
}

/**
 * Consecutive days with at least one finished session. An empty *today* does
 * not break the streak yet (the day is not over), it just is not counted.
 */
export function streak(history, today = new Date()) {
  let offset = history[dayKey(today)]?.count > 0 ? 0 : 1;
  let days = 0;
  while (history[shiftDay(today, offset)]?.count > 0) {
    days++;
    offset++;
  }
  return days;
}

export const totalMinutes =(entries) => entries.reduce((sum, e) => sum + e.minutes, 0);

/** 85 -> "1h 25m", 45 -> "45m", 60 -> "1h". */
export function formatMinutes(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function formatClock(timestamp, locale) {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp));
}
