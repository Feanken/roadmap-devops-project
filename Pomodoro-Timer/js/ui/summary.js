// "Copy summary": puts a plain-text recap of today on the clipboard.

import { $, announce } from '../dom.js';

/** @param {{ getText: () => string }} deps */
export function initSummary({ getText }) {
  const button = $('copy-summary');
  const label = button.textContent;
  let resetTimer = null;

  button.addEventListener('click', async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(getText());
      ok = true;
    } catch {
      /* no clipboard API, or permission denied */
    }
    clearTimeout(resetTimer);
    button.textContent = ok ? 'Copied ✓' : 'Copy not available';
    announce(ok ? 'Summary copied to the clipboard.' : 'Copying is not available in this browser.');
    resetTimer = setTimeout(() => { button.textContent = label; }, 2000);
  });
}
