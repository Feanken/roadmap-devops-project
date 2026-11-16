// The favicon doubles as a tiny progress ring while a session is active.

import { STATUS } from './timer.js';
import { STATIC_FAVICON } from './config.js';

const CIRCUMFERENCE = 2 * Math.PI * 13;

function ringSvg(accent, progress) {
  const dash = CIRCUMFERENCE.toFixed(2);
  const offset = (CIRCUMFERENCE * progress).toFixed(2);
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<circle cx="16" cy="16" r="16" fill="#1f1631"/>' +
    '<circle cx="16" cy="16" r="13" fill="none" stroke="#ffffff" stroke-opacity=".2" stroke-width="4"/>' +
    `<circle cx="16" cy="16" r="13" fill="none" stroke="${accent}" stroke-width="4" stroke-linecap="round" ` +
    `stroke-dasharray="${dash}" stroke-dashoffset="${offset}" transform="rotate(-90 16 16)"/></svg>`
  );
}

/** @param {HTMLLinkElement} link the <link rel="icon"> element */
export function createFavicon(link) {
  let lastKey = '';
  return {
    /** progress is 0..1; the icon only changes ~60 times per session, not every tick. */
    update(snapshot, progress, accent) {
      const idle = snapshot.status === STATUS.IDLE;
      const key = idle ? 'idle' : `${accent}-${Math.round(progress * 60)}`;
      if (key === lastKey) return;
      lastKey = key;
      link.href = idle
        ? STATIC_FAVICON
        : `data:image/svg+xml,${encodeURIComponent(ringSvg(accent, progress))}`;
    },
  };
}
