import test from 'node:test';
import assert from 'node:assert/strict';
import {
  PomodoroTimer, MODES, STATUS, DEFAULT_SETTINGS, sanitizeSettings, formatTime,
} from '../js/timer.js';

const MIN = 60_000;

function make(opts = {}) {
  const clock = { t: 1_000_000 };
  const timer = new PomodoroTimer({ now: () => clock.t, ...opts });
  const advance = (ms) => { clock.t += ms; timer.tick(); };
  return { timer, clock, advance };
}

/** Run one full session to completion. */
function finishSession({ timer, advance }) {
  timer.start();
  advance(timer.durationMs());
}

test('defaults: 25 / 5 / 15 and long break every 4', () => {
  const { timer } = make();
  assert.equal(timer.mode, MODES.WORK);
  assert.equal(timer.remainingMs, 25 * MIN);
  assert.equal(timer.settings.shortBreak, 5);
  assert.equal(timer.settings.longBreak, 15);
  assert.equal(timer.settings.longBreakInterval, 4);
});

test('start, stop (pause) and resume keep the remaining time', () => {
  const { timer, advance } = make();
  timer.start();
  assert.equal(timer.status, STATUS.RUNNING);
  advance(10 * MIN);
  timer.pause();
  assert.equal(timer.status, STATUS.PAUSED);
  assert.equal(timer.remainingMs, 15 * MIN);

  // Time passing while paused must not change anything.
  advance(5 * MIN);
  assert.equal(timer.remainingMs, 15 * MIN);

  timer.start(); // resume
  advance(MIN);
  assert.equal(timer.remainingMs, 14 * MIN);
});

test('completing work counts a session and switches to a short break', () => {
  const ctx = make();
  const events = [];
  ctx.timer.on('complete', (e) => events.push(e));
  finishSession(ctx);
  assert.equal(ctx.timer.completedWork, 1);
  assert.equal(ctx.timer.mode, MODES.SHORT_BREAK);
  assert.equal(ctx.timer.status, STATUS.IDLE);
  assert.equal(ctx.timer.remainingMs, 5 * MIN);
  assert.deepEqual(events, [{ finished: MODES.WORK, next: MODES.SHORT_BREAK, completedWork: 1 }]);
});

test('every 4th completed work session is followed by a long break', () => {
  const ctx = make();
  const sequence = [];
  for (let i = 0; i < 8; i++) {
    finishSession(ctx); // work
    sequence.push(ctx.timer.mode);
    finishSession(ctx); // break
  }
  assert.deepEqual(sequence, [
    MODES.SHORT_BREAK, MODES.SHORT_BREAK, MODES.SHORT_BREAK, MODES.LONG_BREAK,
    MODES.SHORT_BREAK, MODES.SHORT_BREAK, MODES.SHORT_BREAK, MODES.LONG_BREAK,
  ]);
  assert.equal(ctx.timer.completedWork, 8);
  assert.equal(ctx.timer.mode, MODES.WORK);
});

test('finishing a break does not count as a work session', () => {
  const ctx = make();
  finishSession(ctx);
  finishSession(ctx);
  assert.equal(ctx.timer.completedWork, 1);
});

test('skip moves on without counting the session', () => {
  const { timer } = make();
  timer.skip();
  assert.equal(timer.completedWork, 0);
  assert.equal(timer.mode, MODES.SHORT_BREAK);
  timer.skip();
  assert.equal(timer.mode, MODES.WORK);
});

test('skipping a work session never triggers a long break', () => {
  const ctx = make({ completedWork: 4 }); // cycle position is 0 again
  ctx.timer.skip();
  assert.equal(ctx.timer.mode, MODES.SHORT_BREAK);
});

test('reset restores the full session length', () => {
  const { timer, advance } = make();
  timer.start();
  advance(3 * MIN);
  timer.reset();
  assert.equal(timer.status, STATUS.IDLE);
  assert.equal(timer.remainingMs, 25 * MIN);
});

test('autoStart begins the next session immediately', () => {
  const ctx = make({ settings: { autoStart: true } });
  finishSession(ctx);
  assert.equal(ctx.timer.mode, MODES.SHORT_BREAK);
  assert.equal(ctx.timer.status, STATUS.RUNNING);
});

test('custom intervals are used', () => {
  const ctx = make({ settings: { work: 1, shortBreak: 2, longBreak: 3, longBreakInterval: 2 } });
  finishSession(ctx);
  assert.equal(ctx.timer.remainingMs, 2 * MIN);
  finishSession(ctx);
  finishSession(ctx);
  assert.equal(ctx.timer.mode, MODES.LONG_BREAK);
  assert.equal(ctx.timer.remainingMs, 3 * MIN);
});

test('updateSettings changes an idle session but not one in progress', () => {
  const { timer, advance } = make();
  timer.updateSettings({ ...DEFAULT_SETTINGS, work: 30 });
  assert.equal(timer.remainingMs, 30 * MIN);
  timer.start();
  advance(MIN);
  timer.updateSettings({ ...DEFAULT_SETTINGS, work: 50 });
  assert.equal(timer.remainingMs, 29 * MIN);
});

test('setMode switches session and resets the countdown', () => {
  const { timer } = make();
  timer.start();
  timer.setMode(MODES.LONG_BREAK);
  assert.equal(timer.status, STATUS.IDLE);
  assert.equal(timer.remainingMs, 15 * MIN);
  timer.setMode('bogus');
  assert.equal(timer.mode, MODES.LONG_BREAK);
});

test('a late tick (throttled background tab) still completes correctly', () => {
  const { timer, advance } = make();
  timer.start();
  advance(40 * MIN); // way past the end
  assert.equal(timer.completedWork, 1);
  assert.equal(timer.mode, MODES.SHORT_BREAK);
});

test('sanitizeSettings clamps and falls back to defaults', () => {
  const s = sanitizeSettings({ work: 9999, shortBreak: -3, longBreak: 'abc', longBreakInterval: 1, volume: 5 });
  assert.equal(s.work, 180);
  assert.equal(s.shortBreak, 1);
  assert.equal(s.longBreak, DEFAULT_SETTINGS.longBreak);
  assert.equal(s.longBreakInterval, 2);
  assert.equal(s.volume, 1);
});

test('formatTime', () => {
  assert.equal(formatTime(25 * MIN), '25:00');
  assert.equal(formatTime(61_000), '01:01');
  assert.equal(formatTime(500), '00:01');
  assert.equal(formatTime(0), '00:00');
});
