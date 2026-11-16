import { PomodoroTimer, MODES, STATUS, DEFAULT_SETTINGS, formatTime } from './timer.js';
import {
  loadSettings, saveSettings, loadToday, saveToday,
  loadAmbienceVolume, saveAmbienceVolume, loadTask, saveTask,
} from './storage.js';
import {
  dayKey, cleanTask, addEntry, goalProgress, totalMinutes, formatMinutes, formatClock,
} from './log.js';
import { unlockAudio, playChime, setAmbience, setAmbienceVolume } from './audio.js';

const MODE_LABELS = {
  [MODES.WORK]: 'Work',
  [MODES.SHORT_BREAK]: 'Short Break',
  [MODES.LONG_BREAK]: 'Long Break',
};
const THEME_COLORS = {
  [MODES.WORK]: '#2a1f3d',
  [MODES.SHORT_BREAK]: '#1d3340',
  [MODES.LONG_BREAK]: '#3b2530',
};
const ACCENT_COLORS = {
  [MODES.WORK]: '#ffb199',
  [MODES.SHORT_BREAK]: '#9fe0c4',
  [MODES.LONG_BREAK]: '#ffd28a',
};
const TITLE_NAMES = {
  [MODES.WORK]: 'focus_session',
  [MODES.SHORT_BREAK]: 'quick_breather',
  [MODES.LONG_BREAK]: 'long_chill',
};
const RING_LENGTH = 2 * Math.PI * 90;
const BASE_TITLE = 'Lofi Pomodoro';
const STATIC_FAVICON = 'icon.svg';

const $ = (id) => document.getElementById(id);
const els = {
  body: document.body,
  display: $('timer-display'),
  ring: $('ring'),
  sessionType: $('session-type'),
  toggle: $('toggle'),
  toggleLabel: $('toggle-label'),
  themeColor: document.querySelector('meta[name="theme-color"]'),
  favicon: $('favicon'),
  titleName: $('title-name'),
  task: $('task'),
  chips: document.querySelectorAll('.chip'),
  ambVolume: $('amb-volume'),
  reset: $('reset'),
  skip: $('skip'),
  completed: $('completed'),
  goal: $('goal'),
  goalbar: $('goalbar'),
  goalfill: $('goalfill'),
  goalLabel: $('goal-label'),
  cycle: $('cycle'),
  cycleText: $('cycle-text'),
  log: $('log'),
  logEmpty: $('log-empty'),
  todaySummary: $('today-summary'),
  resetCount: $('reset-count'),
  announcer: $('announcer'),
  modes: document.querySelectorAll('.mode'),
  dialog: $('settings'),
  form: $('settings-form'),
  error: $('settings-error'),
};

// ---- state -----------------------------------------------------------------
const saved = loadToday();
let entries = saved.entries;
let currentDay = dayKey();
let task = loadTask();

const timer = new PomodoroTimer({
  settings: loadSettings(),
  completedWork: saved.count,
});

let intervalId = null;
let lastAnnouncedMinute = null;
let lastFaviconKey = '';

// ---- rendering -------------------------------------------------------------
function render(s = timer.snapshot()) {
  const time = formatTime(s.remainingMs);
  const label = MODE_LABELS[s.mode];

  els.display.textContent = time;
  els.display.setAttribute('aria-label', `${label}, ${time} remaining`);
  els.sessionType.textContent = label;
  els.body.dataset.mode = s.mode;
  els.body.dataset.status = s.status;
  els.themeColor?.setAttribute('content', THEME_COLORS[s.mode]);
  renderTitleName(s.mode);

  const progress = s.totalMs > 0 ? 1 - s.remainingMs / s.totalMs : 0;
  els.ring.style.strokeDashoffset = String(RING_LENGTH * progress);

  els.toggle.dataset.state = s.status;
  els.toggleLabel.textContent =
    s.status === STATUS.RUNNING ? 'Pause' : s.status === STATUS.PAUSED ? 'Resume' : 'Start';

  els.modes.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === s.mode)));

  renderGoal(s);
  renderCycle(s);

  const focus = s.mode === MODES.WORK && task ? task : label;
  document.title = s.status === STATUS.IDLE ? BASE_TITLE : `${time} · ${focus}`;
  renderFavicon(s, progress);
}

function renderTitleName(mode) {
  const name = mode === MODES.WORK && task
    ? task.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '') || TITLE_NAMES[mode]
    : TITLE_NAMES[mode];
  els.titleName.textContent = `${name}.lofi`;
}

function renderGoal(s) {
  const g = goalProgress(s.completedWork, timer.settings.dailyGoal);
  els.completed.textContent = String(g.done);
  els.goal.textContent = String(g.goal);
  els.goalfill.style.width = `${g.pct}%`;
  els.goalbar.dataset.reached = String(g.reached);
  els.goalbar.setAttribute('aria-valuenow', String(g.pct));
  els.goalbar.setAttribute('aria-valuetext', `${g.done} of ${g.goal} work sessions`);
  els.goalLabel.textContent = g.reached ? 'daily goal reached 🎉' : 'sessions toward today’s goal';
}

function renderCycle(s) {
  if (els.cycle.children.length !== s.longBreakInterval) {
    els.cycle.replaceChildren(
      ...Array.from({ length: s.longBreakInterval }, () => document.createElement('li')),
    );
  }
  [...els.cycle.children].forEach((li, i) => (li.dataset.done = String(i < s.cycleProgress)));
  const left = s.longBreakInterval - s.cycleProgress;
  els.cycleText.textContent =
    left === 1
      ? 'Next work session is followed by a long break'
      : `${left} work sessions until a long break`;
}

function renderLog() {
  const rows = [...entries].reverse().map((entry) => {
    const li = document.createElement('li');
    const time = document.createElement('span');
    time.className = 'log__time';
    time.textContent = formatClock(entry.at);
    const name = document.createElement('span');
    name.className = entry.task ? 'log__task' : 'log__task log__task--none';
    name.textContent = entry.task || 'untitled focus';
    const min = document.createElement('span');
    min.className = 'log__min';
    min.textContent = `${entry.minutes}m`;
    li.append(time, name, min);
    return li;
  });
  els.log.replaceChildren(...rows);
  els.logEmpty.hidden = entries.length > 0;
  els.todaySummary.textContent = `${formatMinutes(totalMinutes(entries))} focused`;
}

/** Favicon doubles as a tiny progress ring while a session is active. */
function renderFavicon(s, progress) {
  if (!els.favicon) return;
  const key = s.status === STATUS.IDLE ? 'idle' : `${s.mode}-${Math.round(progress * 60)}`;
  if (key === lastFaviconKey) return;
  lastFaviconKey = key;

  if (s.status === STATUS.IDLE) {
    els.favicon.href = STATIC_FAVICON;
    return;
  }
  const c = 2 * Math.PI * 13;
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">` +
    `<circle cx="16" cy="16" r="16" fill="#1f1631"/>` +
    `<circle cx="16" cy="16" r="13" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width="4"/>` +
    `<circle cx="16" cy="16" r="13" fill="none" stroke="${ACCENT_COLORS[s.mode]}" stroke-width="4" ` +
    `stroke-linecap="round" stroke-dasharray="${c.toFixed(2)}" stroke-dashoffset="${(c * progress).toFixed(2)}" ` +
    `transform="rotate(-90 16 16)"/></svg>`;
  els.favicon.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

function announce(message) {
  // Clear first so repeating the same text is still announced.
  els.announcer.textContent = '';
  setTimeout(() => (els.announcer.textContent = message), 50);
}

// ---- daily log -------------------------------------------------------------
/** Start over if the tab stayed open past local midnight. */
function rollOverDay() {
  if (dayKey() === currentDay) return false;
  currentDay = dayKey();
  entries = [];
  timer.resetCount();
  saveToday({ count: 0, entries });
  renderLog();
  return true;
}

function persistToday() {
  saveToday({ count: timer.completedWork, entries });
}

// ---- loop ------------------------------------------------------------------
function startLoop() {
  if (intervalId === null) intervalId = setInterval(() => timer.tick(), 250);
}
function stopLoop() {
  clearInterval(intervalId);
  intervalId = null;
}

timer.on('tick', (s) => {
  render(s);
  // Announce progress once per minute so screen-reader users can follow along
  // without the timer chattering every second.
  const minute = Math.ceil(s.remainingMs / 60_000);
  if (minute !== lastAnnouncedMinute) {
    const first = lastAnnouncedMinute === null; // don't announce on the first tick
    lastAnnouncedMinute = minute;
    if (!first && minute > 0) announce(`${minute} ${minute === 1 ? 'minute' : 'minutes'} remaining`);
  }
});

timer.on('change', (s) => {
  s.status === STATUS.RUNNING ? startLoop() : stopLoop();
  lastAnnouncedMinute = null;
  render(s);
});

timer.on('complete', ({ finished, next, completedWork }) => {
  // A session that finishes after midnight is the first one of the new day.
  if (rollOverDay() && finished === MODES.WORK) timer.completedWork = 1;
  if (finished === MODES.WORK) {
    entries = addEntry(entries, { task, minutes: timer.settings.work, at: Date.now() });
    renderLog();
  }
  persistToday();

  if (timer.settings.sound) playChime(timer.settings.volume);

  let message = `${MODE_LABELS[finished]} finished. Next: ${MODE_LABELS[next]}.`;
  if (finished === MODES.WORK && completedWork === timer.settings.dailyGoal) {
    message += ' You reached your daily goal!';
  }
  announce(message);
  notify(message, finished);
});

function notify(body, finished) {
  if (!timer.settings.notify || !document.hidden) return;
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(finished === MODES.WORK ? 'Time for a break 🌙' : 'Back to focus 🍅', {
      body,
      icon: 'icon-512.png',
      tag: 'pomodoro', // replaces the previous one instead of stacking
    });
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}

async function ensureNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

// ---- controls --------------------------------------------------------------
els.toggle.addEventListener('click', () => {
  unlockAudio();
  timer.toggle();
});
els.reset.addEventListener('click', () => timer.reset());
els.skip.addEventListener('click', () => timer.skip());
els.modes.forEach((b) => b.addEventListener('click', () => timer.setMode(b.dataset.mode)));

els.resetCount.addEventListener('click', () => {
  entries = [];
  timer.resetCount();
  persistToday();
  renderLog();
});

els.task.value = task;
els.task.addEventListener('input', () => {
  task = cleanTask(els.task.value);
  saveTask(task);
  render();
});
els.task.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    els.task.blur();
    unlockAudio();
    if (timer.status !== STATUS.RUNNING) timer.start();
  }
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey || e.metaKey || e.altKey || els.dialog.open) return;
  const tag = e.target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  if (e.key === 'r' || e.key === 'R') timer.reset();
  else if (e.key === 's' || e.key === 'S') timer.skip();
  else if (e.key === ' ' && tag !== 'BUTTON') {
    // On a focused button, Space already clicks it.
    e.preventDefault();
    unlockAudio();
    timer.toggle();
  }
});

// ---- ambience ----------------------------------------------------------------
const initialVolume = loadAmbienceVolume();
els.ambVolume.value = String(initialVolume);
setAmbienceVolume(initialVolume);

const isPressed = (chip) => chip.getAttribute('aria-pressed') === 'true';
els.chips.forEach((chip) =>
  chip.addEventListener('click', () => {
    unlockAudio(); // a click is the user gesture browsers require
    chip.setAttribute('aria-pressed', String(setAmbience(chip.dataset.amb, !isPressed(chip))));

    const chips = [...els.chips];
    els.body.dataset.rain = chips.some((c) => c.dataset.amb === 'rain' && isPressed(c)) ? 'on' : 'off';
    els.body.dataset.ambience = chips.some(isPressed) ? 'on' : 'off';
  }),
);

els.ambVolume.addEventListener('input', () => {
  const v = Number(els.ambVolume.value);
  setAmbienceVolume(v);
  saveAmbienceVolume(v);
});

// ---- settings dialog -------------------------------------------------------
const fields = {
  work: $('s-work'),
  shortBreak: $('s-short'),
  longBreak: $('s-long'),
  longBreakInterval: $('s-interval'),
  dailyGoal: $('s-goal'),
  autoStart: $('s-auto'),
  notify: $('s-notify'),
  sound: $('s-sound'),
  volume: $('s-volume'),
};
const NUMERIC_FIELDS = ['work', 'shortBreak', 'longBreak', 'longBreakInterval', 'dailyGoal'];

function fillForm(settings) {
  for (const [key, el] of Object.entries(fields)) {
    if (el.type === 'checkbox') el.checked = settings[key];
    else el.value = settings[key];
  }
  clearErrors();
}

function clearErrors() {
  els.error.hidden = true;
  els.error.textContent = '';
  Object.values(fields).forEach((el) => el.removeAttribute('aria-invalid'));
}

function readForm() {
  const out = {};
  for (const [key, el] of Object.entries(fields)) {
    out[key] = el.type === 'checkbox' ? el.checked : Number(el.value);
  }
  return out;
}

$('open-settings').addEventListener('click', () => {
  fillForm(timer.settings);
  els.dialog.showModal();
});
$('cancel-settings').addEventListener('click', () => els.dialog.close());
$('close-settings').addEventListener('click', () => els.dialog.close());
$('defaults').addEventListener('click', () => fillForm(DEFAULT_SETTINGS));
$('test-sound').addEventListener('click', () => {
  unlockAudio();
  playChime(Number(fields.volume.value));
});

els.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearErrors();
  const invalid = NUMERIC_FIELDS.map((k) => fields[k]).filter((el) => !el.checkValidity());
  if (invalid.length) {
    invalid.forEach((el) => el.setAttribute('aria-invalid', 'true'));
    els.error.textContent = 'Please enter whole numbers within the allowed ranges.';
    els.error.hidden = false;
    invalid[0].focus();
    return;
  }

  const next = readForm();
  if (next.notify && !(await ensureNotificationPermission())) {
    next.notify = false;
    announce('Notifications are blocked or unavailable in this browser, so they were left off.');
  }
  timer.updateSettings(next);
  saveSettings(timer.settings);
  els.dialog.close();
});

// Close when clicking the backdrop.
els.dialog.addEventListener('click', (e) => {
  if (e.target === els.dialog) els.dialog.close();
});

// Timers are throttled in background tabs, but the wall-clock engine stays
// accurate: re-sync immediately when the tab comes back.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  timer.tick();
  rollOverDay();
});

// ---- offline support (PWA) -----------------------------------------------------
if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* optional enhancement */ });
}

renderLog();
render();
