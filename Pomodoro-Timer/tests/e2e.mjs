// End-to-end test: drives the real app in headless Chrome/Edge through the Chrome
// DevTools Protocol. No dependencies (needs Node 22+ for the global WebSocket).
//
//   E2E_URL=http://127.0.0.1:8080/ node tests/e2e.mjs
//
// Environment:
//   E2E_URL      app URL                    (default http://127.0.0.1:8080/)
//   CHROME_PATH  Chrome/Chromium/Edge binary (auto-detected if unset)
//   E2E_OUT      folder for screenshots     (default <tmp>/lofi-e2e)
//
// The app uses Date.now() for the countdown, so the test fast-forwards a 25
// minute session by skewing Date.now() instead of waiting.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const URL_ = process.env.E2E_URL ?? 'http://127.0.0.1:8080/';
const OUT = process.env.E2E_OUT ?? join(tmpdir(), 'lofi-e2e');
const PORT = 9333;

const CANDIDATES = [
  process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
].filter(Boolean);
const BROWSER = CANDIDATES.find((p) => existsSync(p));
if (!BROWSER) {
  console.error('No Chrome/Chromium/Edge found. Set CHROME_PATH.');
  process.exit(2);
}

mkdirSync(OUT, { recursive: true });
const profile = mkdtempSync(join(OUT, 'profile-')); // fresh profile => empty localStorage
const args = [
  '--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--window-size=1000,1300',
  ...(process.env.CI ? ['--no-sandbox'] : []),
  'about:blank',
];
const proc = spawn(BROWSER, args, { stdio: 'ignore' });

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json`)).json();
      const page = list.find((t) => t.type === 'page');
      if (page) return page;
    } catch { /* browser not up yet */ }
    await sleep(250);
  }
  throw new Error('browser DevTools endpoint did not come up');
}

const target = await getTarget();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));

let nextId = 0;
const pending = new Map();
const problems = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    pending.get(msg.id)(msg);
    pending.delete(msg.id);
    return;
  }
  if (msg.method === 'Runtime.exceptionThrown') {
    const d = msg.params.exceptionDetails;
    problems.push('EXCEPTION: ' + (d.exception?.description || d.text));
  } else if (msg.method === 'Runtime.consoleAPICalled' && ['error', 'warning'].includes(msg.params.type)) {
    problems.push(`console.${msg.params.type}: ` + msg.params.args.map((a) => a.value ?? a.description).join(' '));
  } else if (msg.method === 'Log.entryAdded' && ['error', 'warning'].includes(msg.params.entry.level)) {
    problems.push(`log.${msg.params.entry.level}: ${msg.params.entry.text} ${msg.params.entry.url || ''}`);
  }
};

const send = (method, params = {}) =>
  new Promise((res) => {
    const id = ++nextId;
    pending.set(id, res);
    ws.send(JSON.stringify({ id, method, params }));
  });

const ev = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
  if (r.result.exceptionDetails) {
    throw new Error(`eval failed: ${expr} -> ${r.result.exceptionDetails.exception?.description}`);
  }
  return r.result.result.value;
};
const text = (id) => ev(`document.getElementById('${id}').textContent`);
const click = (selector) => ev(`document.querySelector(${JSON.stringify(selector)}).click()`);

async function shot(name, full = true) {
  let params = { format: 'png' };
  if (full) {
    const m = (await send('Page.getLayoutMetrics')).result;
    params = {
      format: 'png', captureBeyondViewport: true,
      clip: { x: 0, y: 0, width: m.cssContentSize.width, height: m.cssContentSize.height, scale: 1 },
    };
  }
  const r = await send('Page.captureScreenshot', params);
  writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.result.data, 'base64'));
}

async function reload() {
  await send('Page.reload');
  await sleep(2200);
}

const results = [];
function check(name, ok, detail = '') {
  results.push({ name, ok });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  -> ${detail}` : ''}`);
}

try {
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Log.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', {
    source: '(() => { const real = Date.now.bind(Date); window.__skew = 0; Date.now = () => real() + window.__skew; })();',
  });
  await send('Page.navigate', { url: URL_ });
  await sleep(2500);

  // ---- first paint ---------------------------------------------------------
  check('page title', (await ev('document.title')) === 'Lofi Pomodoro');
  check('initial time 25:00', (await text('timer-display')) === '25:00');
  check('cycle dots = 4', (await ev(`document.querySelectorAll('#cycle li').length`)) === 4);
  check('goal shows 8', (await text('goal')) === '8');
  check('log empty message visible', await ev(`!document.getElementById('log-empty').hidden`));
  check('week chart has 7 bars, today flagged',
    (await ev(`document.querySelectorAll('#week li').length`)) === 7 &&
    (await ev(`document.querySelectorAll('#week li[data-today="true"]').length`)) === 1);
  check('no streak yet', (await text('streak')).startsWith('No streak'));
  check('wide screen: timer left, panels right (two columns)', await ev(`(() => {
    const t = document.querySelector('.timer-card').getBoundingClientRect();
    const a = document.querySelector('.ambience').getBoundingClientRect();
    return t.right <= a.left && Math.abs(t.top - document.querySelector('.room').getBoundingClientRect().top) < 2;
  })()`));
  check('goal marker set on the week chart', (await ev(`document.getElementById('week').style.getPropertyValue('--goal')`)) === '100%');

  // ---- presets -----------------------------------------------------------------
  await click('#open-settings');
  await sleep(300);
  check('classic preset highlighted by default', (await ev(`document.querySelector('.preset[data-preset="classic"]').getAttribute('aria-pressed')`)) === 'true');
  await click('.preset[data-preset="deep"]');
  check('deep preset fills the form',
    (await ev(`['s-work','s-short','s-long','s-interval'].map(i => document.getElementById(i).value).join('/')`)) === '50/10/30/3');
  check('deep preset highlighted, classic not',
    (await ev(`document.querySelector('.preset[data-preset="deep"]').getAttribute('aria-pressed')`)) === 'true' &&
    (await ev(`document.querySelector('.preset[data-preset="classic"]').getAttribute('aria-pressed')`)) === 'false');
  await click('#settings-form button[type=submit]');
  await sleep(500);
  check('saved preset applies to idle timer (50:00)', (await text('timer-display')) === '50:00');
  await click('#open-settings');
  await sleep(200);
  await ev(`(() => { const i = document.getElementById('s-work'); i.value = '30'; i.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  check('editing a number clears the preset highlight', (await ev(`document.querySelector('.preset[aria-pressed="true"]')`)) === null);
  await click('.preset[data-preset="classic"]');
  await click('#settings-form button[type=submit]');
  await sleep(500);
  check('back to classic (25:00)', (await text('timer-display')) === '25:00');

  // ---- task + start + tonearm -----------------------------------------------------
  const armIdle = await ev(`getComputedStyle(document.querySelector('.dial__arm')).transform`);
  await ev(`(() => { const t = document.getElementById('task'); t.focus(); t.value = 'write  report'; t.dispatchEvent(new Event('input', {bubbles:true})); })()`);
  check('titlebar reflects task', (await text('title-name')) === 'write_report.lofi');
  await click('#toggle');
  await sleep(1600);
  check('running state + Pause label', (await ev('document.body.dataset.status')) === 'running' && (await text('toggle-label')) === 'Pause');
  check('document.title shows task', (await ev('document.title')).includes('write report'));
  check('favicon switched to progress ring', await ev(`document.getElementById('favicon').href.startsWith('data:image/svg+xml')`));
  check('tonearm swings onto the record', (await ev(`getComputedStyle(document.querySelector('.dial__arm')).transform`)) !== armIdle);

  // ---- reload keeps the session -----------------------------------------------------
  await reload();
  const resumed = await text('timer-display');
  check('running session survives a reload', (await ev('document.body.dataset.status')) === 'running' && resumed.startsWith('24:'), resumed);
  check('task survives a reload', (await ev(`document.getElementById('task').value`)) === 'write report');
  await click('#toggle');
  await sleep(300);
  const pausedAt = await text('timer-display');
  await reload();
  check('paused session survives a reload',
    (await ev('document.body.dataset.status')) === 'paused' && (await text('timer-display')) === pausedAt, pausedAt);
  await click('#toggle'); // resume
  await sleep(300);

  // ---- ambience (real Web Audio) --------------------------------------------------------
  for (const name of ['rain', 'vinyl', 'chords', 'beat']) await click(`.chip[data-amb="${name}"]`);
  await sleep(5000);
  check('all 4 ambience chips pressed', await ev(`[...document.querySelectorAll('.chip')].every(c => c.getAttribute('aria-pressed') === 'true')`));
  check('rain + ambience flags on', (await ev(`document.body.dataset.rain + document.body.dataset.ambience`)) === 'onon');
  await shot('desktop-running');

  // ---- finish the session -------------------------------------------------------------------
  await ev('window.__skew = 25 * 60 * 1000 + 2000');
  await sleep(600);
  check('end-of-session pulse', await ev(`document.body.classList.contains('pulse')`));
  check('completed counter = 1', (await text('completed')) === '1');
  check('moved to short break', (await ev('document.body.dataset.mode')) === 'shortBreak');
  check('log entry with task',
    (await ev(`document.querySelectorAll('#log li').length`)) === 1 && (await ev(`document.querySelector('.log__task').textContent`)) === 'write report');
  check('summary shows 25m focused', (await text('today-summary')) === '25m focused');
  check('cycle dot filled', (await ev(`document.querySelectorAll('#cycle li[data-done="true"]').length`)) === 1);
  check('persisted today', (await ev(`JSON.parse(localStorage.getItem('pomodoro.today.v2')).count`)) === 1);
  check('history written', (await ev(`Object.values(JSON.parse(localStorage.getItem('pomodoro.history.v1'))).map(d => d.count).join()`)) === '1');
  check('week chart shows today = 1', (await ev(`document.querySelector('#week li[data-today="true"] .week__count').textContent`)) === '1');
  check('streak = 1 day', (await text('streak')).includes('1-day'), await text('streak'));
  check('week total', (await text('week-total')) === '1 session this week');

  // ---- task suggestions, break halo, wake lock, mode shortcuts --------------------------------------
  check('finished task is offered as a suggestion',
    (await ev(`[...document.querySelectorAll('#task-suggestions option')].map((o) => o.value).join()`)) === 'write report');
  check('and persisted', (await ev(`JSON.parse(localStorage.getItem('pomodoro.recentTasks.v1')).join()`)) === 'write report');

  const haloAnimation = () => ev(`getComputedStyle(document.querySelector('.dial__breath')).animationName`);
  check('breathing halo is still while the break has not started', (await haloAnimation()) === 'none');

  const wakeLockSupported = await ev(`'wakeLock' in navigator`);
  await ev(`(() => {
    window.__wl = [];
    if (!('wakeLock' in navigator)) return;
    navigator.wakeLock.request = async (type) => {
      window.__wl.push(type);
      return { addEventListener() {}, release: async () => { window.__wl.push('release'); } };
    };
  })()`);
  await click('#toggle'); // start the short break
  await sleep(400);
  check('breathing halo animates while a break runs', (await haloAnimation()) === 'breathe');
  if (wakeLockSupported) {
    check('screen wake lock requested while running', (await ev('window.__wl.join()')) === 'screen');
    await click('#toggle'); // pause
    await sleep(300);
    check('screen wake lock released on pause', (await ev('window.__wl.join()')) === 'screen,release');
  } else {
    check('wake lock unsupported here: the timer still runs', (await ev('document.body.dataset.status')) === 'running');
    await click('#toggle');
    await sleep(200);
  }
  await click('#reset');
  await sleep(200);

  const press = (key) => ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: ${JSON.stringify(key)}, bubbles: true }))`);
  await press('3');
  await sleep(150);
  check('key 3 selects Long Break', (await ev('document.body.dataset.mode')) === 'longBreak');
  await press('1');
  await sleep(150);
  check('key 1 selects Work', (await ev('document.body.dataset.mode')) === 'work');
  await ev(`document.getElementById('task').dispatchEvent(new KeyboardEvent('keydown', { key: '2', bubbles: true }))`);
  await sleep(150);
  check('digits typed in the task field do not switch session', (await ev('document.body.dataset.mode')) === 'work');

  // ---- settings: goal reached + validation -----------------------------------------------------
  await click('#open-settings');
  await sleep(500);
  check('settings dialog open + filled', await ev(`document.getElementById('settings').open && document.getElementById('s-work').value === '25' && document.getElementById('s-goal').value === '8' && document.getElementById('s-awake').checked`));
  await shot('dialog', false);
  await ev(`document.getElementById('s-goal').value = '1'`);
  await click('#settings-form button[type=submit]');
  await sleep(600);
  check('dialog closed after save', await ev(`!document.getElementById('settings').open`));
  check('goal reached styling',
    (await ev(`document.getElementById('goalbar').dataset.reached`)) === 'true' && (await text('goal-label')).includes('reached'));
  check('today bar marked as goal met', (await ev(`document.querySelector('#week li[data-today="true"]').dataset.met`)) === 'true');

  await click('#open-settings');
  await sleep(200);
  await ev(`document.getElementById('s-work').value = '0'`);
  await click('#settings-form button[type=submit]');
  await sleep(300);
  check('invalid value: error shown, dialog stays open', await ev(`document.getElementById('settings').open && !document.getElementById('settings-error').hidden`));
  await click('#cancel-settings');
  await sleep(200);

  // ---- shortcuts, reset ---------------------------------------------------------------------------
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'r', bubbles: true }))`);
  await sleep(100);
  check('R resets session', (await ev('document.body.dataset.status')) === 'idle');
  await click('#reset-count');
  check('Reset today asks for confirmation first',
    (await ev(`document.getElementById('reset-count').dataset.armed`)) === 'true' && (await text('completed')) === '1');
  await click('#reset-count');
  await sleep(200);
  check('reset today clears count, log and history',
    (await text('completed')) === '0' && (await ev(`document.querySelectorAll('#log li').length`)) === 0 &&
    (await ev(`Object.keys(JSON.parse(localStorage.getItem('pomodoro.history.v1'))).length`)) === 0);

  // ---- ambience off (before any reload, which would reset the chips) ----------------------------------------
  for (const name of ['rain', 'vinyl', 'chords', 'beat']) await click(`.chip[data-amb="${name}"]`);
  await sleep(1200);
  check('ambience off again', (await ev(`document.body.dataset.ambience + document.body.dataset.rain`)) === 'offoff');

  // ---- a session that ended while the page was closed --------------------------------------------------
  await ev('window.__skew = 0'); // real clock again, so "5 seconds ago" really is in the past after a reload
  await ev(`localStorage.setItem('pomodoro.session.v1', JSON.stringify({ mode: 'work', status: 'running', remainingMs: 1000, endAt: Date.now() - 5000 }))`);
  await reload();
  check('expired session is completed on load', (await text('completed')) === '1' && (await ev('document.body.dataset.mode')) === 'shortBreak');
  check('and logged', (await ev(`document.querySelectorAll('#log li').length`)) === 1);
  await ev(`localStorage.setItem('pomodoro.session.v1', JSON.stringify({ mode: 'work', status: 'running', remainingMs: 1000, endAt: Date.now() - 3 * 86400000 }))`);
  await click('#reset-count');
  await click('#reset-count'); // armed, then confirmed
  await reload();
  check('a session from an earlier day is not credited to today', (await text('completed')) === '0');

  // ---- focus mode ---------------------------------------------------------------------------------------------------
  const shown = (sel) => ev(`getComputedStyle(document.querySelector(${JSON.stringify(sel)})).display !== 'none'`);
  check('focus mode starts off', (await ev('document.body.dataset.focus')) === 'off' && (await shown('.today')));
  await click('#toggle-focus');
  await sleep(200);
  check('focus mode hides room, stats and log but keeps timer + ambience',
    (await ev('document.body.dataset.focus')) === 'on' && !(await shown('.today')) && !(await shown('.stats')) &&
    !(await shown('.room')) && (await shown('.timer-card')) && (await shown('.ambience')));
  check('focus button reports pressed', (await ev(`document.getElementById('toggle-focus').getAttribute('aria-pressed')`)) === 'true');
  await reload();
  check('focus mode survives a reload', (await ev('document.body.dataset.focus')) === 'on');
  await ev(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', bubbles: true }))`);
  await sleep(200);
  check('F key turns focus mode off', (await ev('document.body.dataset.focus')) === 'off' && (await shown('.today')));

  // ---- theme palette changes smoothly --------------------------------------------------------------------------------
  const accent = () => ev(`getComputedStyle(document.body).getPropertyValue('--accent').trim()`);
  const workAccent = await accent();
  await click('.mode[data-mode="longBreak"]');
  await sleep(900);
  const breakAccent = await accent();
  check('session palette switches (accent colour changes)', workAccent !== breakAccent, `${workAccent} -> ${breakAccent}`);
  await click('.mode[data-mode="work"]');
  await sleep(900);

  // ---- a short laptop screen: Start must be reachable without scrolling ----------------------------------------------
  await send('Emulation.setDeviceMetricsOverride', { width: 1366, height: 768, deviceScaleFactor: 1, mobile: false });
  await sleep(700);
  check('1366x768: Start button is visible without scrolling',
    await ev(`(() => { const r = document.getElementById('toggle').getBoundingClientRect(); return r.top >= 0 && r.bottom <= window.innerHeight; })()`));
  await shot('laptop');

  // ---- mobile layout ---------------------------------------------------------------------------------------------
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
  await sleep(700);
  check('no horizontal scroll at 390px', await ev('document.documentElement.scrollWidth <= window.innerWidth + 1'),
    `${await ev('document.documentElement.scrollWidth')} vs ${await ev('window.innerWidth')}`);
  check('phone: single column, timer above the panels', await ev(`(() => {
    const t = document.querySelector('.timer-card').getBoundingClientRect();
    const a = document.querySelector('.ambience').getBoundingClientRect();
    return t.left === a.left && t.bottom <= a.top;
  })()`));
  check('phone: ambience chips are a 2x2 grid', (await ev(`getComputedStyle(document.querySelector('.chips')).display`)) === 'grid');
  await shot('mobile');
} catch (err) {
  console.log('SCRIPT ERROR:', err.message);
  results.push({ name: 'script', ok: false });
}

const real = problems.filter((p) => !/fonts\.(googleapis|gstatic)/.test(p));
console.log('\nconsole problems (excluding Google Fonts fetches):', real.length ? `\n  ${real.join('\n  ')}` : 'none');
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed. Screenshots: ${OUT}`);
ws.close();
proc.kill();
process.exit(failed || real.length ? 1 : 0);
