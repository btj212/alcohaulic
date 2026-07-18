import { DISPATCH_LINES, pickLine } from "../content/dispatch";

export interface RadioSystem {
  el: HTMLDivElement;
  index: number;
  timer: number;
  muted: boolean;
  audioCtx: AudioContext | null;
  drone: OscillatorNode | null;
}

export function createRadio(root: HTMLElement): RadioSystem {
  const el = document.createElement("div");
  el.id = "radio-chatter";
  el.textContent = "";
  root.appendChild(el);
  return {
    el,
    index: 0,
    timer: 4,
    muted: true,
    audioCtx: null,
    drone: null,
  };
}

export function unmuteRadio(radio: RadioSystem): void {
  if (!radio.audioCtx) {
    const ctx = new AudioContext();
    radio.audioCtx = ctx;
    // Cheap cab drone — placeholder soundtrack
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = 55;
    gain.gain.value = 0.03;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    radio.drone = osc;

    // Soft high hiss
    const bufferSize = 2 * ctx.sampleRate;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.15;
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.012;
    noise.connect(nGain);
    nGain.connect(ctx.destination);
    noise.start();
  }
  void radio.audioCtx.resume();
  radio.muted = false;
}

export function updateRadio(radio: RadioSystem, dt: number, playing: boolean): void {
  if (!playing) return;
  radio.timer -= dt;
  if (radio.timer <= 0) {
    radio.el.textContent = pickLine(DISPATCH_LINES, radio.index++);
    radio.el.classList.add("show");
    radio.timer = 9 + Math.random() * 7;
    window.setTimeout(() => radio.el.classList.remove("show"), 5500);
  }
}
