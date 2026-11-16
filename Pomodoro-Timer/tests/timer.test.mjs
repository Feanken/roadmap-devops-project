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
  assert.deepEqual(events, [{
    finished: MODES.WORK, next: MODES.SHORT_BREAK, completedWork: 1, endedAt: 1_000_000 + 25 * MIN, durationMs: 25 * MIN,
  }]);
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

test('serialize + restore: a running session continues after a reload', () => {
  const a = make();
  a.timer.start();
  a.advance(10 * MIN);
  const saved = JSON.parse(JSON.stringify(a.timer.serialize())); // survives JSON round-trip

  const b = make(); // "new page", same clock
  b.clock.t = a.clock.t + 2 * MIN; // 2 minutes pass while the page is closed
  assert.equal(b.timer.restore(saved), true);
  assert.equal(b.timer.status, STATUS.RUNNING);
  assert.equal(b.timer.remainingMs, 13 * MIN);
  b.advance(13 * MIN);
  assert.equal(b.timer.completedWork, 1);
});

test('restore: a paused session keeps its remaining time', () => {
  const a = make();
  a.timer.start();
  a.advance(5 * MIN);
  a.timer.pause();
  const b = make();
  b.timer.restore(a.timer.serialize());
  assert.equal(b.timer.status, STATUS.PAUSED);
  assert.equal(b.timer.remainingMs, 20 * MIN);
});

test('restore: a session that ended while away is completed with its real end time', () => {
  const a = make();
  a.timer.start();
  const saved = a.timer.serialize();
  const b = make();
  b.clock.t = a.clock.t + 40 * MIN;
  const events = [];
  b.timer.on('complete', (e) => events.push(e));
  b.timer.restore(saved);
  assert.equal(b.timer.completedWork, 1);
  assert.equal(b.timer.mode, MODES.SHORT_BREAK);
  assert.equal(events[0].endedAt, a.clock.t + 25 * MIN);
});

test('restore: bad input is rejected, oversized remaining time is clamped', () => {
  const { timer } = make();
  assert.equal(timer.restore(null), false);
  assert.equal(timer.restore({ mode: 'nope', status: 'running' }), false);
  assert.equal(timer.restore({ mode: MODES.WORK, status: STATUS.PAUSED, remainingMs: 999 * MIN }), true);
  assert.equal(timer.remainingMs, 25 * MIN);
  timer.restore({ mode: MODES.LONG_BREAK, status: 'idle' });
  assert.equal(timer.mode, MODES.LONG_BREAK);
  assert.equal(timer.status, STATUS.IDLE);
  assert.equal(timer.remainingMs, 15 * MIN);
});

test('sanitizeSettings clamps and falls back to defaults', () => {
  const s = sanitizeSettings({ work: 9999, shortBreak: -3, longBreak: 'abc', longBreakInterval: 1, volume: 5 });
  assert.equal(s.work, 180);
  assert.equal(s.shortBreak, 1);
  assert.equal(s.longBreak, DEFAULT_SETTINGS.longBreak);
  assert.equal(s.longBreakInterval, 2);
  assert.equal(s.volume, 1);
});

test('extend adds time to a running session and moves its end', () => {
  const { timer, clock, advance } = make();
  assert.equal(timer.extend(), false, 'nothing to extend while idle');
  timer.start();
  advance(10 * MIN);
  assert.equal(timer.extend(), true);
  assert.equal(timer.remainingMs, 20 * MIN);
  assert.equal(timer.snapshot().totalMs, 30 * MIN);
  assert.equal(timer.snapshot().endAt, clock.t + 20 * MIN);
  advance(20 * MIN - 1);
  assert.equal(timer.status, STATUS.RUNNING, 'still running just before the new end');
  advance(1);
  assert.equal(timer.status, STATUS.IDLE, 'completes at the extended end');
});

test('extend works while paused and is capped at one hour in total', () => {
  const { timer } = make();
  timer.start();
  timer.pause();
  timer.extend(5);
  assert.equal(timer.remainingMs, 30 * MIN);
  for (let i = 0; i < 20; i += 1) timer.extend(5);
  assert.equal(timer.extraMs, 60 * MIN, 'cap reached');
  assert.equal(timer.extend(5), false);
});

test('extension is reported on completion, then forgotten', () => {
  const { timer, advance } = make();
  let payload;
  timer.on('complete', (p) => { payload = p; });
  timer.start();
  timer.extend(5);
  advance(30 * MIN);
  assert.equal(payload.durationMs, 30 * MIN, 'logged length includes the extension');
  assert.equal(timer.extraMs, 0);
  assert.equal(timer.snapshot().totalMs, 5 * MIN, 'the break is its normal length');
});

test('reset, skip and switching session drop the extension', () => {
  const { timer } = make();
  timer.start();
  timer.extend(5);
  timer.reset();
  assert.equal(timer.snapshot().totalMs, 25 * MIN);
  timer.start();
  timer.extend(5);
  timer.skip();
  assert.equal(timer.extraMs, 0);
  timer.start();
  timer.extend(5);
  timer.setMode(MODES.WORK);
  assert.equal(timer.extraMs, 0);
});

test('an extended session survives serialize + restore', () => {
  const a = make();
  a.timer.start();
  a.advance(1 * MIN);
  a.timer.extend(5);
  const saved = a.timer.serialize();
  const b = make();
  b.clock.t = a.clock.t;
  b.timer.restore(saved);
  assert.equal(b.timer.remainingMs, 29 * MIN, 'not clamped back to 25 minutes');
  assert.equal(b.timer.snapshot().totalMs, 30 * MIN);
});

test('snapshot exposes the wall-clock end only while running', () => {
  const { timer, clock } = make();
  assert.equal(timer.snapshot().endAt, null);
  timer.start();
  assert.equal(timer.snapshot().endAt, clock.t + 25 * MIN);
  timer.pause();
  assert.equal(timer.snapshot().endAt, null);
});

test('keepAwake defaults on and only accepts booleans', () => {
  assert.equal(DEFAULT_SETTINGS.keepAwake, true);
  assert.equal(sanitizeSettings({}).keepAwake, true);
  assert.equal(sanitizeSettings({ keepAwake: false }).keepAwake, false);
  assert.equal(sanitizeSettings({ keepAwake: 'no' }).keepAwake, true);
});

test('formatTime', () => {
  assert.equal(formatTime(25 * MIN), '25:00');
  assert.equal(formatTime(61_000), '01:01');
  assert.equal(formatTime(500), '00:01');
  assert.equal(formatTime(0), '00:00');
});
