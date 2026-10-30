/**
 * Tiny synthesised sound effects (no audio files to download).
 * Muted by default; the preference is stored per browser.
 */
export type Sfx = "type" | "stamp" | "unlock" | "wrong" | "open";

let ctx: AudioContext | null = null;
const KEY = "fx-sound";

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(KEY) === "on";
  } catch {
    return false;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(KEY, on ? "on" : "off");
  } catch {
    /* storage unavailable */
  }
}

function tone(freq: number, start: number, dur: number, type: OscillatorType, gain: number, ac: AudioContext) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.02);
}

function noise(start: number, dur: number, gain: number, ac: AudioContext, lowpass = 1800) {
  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) ** 2;
  const src = ac.createBufferSource();
  const filter = ac.createBiquadFilter();
  const g = ac.createGain();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  g.gain.value = gain;
  src.buffer = buf;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

export function play(sfx: Sfx) {
  if (typeof window === "undefined" || !soundEnabled()) return;
  try {
    ctx ??= new AudioContext();
    const ac = ctx;
    if (ac.state === "suspended") void ac.resume();
    switch (sfx) {
      case "type":
        noise(0, 0.04, 0.25, ac, 3500);
        break;
      case "open":
        noise(0, 0.12, 0.15, ac, 900);
        break;
      case "stamp":
        noise(0, 0.18, 0.6, ac, 500);
        tone(90, 0, 0.15, "sine", 0.4, ac);
        break;
      case "unlock":
        tone(660, 0, 0.18, "triangle", 0.18, ac);
        tone(990, 0.12, 0.3, "triangle", 0.15, ac);
        break;
      case "wrong":
        tone(150, 0, 0.22, "square", 0.08, ac);
        tone(110, 0.1, 0.25, "square", 0.08, ac);
        break;
    }
  } catch {
    /* audio unavailable */
  }
}
