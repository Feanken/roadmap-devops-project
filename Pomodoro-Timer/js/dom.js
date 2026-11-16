// Small DOM helpers.
//
// The setters only touch the DOM when the value really changed. The timer
// renders four times a second, and most of what it shows is identical from one
// tick to the next, so skipping the redundant writes keeps style recalculation
// (and therefore battery use) low.

/** Look up an element by id; fail loudly (with the id) if index.html lost it. */
export function $(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Element #${id} is missing from index.html`);
  return el;
}

export const qsa = (selector, root = document) => [...root.querySelectorAll(selector)];

export function setText(el, value) {
  const text = String(value);
  if (el.textContent !== text) el.textContent = text;
}

export function setAttr(el, name, value) {
  const text = String(value);
  if (el.getAttribute(name) !== text) el.setAttribute(name, text);
}

export function setData(el, key, value) {
  const text = String(value);
  if (el.dataset[key] !== text) el.dataset[key] = text;
}

/** Clone the single root element of a <template id="..."> from index.html. */
export function cloneTemplate(id) {
  return $(id).content.firstElementChild.cloneNode(true);
}

/**
 * Should a single-key shortcut (Space, R, S, F) fire for this keydown?
 * No while typing in a field, with a modifier held, or while the settings dialog is open.
 */
export function shortcutsAllowed(event) {
  if (event.ctrlKey || event.metaKey || event.altKey || $('settings').open) return false;
  const tag = event.target.tagName;
  return tag !== 'INPUT' && tag !== 'TEXTAREA' && tag !== 'SELECT';
}

/** Say something to screen readers (polite live region). */
export function announce(message) {
  const region = $('announcer');
  region.textContent = ''; // clear first so repeating the same text is still announced
  setTimeout(() => { region.textContent = message; }, 50);
}
