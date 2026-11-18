// WCAG contrast of every theme x session palette in css/tokens.css.
//
// The palettes are plain CSS, so this reads the stylesheet itself (no copy of the
// colours to keep in sync) and checks the pairs the UI really draws:
//   - cream text on the page gradient and on panels
//   - accent-coloured text/ring on panels and on the dial face
//   - dark text on an accent background (primary button, pressed chips, presets)
// Text needs 4.5:1 (WCAG 2.2 AA); non-text UI such as the progress ring needs 3:1.

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const css = readFileSync(fileURLToPath(new URL('../css/tokens.css', import.meta.url)), 'utf8')
  .replace(/\/\*[\s\S]*?\*\//g, '');

/** Custom properties declared in the first `selector { ... }` block. */
function declarations(selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = new RegExp(`(?:^|[\\s}])${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  assert.ok(match, `selector not found: ${selector}`);
  const body = match[1];
  return Object.fromEntries([...body.matchAll(/(--[\w-]+):\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}

function color(value) {
  const hex = /^#([0-9a-f]{6})$/i.exec(value);
  if (hex) return [0, 2, 4].map((i) => parseInt(hex[1].slice(i, i + 2), 16));
  const rgb = /^rgb\(\s*(\d+)\s+(\d+)\s+(\d+)\s*(?:\/\s*([\d.]+))?\s*\)$/.exec(value);
  assert.ok(rgb, `cannot parse colour: ${value}`);
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3]), rgb[4] === undefined ? 1 : Number(rgb[4])];
}

const over = ([r, g, b, a = 1], [br, bg, bb]) => [r * a + br * (1 - a), g * a + bg * (1 - a), b * a + bb * (1 - a)];

function luminance([r, g, b]) {
  const lin = (c) => { const s = c / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}
const ratio = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// ---- assemble { theme, mode } -> palette, the way the cascade does ---------------
const base = declarations(':root');
const palettes = [];
for (const theme of ['dusk', 'forest', 'ocean']) {
  const themed = theme === 'dusk' ? {} : declarations(`:root[data-theme="${theme}"]`);
  const work = { ...base, ...themed };
  const breakSelector = (mode) => (theme === 'dusk' ? `body[data-mode="${mode}"]` : `:root[data-theme="${theme}"] body[data-mode="${mode}"]`);
  palettes.push(
    { name: `${theme}/work`, p: work },
    { name: `${theme}/shortBreak`, p: { ...work, ...declarations(breakSelector('shortBreak')) } },
    { name: `${theme}/longBreak`, p: { ...work, ...declarations(breakSelector('longBreak')) } },
  );
}

const MIN_TEXT = 4.5;
const MIN_UI = 3;

for (const { name, p } of palettes) {
  const ink = color(p['--ink']);
  const inkDim = color(p['--ink-dim']);
  const accent = color(p['--accent']);
  const bg = [p['--bg'], p['--bg-2'], p['--bg-3']].map(color);
  const panelSolid = color(p['--panel-solid']);
  const face = color(p['--face']);
  const panelOverPage = bg.map((page) => over(color(p['--panel']), page)); // the translucent panel, over each end of the gradient

  test(`${name}: body text is readable on the page and on panels`, () => {
    for (const surface of [...bg, panelSolid, face, ...panelOverPage]) {
      assert.ok(ratio(ink, surface) >= MIN_TEXT, `ink on ${surface.map(Math.round)} = ${ratio(ink, surface).toFixed(2)}`);
      assert.ok(ratio(over(inkDim, surface), surface) >= MIN_TEXT, `ink-dim on ${surface.map(Math.round)} = ${ratio(over(inkDim, surface), surface).toFixed(2)}`);
    }
  });

  test(`${name}: accent text is readable on panels and the dial face`, () => {
    for (const surface of [panelSolid, face, ...panelOverPage]) {
      assert.ok(ratio(accent, surface) >= MIN_TEXT, `accent on ${surface.map(Math.round)} = ${ratio(accent, surface).toFixed(2)}`);
    }
  });

  test(`${name}: dark text on accent buttons and the progress ring against the face`, () => {
    for (const label of [color(p['--bg']), color(p['--bg-3'])]) {
      assert.ok(ratio(label, accent) >= MIN_TEXT, `label on accent = ${ratio(label, accent).toFixed(2)}`);
    }
    assert.ok(ratio(accent, face) >= MIN_UI, `ring on face = ${ratio(accent, face).toFixed(2)}`);
  });

  test(`${name}: focus ring and error colour stand out from panels`, () => {
    assert.ok(ratio(color(p['--focus']), panelSolid) >= MIN_UI, 'focus ring');
    assert.ok(ratio(color(p['--danger']), panelSolid) >= MIN_TEXT, 'error text');
  });
}
