// Focus mode: hides the scenery, statistics and log so only the timer and the
// ambience controls remain. The layout itself is pure CSS (body[data-focus]).

import { $, setData, announce, shortcutsAllowed } from '../dom.js';
import { loadFocusMode, saveFocusMode } from '../storage.js';

export function initFocusMode() {
  const button = $('toggle-focus');
  let on = loadFocusMode();

  const apply = () => {
    setData(document.body, 'focus', on ? 'on' : 'off');
    button.setAttribute('aria-pressed', String(on));
  };
  const toggle = () => {
    on = !on;
    apply();
    saveFocusMode(on);
    announce(on ? 'Focus mode on' : 'Focus mode off');
  };

  apply();
  button.addEventListener('click', toggle);
  document.addEventListener('keydown', (e) => {
    if ((e.key === 'f' || e.key === 'F') && shortcutsAllowed(e)) toggle();
  });
}
