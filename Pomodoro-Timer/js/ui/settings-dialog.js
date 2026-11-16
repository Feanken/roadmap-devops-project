// The settings dialog: form <-> timer settings, presets, validation, notification permission.

import { DEFAULT_SETTINGS } from '../timer.js';
import { PRESETS } from '../config.js';
import { saveSettings } from '../storage.js';
import { unlockAudio, playChime } from '../audio.js';
import { ensureNotificationPermission } from '../notify.js';
import { $, qsa, announce } from '../dom.js';

const NUMERIC_FIELDS = ['work', 'shortBreak', 'longBreak', 'longBreakInterval', 'dailyGoal'];

/**
 * @param {object} deps
 * @param {import('../timer.js').PomodoroTimer} deps.timer
 * @param {() => void} deps.onSaved  called after new settings were applied
 */
export function initSettingsDialog({ timer, onSaved }) {
  const dialog = $('settings');
  const form = $('settings-form');
  const error = $('settings-error');
  const presetButtons = qsa('.preset');

  const fields = {
    work: $('s-work'),
    shortBreak: $('s-short'),
    longBreak: $('s-long'),
    longBreakInterval: $('s-interval'),
    dailyGoal: $('s-goal'),
    autoStart: $('s-auto'),
    notify: $('s-notify'),
    sound: $('s-sound'),
    volume: $('s-volume'),
  };

  function clearErrors() {
    error.hidden = true;
    error.textContent = '';
    for (const el of Object.values(fields)) el.removeAttribute('aria-invalid');
  }

  /** Highlight the preset that matches the numbers currently in the form. */
  function syncPresetButtons() {
    for (const button of presetButtons) {
      const preset = PRESETS[button.dataset.preset];
      const match = Object.entries(preset).every(([key, value]) => Number(fields[key].value) === value);
      button.setAttribute('aria-pressed', String(match));
    }
  }

  function fillForm(settings) {
    for (const [key, el] of Object.entries(fields)) {
      if (el.type === 'checkbox') el.checked = settings[key];
      else el.value = settings[key];
    }
    clearErrors();
    syncPresetButtons();
  }

  const readForm = () =>
    Object.fromEntries(
      Object.entries(fields).map(([key, el]) => [key, el.type === 'checkbox' ? el.checked : Number(el.value)]),
    );

  // ---- open / close ----
  $('open-settings').addEventListener('click', () => {
    fillForm(timer.settings);
    dialog.showModal();
  });
  $('cancel-settings').addEventListener('click', () => dialog.close());
  $('close-settings').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close(); // click on the backdrop
  });

  // ---- helpers inside the dialog ----
  $('defaults').addEventListener('click', () => fillForm(DEFAULT_SETTINGS));
  $('test-sound').addEventListener('click', () => {
    unlockAudio();
    playChime(Number(fields.volume.value));
  });

  for (const button of presetButtons) {
    button.addEventListener('click', () => {
      for (const [key, value] of Object.entries(PRESETS[button.dataset.preset])) fields[key].value = value;
      clearErrors();
      syncPresetButtons();
    });
  }
  for (const key of Object.keys(PRESETS.classic)) fields[key].addEventListener('input', syncPresetButtons);

  // ---- save ----
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearErrors();

    const invalid = NUMERIC_FIELDS.map((key) => fields[key]).filter((el) => !el.checkValidity());
    if (invalid.length) {
      for (const el of invalid) el.setAttribute('aria-invalid', 'true');
      error.textContent = 'Please enter whole numbers within the allowed ranges.';
      error.hidden = false;
      invalid[0].focus();
      return;
    }

    const next = readForm();
    if (next.notify && !(await ensureNotificationPermission())) {
      next.notify = false;
      announce('Notifications are blocked or unavailable in this browser, so they were left off.');
    }
    timer.updateSettings(next);
    saveSettings(timer.settings);
    onSaved();
    dialog.close();
  });
}
