// The dial, mode buttons, title bar, page title and favicon.

import { MODES, STATUS, formatTime } from '../timer.js';
import { MODE_LABELS, THEME, RING_LENGTH, BASE_TITLE } from '../config.js';
import { createFavicon } from '../favicon.js';
import { $, qsa, setText, setAttr, setData } from '../dom.js';

/** "write report" -> "write_report" (used in the fake window title). */
function fileName(mode, task) {
  if (mode === MODES.WORK && task) {
    const slug = task.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '_').replace(/^_+|_+$/g, '');
    if (slug) return slug;
  }
  return THEME[mode].fileName;
}

export function createTimerView() {
  const el = {
    display: $('timer-display'),
    ring: $('ring'),
    sessionType: $('session-type'),
    toggle: $('toggle'),
    toggleLabel: $('toggle-label'),
    titleName: $('title-name'),
    themeColor: document.querySelector('meta[name="theme-color"]'),
    modes: qsa('.mode'),
  };
  const favicon = createFavicon($('favicon'));
  let lastKey = '';

  return {
    /**
     * Cheap to call every tick: it does nothing unless something visible changed
     * (the displayed second, the mode/status, the session length or the task).
     */
    render(s, task) {
      const time = formatTime(s.remainingMs);
      const key = `${s.mode}|${s.status}|${time}|${s.totalMs}|${task}`;
      if (key === lastKey) return;
      lastKey = key;

      const label = MODE_LABELS[s.mode];
      setText(el.display, time);
      setAttr(el.display, 'aria-label', `${label}, ${time} remaining`);
      setText(el.sessionType, label);
      setText(el.titleName, `${fileName(s.mode, task)}.lofi`);
      setAttr(el.themeColor, 'content', THEME[s.mode].themeColor);

      setData(document.body, 'mode', s.mode);
      setData(document.body, 'status', s.status);
      setData(el.toggle, 'state', s.status);
      setText(el.toggleLabel, s.status === STATUS.RUNNING ? 'Pause' : s.status === STATUS.PAUSED ? 'Resume' : 'Start');
      for (const button of el.modes) setAttr(button, 'aria-pressed', button.dataset.mode === s.mode);

      // The ring moves once per displayed second, so it needs no CSS transition.
      const progress = s.totalMs > 0 ? 1 - s.remainingMs / s.totalMs : 0;
      el.ring.style.strokeDashoffset = String(RING_LENGTH * progress);

      const focus = s.mode === MODES.WORK && task ? task : label;
      document.title = s.status === STATUS.IDLE ? BASE_TITLE : `${time} · ${focus}`;
      favicon.update(s, progress);
    },
  };
}
