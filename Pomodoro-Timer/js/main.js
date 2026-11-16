// Entry point: owns the app state and connects the timer engine to the views.
//
//   timer.js  – countdown + session state machine (no DOM)
//   log.js    – pure helpers for the daily log, goal, history and streak
//   storage.js, audio.js, notify.js – browser APIs, each behind a small module
//   ui/*      – one module per part of the page (dial, stats, controls, ...)

import { PomodoroTimer, MODES, STATUS } from './timer.js';
import {
  loadSettings, loadToday, saveToday, loadHistory, loadSession, saveSession, loadTask,
  loadRecentTasks, saveRecentTasks,
} from './storage.js';
import { dayKey, addEntry, removeEntry, summaryText, rememberTask } from './log.js';
import { createWakeLock } from './wake-lock.js';
import { playChime } from './audio.js';
import { notifySessionEnd } from './notify.js';
import { MODE_LABELS } from './config.js';
import { announce } from './dom.js';
import { createTimerView } from './ui/timer-view.js';
import { createStatsView } from './ui/stats-view.js';
import { initControls } from './ui/controls.js';
import { initAmbience } from './ui/ambience.js';
import { initSettingsDialog } from './ui/settings-dialog.js';
import { initFocusMode } from './ui/focus-mode.js';
import { createTaskSuggestions } from './ui/task-suggest.js';
import { initSummary } from './ui/summary.js';

// ---- state -------------------------------------------------------------------
const saved = loadToday();
const state = {
  entries: saved.entries, // today's finished work sessions
  task: loadTask(), // what the user says they are focusing on
  recent: loadRecentTasks(), // most recently used task labels (suggestions)
  day: dayKey(), // the day `entries` belongs to
};
const timer = new PomodoroTimer({ settings: loadSettings(), completedWork: saved.count });
const timerView = createTimerView();
const stats = createStatsView();
const suggestions = createTaskSuggestions();
const wakeLock = createWakeLock();

/** Keep the screen awake only while a session is actually counting down. */
const syncWakeLock = (s = timer.snapshot()) =>
  wakeLock.set(s.status === STATUS.RUNNING && timer.settings.keepAwake);

// ---- rendering -----------------------------------------------------------------
function renderStats(s = timer.snapshot()) {
  stats.renderGoal(s.completedWork, timer.settings.dailyGoal);
  stats.renderCycle(s);
}
const renderWeek = () => stats.renderWeek(loadHistory(), timer.settings.dailyGoal);
const renderAll = (s = timer.snapshot()) => {
  timerView.render(s, state.task);
  renderStats(s);
};

// ---- persistence of "today" -------------------------------------------------------
function persistToday() {
  saveToday({ count: timer.completedWork, entries: state.entries });
  renderWeek();
}

/** Start over if the tab stayed open past local midnight. Returns true if it did. */
function rollOverDay() {
  if (dayKey() === state.day) return false;
  state.day = dayKey();
  state.entries = [];
  timer.resetCount();
  persistToday();
  stats.renderLog(state.entries);
  return true;
}

function resetToday() {
  state.entries = [];
  timer.resetCount();
  persistToday();
  stats.renderLog(state.entries);
}

/** Remove one logged session (a mis-click, or a session that was not really focused). */
function removeSession(index) {
  const before = state.entries.length;
  state.entries = removeEntry(state.entries, index);
  if (state.entries.length === before) return;
  timer.completedWork = Math.max(0, timer.completedWork - 1);
  persistToday();
  stats.renderLog(state.entries);
  renderAll();
  announce('Session removed from today.');
}

// ---- the 4 Hz loop ------------------------------------------------------------------------
let intervalId = null;
let lastAnnouncedMinute = null;

const startLoop = () => { intervalId ??= setInterval(() => timer.tick(), 250); };
const stopLoop = () => { clearInterval(intervalId); intervalId = null; };

timer.on('tick', (s) => {
  timerView.render(s, state.task); // no-op unless the displayed second changed

  // Tell screen-reader users the remaining minutes once a minute, not every second.
  const minute = Math.ceil(s.remainingMs / 60_000);
  if (minute === lastAnnouncedMinute) return;
  const first = lastAnnouncedMinute === null;
  lastAnnouncedMinute = minute;
  if (!first && minute > 0) announce(`${minute} ${minute === 1 ? 'minute' : 'minutes'} remaining`);
});

timer.on('change', (s) => {
  if (s.status === STATUS.RUNNING) startLoop();
  else stopLoop();
  lastAnnouncedMinute = null;
  syncWakeLock(s);
  renderAll(s);
  saveSession(timer.serialize()); // so a reload picks up where we left off
});

timer.on('complete', ({ finished, next, completedWork, endedAt }) => {
  // A session that finishes after midnight is the first one of the new day.
  if (rollOverDay() && finished === MODES.WORK) timer.completedWork = 1;
  if (finished === MODES.WORK) {
    state.entries = addEntry(state.entries, { task: state.task, minutes: timer.settings.work, at: endedAt });
    stats.renderLog(state.entries);
    if (state.task) {
      state.recent = rememberTask(state.recent, state.task);
      saveRecentTasks(state.recent);
      suggestions.render(state.recent);
    }
  }
  persistToday();

  if (timer.settings.sound) playChime(timer.settings.volume);
  flourish();
  if (document.hidden) timerView.setAlert(true); // bell in the tab title until the user is back

  let message = `${MODE_LABELS[finished]} finished. Next: ${MODE_LABELS[next]}.`;
  if (finished === MODES.WORK && completedWork === timer.settings.dailyGoal) message += ' You reached your daily goal!';
  announce(message);
  notifySessionEnd({ enabled: timer.settings.notify, finished, body: message });
});

/** Brief glow on the dial when a session ends (CSS handles reduced motion). */
function flourish() {
  document.body.classList.add('pulse');
  setTimeout(() => document.body.classList.remove('pulse'), 1200);
}

// ---- wire up the page ---------------------------------------------------------------------------
initControls({ timer, state, onTaskChange: () => renderAll(), onResetToday: resetToday });
initAmbience();
initFocusMode();
stats.onRemoveEntry(removeSession);
initSummary({
  getText: () => summaryText({ entries: state.entries, count: timer.completedWork, goal: timer.settings.dailyGoal }),
});
initSettingsDialog({ timer, onSaved: () => { renderWeek(); syncWakeLock(); } });

// Timers are throttled in background tabs, but the wall-clock engine stays
// accurate: re-sync as soon as the tab is visible again.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  timer.tick();
  rollOverDay();
  timerView.setAlert(false);
  renderAll();
});

// Offline support (optional enhancement).
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* ignore */ });
}

// ---- first paint --------------------------------------------------------------------------------------
stats.renderLog(state.entries);
suggestions.render(state.recent);
renderWeek();
renderAll();

// Pick up a session that was running/paused before a reload. If it ended on an
// earlier day we start fresh instead of crediting it to today.
{
  const previous = loadSession();
  const endedBeforeToday =
    previous?.status === STATUS.RUNNING && dayKey(new Date(previous.endAt)) !== state.day;
  timer.restore(endedBeforeToday ? { mode: previous.mode, status: STATUS.IDLE } : previous);
}
