// Daily goal, long-break cycle, today's log, streak and the 7-day chart.

import { goalProgress, totalMinutes, formatMinutes, formatClock, lastDays, streak } from '../log.js';
import { $, setText, setAttr, setData, cloneTemplate } from '../dom.js';

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

export function createStatsView() {
  const el = {
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
    streak: $('streak'),
    weekTotal: $('week-total'),
    week: $('week'),
  };

  return {
    renderGoal(done, goalTarget) {
      const g = goalProgress(done, goalTarget);
      setText(el.completed, g.done);
      setText(el.goal, g.goal);
      el.goalfill.style.width = `${g.pct}%`; // CSSOM write: allowed under a strict CSP
      setData(el.goalbar, 'reached', g.reached);
      setAttr(el.goalbar, 'aria-valuenow', g.pct);
      setAttr(el.goalbar, 'aria-valuetext', `${g.done} of ${g.goal} work sessions`);
      setText(el.goalLabel, g.reached ? 'daily goal reached 🎉' : 'sessions toward today’s goal');
    },

    /** @param {{ cycleProgress: number, longBreakInterval: number }} s */
    renderCycle(s) {
      while (el.cycle.children.length < s.longBreakInterval) el.cycle.append(document.createElement('li'));
      while (el.cycle.children.length > s.longBreakInterval) el.cycle.lastElementChild.remove();
      [...el.cycle.children].forEach((li, i) => setData(li, 'done', i < s.cycleProgress));

      const left = s.longBreakInterval - s.cycleProgress;
      setText(
        el.cycleText,
        left === 1 ? 'Next work session is followed by a long break' : `${left} work sessions until a long break`,
      );
    },

    /** Newest first. */
    renderLog(entries) {
      const rows = [...entries].reverse().map((entry) => {
        const li = cloneTemplate('tpl-log-item');
        const [time, task, minutes] = li.children;
        time.textContent = formatClock(entry.at);
        task.textContent = entry.task || 'untitled focus';
        task.classList.toggle('log__task--none', !entry.task);
        minutes.textContent = `${entry.minutes}m`;
        return li;
      });
      el.log.replaceChildren(...rows);
      el.logEmpty.hidden = entries.length > 0;
      setText(el.todaySummary, `${formatMinutes(totalMinutes(entries))} focused`);
    },

    /** Streak + the last 7 days as a small bar chart. */
    renderWeek(history, goalTarget) {
      const days = lastDays(history, 7);
      const scale = Math.max(goalTarget, ...days.map((d) => d.count));

      const items = days.map((d) => {
        const li = cloneTemplate('tpl-week-item');
        const [srText, count, bar, label] = li.children;
        const dayName = d.isToday ? 'Today' : d.weekday;
        li.dataset.today = String(d.isToday);
        li.dataset.met = String(d.count >= goalTarget);
        srText.textContent = `${dayName}: ${plural(d.count, 'session')}`;
        count.textContent = d.count > 0 ? String(d.count) : '';
        bar.firstElementChild.style.height = `${Math.round((d.count / scale) * 100)}%`;
        label.textContent = dayName;
        return li;
      });
      el.week.replaceChildren(...items);
      el.week.style.setProperty('--goal', `${Math.round((goalTarget / scale) * 100)}%`); // dashed goal marker

      const run = streak(history);
      setText(el.streak, run > 0 ? `🔥 ${run}-day streak` : 'No streak yet. Finish a session today!');
      el.streak.classList.toggle('streak--on', run > 0);
      setText(el.weekTotal, `${plural(days.reduce((sum, d) => sum + d.count, 0), 'session')} this week`);
    },
  };
}
