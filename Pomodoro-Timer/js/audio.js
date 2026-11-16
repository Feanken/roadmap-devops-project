// All sound is generated with the Web Audio API: no audio files to download
// (and nothing copyrighted). Two parts:
//   1. playChime()   – the end-of-session notification
//   2. ambience      – optional rain / vinyl crackle / chords / drum beat
//
// The musical layers (chords + beat) share one bar clock so they stay in time
// no matter when each one is switched on.

let ctx = null;
let master = null; // gain node shared by all ambience layers
let ambienceVolume = 0.5;
const active = { rain: null, vinyl: null, chords: null, beat: null };

function getContext() {
  try {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx ??= new AC();
    return ctx;
  } catch {
    return null;
  }
}

/** Create/resume the AudioContext. Call from a user gesture, otherwise the
 *  browser keeps it suspended and nothing is audible. */
export function unlockAudio() {
  const c = getContext();
  if (c && c.state === 'suspended') c.resume();
}

// ---- end-of-session chime ---------------------------------------------------
/** Play a short three-note chime. `volume` is 0..1. */
export function playChime(volume = 0.6) {
  if (!ctx || volume <= 0) return;
  const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6
  const start = ctx.currentTime + 0.02;

  notes.forEach((freq, i) => {
    const t = start + i * 0.22;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume * 0.5), t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.6);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 0.65);
  });
}

// ---- ambience helpers -------------------------------------------------------
function getMaster() {
  if (!master) {
    master = ctx.createGain();
    master.gain.value = ambienceVolume;
    master.connect(ctx.destination);
  }
  return master;
}

/** Fill a mono looping buffer; `fill(i, sampleRate)` returns one sample. */
function makeBuffer(seconds, fill) {
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = fill(i, ctx.sampleRate);
  return buf;
}

function loopSource(buffer) {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

/** Fade a layer's gain in; returns a function that fades out and cleans up. */
function fadeLayer(layer, nodes, target) {
  const t = ctx.currentTime;
  layer.gain.setValueAtTime(0.0001, t);
  layer.gain.exponentialRampToValueAtTime(target, t + 1.2);
  return () => {
    const now = ctx.currentTime;
    layer.gain.cancelScheduledValues(now);
    layer.gain.setValueAtTime(Math.max(layer.gain.value, 0.0001), now);
    layer.gain.exponentialRampToValueAtTime(0.0001, now + 0.8);
    setTimeout(() => {
      nodes.forEach((n) => {
        try { n.stop?.(); } catch { /* already stopped */ }
        n.disconnect();
      });
      layer.disconnect();
    }, 900);
  };
}

// ---- rain: soft filtered noise + low rumble ------------------------------------
function startRain() {
  const layer = ctx.createGain();
  layer.connect(getMaster());

  const hiss = loopSource(makeBuffer(4, () => Math.random() * 2 - 1));
  const band = ctx.createBiquadFilter();
  band.type = 'bandpass';
  band.frequency.value = 2600;
  band.Q.value = 0.45;
  const hissGain = ctx.createGain();
  hissGain.gain.value = 0.5;
  hiss.connect(band).connect(hissGain).connect(layer);

  let last = 0; // brown noise for the low rumble
  const rumble = loopSource(makeBuffer(4, () => {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    return last * 3.5;
  }));
  const low = ctx.createBiquadFilter();
  low.type = 'lowpass';
  low.frequency.value = 380;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.55;
  rumble.connect(low).connect(rumbleGain).connect(layer);

  hiss.start();
  rumble.start();
  const fadeOut = fadeLayer(layer, [hiss, rumble, band, hissGain, low, rumbleGain], 0.55);
  return { stop: fadeOut };
}

// ---- vinyl: constant hiss + random pops ----------------------------------------
function startVinyl() {
  const layer = ctx.createGain();
  layer.connect(getMaster());

  let popLeft = 0;
  let popAmp = 0;
  const crackle = loopSource(makeBuffer(6, (_, sr) => {
    let v = (Math.random() * 2 - 1) * 0.025; // faint hiss
    if (popLeft <= 0 && Math.random() < 9 / sr) { // ~9 pops per second
      popLeft = 12 + Math.floor(Math.random() * 60);
      popAmp = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.7);
    }
    if (popLeft > 0) {
      v += popAmp * (popLeft / 70);
      popLeft--;
    }
    return v;
  }));
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 900;
  crackle.connect(hp).connect(layer);

  crackle.start();
  const fadeOut = fadeLayer(layer, [crackle, hp], 0.5);
  return { stop: fadeOut };
}

// ---- shared bar clock for the musical layers --------------------------------------
const BPM = 76;
const BEAT = 60 / BPM;
const BAR = BEAT * 4;
const STEP = BAR / 16; // 16th note

let clock = null; // { anchor, timer, layers: Set<{ idx, playBar }> }

function addMusicLayer(playBar) {
  if (!clock) {
    clock = { anchor: ctx.currentTime + 0.1, timer: null, layers: new Set() };
    clock.timer = setInterval(scheduleBars, 250);
  }
  // Join on the next bar line so everything stays in time.
  const layer = { playBar, idx: Math.max(0, Math.ceil((ctx.currentTime + 0.05 - clock.anchor) / BAR)) };
  clock.layers.add(layer);
  scheduleBars();
  return () => {
    clock.layers.delete(layer);
    if (clock.layers.size === 0) {
      clearInterval(clock.timer);
      clock = null;
    }
  };
}

/** Schedule every bar that starts within the next ~1.2 s. */
function scheduleBars() {
  if (!clock) return;
  const horizon = ctx.currentTime + 1.2;
  for (const layer of clock.layers) {
    while (clock.anchor + layer.idx * BAR < horizon) {
      layer.playBar(layer.idx, clock.anchor + layer.idx * BAR);
      layer.idx++;
    }
  }
}

// ---- chords: slow, wobbly jazz progression + the odd pentatonic pluck ------------
const PROGRESSION = [
  [48, 52, 55, 59, 64], // Cmaj7
  [45, 52, 55, 60, 64], // Am7
  [50, 53, 57, 60, 64], // Dm7
  [43, 53, 59, 62, 65], // G7
];
const PENTATONIC = [72, 74, 76, 79, 81, 84]; // C major pentatonic, upper octave
const midiToHz = (m) => 440 * 2 ** ((m - 69) / 12);

function startChords() {
  const layer = ctx.createGain();
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 1100;
  tone.Q.value = 0.3;

  // Tape-style echo, one dotted-eighth long
  const delay = ctx.createDelay(1);
  delay.delayTime.value = BEAT * 0.75;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.35;
  const echoTone = ctx.createBiquadFilter();
  echoTone.type = 'lowpass';
  echoTone.frequency.value = 1500;
  tone.connect(layer);
  tone.connect(delay);
  delay.connect(echoTone).connect(feedback).connect(delay);
  echoTone.connect(layer);
  layer.connect(getMaster());

  // Slow pitch wobble, like a worn tape
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.35;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 9; // cents
  lfo.connect(lfoDepth);
  lfo.start();

  const note = (midi, t, { type = 'triangle', peak = 0.09, attack = 0.5, length = BAR + 0.6 } = {}) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = midiToHz(midi);
    osc.detune.value = (Math.random() - 0.5) * 10;
    lfoDepth.connect(osc.detune);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    osc.connect(g).connect(tone);
    osc.start(t);
    osc.stop(t + length + 0.1);
    osc.onended = () => {
      g.disconnect();
      try { lfoDepth.disconnect(osc.detune); } catch { /* gone */ }
    };
  };

  const playBar = (idx, t0) => {
    const chord = PROGRESSION[idx % PROGRESSION.length];
    chord.forEach((m, i) => note(m, t0 + i * 0.05));
    note(chord[0] - 12, t0, { type: 'sine', peak: 0.16, attack: 0.15, length: BAR }); // bass
    // A few soft plucks per bar, on the beat or the "and" of the beat
    for (let beat = 0; beat < 4; beat++) {
      if (Math.random() < 0.45) {
        const m = PENTATONIC[Math.floor(Math.random() * PENTATONIC.length)];
        const t = t0 + (beat + (Math.random() < 0.5 ? 0 : 0.5)) * BEAT;
        note(m, t, { type: 'sine', peak: 0.07, attack: 0.02, length: 1.6 });
      }
    }
  };

  const leave = addMusicLayer(playBar);
  const fadeOut = fadeLayer(layer, [lfo, lfoDepth, tone, delay, feedback, echoTone], 1);
  return { stop: () => { leave(); fadeOut(); } };
}

// ---- beat: dusty boom-bap with swung hats --------------------------------------
function startBeat() {
  const layer = ctx.createGain();
  const muffle = ctx.createBiquadFilter(); // the classic dull, dusty lofi top end
  muffle.type = 'lowpass';
  muffle.frequency.value = 4200;
  muffle.connect(layer);
  layer.connect(getMaster());

  const noise = makeBuffer(1, () => Math.random() * 2 - 1);

  const kick = (t, vel = 1) => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(130, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.14);
    g.gain.setValueAtTime(0.9 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    osc.connect(g).connect(muffle);
    osc.start(t);
    osc.stop(t + 0.4);
    osc.onended = () => g.disconnect();
  };

  const noiseHit = (t, { freq, type, length, peak }) => {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(peak, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length);
    src.connect(f).connect(g).connect(muffle);
    src.start(t, Math.random() * 0.5, length + 0.05);
    src.onended = () => { f.disconnect(); g.disconnect(); };
  };

  const snare = (t, vel = 1) => {
    noiseHit(t, { freq: 1800, type: 'bandpass', length: 0.2, peak: 0.55 * vel });
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 190;
    g.gain.setValueAtTime(0.3 * vel, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g).connect(muffle);
    osc.start(t);
    osc.stop(t + 0.15);
    osc.onended = () => g.disconnect();
  };

  const hat = (t, vel) => noiseHit(t, { freq: 7500, type: 'highpass', length: 0.05, peak: 0.16 * vel });

  const SWING = STEP * 0.28;
  const playBar = (_idx, t0) => {
    const at = (step) => t0 + step * STEP + (step % 2 ? SWING : 0);
    // kick: 1, a late "and of 2", sometimes a pickup before the next bar
    [0, 7, 10].forEach((s) => kick(at(s), s === 0 ? 1 : 0.75));
    if (Math.random() < 0.4) kick(at(14), 0.6);
    // backbeat
    [4, 12].forEach((s) => snare(at(s)));
    if (Math.random() < 0.3) snare(at(15), 0.35); // ghost note
    // hats on every 16th, accented on the beat, a few dropped for feel
    for (let s = 0; s < 16; s++) {
      if (Math.random() < 0.12) continue;
      hat(at(s), s % 4 === 0 ? 1 : s % 2 === 0 ? 0.65 : 0.4);
    }
  };

  const leave = addMusicLayer(playBar);
  const fadeOut = fadeLayer(layer, [muffle], 0.8);
  return { stop: () => { leave(); fadeOut(); } };
}

const STARTERS = { rain: startRain, vinyl: startVinyl, chords: startChords, beat: startBeat };

/** Turn one ambience layer on or off. Returns true if the layer is now playing. */
export function setAmbience(name, on) {
  if (!(name in STARTERS) || !getContext()) return false;
  unlockAudio();
  if (on && !active[name]) active[name] = STARTERS[name]();
  else if (!on && active[name]) {
    active[name].stop();
    active[name] = null;
  }
  return Boolean(active[name]);
}

/** Overall ambience volume, 0..1. */
export function setAmbienceVolume(v) {
  ambienceVolume = Math.min(1, Math.max(0, v));
  if (master) master.gain.setTargetAtTime(ambienceVolume, ctx.currentTime, 0.05);
}
