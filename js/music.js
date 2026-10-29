// Musica chiptune generata con WebAudio. Se in CONFIG.music c'è un file per la scena,
// viene usato quello (mp3/ogg in loop) al posto del sequencer.
window.Music = (() => {
  let ctx = null, master = null, muted = false;
  let cur = null;        // traccia chiptune in esecuzione
  let timer = 0;
  let audioEl = null;    // <audio> per i file esterni
  let curName = null;

  const SEMI = { C: 0, "C#": 1, Db: 1, D: 2, "D#": 3, Eb: 3, E: 4, F: 5, "F#": 6, Gb: 6, G: 7, "G#": 8, Ab: 8, A: 9, "A#": 10, Bb: 10, B: 11 };
  function freq(n) {
    const m = /^([A-G][#b]?)(\d)$/.exec(n);
    if (!m) return 0;
    const midi = 12 * (parseInt(m[2], 10) + 1) + SEMI[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  }
  // "E4:4 -:2 x:1" → [{f|hit, len}] con len in sedicesimi
  function parse(str) {
    return str.trim().split(/\s+/).map((tok) => {
      const [p, l] = tok.split(":");
      return { p, len: parseFloat(l || "1") };
    });
  }

  // ---------- tracce ----------
  // Jingle Bells (pubblico dominio) per il titolo; il resto è originale.
  const TRACKS = {
    title: {
      bpm: 150, loop: true,
      ch: [
        { type: "square", gain: 0.06, seq: "E4:4 E4:4 E4:8 E4:4 E4:4 E4:8 E4:4 G4:4 C4:6 D4:2 E4:16 F4:4 F4:4 F4:6 F4:2 F4:4 E4:4 E4:4 E4:2 E4:2 E4:4 D4:4 D4:4 E4:4 D4:8 G4:8 E4:4 E4:4 E4:8 E4:4 E4:4 E4:8 E4:4 G4:4 C4:6 D4:2 E4:16 F4:4 F4:4 F4:6 F4:2 F4:4 E4:4 E4:4 E4:2 E4:2 G4:4 G4:4 F4:4 D4:4 C4:16" },
        { type: "triangle", gain: 0.09, seq: "C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 F2:4 C3:4 F2:4 C3:4 C3:4 G2:4 C3:4 G2:4 G2:4 D3:4 G2:4 D3:4 G2:4 D3:4 G2:4 D3:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 C3:4 G2:4 F2:4 C3:4 F2:4 C3:4 C3:4 G2:4 C3:4 G2:4 G2:4 D3:4 G2:4 D3:4 C3:4 G2:4 C3:8" },
        { type: "noise", gain: 0.05, seq: "k:4 h:4 k:4 h:4 ".repeat(32) }
      ]
    },
    world: {
      bpm: 126, loop: true,
      ch: [
        { type: "square", gain: 0.05, seq: "G4:4 E4:4 C4:4 E4:4 G4:4 A4:4 G4:8 F4:4 D4:4 B3:4 D4:4 F4:4 G4:4 F4:8 E4:4 C4:4 G3:4 C4:4 E4:4 F4:4 E4:8 D4:4 F4:4 B4:4 A4:4 G4:12 -:4 C5:4 B4:4 A4:4 G4:4 A4:4 G4:4 E4:8 F4:4 A4:4 G4:4 F4:4 E4:4 D4:4 C4:8 E4:4 G4:4 C5:4 B4:4 A4:4 F4:4 D4:8 G4:4 B4:4 D5:4 C5:4 C5:12 -:4" },
        { type: "square", gain: 0.025, seq: "C4:2 E4:2 G4:2 E4:2 ".repeat(4) + "B3:2 D4:2 G4:2 D4:2 ".repeat(4) + "C4:2 E4:2 G4:2 E4:2 ".repeat(4) + "B3:2 D4:2 G4:2 D4:2 ".repeat(2) + "C4:2 E4:2 G4:2 E4:2 ".repeat(2) + "A3:2 C4:2 E4:2 C4:2 ".repeat(4) + "F3:2 A3:2 C4:2 A3:2 ".repeat(4) + "C4:2 E4:2 G4:2 E4:2 ".repeat(4) + "G3:2 B3:2 D4:2 B3:2 ".repeat(2) + "C4:2 E4:2 G4:2 E4:2 ".repeat(2) },
        { type: "triangle", gain: 0.08, seq: "C3:4 -:2 C3:2 G2:4 -:4 ".repeat(2) + "G2:4 -:2 G2:2 D3:4 -:4 ".repeat(2) + "C3:4 -:2 C3:2 G2:4 -:4 ".repeat(2) + "G2:4 -:2 G2:2 D3:4 -:4 C3:4 -:2 C3:2 G2:4 -:4 " + "A2:4 -:2 A2:2 E3:4 -:4 ".repeat(2) + "F2:4 -:2 F2:2 C3:4 -:4 ".repeat(2) + "C3:4 -:2 C3:2 G2:4 -:4 ".repeat(2) + "G2:4 -:2 G2:2 D3:4 -:4 C3:4 -:2 C3:2 G2:4 -:4 " },
        { type: "noise", gain: 0.035, seq: "k:4 h:2 h:2 s:4 h:4 ".repeat(32) }
      ]
    },
    battle: {
      bpm: 168, loop: true,
      ch: [
        { type: "square", gain: 0.055, seq: "A4:2 A4:2 A4:2 C5:2 B4:2 A4:2 G4:4 A4:2 A4:2 A4:2 E5:2 D5:2 C5:2 B4:4 A4:2 A4:2 A4:2 C5:2 B4:2 A4:2 G4:2 F4:2 E4:4 G4:4 A4:8 -:4 E5:2 E5:2 E5:2 F5:2 E5:2 D5:2 C5:4 D5:2 D5:2 D5:2 E5:2 D5:2 C5:2 B4:4 C5:2 C5:2 C5:2 D5:2 C5:2 B4:2 A4:2 G4:2 A4:4 B4:4 C5:4 B4:4 A4:8 -:4" },
        { type: "square", gain: 0.03, seq: "A3:1 -:1 A3:1 -:1 ".repeat(8) + "F3:1 -:1 F3:1 -:1 ".repeat(4) + "G3:1 -:1 G3:1 -:1 ".repeat(4) + "A3:1 -:1 A3:1 -:1 ".repeat(4) + "E3:1 -:1 E3:1 -:1 ".repeat(4) + "A3:1 -:1 A3:1 -:1 ".repeat(4) + "F3:1 -:1 F3:1 -:1 ".repeat(4) + "G3:1 -:1 G3:1 -:1 ".repeat(4) + "E3:1 -:1 E3:1 -:1 ".repeat(4) + "A3:1 -:1 A3:1 -:1 ".repeat(4) },
        { type: "triangle", gain: 0.09, seq: "A2:2 A2:2 A3:2 A2:2 ".repeat(8) + "F2:2 F2:2 F3:2 F2:2 ".repeat(4) + "G2:2 G2:2 G3:2 G2:2 ".repeat(4) + "A2:2 A2:2 A3:2 A2:2 ".repeat(4) + "E2:2 E2:2 E3:2 E2:2 ".repeat(4) + "A2:2 A2:2 A3:2 A2:2 ".repeat(4) + "F2:2 F2:2 F3:2 F2:2 ".repeat(4) + "G2:2 G2:2 G3:2 G2:2 ".repeat(4) + "E2:2 E2:2 E3:2 E2:2 ".repeat(4) + "A2:2 A2:2 A3:2 A2:2 ".repeat(4) },
        { type: "noise", gain: 0.05, seq: "k:2 h:2 s:2 h:2 k:2 k:2 s:2 h:2 ".repeat(24) }
      ]
    },
    victory: {
      bpm: 140, loop: false,
      ch: [
        { type: "square", gain: 0.07, seq: "C5:2 C5:2 C5:2 C5:6 G#4:6 A#4:6 C5:4 A#4:2 C5:16" },
        { type: "square", gain: 0.035, seq: "E4:2 E4:2 E4:2 E4:6 C4:6 D4:6 E4:4 D4:2 E4:16" },
        { type: "triangle", gain: 0.09, seq: "C3:2 C3:2 C3:2 C3:6 G#2:6 A#2:6 C3:4 A#2:2 C3:16" },
        { type: "noise", gain: 0.05, seq: "k:2 k:2 k:2 s:6 k:6 k:6 s:4 h:2 s:16" }
      ]
    },
    dex: {
      bpm: 160, loop: true,
      ch: [
        { type: "square", gain: 0.035, seq: "C5:2 E5:2 G5:2 -:2 E5:2 G5:2 C6:2 -:2 B5:2 G5:2 E5:2 -:2 D5:2 G5:2 B5:2 -:2 A5:2 C6:2 E6:2 -:2 C6:2 A5:2 E5:2 -:2 F5:2 A5:2 C6:2 -:2 G5:2 B5:2 D6:2 -:2" },
        { type: "triangle", gain: 0.07, seq: "C3:8 -:8 G2:8 -:8 A2:8 -:8 F2:8 G2:8" }
      ]
    }
  };

  function init() {
    if (ctx) return;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = muted ? 0 : 1; master.connect(ctx.destination);
    } catch { ctx = null; }
  }

  function noiseBuf() {
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }
  let nbuf = null;

  function playDrum(kind, t, gain) {
    if (kind === "k") {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = "sine"; o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.1);
      g.gain.setValueAtTime(gain * 3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      o.connect(g).connect(master); o.start(t); o.stop(t + 0.13);
      return;
    }
    const src = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    src.buffer = nbuf || (nbuf = noiseBuf());
    f.type = "highpass"; f.frequency.value = kind === "h" ? 6000 : 1500;
    const dur = kind === "h" ? 0.04 : 0.12;
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(f).connect(g).connect(master); src.start(t); src.stop(t + dur + 0.01);
  }

  function playNote(ch, f, t, dur) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = ch.type; o.frequency.value = f;
    const a = 0.005, rel = Math.min(0.06, dur * 0.3);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(ch.gain, t + a);
    g.gain.setValueAtTime(ch.gain, t + dur - rel);
    g.gain.linearRampToValueAtTime(0, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.01);
  }

  function schedule() {
    if (!cur) return;
    const ahead = ctx.currentTime + 0.25;
    const step = 60 / cur.bpm / 4; // durata di un sedicesimo
    let allDone = true;
    cur.chans.forEach((c) => {
      while (c.t < ahead) {
        if (c.i >= c.notes.length) {
          if (!cur.loop) { break; }
          c.i = 0;
        }
        allDone = false;
        const n = c.notes[c.i++];
        const dur = n.len * step;
        if (n.p !== "-") {
          if (c.type === "noise") playDrum(n.p, c.t, c.gain);
          else playNote(c, freq(n.p), c.t, dur * 0.92);
        }
        c.t += dur;
      }
    });
    if (allDone && !cur.loop) { stop(); }
  }

  function stop() {
    clearInterval(timer); timer = 0; cur = null; curName = null;
    if (audioEl) { audioEl.pause(); audioEl = null; }
  }

  function play(name) {
    if (curName === name) return;
    stop();
    curName = name;
    const file = window.CONFIG && CONFIG.music && CONFIG.music[name];
    if (file) {
      audioEl = new Audio(file);
      audioEl.loop = TRACKS[name] ? TRACKS[name].loop : true;
      audioEl.volume = muted ? 0 : 0.6;
      audioEl.play().catch(() => {});
      return;
    }
    init();
    const tr = TRACKS[name];
    if (!ctx || !tr) return;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + 0.05;
    cur = { bpm: tr.bpm, loop: tr.loop, chans: tr.ch.map((c) => ({ ...c, notes: parse(c.seq), i: 0, t: t0 })) };
    schedule();
    timer = setInterval(schedule, 80);
  }

  function setMuted(m) {
    muted = m;
    if (master) master.gain.value = m ? 0 : 1;
    if (audioEl) audioEl.volume = m ? 0 : 0.6;
  }

  return { init, play, stop, setMuted, get current() { return curName; } };
})();
