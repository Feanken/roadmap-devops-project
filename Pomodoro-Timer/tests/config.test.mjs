import test from 'node:test';
import assert from 'node:assert/strict';
import { THEMES, DEFAULT_THEME, THEME, paletteFor } from '../js/config.js';
import { MODES } from '../js/timer.js';
import { loadTheme } from '../js/storage.js';

test('the default theme exists and uses the base palette', () => {
  assert.ok(Object.hasOwn(THEMES, DEFAULT_THEME));
  for (const mode of Object.values(MODES)) assert.deepEqual(paletteFor(DEFAULT_THEME, mode), THEME[mode]);
});

test('every theme has a palette for every session, as valid hex colours', () => {
  for (const id of Object.keys(THEMES)) {
    for (const mode of Object.values(MODES)) {
      const { themeColor, accent } = paletteFor(id, mode);
      assert.match(themeColor, /^#[0-9a-f]{6}$/i, `${id}/${mode} themeColor`);
      assert.match(accent, /^#[0-9a-f]{6}$/i, `${id}/${mode} accent`);
    }
  }
});

test('non-default themes really differ from the default', () => {
  for (const id of Object.keys(THEMES).filter((t) => t !== DEFAULT_THEME)) {
    assert.notEqual(paletteFor(id, MODES.WORK).accent, paletteFor(DEFAULT_THEME, MODES.WORK).accent, id);
  }
});

test('an unknown theme falls back to the default palette', () => {
  assert.deepEqual(paletteFor('nope', MODES.WORK), THEME[MODES.WORK]);
  assert.deepEqual(paletteFor(undefined, MODES.SHORT_BREAK), THEME[MODES.SHORT_BREAK]);
});

test('loadTheme survives missing storage (Node has no localStorage)', () => {
  assert.equal(loadTheme(), DEFAULT_THEME);
});
