// Mind sounds, made live in the browser (Web Audio) — no audio files.
// Ambient sounds (rain, ocean, fire, wind, noises, drone) can be mixed,
// each with its own volume; bells and chimes mark the start/end of sessions.
let ctx = null;
let out = null; // everything
let bus = null; // ambient sounds only (so the sleep timer can fade them)
const buffers = {};
const playing = new Map(); // id -> { gain, stop }

export function audioCtx() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    out = ctx.createGain();
    out.connect(ctx.destination);
    bus = ctx.createGain();
    bus.connect(out);
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
}

// ---------- noise buffers (seamless loops) ----------
function makeNoise(kind, seconds = 9) {
  if (buffers[kind]) return buffers[kind];
  const c = audioCtx();
  const sr = c.sampleRate;
  const n = Math.floor(sr * seconds);
  const fade = Math.floor(sr * 0.6);
  const buf = c.createBuffer(2, n, sr);
  for (let ch = 0; ch < 2; ch++) {
    const tmp = new Float32Array(n + fade);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, last = 0; // prettier-ignore
    for (let i = 0; i < tmp.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") tmp[i] = w * 0.5;
      else if (kind === "pink") {
        // Paul Kellet's pink filter
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        tmp[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      } else if (kind === "brown") {
        last = (last + 0.02 * w) / 1.02;
        tmp[i] = last * 3.5;
      } else if (kind === "drops" || kind === "crackle") {
        tmp[i] = 0;
      }
    }
    if (kind === "drops" || kind === "crackle") {
      // Short decaying bursts at random moments: rain drops / fire crackles.
      const rate = kind === "drops" ? 55 : 9; // per second
      const count = Math.floor(rate * (tmp.length / sr));
      for (let k = 0; k < count; k++) {
        const at = Math.floor(Math.random() * (tmp.length - sr * 0.05));
        const len = Math.floor(sr * (kind === "drops" ? 0.004 + Math.random() * 0.01 : 0.002 + Math.random() * 0.02));
        const amp = kind === "drops" ? 0.15 + Math.random() * 0.5 : 0.3 + Math.random() * 0.7;
        for (let j = 0; j < len; j++) tmp[at + j] += (Math.random() * 2 - 1) * amp * Math.exp((-5 * j) / len);
      }
    }
    const d = buf.getChannelData(ch);
    for (let i = 0; i < n; i++) d[i] = i < fade ? tmp[i] * (i / fade) + tmp[n + i] * (1 - i / fade) : tmp[i];
  }
  buffers[kind] = buf;
  return buf;
}

function loop(kind) {
  const c = audioCtx();
  const s = c.createBufferSource();
  s.buffer = makeNoise(kind);
  s.loop = true;
  s.start(0, Math.random() * 4);
  return s;
}
const filter = (type, freq, Q = 0.7) => {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = Q;
  return f;
};
const gainNode = (v) => {
  const g = ctx.createGain();
  g.gain.value = v;
  return g;
};
const lfo = (hz, depth, target) => {
  const o = ctx.createOscillator();
  o.frequency.value = hz;
  const g = gainNode(depth);
  o.connect(g).connect(target);
  o.start();
  return o;
};
const chain = (...nodes) => nodes.reduce((a, b) => (a.connect(b), b));

// Each builder connects into `dest` and returns the nodes to stop later.
const BUILDERS = {
  rain(dest) {
    const a = loop("pink");
    chain(a, filter("highpass", 500), filter("lowpass", 6500), gainNode(0.55), dest);
    const b = loop("drops");
    chain(b, filter("bandpass", 3200, 0.6), gainNode(0.5), dest);
    const c = loop("brown");
    chain(c, filter("lowpass", 400), gainNode(0.25), dest);
    return [a, b, c];
  },
  ocean(dest) {
    const a = loop("brown");
    const f = filter("lowpass", 700);
    const g = gainNode(0.55);
    chain(a, f, g, dest);
    const o1 = lfo(0.075, 450, f.frequency);
    const o2 = lfo(0.075, 0.4, g.gain);
    const b = loop("pink");
    chain(b, filter("highpass", 1500), gainNode(0.06), dest);
    return [a, b, o1, o2];
  },
  fire(dest) {
    const a = loop("brown");
    chain(a, filter("lowpass", 500), gainNode(0.7), dest);
    const b = loop("crackle");
    chain(b, filter("bandpass", 1800, 0.8), gainNode(0.6), dest);
    return [a, b];
  },
  wind(dest) {
    const a = loop("pink");
    const f = filter("bandpass", 500, 1.2);
    const g = gainNode(0.9);
    chain(a, f, g, dest);
    const o1 = lfo(0.05, 250, f.frequency);
    const o2 = lfo(0.11, 0.35, g.gain);
    return [a, o1, o2];
  },
  brown(dest) {
    const a = loop("brown");
    chain(a, filter("lowpass", 1200), gainNode(0.8), dest);
    return [a];
  },
  pink(dest) {
    const a = loop("pink");
    chain(a, gainNode(0.6), dest);
    return [a];
  },
  white(dest) {
    const a = loop("white");
    chain(a, filter("lowpass", 8000), gainNode(0.22), dest);
    return [a];
  },
  drone(dest) {
    const lp = filter("lowpass", 900);
    const g = gainNode(0.09);
    lp.connect(g).connect(dest);
    const nodes = [];
    for (const [f, det] of [
      [110, 0],
      [110, 0.6],
      [164.81, -0.4],
      [220, 0.3],
      [329.63, 0],
    ]) {
      const o = ctx.createOscillator();
      o.type = f > 300 ? "sine" : "triangle";
      o.frequency.value = f + det;
      const og = gainNode(f > 300 ? 0.25 : 0.6);
      o.connect(og).connect(lp);
      o.start();
      nodes.push(o);
    }
    nodes.push(lfo(0.08, 0.03, g.gain));
    return nodes;
  },
};

export const SOUNDS = [
  { id: "rain", label: "Rain", emoji: "🌧️" },
  { id: "ocean", label: "Ocean", emoji: "🌊" },
  { id: "fire", label: "Fireplace", emoji: "🔥" },
  { id: "wind", label: "Wind", emoji: "🍃" },
  { id: "brown", label: "Brown noise", emoji: "🟤" },
  { id: "pink", label: "Pink noise", emoji: "🌸" },
  { id: "white", label: "White noise", emoji: "⚪" },
  { id: "drone", label: "Calm drone", emoji: "🎵" },
];

/** Start, change the volume of (0–1), or stop (0) one ambient sound. Fades smoothly. */
export function setSound(id, volume) {
  const c = audioCtx();
  if (!c || !BUILDERS[id]) return;
  const now = c.currentTime;
  const cur = playing.get(id);
  if (volume <= 0) {
    if (!cur) return;
    playing.delete(id);
    cur.gain.gain.cancelScheduledValues(now);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, now);
    cur.gain.gain.linearRampToValueAtTime(0, now + 0.8);
    setTimeout(() => cur.nodes.forEach((n) => n.stop?.()), 900);
    return;
  }
  const v = volume * volume; // feels more even across the slider
  if (cur) {
    cur.gain.gain.cancelScheduledValues(now);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, now);
    cur.gain.gain.linearRampToValueAtTime(v, now + 0.3);
    return;
  }
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(1, now);
  const g = c.createGain();
  g.gain.value = 0;
  g.connect(bus);
  const nodes = BUILDERS[id](g);
  g.gain.linearRampToValueAtTime(v, now + 1.5);
  playing.set(id, { gain: g, nodes });
}

export const isPlaying = (id) => playing.has(id);
export const anyPlaying = () => playing.size > 0;

/** Stop every ambient sound (fading out over `seconds`). */
export function stopAll(seconds = 1) {
  for (const id of [...playing.keys()]) {
    const cur = playing.get(id);
    playing.delete(id);
    if (!ctx) continue;
    const now = ctx.currentTime;
    cur.gain.gain.cancelScheduledValues(now);
    cur.gain.gain.setValueAtTime(cur.gain.gain.value, now);
    cur.gain.gain.linearRampToValueAtTime(0, now + seconds);
    setTimeout(() => cur.nodes.forEach((n) => n.stop?.()), seconds * 1000 + 100);
  }
}

/** Slowly fade all ambient sound out (sleep timer), then stop it. */
export function fadeOutAll(seconds) {
  if (!ctx) return;
  const now = ctx.currentTime;
  bus.gain.cancelScheduledValues(now);
  bus.gain.setValueAtTime(bus.gain.value, now);
  bus.gain.linearRampToValueAtTime(0, now + seconds);
  setTimeout(() => stopAll(0.1), seconds * 1000);
}

// ---------- bells ----------
/** A singing bowl: start and end of a session. */
export function bowl(volume = 0.5) {
  const c = audioCtx();
  if (!c) return;
  const now = c.currentTime;
  const f = 196;
  for (const [ratio, amp, decay] of [
    [1, 1, 8],
    [2.71, 0.45, 5],
    [5.15, 0.2, 3],
    [8.43, 0.08, 1.8],
  ]) {
    for (const det of [-0.7, 0.7]) {
      const o = c.createOscillator();
      o.frequency.value = f * ratio + det;
      const g = c.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(volume * amp * 0.18, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
      o.connect(g).connect(out);
      o.start(now);
      o.stop(now + decay + 0.1);
    }
  }
}

/** A soft short chime (breathing phase changes). `pitch`: "in" | "hold" | "out". */
export function chime(pitch = "in", volume = 0.25) {
  const c = audioCtx();
  if (!c) return;
  const now = c.currentTime;
  const f = { in: 659.25, hold: 587.33, out: 493.88, in2: 739.99 }[pitch] || 587.33;
  for (const [mult, amp] of [
    [1, 1],
    [2, 0.25],
  ]) {
    const o = c.createOscillator();
    o.frequency.value = f * mult;
    const g = c.createGain();
    g.gain.setValueAtTime(0, now);
    g.gain.linearRampToValueAtTime(volume * amp * 0.25, now + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 1.3);
    o.connect(g).connect(out);
    o.start(now);
    o.stop(now + 1.4);
  }
}
