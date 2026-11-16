// Start/pause, reset, skip, mode tabs, the focus-task input and keyboard shortcuts.

import { STATUS, EXTEND_STEP_MIN } from '../timer.js';
import { cleanTask } from '../log.js';
import { saveTask } from '../storage.js';
import { unlockAudio } from '../audio.js';
import { $, qsa, shortcutsAllowed, announce } from '../dom.js';

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
  $('extend').addEventListener('click', extend);
  function extend() {
    if (timer.extend()) announce(`Added ${EXTEND_STEP_MIN} minutes.`);
    else announce('Cannot add more time to this session.');
  }

  const modeButtons = qsa('.mode');
  for (const button of modeButtons) button.addEventListener('click', () => timer.setMode(button.dataset.mode));

  // "Reset today" wipes the count and the log, so it needs a second, deliberate tap.
  const resetCount = $('reset-count');
  const resetLabel = resetCount.textContent;
  let disarmTimer = null;
  const disarm = () => {
    clearTimeout(disarmTimer);
    resetCount.textContent = resetLabel;
    delete resetCount.dataset.armed;
  };
  resetCount.addEventListener('click', () => {
    if (resetCount.dataset.armed) {
      disarm();
      onResetToday();
      return;
    }
    resetCount.dataset.armed = 'true';
    resetCount.textContent = 'Tap again to confirm';
    announce('Tap again to confirm resetting today.');
    disarmTimer = setTimeout(disarm, 4000);
  });
  resetCount.addEventListener('blur', disarm);

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
    else if ((e.key === '+' || e.key === '=') && timer.status !== STATUS.IDLE) extend();
    else if (e.key >= '1' && e.key <= String(modeButtons.length)) modeButtons[Number(e.key) - 1].click();
    else if (e.key === ' ' && e.target.tagName !== 'BUTTON') {
      // On a focused button, Space already clicks it.
      e.preventDefault();
      unlockAudio();
      timer.toggle();
    }
  });
}
