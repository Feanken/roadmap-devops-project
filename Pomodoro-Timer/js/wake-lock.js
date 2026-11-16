// Screen Wake Lock: keeps the display from sleeping while a session runs, so the
// countdown stays visible on a desk or a phone stand. Entirely optional: browsers
// without the API (or that refuse the request) just behave as before.
//
// The browser drops the lock whenever the tab is hidden, so we re-request it when
// the tab comes back and the caller still wants it.

export function createWakeLock() {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator;
  let wanted = false;
  let sentinel = null;
  let pending = false;

  async function acquire() {
    if (!supported || sentinel || pending || document.hidden) return;
    pending = true;
    try {
      sentinel = await navigator.wakeLock.request('screen');
      sentinel.addEventListener('release', () => { sentinel = null; });
      if (!wanted) release(); // stopped while the request was in flight
    } catch {
      sentinel = null; // denied (low battery, permissions policy, ...): not worth reporting
    } finally {
      pending = false;
    }
  }

  function release() {
    const current = sentinel;
    sentinel = null;
    current?.release().catch(() => { /* already released */ });
  }

  document.addEventListener('visibilitychange', () => {
    if (wanted && !document.hidden) acquire();
  });

  return {
    supported,
    /** Ask for (true) or give up (false) the lock. Safe to call repeatedly. */
    set(on) {
      wanted = Boolean(on);
      if (wanted) acquire();
      else release();
    },
    get active() { return sentinel !== null; },
  };
}
