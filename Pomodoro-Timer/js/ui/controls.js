// Start/pause, reset, skip, mode tabs, the focus-task input and keyboard shortcuts.

import { STATUS } from '../timer.js';
import { cleanTask } from '../log.js';
import { saveTask } from '../storage.js';
import { unlockAudio } from '../audio.js';
import { $, qsa, shortcutsAllowed } from '../dom.js';

/**
 * @param {object} deps
 * @param {import('../timer.js').PomodoroTimer} deps.timer
 * @param {{ task: string }} deps.state            shared app state (task is read and written here)
 * @param {() => void} deps.onTaskChange           re-render after the task text changed
 * @param {() => void} deps.onResetToday           clear today's count and log
 */
export function initControls({ timer, state, onTaskChange, onResetToday }) {
  const task = $('task');

  $('toggle').addEventListener('click', () => {
    unlockAudio();
    timer.toggle();
  });
  $('reset').addEventListener('click', () => timer.reset());
  $('skip').addEventListener('click', () => timer.skip());
  $('reset-count').addEventListener('click', onResetToday);
  for (const button of qsa('.mode')) button.addEventListener('click', () => timer.setMode(button.dataset.mode));

  task.value = state.task;
  task.addEventListener('input', () => {
    state.task = cleanTask(task.value);
    saveTask(state.task);
    onTaskChange();
  });
  task.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    task.blur();
    unlockAudio();
    if (timer.status !== STATUS.RUNNING) timer.start();
  });

  document.addEventListener('keydown', (e) => {
    if (!shortcutsAllowed(e)) return;

    if (e.key === 'r' || e.key === 'R') timer.reset();
    else if (e.key === 's' || e.key === 'S') timer.skip();
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
      // On a focused button, Space already clicks it.
      e.preventDefault();
      unlockAudio();
      timer.toggle();
    }
  });
}
