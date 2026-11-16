// Desktop notifications (opt-in). Everything is feature-detected and wrapped,
// because support and permission rules differ a lot between browsers.

import { MODES } from './timer.js';

const supported = () => typeof Notification !== 'undefined';

/** Ask for permission if needed. Resolves true only when notifications may be shown. */
export async function ensureNotificationPermission() {
  if (!supported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/** Show a notification, but only while the tab is hidden (otherwise the UI already says it). */
export function notifySessionEnd({ enabled, finished, body }) {
  if (!enabled || !document.hidden || !supported() || Notification.permission !== 'granted') return;
  try {
    new Notification(finished === MODES.WORK ? 'Time for a break 🌙' : 'Back to focus 🍅', {
      body,
      icon: 'icon-512.png',
      tag: 'pomodoro', // replaces the previous one instead of stacking
    });
  } catch {
    /* some mobile browsers only allow notifications from a service worker */
  }
}
