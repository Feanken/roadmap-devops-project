// Static consistency checks for a project that has no build step (so nothing else
// would notice a typo'd id or a file forgotten in the offline cache).
//
//   node tools/check.mjs
//
// Dependency-free. Exits 1 and lists every problem it finds.

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const problems = [];
const fail = (msg) => problems.push(msg);

function walk(dir, ext) {
  return readdirSync(join(root, dir)).flatMap((name) => {
    const rel = `${dir}/${name}`;
    if (statSync(join(root, rel)).isDirectory()) return walk(rel, ext);
    return rel.endsWith(ext) ? [rel] : [];
  });
}

const html = read('index.html');
const jsFiles = walk('js', '.js');
const cssFiles = walk('css', '.css');

// 1. ids ------------------------------------------------------------------------------
const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]));
for (const file of jsFiles) {
  for (const [, id] of read(file).matchAll(/\$\('([\w-]+)'\)/g)) {
    if (!ids.has(id)) fail(`${file}: $('${id}') but index.html has no id="${id}"`);
  }
}
for (const [, target] of html.matchAll(/(?:for|aria-labelledby|aria-describedby)="([^"]+)"/g)) {
  for (const id of target.split(/\s+/)) if (!ids.has(id)) fail(`index.html: references missing id "${id}"`);
}
for (const [, ref] of html.matchAll(/href="#([\w-]+)"/g)) {
  if (!ids.has(ref)) fail(`index.html: href="#${ref}" has no target`);
}

// 2. local files referenced from index.html --------------------------------------------------
for (const [, url] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
  if (/^(https?:|data:|\/\/)/.test(url)) continue;
  if (!existsSync(join(root, url))) fail(`index.html: "${url}" does not exist`);
}

// 3. ES module imports resolve ------------------------------------------------------------------
for (const file of jsFiles) {
  for (const [, spec] of read(file).matchAll(/from\s+'(\.[^']+)'/g)) {
    if (!existsSync(resolve(root, dirname(file), spec))) fail(`${file}: cannot resolve import '${spec}'`);
  }
}

// 4. every stylesheet is linked, and every rule lives in a cascade layer ----------------------------
for (const file of cssFiles) {
  if (!html.includes(`href="${file}"`)) fail(`${file} is not linked from index.html`);
  const withoutComments = read(file).replace(/\/\*[\s\S]*?\*\//g, '');
  const topLevelRules = withoutComments.split(/@layer[^{;]*[{;]/)[0].trim();
  if (!file.endsWith('tokens.css') && topLevelRules) fail(`${file}: rules found outside an @layer block`);
}
if (!/@layer\s+reset,/.test(read('css/tokens.css'))) fail('css/tokens.css must declare the layer order first');
if (html.indexOf('css/tokens.css') > html.indexOf('css/base.css')) fail('tokens.css must be linked before the other stylesheets');

// 5. offline cache lists every app file ---------------------------------------------------------------
const shellSource = read('sw.js').match(/const SHELL = \[([\s\S]*?)\];/);
if (!shellSource) {
  fail('sw.js: could not find the SHELL list');
} else {
  const shell = new Set([...shellSource[1].matchAll(/'([^']+)'/g)].map((m) => m[1]));
  for (const file of shell) if (file !== './' && !existsSync(join(root, file))) fail(`sw.js: SHELL lists missing file "${file}"`);
  for (const file of [...jsFiles, ...cssFiles, 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-512.png']) {
    if (!shell.has(file)) fail(`sw.js: SHELL is missing "${file}" (it would not work offline)`);
  }
}

// 6. things the Content-Security-Policy in nginx/security-headers.conf would block ----------------------
if (/<style[\s>]/i.test(html)) fail('index.html: <style> element (blocked by style-src)');
if (/\sstyle="/i.test(html)) fail('index.html: inline style="" attribute (blocked by style-src)');
if (/\son[a-z]+="/i.test(html)) fail('index.html: inline event handler attribute (blocked by script-src)');
if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(html)) fail('index.html: inline <script> (blocked by script-src)');

// 7. heading structure -------------------------------------------------------------------------------------
const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
if (h1 !== 1) fail(`index.html: expected exactly one <h1>, found ${h1}`);

if (problems.length) {
  console.error(`${problems.length} problem(s):\n - ${problems.join('\n - ')}`);
  process.exit(1);
}
console.log(
  `OK: ${jsFiles.length} JS modules, ${cssFiles.length} stylesheets, ${ids.size} ids in index.html, ` +
  `offline cache complete (${relative(process.cwd(), root) || '.'})`,
);
