// localStorage wrapper. Storage can be missing/blocked (private mode), so
// every access is guarded and the app keeps working without persistence.

import { dayKey, sanitizeEntries, cleanTask } from './log.js';

const KEYS = {
  settings: 'pomodoro.settings.v1',
  today: 'pomodoro.today.v2', // { date, count, entries[] } — starts over each day
  ambienceVolume: 'pomodoro.ambienceVolume.v1',
  task: 'pomodoro.task.v1',
};

function read(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore: persistence is best-effort */
  }
}

export const loadSettings = () => read(KEYS.settings) ?? {};
export const saveSettings = (settings) => write(KEYS.settings, settings);

/** Today's completed work sessions. Anything saved on an earlier day is dropped. */
export function loadToday() {
  const saved = read(KEYS.today);
  if (!saved || saved.date !== dayKey()) return { count: 0, entries: [] };
  return { count: Math.max(0, Number(saved.count) || 0), entries: sanitizeEntries(saved.entries) };
}

export const saveToday = ({ count, entries }) => write(KEYS.today, { date: dayKey(), count, entries });

export function loadAmbienceVolume() {
  const v = read(KEYS.ambienceVolume);
  return typeof v === 'number' && v >= 0 && v <= 1 ? v : 0.5;
}
export const saveAmbienceVolume = (v) => write(KEYS.ambienceVolume, v);

export const loadTask = () => cleanTask(read(KEYS.task));
export const saveTask = (task) => write(KEYS.task, cleanTask(task));
