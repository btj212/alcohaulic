/** Dirty diesel bed + withdrawal body noises (Web Audio, no assets). */

export interface CabAudio {
  ctx: AudioContext | null;
  engineGain: GainNode | null;
  coughTimer: number;
  started: boolean;
}

export function createCabAudio(): CabAudio {
  return { ctx: null, engineGain: null, coughTimer: 2.5, started: false };
}

export function startCabAudio(audio: CabAudio): void {
  if (audio.started) {
    void audio.ctx?.resume();
    return;
  }
  const ctx = new AudioContext();
  audio.ctx = ctx;
  audio.started = true;

  const master = ctx.createGain();
  master.gain.value = 0.55;
  master.connect(ctx.destination);

  // Rumbling diesel: layered low osc + filtered noise
  const engineGain = ctx.createGain();
  engineGain.gain.value = 0.22;
  engineGain.connect(master);
  audio.engineGain = engineGain;

  const rumble = ctx.createOscillator();
  rumble.type = "sawtooth";
  rumble.frequency.value = 48;
  const rumbleFilter = ctx.createBiquadFilter();
  rumbleFilter.type = "lowpass";
  rumbleFilter.frequency.value = 180;
  rumbleFilter.Q.value = 0.7;
  const rumbleGain = ctx.createGain();
  rumbleGain.gain.value = 0.35;
  rumble.connect(rumbleFilter);
  rumbleFilter.connect(rumbleGain);
  rumbleGain.connect(engineGain);
  rumble.start();

  const knock = ctx.createOscillator();
  knock.type = "triangle";
  knock.frequency.value = 72;
  const knockGain = ctx.createGain();
  knockGain.gain.value = 0.08;
  knock.connect(knockGain);
  knockGain.connect(engineGain);
  knock.start();

  // Exhaust hiss / dirty air
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (0.4 + 0.6 * Math.sin(i * 0.001));
  }
  const exhaust = ctx.createBufferSource();
  exhaust.buffer = noiseBuf;
  exhaust.loop = true;
  const exhaustFilter = ctx.createBiquadFilter();
  exhaustFilter.type = "bandpass";
  exhaustFilter.frequency.value = 320;
  exhaustFilter.Q.value = 0.4;
  const exhaustGain = ctx.createGain();
  exhaustGain.gain.value = 0.07;
  exhaust.connect(exhaustFilter);
  exhaustFilter.connect(exhaustGain);
  exhaustGain.connect(engineGain);
  exhaust.start();

  // Cab cabin tone
  const cabin = ctx.createOscillator();
  cabin.type = "sine";
  cabin.frequency.value = 110;
  const cabinGain = ctx.createGain();
  cabinGain.gain.value = 0.02;
  cabin.connect(cabinGain);
  cabinGain.connect(master);
  cabin.start();

  void ctx.resume();
}

/** Speed/stress modulate the dirty engine bed. */
export function updateCabAudio(
  audio: CabAudio,
  opts: { speedMph: number; withdrawal: number; dt: number },
): void {
  if (!audio.ctx || !audio.engineGain) return;
  const { speedMph, withdrawal, dt } = opts;
  const load = Math.min(1, speedMph / 70);
  const target = 0.14 + load * 0.16 + withdrawal * 0.12;
  const g = audio.engineGain.gain;
  g.setTargetAtTime(target, audio.ctx.currentTime, 0.15);

  audio.coughTimer -= dt;
  if (withdrawal > 0.25 && audio.coughTimer <= 0) {
    playCough(audio, withdrawal);
    audio.coughTimer = 1.8 + Math.random() * 2.4 - withdrawal * 0.8;
  }
}

function playCough(audio: CabAudio, intensity: number): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const bursts = 1 + Math.floor(Math.random() * 2 + intensity);

  for (let b = 0; b < bursts; b++) {
    const start = t0 + b * (0.12 + Math.random() * 0.08);
    const dur = 0.14 + Math.random() * 0.1;

    const noise = ctx.createBufferSource();
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < ch.length; i++) {
      const env = Math.sin((i / ch.length) * Math.PI);
      ch[i] = (Math.random() * 2 - 1) * env;
    }
    noise.buffer = buf;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 600 + Math.random() * 900;
    filter.Q.value = 1.2;

    const gain = ctx.createGain();
    const peak = 0.18 + intensity * 0.22;
    gain.gain.setValueAtTime(0.001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start(start);
    noise.stop(start + dur + 0.02);
  }

  // Wet throat click / phlegm undertone
  const click = ctx.createOscillator();
  click.type = "square";
  click.frequency.setValueAtTime(90, t0);
  click.frequency.exponentialRampToValueAtTime(40, t0 + 0.08);
  const clickGain = ctx.createGain();
  clickGain.gain.setValueAtTime(0.05 + intensity * 0.04, t0);
  clickGain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.1);
  click.connect(clickGain);
  clickGain.connect(ctx.destination);
  click.start(t0);
  click.stop(t0 + 0.12);
}

/** Metal-on-metal scrape for a glancing hit. */
export function playScreech(audio: CabAudio): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const dur = 0.5;
  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * dur), ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) {
    ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  }
  noise.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.frequency.setValueAtTime(2400, t0);
  filter.frequency.exponentialRampToValueAtTime(900, t0 + dur);
  filter.Q.value = 3;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.22, t0);
  gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(t0);
  noise.stop(t0 + dur);
}

/** Dull body thud — debris or a deer strike. */
export function playThud(audio: CabAudio): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(120, t0);
  osc.frequency.exponentialRampToValueAtTime(38, t0 + 0.18);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.4, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.28);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.3);

  const noise = ctx.createBufferSource();
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.12), ctx.sampleRate);
  const ch = buf.getChannelData(0);
  for (let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
  noise.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.setValueAtTime(0.18, t0);
  ng.gain.exponentialRampToValueAtTime(0.001, t0 + 0.12);
  noise.connect(ng);
  ng.connect(ctx.destination);
  noise.start(t0);
}

/** Two-tone payout chime for a delivered load. */
export function playPayout(audio: CabAudio): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime;
  for (const [freq, delay] of [
    [523, 0],
    [784, 0.12],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0 + delay);
    g.gain.exponentialRampToValueAtTime(0.12, t0 + delay + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + delay + 0.4);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0 + delay);
    osc.stop(t0 + delay + 0.45);
  }
}

export function playSipSound(audio: CabAudio): void {
  const ctx = audio.ctx;
  if (!ctx) return;
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(180, t0);
  osc.frequency.exponentialRampToValueAtTime(90, t0 + 0.2);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.06, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 0.25);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + 0.26);
}
