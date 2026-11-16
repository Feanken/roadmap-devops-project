// Ambience chips (rain / vinyl / chords / beat) and their shared volume slider.

import { unlockAudio, setAmbience, setAmbienceVolume } from '../audio.js';
import { loadAmbienceVolume, saveAmbienceVolume } from '../storage.js';
import { $, qsa, setData } from '../dom.js';

export function initAmbience() {
  const chips = qsa('.chip');
  const volume = $('amb-volume');
  const isOn = (chip) => chip.getAttribute('aria-pressed') === 'true';

  const initial = loadAmbienceVolume();
  volume.value = String(initial);
  setAmbienceVolume(initial);

  for (const chip of chips) {
    chip.addEventListener('click', () => {
      unlockAudio(); // a click is the user gesture browsers require
      chip.setAttribute('aria-pressed', String(setAmbience(chip.dataset.amb, !isOn(chip))));

      setData(document.body, 'rain', chips.some((c) => c.dataset.amb === 'rain' && isOn(c)) ? 'on' : 'off');
      setData(document.body, 'ambience', chips.some(isOn) ? 'on' : 'off');
    });
  }

  volume.addEventListener('input', () => {
    const v = Number(volume.value);
    setAmbienceVolume(v);
    saveAmbienceVolume(v);
  });
}
