// Constants shared by the UI modules (no logic, no DOM).

import { MODES } from './timer.js';

export const MODE_LABELS = Object.freeze({
  [MODES.WORK]: 'Work',
  [MODES.SHORT_BREAK]: 'Short Break',
  [MODES.LONG_BREAK]: 'Long Break',
});

/** Per-session look. Keep in sync with the palettes in css/tokens.css. */
export const THEME = Object.freeze({
  [MODES.WORK]: { themeColor: '#2a1f3d', accent: '#ffb199', fileName: 'focus_session' },
  [MODES.SHORT_BREAK]: { themeColor: '#1d3340', accent: '#9fe0c4', fileName: 'quick_breather' },
  [MODES.LONG_BREAK]: { themeColor: '#3b2530', accent: '#ffd28a', fileName: 'long_chill' },
});

export const WORK_PLACEHOLDER = 'what are you focusing on?';

/** Gentle suggestions shown in the task field during breaks (the field is for the next work session). */
export const BREAK_TIPS = Object.freeze({
  [MODES.SHORT_BREAK]: [
    'stretch your neck and shoulders',
    'drink a glass of water',
    'look at something far away',
    'stand up and walk a little',
    'take three slow breaths',
  ],
  [MODES.LONG_BREAK]: [
    'step outside for a minute',
    'make yourself a warm drink',
    'move around, no screens',
    'rest your eyes for a while',
  ],
});

/** One-click interval presets in the settings dialog. */
export const PRESETS = Object.freeze({
  classic: { work: 25, shortBreak: 5, longBreak: 15, longBreakInterval: 4 },
  deep: { work: 50, shortBreak: 10, longBreak: 30, longBreakInterval: 3 },
  flow: { work: 90, shortBreak: 20, longBreak: 30, longBreakInterval: 2 },
});

/** Circumference of the progress ring (r = 90 in the SVG's 200x200 viewBox). */
export const RING_LENGTH = 2 * Math.PI * 90;

export const BASE_TITLE = 'Lofi Pomodoro';
export const STATIC_FAVICON = 'icon.svg';
