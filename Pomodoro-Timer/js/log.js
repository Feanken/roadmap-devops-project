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

export const totalMinutes = (entries) => entries.reduce((sum, e) => sum + e.minutes, 0);

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
