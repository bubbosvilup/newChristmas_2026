// Suoni 8-bit generati al volo con WebAudio (nessun file audio).
window.Sfx = (() => {
  let ctx = null;
  let muted = false;

  function init() {
    if (ctx) return;
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { ctx = null; }
  }
  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  // note: [freq, durata(s)], type = square/triangle...
  function play(notes, { type = "square", gain = 0.08, gap = 0 } = {}) {
    if (!ctx || muted) return;
    resume();
    let t = ctx.currentTime;
    for (const [f, d] of notes) {
      if (f > 0) {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = f;
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + d);
        o.connect(g).connect(ctx.destination);
        o.start(t);
        o.stop(t + d);
      }
      t += d + gap;
    }
  }

  function noise(dur = 0.15, gain = 0.1) {
    if (!ctx || muted) return;
    resume();
    const buf = ctx.createBuffer(1, ctx.sampleRate * dur, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.buffer = buf;
    src.connect(g).connect(ctx.destination);
    src.start();
  }

  return {
    init,
    toggle() { muted = !muted; return muted; },
    get muted() { return muted; },
    blip: () => play([[880, 0.04]], { gain: 0.04 }),
    voice: () => play([[300 + Math.random() * 120, 0.05]], { type: "triangle", gain: 0.05 }),
    select: () => play([[660, 0.06], [990, 0.08]]),
    deny: () => play([[220, 0.12], [180, 0.16]], { type: "sawtooth", gain: 0.06 }),
    step: () => play([[140, 0.03]], { type: "triangle", gain: 0.05 }),
    rustle: () => noise(0.08, 0.05),
    slide: () => play([[900, 0.05], [1200, 0.05]], { type: "triangle", gain: 0.03 }),
    gift: () => play([[784, 0.08], [988, 0.08], [1175, 0.08], [1568, 0.25]], { gain: 0.09 }),
    encounter: () => play([[523, 0.08], [0, 0.03], [523, 0.08], [0, 0.03], [392, 0.08], [466, 0.08], [523, 0.2]], { gain: 0.09 }),
    cry: () => play([[300, 0.06], [90, 0.08], [420, 0.05], [60, 0.12], [250, 0.07], [700, 0.04], [80, 0.15]], { type: "sawtooth", gain: 0.07 }),
    throwBall: () => play([[500, 0.05], [700, 0.05], [900, 0.08]], { type: "triangle" }),
    shake: () => play([[200, 0.05], [150, 0.09]], { type: "triangle", gain: 0.09 }),
    breakout: () => play([[400, 0.07], [300, 0.07], [200, 0.15]], { type: "sawtooth", gain: 0.07 }),
    catchJingle: () => play([[659, 0.1], [659, 0.1], [659, 0.1], [523, 0.08], [659, 0.1], [784, 0.3], [0, 0.1], [392, 0.3]], { gain: 0.1 }),
    unlock: () => play([[523, 0.08], [659, 0.08], [784, 0.08], [1047, 0.2]], { gain: 0.08 }),
    dex: () => play([[1047, 0.06], [0, 0.04], [1047, 0.06], [0, 0.04], [1319, 0.2]], { gain: 0.07 }),
    glitch: () => noise(0.25, 0.12)
  };
})();
