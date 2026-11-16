// Colour theme picker (in the settings dialog). The palettes themselves are CSS
// (css/tokens.css, selected by <html data-theme>); this only stores the choice
// and keeps the buttons in sync.

import { THEMES } from '../config.js';
import { loadTheme, saveTheme } from '../storage.js';
import { qsa, announce } from '../dom.js';

/** @param {{ onChange: () => void }} deps  called after the theme changed (to refresh meta colour + favicon) */
export function initTheme({ onChange }) {
  const buttons = qsa('.theme');

  const apply = (id) => {
    document.documentElement.dataset.theme = id;
    for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.themeId === id));
  };

  apply(loadTheme());
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const id = button.dataset.themeId;
      apply(id);
      saveTheme(id);
      announce(`${THEMES[id].label} theme`);
      onChange();
    });
  }
}
