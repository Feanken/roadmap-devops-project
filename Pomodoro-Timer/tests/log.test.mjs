import test from 'node:test';
import assert from 'node:assert/strict';
import {
  dayKey, cleanTask, addEntry, sanitizeEntries, goalProgress, totalMinutes, formatMinutes, formatClock,
  shiftDay, sanitizeHistory, recordDay, lastDays, streak, rememberTask, removeEntry, summaryText,
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

test('rememberTask keeps a most-recent-first list without case-insensitive duplicates', () => {
  assert.deepEqual(rememberTask([], 'write report'), ['write report']);
  assert.deepEqual(rememberTask(['a', 'b'], 'c'), ['c', 'a', 'b']);
  assert.deepEqual(rememberTask(['a', 'Write Report', 'b'], '  write   report '), ['write report', 'a', 'b']);
  assert.deepEqual(rememberTask(['a', 'b', 'c'], 'd', 3), ['d', 'a', 'b']);
  assert.deepEqual(rememberTask(['a', 'b'], ''), ['a', 'b'], 'an empty label changes nothing');
  assert.deepEqual(rememberTask('garbage', 'x'), ['x']);
  assert.deepEqual(rememberTask(['a', 5, null, '  '], ''), ['a', '5'], 'junk in storage is cleaned');
});

test('removeEntry returns a new list without that index', () => {
  const list = [{ n: 1 }, { n: 2 }, { n: 3 }];
  assert.deepEqual(removeEntry(list, 1), [{ n: 1 }, { n: 3 }]);
  assert.equal(list.length, 3, 'input is not mutated');
  assert.equal(removeEntry(list, 9).length, 3);
  assert.equal(removeEntry(list, -1).length, 3);
});

test('summaryText lists totals and each session', () => {
  const at = new Date(2026, 10, 16, 14, 5).getTime();
  const text = summaryText({
    entries: [{ task: 'write report', minutes: 25, at }, { task: '', minutes: 50, at }],
    count: 2,
    goal: 8,
    date: '2026-11-16',
    locale: 'en-GB',
  });
  assert.deepEqual(text.split('\n'), [
    'Pomodoro · 2026-11-16',
    '2/8 sessions · 1h 15m focused',
    '• 14:05 write report (25m)',
    '• 14:05 untitled focus (50m)',
  ]);
  assert.equal(summaryText({ entries: [], count: 0, goal: 8, date: 'd' }).split('\n').length, 2);
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

test('shiftDay goes back by calendar days across month and year ends', () => {
  assert.equal(shiftDay(new Date(2026, 2, 1), 1), '2026-02-28');
  assert.equal(shiftDay(new Date(2026, 0, 1), 1), '2025-12-31');
  assert.equal(shiftDay(new Date(2026, 5, 15), 0), '2026-06-15');
  assert.equal(shiftDay(new Date(2026, 2, 30), 3), '2026-03-27'); // spans the DST switch in many zones
});

test('sanitizeHistory keeps only valid, non-empty days', () => {
  const out = sanitizeHistory({
    '2026-01-01': { count: 3, minutes: 75 },
    '2026-01-02': { count: 0, minutes: 0 },
    'bad-key': { count: 1, minutes: 25 },
    '2026-01-03': { count: 'x', minutes: 5 },
  });
  assert.deepEqual(out, { '2026-01-01': { count: 3, minutes: 75 } });
  assert.deepEqual(sanitizeHistory(null), {});
});

test('recordDay sets, removes and prunes', () => {
  let h = recordDay({}, '2026-01-01', { count: 2, minutes: 50 });
  assert.deepEqual(h, { '2026-01-01': { count: 2, minutes: 50 } });
  h = recordDay(h, '2026-01-01', { count: 0, minutes: 0 });
  assert.deepEqual(h, {});

  let big = {};
  for (let d = 1; d <= 9; d++) big = recordDay(big, `2026-01-0${d}`, { count: 1, minutes: 25 }, 5);
  assert.deepEqual(Object.keys(big), ['2026-01-05', '2026-01-06', '2026-01-07', '2026-01-08', '2026-01-09']);
});

test('lastDays returns 7 days oldest-first with today flagged', () => {
  const today = new Date(2026, 4, 20); // Wed 20 May 2026
  const history = { '2026-05-20': { count: 4, minutes: 100 }, '2026-05-18': { count: 2, minutes: 50 } };
  const days = lastDays(history, 7, today, 'en-US');
  assert.equal(days.length, 7);
  assert.equal(days[0].key, '2026-05-14');
  assert.equal(days[6].key, '2026-05-20');
  assert.deepEqual(days.map((d) => d.count), [0, 0, 0, 0, 2, 0, 4]);
  assert.equal(days[6].isToday, true);
  assert.equal(days[5].isToday, false);
  assert.equal(days[6].weekday, 'Wed');
});

test('streak counts consecutive days and tolerates an empty today', () => {
  const today = new Date(2026, 4, 20);
  const day = (n) => shiftDay(today, n);
  const mk = (...offsets) => Object.fromEntries(offsets.map((o) => [day(o), { count: 1, minutes: 25 }]));

  assert.equal(streak({}, today), 0);
  assert.equal(streak(mk(0, 1, 2), today), 3);
  assert.equal(streak(mk(1, 2), today), 2); // nothing yet today: streak is still alive
  assert.equal(streak(mk(2, 3), today), 0); // yesterday missed: streak is broken
  assert.equal(streak(mk(0, 2, 3), today), 1); // gap yesterday
});

test('new settings: dailyGoal is clamped and notify defaults to off', () => {
  assert.equal(DEFAULT_SETTINGS.dailyGoal, 8);
  assert.equal(DEFAULT_SETTINGS.notify, false);
  assert.equal(sanitizeSettings({ dailyGoal: 99 }).dailyGoal, 24);
  assert.equal(sanitizeSettings({ dailyGoal: 0 }).dailyGoal, 1);
  assert.equal(sanitizeSettings({ notify: true }).notify, true);
  assert.equal(sanitizeSettings({ notify: 'yes' }).notify, false);
});
