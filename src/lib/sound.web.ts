// Every sound in Ember is synthesised with Web Audio — no files to download or license.
// UI sounds are short, soft sine/triangle blips; fire is shaped noise (roar, crackle) over a low sine boom.
// Audio starts on the first tap (browsers require a gesture), and like other web audio on iPhone it follows the
// silent switch.

const KEY = 'ember.sound';

let enabled = (() => {
  try {
    return localStorage.getItem(KEY) !== 'off';
  } catch {
    return true;
  }
})();

let ctx: AudioContext | null = null;
let master: GainNode;
let noiseBuf: AudioBuffer;

function create(): AudioContext | null {
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return ctx;
  } catch {
    return null;
  }
}

// iOS Safari can leave the context 'suspended' or 'interrupted' (its own state) and only lets a page wake it inside
// a user gesture. So every tap and every return to the app nudges it awake, playing a silent blip to unlock output.
function wake() {
  if (!enabled) return;
  const c = create();
  if (!c || c.state === 'running') return;
  c.resume().catch(() => {});
  const blip = c.createBufferSource();
  blip.buffer = c.createBuffer(1, 1, c.sampleRate);
  blip.connect(c.destination);
  blip.start(0);
}
if (typeof window !== 'undefined') {
  for (const type of ['touchend', 'pointerup', 'click', 'keydown']) window.addEventListener(type, wake, { capture: true, passive: true });
  document.addEventListener('visibilitychange', () => document.visibilityState === 'visible' && wake());
}

function ac(): AudioContext | null {
  if (!enabled) return null;
  const c = create();
  if (c && c.state !== 'running') wake();
  return c;
}

type ToneOpts = { type?: OscillatorType; gain?: number; attack?: number; slideTo?: number };

/** A pitched blip with a fast attack and exponential decay. `at` is seconds from now. */
function tone(freq: number, at: number, dur: number, { type = 'sine', gain = 0.2, attack = 0.004, slideTo }: ToneOpts = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t);
  o.stop(t + dur + 0.02);
}

/** A bell-ish note: a sine plus a quiet octave for sparkle. */
const bell = (freq: number, at: number, dur = 0.35, gain = 0.4) => {
  tone(freq, at, dur, { gain });
  tone(freq * 2, at, dur * 0.6, { gain: gain * 0.25 });
};

type NoiseOpts = { filter?: BiquadFilterType; freq?: number; q?: number; gain?: number; attack?: number; sweepTo?: number };

/** Filtered noise with an attack/decay envelope — swishes, whooshes and crackles. */
function noise(at: number, dur: number, { filter = 'lowpass', freq = 1000, q = 0.7, gain = 0.2, attack = 0.005, sweepTo }: NoiseOpts = {}) {
  const c = ac();
  if (!c) return;
  const t = c.currentTime + at;
  const src = c.createBufferSource();
  src.buffer = noiseBuf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.setValueAtTime(freq, t);
  if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  f.Q.value = q;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t, Math.random());
  src.stop(t + dur + 0.02);
}

export const sound = {
  get enabled() {
    return enabled;
  },
  setEnabled(on: boolean) {
    enabled = on;
    try {
      localStorage.setItem(KEY, on ? 'on' : 'off');
    } catch {}
    if (on) sound.success();
  },

  /** Any button, chip or toggle: a soft, short tick. */
  tap: () => tone(1500, 0, 0.05, { type: 'triangle', gain: 0.22, slideTo: 1150 }),
  /** Switching tabs: quieter still. */
  tick: () => tone(1900, 0, 0.035, { gain: 0.14 }),
  /** Habit done: two rising bell notes. */
  complete: () => {
    bell(880, 0, 0.3);
    bell(1318.5, 0.08, 0.45);
  },
  /** Undo / skip: a small falling blip. */
  undo: () => tone(700, 0, 0.14, { gain: 0.3, slideTo: 480 }),
  /** Slip on a quit habit: a low, soft thud. */
  slip: () => {
    tone(196, 0, 0.3, { type: 'triangle', gain: 0.5, slideTo: 110 });
    noise(0, 0.12, { freq: 400, gain: 0.2 });
  },
  /** Something saved: a quick bright arpeggio. */
  success: () => {
    bell(1046.5, 0, 0.25, 0.3);
    bell(1318.5, 0.06, 0.25, 0.3);
    bell(1568, 0.12, 0.45, 0.35);
  },
  /** Something deleted: a descending swish. */
  remove: () => {
    tone(620, 0, 0.2, { gain: 0.32, slideTo: 240 });
    noise(0, 0.2, { filter: 'bandpass', freq: 2400, sweepTo: 500, q: 1.2, gain: 0.2 });
  },
  /** Rank up: a rising fanfare, then a shimmer. */
  rankUp: () => {
    [523.3, 659.3, 784, 1046.5].forEach((f, i) => bell(f, i * 0.09, 0.4, 0.35));
    [1568, 2093, 2637].forEach((f, i) => bell(f, 0.4 + i * 0.05, 0.9, 0.15));
    noise(0.36, 0.7, { filter: 'highpass', freq: 5000, gain: 0.08, attack: 0.05 });
  },

  /**
   * The ember thrown into the page: a breath drawn in as it flares (`flareS`), a deep whoomp as it catches,
   * then a roar that swells and fades with the burn (`burnS`), peppered with crackles and pops.
   */
  fire(flareS: number, burnS: number) {
    const c = ac();
    if (!c) return;
    // the draw-in
    noise(0, flareS, { freq: 250, sweepTo: 1800, gain: 0.18, attack: flareS * 0.9 });
    // the catch
    tone(110, flareS, 0.6, { gain: 0.5, slideTo: 38, attack: 0.008 });
    noise(flareS, 0.7, { freq: 1400, sweepTo: 200, gain: 0.35, attack: 0.006 });
    // the roar: noise through a flickering band, swelling then dying away
    const t = c.currentTime + flareS;
    const end = burnS + 0.9;
    const src = c.createBufferSource();
    src.buffer = noiseBuf;
    src.loop = true;
    const band = c.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 520;
    band.Q.value = 0.6;
    const lfo = c.createOscillator();
    const lfoGain = c.createGain();
    lfo.frequency.value = 7;
    lfoGain.gain.value = 180;
    lfo.connect(lfoGain).connect(band.frequency);
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.32, t + burnS * 0.35);
    g.gain.setValueAtTime(0.32, t + burnS * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + end);
    src.connect(band).connect(g).connect(master);
    src.start(t);
    lfo.start(t);
    src.stop(t + end + 0.05);
    lfo.stop(t + end + 0.05);
    // crackles: sharp ticks, and the odd deeper pop
    for (let i = 0; i < 46; i++) {
      const at = flareS + Math.random() * (burnS + 0.4);
      if (Math.random() < 0.8) noise(at, 0.008 + Math.random() * 0.02, { filter: 'highpass', freq: 1800 + Math.random() * 3000, gain: 0.05 + Math.random() * 0.2, attack: 0.001 });
      else tone(140 + Math.random() * 120, at, 0.06, { gain: 0.12, attack: 0.002, slideTo: 70 });
    }
  },
};
