const MELODY = [392, 494, 587, 494, 392, 294, 659, 587, 247, 294, 392, 440];

export type AudioBus = {
  unlock: () => void;
  jump: () => void;
  coin: () => void;
  stomp: () => void;
  bump: () => void;
  hurt: () => void;
  win: () => void;
  power: () => void;
  tickMusic: (playing: boolean) => void;
  setMuted: (muted: boolean) => void;
  close: () => void;
};

export function createAudio(): AudioBus {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;
  let musicBus: GainNode | null = null;
  let sfxBus: GainNode | null = null;
  let muted = false;
  let nextNote = 0;
  let step = 0;

  function ensure() {
    if (ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    musicBus = ctx.createGain();
    sfxBus = ctx.createGain();
    musicBus.gain.value = 0.16;
    sfxBus.gain.value = 0.7;
    musicBus.connect(master);
    sfxBus.connect(master);
    master.connect(ctx.destination);
    master.gain.value = muted ? 0 : 1;
  }

  function tone(freq: number, dur: number, type: OscillatorType, gain: number, slide = 1) {
    if (!ctx || !sfxBus) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * slide), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(sfxBus);
    o.start(t);
    o.stop(t + dur + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }

  return {
    unlock() {
      ensure();
      if (ctx && ctx.state === "suspended") void ctx.resume().catch(() => {});
    },
    jump() {
      tone(280, 0.09, "square", 0.08, 2.1);
    },
    coin() {
      tone(740, 0.07, "square", 0.06, 1);
      tone(1110, 0.1, "square", 0.05, 1);
    },
    stomp() {
      tone(140, 0.09, "triangle", 0.12, 0.5);
    },
    bump() {
      tone(180, 0.06, "square", 0.05, 0.7);
    },
    hurt() {
      tone(420, 0.18, "sawtooth", 0.06, 0.35);
    },
    win() {
      [523, 659, 784, 1046].forEach((f, i) => {
        window.setTimeout(() => tone(f, 0.12, "triangle", 0.07, 1), i * 90);
      });
    },
    power() {
      tone(520, 0.14, "triangle", 0.08, 1.6);
    },
    tickMusic(playing) {
      if (!ctx || !musicBus || !playing || muted) {
        if (ctx) nextNote = ctx.currentTime + 0.05;
        return;
      }
      const beat = 0.2;
      while (nextNote < ctx.currentTime + 0.25) {
        const freq = MELODY[step % MELODY.length];
        const t = nextNote;
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(freq, t);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + beat * 0.9);
        o.connect(g);
        g.connect(musicBus);
        o.start(t);
        o.stop(t + beat);
        o.onended = () => {
          o.disconnect();
          g.disconnect();
        };
        step += 1;
        nextNote += beat;
      }
    },
    setMuted(next) {
      muted = next;
      if (ctx && master) master.gain.setTargetAtTime(next ? 0 : 1, ctx.currentTime, 0.02);
    },
    close() {
      const current = ctx;
      ctx = null;
      master = null;
      musicBus = null;
      sfxBus = null;
      if (current && current.state !== "closed") void current.close().catch(() => {});
    },
  };
}
