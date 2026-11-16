import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, cleanTask, addEntry, sanitizeEntries, goalProgress, totalMinutes, formatMinutes, formatClock,
} from '../js/log.js';
import { sanitizeSettings, DEFAULT_SETTINGS } from '../js/timer.js';

test('dayKey uses the local calendar date', () => {
  assert.equal(dayKey(new Date(2026, 0, 5, 23, 59)), '2026-01-05');
  assert.equal(dayKey(new Date(2026, 11, 31, 0, 0)), '2026-12-31');
});

test('cleanTask trims, collapses spaces and caps length', () => {
  assert.equal(cleanTask('  write   report \n now '), 'write report now');
  assert.equal(cleanTask(null), '');
  assert.equal(cleanTask('x'.repeat(200)).length, 60);
});

test('addEntry appends without mutating and keeps only the newest entries', () => {
  const a = [];
  const b = addEntry(a, { task: ' read ', minutes: 24.6, at: 1 });
  assert.deepEqual(a, []);
  assert.deepEqual(b, [{ task: 'read', minutes: 25, at: 1 }]);

  let list = [];
  for (let i = 0; i < 5; i++) list = addEntry(list, { task: `t${i}`, minutes: 25, at: i }, 3);
  assert.deepEqual(list.map((e) => e.task), ['t2', 't3', 't4']);
});

test('sanitizeEntries drops malformed data', () => {
  assert.deepEqual(sanitizeEntries('nope'), []);
  const out = sanitizeEntries([{ task: 'ok', minutes: 25, at: 5 }, null, { task: 'bad' }, { minutes: 'x', at: 1 }]);
  assert.deepEqual(out, [{ task: 'ok', minutes: 25, at: 5 }]);
});

test('goalProgress clamps and flags reaching the goal', () => {
  assert.deepEqual(goalProgress(3, 8), { done: 3, goal: 8, pct: 38, reached: false });
  assert.equal(goalProgress(8, 8).reached, true);
  assert.equal(goalProgress(12, 8).pct, 100);
  assert.equal(goalProgress(1, 0).goal, 1);
});

test('totalMinutes and formatMinutes', () => {
  assert.equal(totalMinutes([{ minutes: 25 }, { minutes: 30 }]), 55);
  assert.equal(formatMinutes(45), '45m');
  assert.equal(formatMinutes(60), '1h');
  assert.equal(formatMinutes(85), '1h 25m');
});

test('formatClock returns a time of day', () => {
  assert.match(formatClock(new Date(2026, 0, 1, 14, 5).getTime(), 'en-GB'), /14[:.]05/);
});

test('new settings: dailyGoal is clamped and notify defaults to off', () => {
  assert.equal(DEFAULT_SETTINGS.dailyGoal, 8);
  assert.equal(DEFAULT_SETTINGS.notify, false);
  assert.equal(sanitizeSettings({ dailyGoal: 99 }).dailyGoal, 24);
  assert.equal(sanitizeSettings({ dailyGoal: 0 }).dailyGoal, 1);
  assert.equal(sanitizeSettings({ notify: true }).notify, true);
  assert.equal(sanitizeSettings({ notify: 'yes' }).notify, false);
});
