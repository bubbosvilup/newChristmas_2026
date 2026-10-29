/* Babbo Natale Segreto · Versione Glitch
   Macchina a stati: title → login → pin → world → battle → dex (→ card)
*/
(() => {
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  const screen = $("#screen");
  const dpad = $("#dpad");
  const abBtns = $(".ab");

  // ---------- stato globale ----------
  const G = {
    scr: null,
    player: null,      // nome scelto
    payload: null,     // { target, pokemon:{id,name}, type, flavor }
    save: null
  };

  // ---------- helpers UI ----------
  function show(id) {
    $$(".scr").forEach((s) => s.classList.remove("on"));
    $("#scr-" + id).classList.add("on");
    G.scr = id;
    const inWorld = id === "world";
    dpad.classList.toggle("off", !inWorld);
    abBtns.classList.toggle("off", !(inWorld || id === "battle" || id === "title"));
  }

  // font-size proporzionale alla larghezza dello schermo
  function fitFont() {
    screen.style.fontSize = (screen.clientWidth / 32) + "px";
  }
  new ResizeObserver(fitFont).observe(screen);
  fitFont();

  // ---------- salvataggio ----------
  function loadSave() {
    try { return JSON.parse(localStorage.getItem(C.saveKey)) || null; } catch { return null; }
  }
  function writeSave(data) {
    try { localStorage.setItem(C.saveKey, JSON.stringify(data)); } catch { /* storage pieno/bloccato: ignora */ }
  }
  if (location.search.includes("reset")) {
    localStorage.removeItem(C.saveKey);
    history.replaceState(null, "", location.pathname);
  }
  G.save = loadSave();

  // ---------- "pulsante A" universale ----------
  // Un tap sullo schermo o sul tasto A equivale a Invio.
  const aHandlers = [];
  function onA(fn) { aHandlers.push(fn); return () => { const i = aHandlers.indexOf(fn); if (i >= 0) aHandlers.splice(i, 1); }; }
  function pressA() { const fn = aHandlers[aHandlers.length - 1]; if (fn) fn(); }
  $("#btn-a").addEventListener("click", pressA);
  $("#btn-start").addEventListener("click", pressA);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "z") { e.preventDefault(); pressA(); }
  });
  function waitA() {
    return new Promise((res) => { const off = onA(() => { off(); res(); }); });
  }

  // ---------- audio ----------
  $("#btn-mute").addEventListener("click", (e) => {
    Sfx.init();
    const m = Sfx.toggle();
    e.currentTarget.classList.toggle("muted", m);
  });

  // =====================================================================
  // TITLE
  // =====================================================================
  function title() {
    show("title");
    const go = () => {
      Sfx.init(); Sfx.select();
      offA(); $("#scr-title").removeEventListener("click", go);
      if (G.save && G.save.payload) {
        G.player = G.save.player; G.payload = G.save.payload;
        dex(true);
      } else {
        login();
      }
    };
    const offA = onA(go);
    $("#scr-title").addEventListener("click", go);
  }

  // =====================================================================
  // LOGIN + PIN
  // =====================================================================
  function login() {
    show("login");
    const list = $("#name-list");
    list.innerHTML = "";
    C.names.forEach((n) => {
      const b = document.createElement("button");
      b.textContent = n.toUpperCase();
      b.addEventListener("click", () => { Sfx.select(); pin(n); });
      list.appendChild(b);
    });
  }

  function pin(name) {
    show("pin");
    G.player = name;
    $("#pin-who").textContent = name.toUpperCase();
    const boxes = $("#pin-boxes");
    const msg = $("#pin-msg");
    const pad = $("#keypad");
    let code = "";
    const LEN = 6;
    let busy = false;

    const render = () => {
      boxes.innerHTML = "";
      for (let i = 0; i < LEN; i++) {
        const b = document.createElement("i");
        b.textContent = i < code.length ? "•" : "";
        boxes.appendChild(b);
      }
    };
    render();
    msg.innerHTML = "&nbsp;";

    pad.innerHTML = "";
    const keys = ["1","2","3","4","5","6","7","8","9","⌫","0","OK"];
    keys.forEach((k) => {
      const b = document.createElement("button");
      b.textContent = k;
      if (k === "OK") b.classList.add("ok");
      b.addEventListener("click", async () => {
        if (busy) return;
        if (k === "⌫") { code = code.slice(0, -1); Sfx.blip(); render(); return; }
        if (k === "OK") { await submit(); return; }
        if (code.length < LEN) { code += k; Sfx.blip(); render(); }
        if (code.length === LEN) await submit();
      });
      pad.appendChild(b);
    });

    async function submit() {
      if (code.length < LEN) { msg.textContent = "PIN di 6 cifre"; Sfx.deny(); return; }
      busy = true;
      msg.textContent = "Verifica...";
      const payload = await Vault.unlock(name, code);
      busy = false;
      if (!payload) {
        code = ""; render();
        msg.textContent = "PIN ERRATO!";
        Sfx.deny();
        boxes.classList.remove("shake"); void boxes.offsetWidth; boxes.classList.add("shake");
        return;
      }
      G.payload = payload;
      Sfx.unlock();
      // precarica lo sprite del bersaglio
      new Image().src = payload.sprite;
      await wait(400);
      world();
    }

    $("#pin-back").onclick = () => { Sfx.blip(); login(); };
  }

  // =====================================================================
  // WORLD (canvas 160x144, tile 16px, mappa 10x9)
  // =====================================================================
  const T = 16;
  // T albero, G erba alta, X abete natalizio, O Oak, . terreno, s neve, f fiori
  const MAP = [
    "TTTTTTTTTT",
    "Ts.X..s..T",
    "T.GGG.GG.T",
    "T.GGGfGG.T",
    "T...s....T",
    "TfGG..GGGT",
    "T.GG.sGGGT",
    "T.GG..GG.T",
    "Ts..O..f.T",
    "TTTTTTTTTT"
  ];
  const cv = $("#world");
  const cx = cv.getContext("2d");
  cx.imageSmoothingEnabled = false;

  // Sprite 16x16: . trasparente, k contorno, r rosso, s pelle, b blu, w bianco, h capelli, g grigio, y giallo
  const PLAYER_DOWN = [
    "......kkkk......",
    ".....krrrrk.....",
    "....krrrrrrk....",
    "....kkkkkkkk....",
    "....khhsshhk....",
    "....kssssssk....",
    "....ksksskks....",
    "....kssssssk....",
    ".....kssssk.....",
    "....kbbbbbbk....",
    "...ksbbbbbbsk...",
    "...ksbbbbbbsk...",
    "....kbbbbbbk....",
    ".....kggggk.....",
    ".....kg..gk.....",
    ".....kk..kk....."
  ];
  const PLAYER_UP = [
    "......kkkk......",
    ".....krrrrk.....",
    "....krrrrrrk....",
    "....krrrrrrk....",
    "....khhhhhhk....",
    "....khhhhhhk....",
    "....khhhhhhk....",
    ".....kssssk.....",
    "....kbbbbbbk....",
    "...ksbbbbbbsk...",
    "...ksbbbbbbsk...",
    "....kbbbbbbk....",
    ".....kggggk.....",
    ".....kg..gk.....",
    ".....kk..kk.....",
    "................"
  ];
  const PLAYER_SIDE = [
    "......kkkk......",
    ".....krrrrkk....",
    "....krrrrrrrk...",
    "....kkkkkkkkk...",
    "....khhsssssk...",
    "....khsskssk....",
    "....khsssssk....",
    ".....kssssk.....",
    "....kbbbbbk.....",
    "....kbbbbbsk....",
    "....kbbbbbsk....",
    "....kbbbbbk.....",
    ".....kgggk......",
    ".....kgggk......",
    ".....kgkgk......",
    ".....kk.kk......"
  ];
  const OAK = [
    "......kkkk......",
    ".....kggggk.....",
    "....kgggggkk....",
    "....kgssssgk....",
    "....kssssssk....",
    "....ksksskks....",
    "....kssssssk....",
    ".....kssssk.....",
    "....kwwwwwwk....",
    "...kswwrrwwsk...",
    "...kswwwwwwsk...",
    "....kwwwwwwk....",
    "....kwwwwwwk....",
    ".....kgggkk.....",
    ".....kg..gk.....",
    ".....kk..kk....."
  ];
  const PAL = { k: "#202030", r: "#d83838", s: "#f8d0a0", b: "#3058c0", w: "#f8f8f8", h: "#503820", g: "#687080", y: "#f8e048" };

  function drawSprite(sp, x, y, { frame = 0, flip = false } = {}) {
    for (let r = 0; r < sp.length; r++) {
      const row = sp[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        cx.fillStyle = PAL[ch];
        // frame di camminata: le gambe si alternano
        let dy = 0;
        if (frame && r >= 13) dy = (frame === 1 ? (c < 8 ? -1 : 0) : (c < 8 ? 0 : -1));
        const px = flip ? x + (row.length - 1 - c) : x + c;
        cx.fillRect(px, y + r + dy, 1, 1);
      }
    }
  }

  const GROUND = "#88d068", GROUND2 = "#78c058", DARK = "#285828", LEAF = "#48a048", LEAF2 = "#68c858", TRUNK = "#805030", SNOW = "#f8f8ff", SNOW2 = "#c8d8f0";
  function drawTile(ch, x, y, frame, tx, ty) {
    // terreno base con lieve texture
    cx.fillStyle = GROUND; cx.fillRect(x, y, T, T);
    cx.fillStyle = GROUND2;
    if ((tx * 7 + ty * 3) % 4 === 0) { cx.fillRect(x + 3, y + 5, 2, 1); cx.fillRect(x + 10, y + 11, 2, 1); }
    if (ch === "T") {
      // albero con cappello di neve
      cx.fillStyle = TRUNK; cx.fillRect(x + 6, y + 11, 4, 5);
      cx.fillStyle = DARK; cx.fillRect(x + 1, y + 3, 14, 10);
      cx.fillStyle = LEAF; cx.fillRect(x + 2, y + 2, 12, 9);
      cx.fillStyle = LEAF2; cx.fillRect(x + 4, y + 4, 3, 2); cx.fillRect(x + 9, y + 6, 2, 2); cx.fillRect(x + 3, y + 8, 2, 1);
      cx.fillStyle = SNOW; cx.fillRect(x + 3, y + 1, 10, 2); cx.fillRect(x + 5, y, 6, 1); cx.fillRect(x + 2, y + 3, 3, 1); cx.fillRect(x + 10, y + 3, 3, 1);
      cx.fillStyle = DARK; cx.fillRect(x + 5, y + 10, 6, 1);
    } else if (ch === "X") {
      // abete natalizio decorato
      cx.fillStyle = TRUNK; cx.fillRect(x + 7, y + 13, 2, 3);
      cx.fillStyle = DARK;
      cx.fillRect(x + 7, y, 2, 1); cx.fillRect(x + 6, y + 1, 4, 2); cx.fillRect(x + 5, y + 3, 6, 2);
      cx.fillRect(x + 4, y + 5, 8, 3); cx.fillRect(x + 3, y + 8, 10, 3); cx.fillRect(x + 2, y + 11, 12, 2);
      cx.fillStyle = LEAF; cx.fillRect(x + 7, y + 2, 2, 1); cx.fillRect(x + 6, y + 4, 3, 1); cx.fillRect(x + 5, y + 7, 4, 1); cx.fillRect(x + 4, y + 10, 5, 1);
      const on = Math.floor(frame / 15) % 2;
      const lights = [[7, 1, "#f8e048"], [5, 4, "#f85050"], [10, 5, "#58c8f8"], [4, 8, "#f85050"], [11, 9, "#f8e048"], [6, 11, "#58c8f8"], [12, 12, "#f85050"], [3, 12, "#f8e048"]];
      lights.forEach(([lx, ly, col], i) => { cx.fillStyle = (i % 2 === on) ? col : "#f8f8f8"; cx.fillRect(x + lx, y + ly, 1, 1); });
      cx.fillStyle = "#f8e048"; cx.fillRect(x + 7, y - 1 < y ? y : y, 2, 1);
    } else if (ch === "G") {
      // erba alta stile gen 2
      cx.fillStyle = "#58a848"; cx.fillRect(x, y, T, T);
      cx.fillStyle = "#307838";
      const o = frame % 2 ? 1 : 0;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        const gx = x + 1 + i * 8, gy = y + 1 + j * 8 + ((i + j + o) % 2);
        cx.fillRect(gx, gy + 2, 1, 4); cx.fillRect(gx + 2, gy, 1, 6); cx.fillRect(gx + 4, gy + 1, 1, 5); cx.fillRect(gx + 1, gy + 5, 5, 1);
      }
      cx.fillStyle = "#88d868"; cx.fillRect(x + 3, y + 1, 1, 2); cx.fillRect(x + 11, y + 9, 1, 2);
    } else if (ch === "s") {
      // chiazza di neve
      cx.fillStyle = SNOW2; cx.fillRect(x + 2, y + 5, 12, 8);
      cx.fillStyle = SNOW; cx.fillRect(x + 3, y + 4, 10, 8); cx.fillRect(x + 1, y + 7, 14, 4);
    } else if (ch === "f") {
      // fiori che ondeggiano
      const o = Math.floor(frame / 25) % 2;
      cx.fillStyle = "#f8e048"; cx.fillRect(x + 3 + o, y + 4, 2, 2); cx.fillRect(x + 10, y + 9 + o, 2, 2);
      cx.fillStyle = "#f85858"; cx.fillRect(x + 10 - o, y + 3, 2, 2); cx.fillRect(x + 4, y + 10 + o, 2, 2);
      cx.fillStyle = "#307838"; cx.fillRect(x + 4, y + 6, 1, 2); cx.fillRect(x + 11, y + 11, 1, 2);
    }
  }

  const W = {
    px: 5, py: 8, mx: 0, my: 0,
    moving: null, held: null, facing: "down",
    stepsInGrass: 0, threshold: rnd(C.stepsMin, C.stepsMax),
    frame: 0, locked: true, raf: 0, lastT: 0
  };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

  function tileAt(x, y) { return (MAP[y] && MAP[y][x]) || "T"; }
  function blocked(ch) { return ch === "T" || ch === "O" || ch === "X"; }

  function playerSprite() {
    const walk = W.moving ? 1 + Math.floor(W.frame / 7) % 2 : 0;
    if (W.facing === "up") return [PLAYER_UP, { frame: walk }];
    if (W.facing === "left") return [PLAYER_SIDE, { frame: walk, flip: true }];
    if (W.facing === "right") return [PLAYER_SIDE, { frame: walk }];
    return [PLAYER_DOWN, { frame: walk }];
  }

  function render() {
    const anim = Math.floor(W.frame / 20);
    for (let y = 0; y < MAP.length; y++)
      for (let x = 0; x < MAP[y].length; x++) {
        const ch = tileAt(x, y);
        drawTile(ch === "O" ? "." : ch, x * T, y * T, ch === "X" ? W.frame : anim, x, y);
      }
    drawSprite(OAK, 4 * T, 8 * T - 2);
    const px = W.px * T + W.mx, py = W.py * T + W.my - 2;
    const [sp, opt] = playerSprite();
    drawSprite(sp, px, py, opt);
    // nell'erba alta le gambe restano coperte
    if (tileAt(W.px, W.py) === "G" && !W.moving) {
      drawTile("G", W.px * T, W.py * T, anim, W.px, W.py);
      cx.save(); cx.beginPath(); cx.rect(px, py, 16, 11); cx.clip(); drawSprite(sp, px, py, opt); cx.restore();
    }
  }

  function tryMove(dir) {
    W.facing = dir;
    const [dx, dy] = DIRS[dir];
    const nx = W.px + dx, ny = W.py + dy;
    if (blocked(tileAt(nx, ny))) { return false; }
    W.moving = dir;
    W.mx = -dx * T; W.my = -dy * T;
    W.px = nx; W.py = ny;
    return true;
  }

  function loop(ts) {
    W.raf = requestAnimationFrame(loop);
    const dt = Math.min(50, ts - W.lastT); W.lastT = ts;
    W.frame++;
    if (W.moving) {
      const speed = 0.1 * dt; // px per ms
      const [dx, dy] = DIRS[W.moving];
      W.mx += dx * speed; W.my += dy * speed;
      if ((dx && Math.sign(W.mx) === Math.sign(dx)) || (dy && Math.sign(W.my) === Math.sign(dy)) || (!W.mx && !W.my)) {
        W.mx = 0; W.my = 0; W.moving = null;
        arrived();
      }
    }
    if (!W.moving && !W.locked && W.held) tryMove(W.held);
    render();
  }

  function arrived() {
    if (tileAt(W.px, W.py) === "G") {
      Sfx.rustle();
      W.stepsInGrass++;
      if (W.stepsInGrass >= W.threshold) { encounter(); return; }
    } else {
      Sfx.step();
    }
  }

  // controlli
  dpad.querySelectorAll("button").forEach((b) => {
    const dir = b.dataset.dir;
    const down = (e) => { e.preventDefault(); W.held = dir; };
    const up = () => { if (W.held === dir) W.held = null; };
    b.addEventListener("pointerdown", down);
    b.addEventListener("pointerup", up);
    b.addEventListener("pointercancel", up);
    b.addEventListener("pointerleave", up);
  });
  const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  document.addEventListener("keydown", (e) => { if (KEYS[e.key]) { e.preventDefault(); W.held = KEYS[e.key]; } });
  document.addEventListener("keyup", (e) => { if (KEYS[e.key] && W.held === KEYS[e.key]) W.held = null; });

  async function hint(text) {
    const h = $("#world-hint");
    h.textContent = text;
    await waitA();
    Sfx.blip();
  }

  async function world() {
    show("world");
    W.locked = true;
    W.px = 5; W.py = 8; W.stepsInGrass = 0; W.threshold = rnd(C.stepsMin, C.stepsMax);
    if (!W.raf) { W.lastT = performance.now(); W.raf = requestAnimationFrame(loop); }
    const hintEl = $("#world-hint");
    const clickHint = () => pressA();
    hintEl.addEventListener("click", clickHint);
    await hint(`PROF. OAK: Ciao ${G.player.toUpperCase()}! Non hai nessun Pokémon, vero?`);
    await hint("Non importa. Questa è la ZONA SAFARI: tieni 30 SAFARI BALL.");
    await hint("Nell'erba alta si nasconde la persona a cui farai il REGALO di Natale...");
    await hint("Vai e catturala! (d-pad o frecce)");
    hintEl.removeEventListener("click", clickHint);
    hintEl.textContent = "";
    W.locked = false;
  }

  // =====================================================================
  // ENCOUNTER → BATTLE
  // =====================================================================
  async function encounter() {
    W.locked = true; W.held = null;
    Sfx.encounter();
    const fl = $("#flash");
    fl.classList.add("on");
    await wait(1100);
    fl.classList.remove("on");
    const wp = $("#wipe");
    wp.classList.add("on");
    await wait(750);
    cancelAnimationFrame(W.raf); W.raf = 0;
    battle();
    wp.classList.remove("on"); wp.classList.add("off");
    await wait(400);
    wp.classList.remove("off");
  }

  // ---------- testo battaglia ----------
  const btext = $("#btext");
  const bcursor = $("#bcursor");
  const bmenu = $("#bmenu");
  let typing = false;
  let skipType = false;

  async function say(text, { hold = true } = {}) {
    bmenu.classList.remove("on");
    bcursor.classList.remove("on");
    btext.textContent = "";
    typing = true; skipType = false;
    for (let i = 0; i < text.length; i++) {
      if (skipType) { btext.textContent = text; break; }
      btext.textContent += text[i];
      if (i % 3 === 0) Sfx.blip();
      await wait(28);
    }
    typing = false;
    if (!hold) return;
    bcursor.classList.add("on");
    await waitA();
    bcursor.classList.remove("on");
  }
  $(".textbox").addEventListener("click", () => { if (typing) skipType = true; else pressA(); });
  onA(() => { if (typing) skipType = true; }); // l'handler di base: Invio salta la digitazione
  // nota: waitA usa l'ultimo handler, quindi quando si attende il tap, il tap prende precedenza

  // ---------- sprite glitch ----------
  const spriteWrap = $("#enemy-sprite");
  const noiseCv = $("#glitch-noise");
  const ncx = noiseCv.getContext("2d");
  let glitchTimer = 0;
  let sliceEls = [];

  function buildEnemySprite(src) {
    sliceEls.forEach((e) => e.remove()); sliceEls = [];
    spriteWrap.querySelectorAll("img").forEach((e) => e.remove());
    const img = document.createElement("img");
    img.src = src; img.alt = "";
    spriteWrap.insertBefore(img, noiseCv);
    // 6 fette che "scivolano" lateralmente
    for (let i = 0; i < 6; i++) {
      const s = document.createElement("img");
      s.src = src; s.className = "slice";
      s.style.clipPath = `inset(${i * 16.6}% 0 ${100 - (i + 1) * 16.6}% 0)`;
      spriteWrap.insertBefore(s, noiseCv);
      sliceEls.push(s);
    }
    spriteWrap.classList.add("shadow");
    spriteWrap.classList.remove("revealed", "hidden-mon");
    startGlitch(1);
  }

  function startGlitch(intensity) {
    stopGlitch();
    glitchTimer = setInterval(() => {
      sliceEls.forEach((s) => {
        const dx = Math.random() < 0.35 * intensity ? rnd(-10, 10) * intensity : 0;
        s.style.transform = `translateX(${dx}px)`;
      });
      ncx.clearRect(0, 0, 96, 96);
      const blocks = Math.floor(14 * intensity);
      for (let i = 0; i < blocks; i++) {
        ncx.fillStyle = Math.random() < 0.5 ? "#000" : (Math.random() < 0.5 ? "#888" : "#fff");
        ncx.globalAlpha = 0.5 + Math.random() * 0.5;
        ncx.fillRect(rnd(0, 88), rnd(10, 88), rnd(4, 20), rnd(2, 8));
      }
      ncx.globalAlpha = 1;
    }, 110);
  }
  function stopGlitch() { clearInterval(glitchTimer); glitchTimer = 0; }

  // ---------- battaglia ----------
  let balls = C.safariBalls;
  let attempts = 0;
  let escaCount = 0, sassoCount = 0;

  function menu() {
    return new Promise((res) => {
      bcursor.classList.remove("on");
      bmenu.classList.add("on");
      const h = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        bmenu.removeEventListener("click", h);
        bmenu.classList.remove("on");
        Sfx.select();
        res(b.dataset.act);
      };
      bmenu.addEventListener("click", h);
    });
  }

  async function battle() {
    show("battle");
    balls = C.safariBalls; attempts = 0; escaCount = 0; sassoCount = 0;
    $("#ball-count").textContent = balls;
    $("#ename").textContent = "???????";
    buildEnemySprite(G.payload.sprite);
    const ball = $("#ball"); ball.className = "ball";

    await wait(300);
    Sfx.cry(); Sfx.glitch();
    await say("Un ??????? selvatico è apparso!");
    await say("...i dati sembrano corrotti. Sarà pericoloso?");

    // loop menu
    while (true) {
      await say("Cosa fai?", { hold: false });
      const act = await menu();
      if (act === "fuga") {
        Sfx.deny();
        await say("Non puoi fuggire da un incontro del DESTINO!");
      } else if (act === "esca") {
        escaCount++;
        const msgs = [
          "Hai lanciato un'ESCA. ??????? la ignora e ti fissa.",
          "Hai lanciato un'altra ESCA. ??????? la mangia... senza masticare.",
          "??????? sembra aspettare qualcosa di più. Tipo un regalo."
        ];
        await say(msgs[Math.min(escaCount - 1, msgs.length - 1)]);
      } else if (act === "sasso") {
        sassoCount++;
        Sfx.breakout();
        const msgs = [
          "Hai lanciato un SASSO. ??????? sembra... offeso.",
          "Un altro SASSO?! ??????? se lo ricorderà a Natale.",
          "Il SASSO attraversa ??????? come se fosse un bug. Non fa effetto."
        ];
        await say(msgs[Math.min(sassoCount - 1, msgs.length - 1)]);
      } else if (act === "ball") {
        const caught = await throwBall();
        if (caught) break;
      }
    }
    await reveal();
  }

  async function throwBall() {
    attempts++;
    balls--; $("#ball-count").textContent = balls;
    const ball = $("#ball");
    const wr = spriteWrap.getBoundingClientRect();
    const sr = screen.getBoundingClientRect();
    ball.style.setProperty("--bx", ((wr.left + wr.width / 2 - sr.left) / sr.width * 100 - 2) + "%");
    ball.style.setProperty("--by", ((wr.bottom - sr.top) / sr.height * 100 - 6) + "%");

    await say(`${G.player.toUpperCase()} ha lanciato una SAFARI BALL!`, { hold: false });
    Sfx.throwBall();
    ball.className = "ball fly";
    await wait(700);
    // il mostro entra nella ball
    spriteWrap.classList.add("hidden-mon");
    stopGlitch();
    await wait(350);
    ball.className = "ball land";

    // scuote 1-3 volte; cattura sempre al 3° tentativo
    const succeed = attempts >= 3 || Math.random() > (attempts === 1 ? 0.65 : 0.35);
    const shakes = succeed ? 3 : rnd(1, 2);
    for (let i = 0; i < shakes; i++) {
      await wait(500);
      Sfx.shake();
      ball.classList.remove("wob"); void ball.offsetWidth; ball.classList.add("wob");
    }
    await wait(650);
    if (!succeed) {
      Sfx.breakout();
      ball.className = "ball";
      spriteWrap.classList.remove("hidden-mon");
      startGlitch(1.4);
      Sfx.glitch();
      const msgs = ["Oh no! ??????? è sfuggito!", "Accidenti! C'è mancato poco!", "??????? si rifiuta di entrare. Ha paura del buio."];
      await say(msgs[Math.min(attempts - 1, msgs.length - 1)]);
      startGlitch(1);
      return false;
    }
    ball.classList.add("caught");
    Sfx.catchJingle();
    await say("Gotcha! ??????? è stato catturato!");
    return true;
  }

  async function reveal() {
    const ball = $("#ball");
    await say("Un momento... i dati si stanno ricostruendo!", { hold: false });
    ball.className = "ball";
    spriteWrap.classList.remove("hidden-mon");
    // glitch violento che si calma
    startGlitch(2.2); Sfx.glitch();
    await wait(700);
    startGlitch(1.2); Sfx.glitch();
    await wait(600);
    startGlitch(0.4);
    await wait(500);
    stopGlitch();
    spriteWrap.classList.remove("shadow");
    spriteWrap.classList.add("revealed");
    Sfx.cry();
    const target = G.payload.target.toUpperCase();
    $("#ename").textContent = target;
    await wait(500);
    await say(`??????? era in realtà... ${target}!`);
    await say(`${target}${G.payload.form ? ` (forma ${G.payload.form})` : ""} è nelle tue mani: dovrai fargli il REGALO!`);
    Sfx.dex();
    await say(`I dati di ${target} sono stati registrati nel POKÉDEX.`);
    writeSave({ player: G.player, payload: G.payload, capturedAt: Date.now() });
    G.save = loadSave();
    dex(false);
  }

  // =====================================================================
  // POKEDEX + CARD
  // =====================================================================
  function dex(returning) {
    show("dex");
    const list = $("#dex-list");
    list.innerHTML = "";
    const slot = C.names.indexOf(G.payload.target);
    const myIndex = slot >= 0 ? slot : 0;
    C.names.forEach((n, i) => {
      const li = document.createElement("li");
      const no = String(i + 1).padStart(3, "0");
      if (i === myIndex) {
        li.className = "caught";
        li.innerHTML = `<i class="ico"></i><span class="nm">No.${no} ${G.payload.target.toUpperCase()}</span>`;
        li.addEventListener("click", () => { Sfx.select(); card(no); });
      } else {
        li.className = "ghost";
        li.innerHTML = `<i class="ico"></i><span class="nm">No.${no} ---------</span>`;
      }
      list.appendChild(li);
    });
    $("#dex-count").textContent = `1/${C.names.length}`;
    if (returning) Sfx.dex();
  }

  function card(no) {
    show("card");
    const p = G.payload;
    $("#card-img").src = p.sprite;
    $("#card-no").textContent = no;
    $("#card-name").textContent = p.target.toUpperCase();
    $("#card-type").textContent = p.type || p.form || "???";
    $("#card-flavor").textContent = p.flavor || `${p.target} ti è stato assegnato dal destino (e da nessun altro).`;
    $("#card-target").textContent = p.target.toUpperCase();
    $("#card-date").textContent = C.eventDate;
    $("#card-budget").textContent = C.budget;
    $("#card-back").onclick = () => { Sfx.blip(); dex(false); };
  }

  // =====================================================================
  // DECORAZIONI: allenatore di spalle (battaglia) e MissingNo (titolo)
  // =====================================================================
  const TRAINER_BACK = [
    "........kkkkkkkk........",
    ".......krrrrrrrrk.......",
    "......krrrrrrrrrrk......",
    ".....krrrrrrrrrrrrk.....",
    ".....krrrrrrrrrrrrk.....",
    ".....kkkkkkkkkkkkkk.....",
    "......kddddddddddk......",
    "......kddddddddddk......",
    ".......kddddddddk.......",
    "........kssssssk........",
    "........kssssssk........",
    ".....kkkkbbbbbbkkkk.....",
    "....kbbbbbbbbbbbbbbk....",
    "...kbbbbbbbbbbbbbbbbk...",
    "...kbbkbbbbbbbbbbkbbk...",
    "...kbbkbbbbbbbbbbkbbk...",
    "...kskkbbbbbbbbbbkksk...",
    "...kssk.bbbbbbbb.kssk...",
    "...kkkk.kbbbbbbk.kkkk...",
    "........kggggggk........",
    "........kggggggk........",
    "........kggkkggk........",
    "........kggk.kggk.......",
    "........kggk.kggk.......",
    "........kkkk.kkkk......."
  ];
  const TPAL = { k: "#101010", r: "#d03030", d: "#3a2a1a", s: "#f0c090", b: "#2848a0", g: "#5a5a6a" };
  (function drawTrainer() {
    const c = $("#trainer"); c.width = 24; c.height = 25;
    const t = c.getContext("2d");
    TRAINER_BACK.forEach((row, y) => [...row].forEach((ch, x) => {
      if (ch === ".") return; t.fillStyle = TPAL[ch]; t.fillRect(x, y, 1, 1);
    }));
  })();

  (function drawMissingNo() {
    const c = $("#missingno"); const t = c.getContext("2d");
    // forma a "L rovesciata" tipica di MissingNo, riempita di tile spazzatura
    const inside = (x, y) => !(x < 12 && y < 14);
    const paint = () => {
      t.clearRect(0, 0, 32, 32);
      for (let y = 0; y < 32; y += 2) for (let x = 0; x < 32; x += 2) {
        if (!inside(x, y)) continue;
        const v = Math.random();
        t.fillStyle = v < 0.35 ? "#101010" : v < 0.6 ? "#6a6a6a" : v < 0.8 ? "#b8b8b8" : "#f0f0f0";
        const w = Math.random() < 0.3 ? 4 : 2;
        t.fillRect(x, y, w, 2);
      }
    };
    paint();
    setInterval(() => { if (G.scr === "title") paint(); }, 160);
  })();

  // ---------- B button: indietro dove ha senso ----------
  $("#btn-b").addEventListener("click", () => {
    if (G.scr === "card") { Sfx.blip(); dex(false); }
    else if (G.scr === "pin") { Sfx.blip(); login(); }
    else if (G.scr === "battle" && typing) skipType = true;
  });

  // avvio
  title();
})();
