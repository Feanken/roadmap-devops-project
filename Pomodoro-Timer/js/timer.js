// Pure timer / state engine. No DOM access, so it can be unit-tested in Node.

export const MODES = Object.freeze({
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak',
});

export const STATUS = Object.freeze({
  IDLE: 'idle', // not started (or just reset / just switched session)
  RUNNING: 'running',
  PAUSED: 'paused', // stopped part-way, can be resumed
});

export const DEFAULT_SETTINGS = Object.freeze({
  work: 25, // minutes
  shortBreak: 5, // minutes
  longBreak: 15, // minutes
  longBreakInterval: 4, // work sessions before a long break
  autoStart: false, // start the next session automatically
  sound: true,
  volume: 0.6, // 0..1
  dailyGoal: 8, // work sessions per day
  notify: false, // desktop notification when a session ends (opt-in)
});

const LIMITS = {
  work: [1, 180],
  shortBreak: [1, 60],
  longBreak: [1, 120],
  longBreakInterval: [2, 12],
  dailyGoal: [1, 24],
};

/** Clamp / coerce arbitrary input into a valid settings object. */
export function sanitizeSettings(input = {}) {
  const out = { ...DEFAULT_SETTINGS };
  for (const [key, [min, max]] of Object.entries(LIMITS)) {
    const n = Math.round(Number(input[key]));
    if (Number.isFinite(n)) out[key] = Math.min(max, Math.max(min, n));
  }
  if (typeof input.autoStart === 'boolean') out.autoStart = input.autoStart;
  if (typeof input.sound === 'boolean') out.sound = input.sound;
  if (typeof input.notify === 'boolean') out.notify = input.notify;
  const v = Number(input.volume);
  if (Number.isFinite(v)) out.volume = Math.min(1, Math.max(0, v));
  return out;
}

export class PomodoroTimer {
  /**
   * @param {object}   opts
   * @param {object}   [opts.settings]        partial settings
   * @param {number}   [opts.completedWork]   initial completed work sessions
   * @param {Function} [opts.now]             clock, injectable for tests
   */
  constructor({ settings, completedWork = 0, now = () => Date.now() } = {}) {
    this.now = now;
    this.settings = sanitizeSettings(settings);
    this.completedWork = Math.max(0, Math.floor(completedWork));
    this.mode = MODES.WORK;
    this.status = STATUS.IDLE;
    this.remainingMs = this.durationMs(this.mode);
    this.endAt = 0;
    this.listeners = new Map();
  }

  // ---- events -------------------------------------------------------------
  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event).add(fn);
    return () => this.listeners.get(event).delete(fn);
  }

  emit(event, payload) {
    for (const fn of this.listeners.get(event) ?? []) fn(payload);
  }

  // ---- derived values -----------------------------------------------------
  durationMs(mode = this.mode) {
    return this.settings[mode] * 60_000;
  }

  /** Work sessions finished in the current round of `longBreakInterval`. */
  get cycleProgress() {
    return this.completedWork % this.settings.longBreakInterval;
  }

  snapshot() {
    return {
      mode: this.mode,
      status: this.status,
      remainingMs: this.remainingMs,
      totalMs: this.durationMs(),
      completedWork: this.completedWork,
      cycleProgress: this.cycleProgress,
      longBreakInterval: this.settings.longBreakInterval,
    };
  }

  // ---- controls -----------------------------------------------------------
  /** Start a fresh session, or resume a paused one. */
  start() {
    if (this.status === STATUS.RUNNING) return;
    this.endAt = this.now() + this.remainingMs;
    this.status = STATUS.RUNNING;
    this.emit('change', this.snapshot());
  }

  /** Stop (pause) the countdown, keeping the remaining time. */
  pause() {
    if (this.status !== STATUS.RUNNING) return;
    this.remainingMs = Math.max(0, this.endAt - this.now());
    this.status = STATUS.PAUSED;
    this.emit('change', this.snapshot());
  }

  toggle() {
    if (this.status === STATUS.RUNNING) this.pause();
    else this.start();
  }

  /** Reset the current session back to its full length. */
  reset() {
    this.status = STATUS.IDLE;
    this.remainingMs = this.durationMs();
    this.emit('change', this.snapshot());
  }

  /** Jump to the next session without counting the current one. */
  skip() {
    this.advance(false);
  }

  /** Reset the completed-session counter (and the long-break cycle). */
  resetCount() {
    this.completedWork = 0;
    this.emit('change', this.snapshot());
  }

  /** Apply new settings. An untouched (idle) session adopts the new length. */
  updateSettings(next) {
    this.settings = sanitizeSettings(next);
    if (this.status === STATUS.IDLE) this.remainingMs = this.durationMs();
    this.emit('change', this.snapshot());
  }

  /** Switch to a specific mode manually (used by the mode tabs). */
  setMode(mode) {
    if (!Object.values(MODES).includes(mode)) return;
    this.mode = mode;
    this.status = STATUS.IDLE;
    this.remainingMs = this.durationMs();
    this.emit('change', this.snapshot());
  }

  /** Call regularly (e.g. every 250ms). Uses wall-clock so it never drifts. */
  tick() {
    if (this.status !== STATUS.RUNNING) return;
    this.remainingMs = Math.max(0, this.endAt - this.now());
    if (this.remainingMs === 0) {
      this.advance(true);
    } else {
      this.emit('tick', this.snapshot());
    }
  }

  // ---- internals ----------------------------------------------------------
  advance(completed) {
    const finished = this.mode;
    if (completed && finished === MODES.WORK) this.completedWork += 1;

    let next;
    if (finished === MODES.WORK) {
      // After a *completed* work session decide short vs long break.
      // A skipped work session never earns a long break.
      const longDue = completed && this.cycleProgress === 0 && this.completedWork > 0;
      next = longDue ? MODES.LONG_BREAK : MODES.SHORT_BREAK;
    } else {
      next = MODES.WORK;
    }

    this.mode = next;
    this.remainingMs = this.durationMs(next);
    this.status = STATUS.IDLE;
    if (completed) this.emit('complete', { finished, next, completedWork: this.completedWork });
    if (completed && this.settings.autoStart) this.start();
    else this.emit('change', this.snapshot());
  }
}

/** Format milliseconds as MM:SS (rounding up so 0:00 only shows at the end). */
export function formatTime(ms) {
  const totalSeconds = Math.ceil(ms / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
