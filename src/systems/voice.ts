/** Character voices via the Web Speech API — free, offline, grungy enough. */

export type Speaker = "earl" | "marlene" | "preacher" | "lucy";

export interface VoiceSystem {
  enabled: boolean;
  voices: SpeechSynthesisVoice[];
}

const PROFILES: Record<Speaker, { pitch: number; rate: number; volume: number; prefer: "male" | "female" }> = {
  earl: { pitch: 0.55, rate: 0.82, volume: 0.85, prefer: "male" },
  marlene: { pitch: 0.85, rate: 1.02, volume: 0.8, prefer: "female" },
  preacher: { pitch: 0.7, rate: 0.9, volume: 0.75, prefer: "male" },
  lucy: { pitch: 1.15, rate: 0.95, volume: 0.8, prefer: "female" },
};

export function createVoice(): VoiceSystem {
  const sys: VoiceSystem = { enabled: false, voices: [] };
  if (typeof speechSynthesis === "undefined") return sys;
  sys.enabled = true;
  const load = () => {
    sys.voices = speechSynthesis.getVoices();
  };
  load();
  speechSynthesis.addEventListener?.("voiceschanged", load);
  return sys;
}

function pickVoice(sys: VoiceSystem, prefer: "male" | "female"): SpeechSynthesisVoice | null {
  const en = sys.voices.filter((v) => v.lang.startsWith("en"));
  if (en.length === 0) return sys.voices[0] ?? null;
  const namesFemale = ["samantha", "victoria", "karen", "susan", "zira", "female"];
  const namesMale = ["daniel", "fred", "alex", "david", "male", "aaron"];
  const wanted = prefer === "female" ? namesFemale : namesMale;
  for (const w of wanted) {
    const hit = en.find((v) => v.name.toLowerCase().includes(w));
    if (hit) return hit;
  }
  return en[0] ?? null;
}

/** Speak a line in character. Interrupts nothing; drops line if channel busy. */
export function speak(sys: VoiceSystem, speaker: Speaker, text: string): void {
  if (!sys.enabled) return;
  if (speechSynthesis.speaking) return; // don't stack monologues
  const p = PROFILES[speaker];
  const u = new SpeechSynthesisUtterance(text);
  u.pitch = p.pitch;
  u.rate = p.rate;
  u.volume = p.volume;
  const v = pickVoice(sys, p.prefer);
  if (v) u.voice = v;
  speechSynthesis.speak(u);
}

export function stopVoice(sys: VoiceSystem): void {
  if (sys.enabled) speechSynthesis.cancel();
}
