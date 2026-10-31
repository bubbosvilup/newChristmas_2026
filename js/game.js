/* Babbo Natale Segreto · Versione Glitch
   Flusso: title → intro (Oak) → login → pin → world ⇄ battle → dex (→ card)
*/
(() => {
  // Se un file è stato bloccato (ad blocker, rete), dillo chiaramente invece di morire in silenzio.
  for (const g of ["CONFIG", "SECRETS", "Vault", "Sfx", "Music", "Pix", "World"]) {
    if (!window[g]) throw new Error("File JS mancante o bloccato dal browser: " + g + ". Disattiva il blocco pubblicità per questo sito e ricarica.");
  }
  const C = window.CONFIG;
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => Array.from(document.querySelectorAll(s));
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const pick = (arr) => arr[rnd(0, arr.length - 1)];

  const screen = $("#screen");
  const dpad = $("#dpad");
  const abBtns = $(".ab");

  const G = { scr: null, player: null, payload: null, save: null, decoysSeen: 0, threshold: 0, talked: {}, masterBall: false, gifts: 0 };

  // ---------- UI base ----------
  function show(id) {
    $$(".scr").forEach((s) => s.classList.remove("on"));
    $("#scr-" + id).classList.add("on");
    G.scr = id;
    dpad.classList.toggle("off", id !== "world");
    abBtns.classList.toggle("off", !["world", "battle", "title", "intro"].includes(id));
  }
  function fitFont() { screen.style.fontSize = (screen.clientWidth / 32) + "px"; }
  new ResizeObserver(fitFont).observe(screen);
  fitFont();

  // ---------- salvataggio ----------
  function loadSave() { try { return JSON.parse(localStorage.getItem(C.saveKey)) || null; } catch { return null; } }
  function writeSave(data) { try { localStorage.setItem(C.saveKey, JSON.stringify(data)); } catch { /* ignora */ } }
  if (location.search.includes("reset")) { localStorage.removeItem(C.saveKey); history.replaceState(null, "", location.pathname); }
  G.save = loadSave();

  // ---------- tasto A universale ----------
  const aHandlers = [];
  function onA(fn) { aHandlers.push(fn); return () => { const i = aHandlers.indexOf(fn); if (i >= 0) aHandlers.splice(i, 1); }; }
  function pressA() { const fn = aHandlers[aHandlers.length - 1]; if (fn) fn(); }
  function waitA() { return new Promise((res) => { const off = onA(() => { off(); res(); }); }); }
  $("#btn-a").addEventListener("click", pressA);
  $("#btn-start").addEventListener("click", pressA);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "z" || e.key === "Z") { e.preventDefault(); pressA(); }
  });

  // ---------- audio ----------
  function toggleMute() {
    Sfx.init();
    const m = Sfx.toggle();
    Music.setMuted(m);
    $("#btn-mute").classList.toggle("muted", m);
  }
  $("#btn-mute").addEventListener("click", toggleMute);

  // ---------- motore dialoghi (macchina da scrivere) ----------
  let typing = false, skipType = false;
  function makeDialog(box, textEl, cursorEl) {
    box.addEventListener("click", () => { if (typing) skipType = true; else pressA(); });
    return async function say(text, { hold = true, speed = 26, voice = false } = {}) {
      cursorEl.classList.remove("on");
      textEl.textContent = "";
      typing = true; skipType = false;
      for (let i = 0; i < text.length; i++) {
        if (skipType) { textEl.textContent = text; break; }
        textEl.textContent += text[i];
        if (i % 3 === 0 && text[i] !== " ") (voice ? Sfx.voice : Sfx.blip)();
        await wait(speed);
      }
      typing = false;
      if (!hold) return;
      cursorEl.classList.add("on");
      await waitA();
      cursorEl.classList.remove("on");
      Sfx.blip();
    };
  }
  // handler di base: Invio salta la digitazione, nel mondo interagisce
  onA(() => {
    if (typing) { skipType = true; return; }
    if (G.scr === "world" && !World.locked && !World.isMoving) worldInteract();
  });

  // =====================================================================
  // TITLE
  // =====================================================================
  function title() {
    show("title");
    Music.stop();
    const go = () => {
      Sfx.init(); Music.init(); Sfx.select();
      offA(); $("#scr-title").removeEventListener("click", go);
      if (G.save && G.save.payload) {
        G.player = G.save.player; G.payload = G.save.payload;
        Music.play("dex");
        dex(true);
      } else {
        Music.play("title");
        intro();
      }
    };
    const offA = onA(go);
    $("#scr-title").addEventListener("click", go);
  }

  // =====================================================================
  // INTRO con il Prof. OAK
  // =====================================================================
  const sayIntroRaw = makeDialog($("#intro-box"), $("#itext"), $("#icursor"));
  const sayIntro = (text, o) => sayIntroRaw(text, Object.assign({ voice: true, speed: 30 }, o || {}));
  const portrait = $("#portrait").getContext("2d");
  // Oak parla (bocca che si muove mentre il testo scorre) e sbatte le ciglia
  let oakAnim = 0, oakBlink = false, oakBlinkT = 0;
  function oakStart() {
    clearInterval(oakAnim);
    oakBlinkT = performance.now() + 1800;
    oakAnim = setInterval(() => {
      const now = performance.now();
      if (now > oakBlinkT) { oakBlink = !oakBlink; oakBlinkT = now + (oakBlink ? 140 : 2200 + Math.random() * 2500); }
      const mouth = typing ? (Math.floor(now / 110) % 2) : 0;
      Pix.oakPortrait(portrait, { mouth, blink: oakBlink });
    }, 55);
  }
  function oakStop() { clearInterval(oakAnim); oakAnim = 0; Pix.oakPortrait(portrait); }

  async function intro() {
    show("intro");
    $("#scr-intro").classList.remove("named");
    oakStart();
    await wait(700);
    await sayIntro("Salve! Benvenuto nel mondo dei POKÉMON!");
    await sayIntro("Il mio nome è OAK. La gente mi chiama il PROFESSORE dei Pokémon.");
    await sayIntro("Questo mondo è abitato da creature chiamate POKÉMON. Alcune... somigliano stranamente ai tuoi amici.");
    await sayIntro("Quest'anno il BABBO NATALE SEGRETO non si estrae da un cappello. Si CATTURA.");
    await sayIntro("Ma prima di tutto, dimmi: tu chi sei?");
    oakStop();
    login();
  }

  async function introAfterPin() {
    show("intro");
    $("#scr-intro").classList.add("named");
    oakStart();
    await sayIntro(`${G.player.toUpperCase()}! Certo, ora ricordo. Il tuo PIN è corretto.`);
    await sayIntro("Là fuori, nell'erba alta della ZONA SAFARI, si nasconde la persona a cui farai il regalo.");
    await sayIntro("I suoi dati sono CORROTTI: la riconoscerai solo dopo averla catturata. Il tuo viaggio comincia ora!");
    oakStop();
    Music.stop();
    await fadeOut();
    world();
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
    const boxes = $("#pin-boxes"), msg = $("#pin-msg"), pad = $("#keypad");
    let code = "", busy = false;
    const LEN = 6;
    const render = () => {
      boxes.innerHTML = "";
      for (let i = 0; i < LEN; i++) { const b = document.createElement("i"); b.textContent = i < code.length ? "•" : ""; boxes.appendChild(b); }
    };
    render(); msg.innerHTML = "&nbsp;";
    pad.innerHTML = "";
    ["1","2","3","4","5","6","7","8","9","⌫","0","OK"].forEach((k) => {
      const b = document.createElement("button");
      b.textContent = k; if (k === "OK") b.classList.add("ok");
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
      busy = true; msg.textContent = "Verifica...";
      const payload = await Vault.unlock(name, code);
      busy = false;
      if (!payload) {
        code = ""; render(); msg.textContent = "PIN ERRATO!"; Sfx.deny();
        boxes.classList.remove("shake"); void boxes.offsetWidth; boxes.classList.add("shake");
        return;
      }
      G.payload = payload;
      Sfx.unlock();
      new Image().src = payload.sprite;
      await wait(400);
      introAfterPin();
    }
    $("#pin-back").onclick = () => { Sfx.blip(); login(); };
  }

  // =====================================================================
  // WORLD
  // =====================================================================
  const sayWorld = makeDialog($("#world-hint"), $("#wtext"), $("#wcursor"));
  const hintBox = $("#world-hint");

  async function worldSay(lines) {
    World.lock(true);
    hintBox.classList.add("on");
    for (const l of lines) await sayWorld(l);
    hintBox.classList.remove("on");
    World.lock(false);
  }

  function updateHud() {
    const g = World.gifts;
    $("#gift-hud").textContent = `${g.found}/${g.total}`;
    $("#gift-hud").classList.toggle("done", g.found === g.total);
  }

  World.init($("#world"), {
    async onGift(n, total) {
      Sfx.gift(); updateHud(); G.gifts = n;
      const hud = $("#gift-hud"); hud.classList.remove("pop"); void hud.offsetWidth; hud.classList.add("pop");
      if (n === total) await worldSay([`Hai trovato un REGALO! (${n}/${total})`, "Sono tutti! BABBO NATALE vorrà saperlo..."]);
      else await worldSay([`Hai trovato un REGALO! (${n}/${total})`]);
    },
    onGrassStep(n) {
      if (n >= G.threshold) { encounter({ kind: "glitch" }); return; }
      const forceDecoy = G.decoysSeen === 0 && n >= G.threshold - 3;
      if (G.decoysSeen < 2 && n >= 2 && (forceDecoy || Math.random() < 0.22)) {
        G.decoysSeen++;
        encounter({ kind: "decoy", mon: pick(C.decoys) });
      }
    }
  });

  // controlli
  dpad.querySelectorAll("button").forEach((b) => {
    const dir = b.dataset.dir;
    b.addEventListener("pointerdown", (e) => { e.preventDefault(); World.hold(dir); });
    ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => b.addEventListener(ev, () => World.release(dir)));
  });
  const KEYS = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
  document.addEventListener("keydown", (e) => {
    if (KEYS[e.key]) { e.preventDefault(); World.hold(KEYS[e.key]); }
    if (e.key === "Shift" || e.key === "x") World.run(true);
  });
  document.addEventListener("keyup", (e) => {
    if (KEYS[e.key]) World.release(KEYS[e.key]);
    if (e.key === "Shift" || e.key === "x") World.run(false);
  });
  const bBtn = $("#btn-b");
  bBtn.addEventListener("pointerdown", () => World.run(true));
  ["pointerup", "pointercancel", "pointerleave"].forEach((ev) => bBtn.addEventListener(ev, () => World.run(false)));

  const NAME = () => G.player.toUpperCase();
  const DIALOGUES = {
    oak: () => G.talked.oak ? [
      pick([
        "Ancora qui? L'erba alta è laggiù, non davanti a me.",
        "Un consiglio: tieni premuto B per correre. Lo faccio anch'io quando vedo la bolletta.",
        "Se incontri un Pokémon normale, lascialo stare. Tu cerchi quello coi dati CORROTTI."
      ])
    ] : (G.talked.oak = true, [
      `Ecco, ${NAME()}: prendi queste 30 SAFARI BALL. Qui non si combatte, si cattura e basta.`,
      "Cerca nell'ERBA ALTA. E se trovi un Pokémon che sembra... rotto, non avere paura. È lui.",
      "Vai! E ricorda: il regalo NON si ricicla."
    ]),
    santa: () => {
      const g = World.gifts;
      if (G.masterBall) return [pick(["Trovato il tuo Pokémon? La MASTER BALL non sbaglia mai. Quasi.", `Budget: ${C.budget}. E niente regali riciclati, ${NAME()}. Lo so sempre.`])];
      if (g.found === g.total) {
        G.masterBall = true;
        return [
          "HO HO HO! Li hai trovati TUTTI! Sei un vero Allenatore di Natale.",
          `Tieni, ${NAME()}: una MASTER BALL. È una Safari Ball dipinta d'oro, ma funziona. Fidati.`,
          "Usala sul Pokémon coi dati corrotti: lo cattura al primo colpo."
        ];
      }
      if (!G.talked.santa) {
        G.talked.santa = true;
        return [
          "HO HO HO! Quest'anno niente slitta: i regali ve li consegnate da soli. Io supervisiono.",
          `Però ho perso ${g.total} REGALI per la Zona Safari... Se li trovi tutti, ho qualcosa per te.`,
          "Uno è finito in mezzo al lago. Sul ghiaccio si scivola: pensa bene da dove partire."
        ];
      }
      return [`Regali trovati: ${g.found} su ${g.total}. ${g.found ? "Continua così!" : "Guarda negli angoli, dietro le case, nel recinto..."}`];
    },
    rival: () => G.talked.rival ? [pick(["Ancora in giro? Il mio l'ho già catturato al primo lancio.", "Ti ho visto lanciare le BALL. Imbarazzante."])] : (G.talked.rival = true, [
      `Ehi, ${NAME()}! Puzzi di regalo dell'ultimo minuto!`,
      "Io il mio Pokémon l'ho già catturato. Ci vediamo sotto l'albero... se ci arrivi!"
    ]),
    S: () => ["ZONA SAFARI", "▸ Erba alta a nord e a sud. ▸ Segnalati DATI CORROTTI nella zona."],
    "D:4,4": () => ["La porta del laboratorio è chiusa.", "Un biglietto: \"Sono qui fuori. — Prof. OAK\""],
    "D:11,10": () => ["È chiuso a chiave.", "Da dentro arriva un profumo di panettone. Qualcuno ha iniziato in anticipo."],
    W: () => ["È un pupazzo di neve.", "...Ti ha appena fatto l'occhiolino?"],
    X: () => ["L'abete di Natale. Sotto non c'è ancora nessun regalo.", "...Colpa tua?"]
  };

  function worldInteract() {
    const hit = World.interact();
    if (!hit) return;
    Sfx.select();
    let fn;
    if (hit.type === "npc") fn = DIALOGUES[hit.id];
    else fn = DIALOGUES[`${hit.tile}:${hit.x},${hit.y}`] || DIALOGUES[hit.tile];
    if (fn) worldSay(fn());
  }

  async function world() {
    show("world");
    Music.play("world");
    World.reset();
    G.threshold = rnd(C.stepsMin, C.stepsMax);
    G.masterBall = false; G.gifts = 0; updateHud();
    World.start();
    await fadeIn();
    await worldSay(DIALOGUES.oak());
  }

  async function backToWorld() {
    show("world");
    Music.play("world");
    World.start();
    await fadeIn();
    World.lock(false);
  }

  // =====================================================================
  // TRANSIZIONI
  // =====================================================================
  async function fadeOut() { const f = $("#fade"); f.classList.add("on"); await wait(450); }
  async function fadeIn() { const f = $("#fade"); f.classList.remove("on"); await wait(450); }

  async function encounter(what) {
    World.lock(true);
    Music.stop();
    Sfx.encounter();
    const fl = $("#flash"); fl.classList.add("on");
    await wait(1100); fl.classList.remove("on");
    const wp = $("#wipe"); wp.classList.add("on");
    await wait(750);
    World.stop();
    const result = battle(what);
    wp.classList.remove("on"); wp.classList.add("off");
    await wait(400); wp.classList.remove("off");
    await result;
  }

  // =====================================================================
  // BATTLE
  // =====================================================================
  const sayB = makeDialog($(".textbox"), $("#btext"), $("#bcursor"));
  const bmenu = $("#bmenu");
  const spriteWrap = $("#enemy-sprite");
  const noiseCv = $("#glitch-noise");
  const ncx = noiseCv.getContext("2d");
  let glitchTimer = 0, sliceEls = [];
  let balls = C.safariBalls;

  // Misura il margine trasparente sotto il disegno e lo compensa, così i piedi toccano la piattaforma.
  function groundSprite(src) {
    spriteWrap.style.setProperty("--pad", "0%");
    const probe = new Image();
    probe.crossOrigin = "anonymous";
    probe.onload = () => {
      try {
        const c = document.createElement("canvas"); c.width = probe.width; c.height = probe.height;
        const x = c.getContext("2d"); x.drawImage(probe, 0, 0);
        const d = x.getImageData(0, 0, c.width, c.height).data;
        let bottom = c.height - 1;
        outer: for (; bottom >= 0; bottom--) for (let i = 0; i < c.width; i++) if (d[(bottom * c.width + i) * 4 + 3] > 40) break outer;
        const pad = (c.height - 1 - bottom) / c.height * 100;
        spriteWrap.style.setProperty("--pad", pad.toFixed(1) + "%");
      } catch { /* immagine senza CORS: lasciamo com'è */ }
    };
    probe.src = src;
  }

  function buildEnemySprite(src, glitched) {
    sliceEls.forEach((e) => e.remove()); sliceEls = [];
    spriteWrap.querySelectorAll("img").forEach((e) => e.remove());
    groundSprite(src);
    const img = document.createElement("img"); img.src = src; img.alt = "";
    spriteWrap.insertBefore(img, noiseCv);
    spriteWrap.classList.remove("revealed", "hidden-mon", "shadow", "pokeapi");
    if (/pokemon\/\d+\.png$/.test(src)) spriteWrap.classList.add("pokeapi");
    if (glitched) {
      for (let i = 0; i < 6; i++) {
        const s = document.createElement("img"); s.src = src; s.className = "slice";
        s.style.clipPath = `inset(${i * 16.6}% 0 ${100 - (i + 1) * 16.6}% 0)`;
        spriteWrap.insertBefore(s, noiseCv); sliceEls.push(s);
      }
      spriteWrap.classList.add("shadow");
      startGlitch(1);
    } else {
      spriteWrap.classList.add("revealed");
    }
  }
  function startGlitch(intensity) {
    stopGlitch();
    glitchTimer = setInterval(() => {
      sliceEls.forEach((s) => { s.style.setProperty("--jx", (Math.random() < 0.35 * intensity ? rnd(-10, 10) * intensity : 0) + "px"); });
      ncx.clearRect(0, 0, 96, 96);
      for (let i = 0; i < Math.floor(14 * intensity); i++) {
        ncx.fillStyle = Math.random() < 0.5 ? "#000" : (Math.random() < 0.5 ? "#888" : "#fff");
        ncx.globalAlpha = 0.5 + Math.random() * 0.5;
        ncx.fillRect(rnd(0, 88), rnd(10, 88), rnd(4, 20), rnd(2, 8));
      }
      ncx.globalAlpha = 1;
    }, 110);
  }
  function stopGlitch() { clearInterval(glitchTimer); glitchTimer = 0; ncx.clearRect(0, 0, 96, 96); }

  function menu() {
    return new Promise((res) => {
      $("#bcursor").classList.remove("on");
      bmenu.classList.add("on");
      const h = (e) => {
        const b = e.target.closest("button"); if (!b) return;
        bmenu.removeEventListener("click", h); bmenu.classList.remove("on");
        Sfx.select(); res(b.dataset.act);
      };
      bmenu.addEventListener("click", h);
    });
  }

  function setBalls(n) { balls = n; $("#ball-count").textContent = n; }
  function hpShake() { const nb = $(".namebox"); nb.classList.remove("shake"); void nb.offsetWidth; nb.classList.add("shake"); }
  function enemyShake() { spriteWrap.classList.remove("cry"); void spriteWrap.offsetWidth; spriteWrap.classList.add("cry"); }

  // oggetto lanciato (ball / esca / sasso) con parabola verso il nemico
  async function throwThing(kind) {
    const ball = $("#ball");
    const wr = spriteWrap.getBoundingClientRect(), sr = screen.getBoundingClientRect();
    ball.style.setProperty("--bx", ((wr.left + wr.width / 2 - sr.left) / sr.width * 100 - 2) + "%");
    ball.style.setProperty("--by", ((wr.bottom - sr.top) / sr.height * 100 - 7) + "%");
    ball.className = `ball ${kind} fly`;
    Sfx.throwBall();
    await wait(750);
    return ball;
  }

  // barra di tempismo: il giocatore ferma il cursore. Ritorna "perfect" | "good" | "bad"
  async function timingBar() {
    const bar = $("#throwbar"), cur = $("#throwcur");
    bar.classList.add("on"); cur.style.animation = "none"; void cur.offsetWidth; cur.style.animation = "";
    await waitA();
    const b = bar.querySelector(".track").getBoundingClientRect(), c = cur.getBoundingClientRect();
    const pos = (c.left + c.width / 2 - b.left) / b.width; // 0..1
    cur.style.animationPlayState = "paused";
    const d = Math.abs(pos - 0.5);
    const res = d < 0.1 ? "perfect" : d < 0.25 ? "good" : "bad";
    bar.classList.add(res);
    Sfx[res === "perfect" ? "unlock" : res === "good" ? "select" : "deny"]();
    await wait(500);
    bar.classList.remove("on", "perfect", "good", "bad");
    cur.style.animationPlayState = "";
    return res;
  }

  async function battle(what) {
    show("battle");
    Music.play("battle");
    const glitch = what.kind === "glitch";
    const name = glitch ? "???????" : what.mon.name.toUpperCase();
    $("#ename").textContent = name;
    $("#elvl").textContent = glitch ? "L??" : "L" + rnd(5, 12);
    setBalls(balls);
    buildEnemySprite(glitch ? G.payload.sprite : C.decoySprite(what.mon.id), glitch);
    $("#ball").className = "ball";
    $("#throwbar").classList.remove("on");
    // entrata in scena
    $("#scr-battle").classList.remove("enter"); void $("#scr-battle").offsetWidth; $("#scr-battle").classList.add("enter");
    await wait(900);
    Sfx.cry(); if (glitch) Sfx.glitch(); enemyShake();
    await sayB(`Un ${name} selvatico è apparso!`);
    if (glitch) await sayB("...i suoi dati sembrano CORROTTI. Eppure, c'è qualcosa di familiare.");

    let attempts = 0, esca = 0, sasso = 0, fuga = 0;
    while (true) {
      await sayB(`Cosa fa ${NAME()}?`, { hold: false });
      const act = await menu();
      if (act === "fuga") {
        if (!glitch) { Sfx.select(); await sayB("Sei fuggito senza problemi!"); break; }
        fuga++; Sfx.deny();
        await sayB(pick(["Non puoi fuggire da un incontro del DESTINO!", "??????? ti blocca la strada. Non si scappa dal Natale.", fuga > 2 ? "Dai. Lancia la BALL." : "Niente da fare: le gambe non rispondono."]));
      } else if (act === "esca") {
        esca++;
        await sayB(`${NAME()} ha lanciato un'ESCA!`, { hold: false });
        await throwThing("bait"); $("#ball").className = "ball";
        if (!glitch) { await sayB(`${name} mangia l'ESCA, fa un verso soddisfatto e se ne va.`); break; }
        await sayB(pick([
          "??????? ignora l'ESCA e ti fissa.",
          "??????? la mangia... senza masticare. Inquietante.",
          "??????? sembra aspettare qualcosa di più. Tipo un regalo."
        ].slice(Math.min(esca - 1, 2))));
      } else if (act === "sasso") {
        sasso++;
        await sayB(`${NAME()} ha lanciato un SASSO!`, { hold: false });
        await throwThing("rock"); $("#ball").className = "ball";
        Sfx.breakout(); hpShake(); enemyShake();
        if (!glitch) { await sayB(`${name} si offende e scappa via!`); break; }
        await sayB(pick([
          "??????? sembra... offeso.",
          "Un altro SASSO?! ??????? se lo ricorderà a Natale.",
          "Il SASSO attraversa ??????? come fosse un bug. Nessun effetto."
        ].slice(Math.min(sasso - 1, 2))));
      } else if (act === "ball") {
        if (balls <= 0) { await sayB("Non hai più SAFARI BALL! ...Scherzo, OAK te ne passa altre 10."); setBalls(10); continue; }
        const useMaster = G.masterBall && glitch;
        if (G.masterBall && !glitch) { await sayB(`Non sprecare la MASTER BALL su un ${name}! Usa una Safari Ball.`); }
        attempts++;
        if (useMaster) G.masterBall = false; else setBalls(balls - 1);
        await sayB(useMaster ? "La MASTER BALL brilla d'oro..." : "Ferma il cursore al centro!", { hold: false });
        const t = useMaster ? "perfect" : await timingBar();
        await sayB(`${NAME()} ha lanciato ${useMaster ? "la MASTER BALL" : "una SAFARI BALL"}!${useMaster ? "" : t === "perfect" ? " Lancio PERFETTO!" : t === "bad" ? " Lancio un po' storto..." : ""}`, { hold: false });
        const ball = await throwThing(useMaster ? "master" : "");
        if (!glitch) {
          Sfx.breakout(); ball.className = "ball"; enemyShake();
          await sayB(`${name} ha respinto la BALL! Non è lui quello che cerchi...`);
          continue;
        }
        spriteWrap.classList.add("hidden-mon"); stopGlitch();
        await wait(350);
        ball.className = "ball land";
        const chance = useMaster || attempts >= 3 ? 1 : t === "perfect" ? 0.85 : t === "good" ? 0.5 : 0.2;
        const succeed = Math.random() < chance;
        const shakes = succeed ? 3 : rnd(1, 2);
        for (let i = 0; i < shakes; i++) {
          await wait(520); Sfx.shake();
          ball.classList.remove("wob"); void ball.offsetWidth; ball.classList.add("wob");
        }
        await wait(650);
        if (!succeed) {
          Sfx.breakout(); ball.className = "ball";
          spriteWrap.classList.remove("hidden-mon"); startGlitch(1.4); Sfx.glitch();
          await sayB(pick(["Oh no! ??????? è sfuggito!", "Accidenti! C'è mancato poco!", "??????? si rifiuta di entrare. Ha paura del buio."]));
          startGlitch(1);
          continue;
        }
        ball.classList.add("caught");
        const fl = $("#flash"); fl.classList.add("once"); setTimeout(() => fl.classList.remove("once"), 400);
        Music.stop(); Sfx.catchJingle();
        await sayB(`Gotcha! ??????? è stato catturato!${useMaster ? " La MASTER BALL non sbaglia." : ""}`);
        await reveal();
        return;
      }
    }
    // fine incontro-esca
    await fadeOut();
    await backToWorld();
  }

  async function reveal() {
    const ball = $("#ball");
    await sayB("Un momento... i dati si stanno ricostruendo!", { hold: false });
    ball.className = "ball";
    spriteWrap.classList.remove("hidden-mon");
    startGlitch(2.2); Sfx.glitch(); await wait(700);
    startGlitch(1.2); Sfx.glitch(); await wait(600);
    startGlitch(0.4); await wait(500);
    stopGlitch();
    spriteWrap.classList.remove("shadow"); spriteWrap.classList.add("revealed");
    Music.play("victory");
    Sfx.cry();
    const target = G.payload.target.toUpperCase();
    $("#ename").textContent = target; $("#elvl").textContent = "L" + new Date().getFullYear() % 100;
    await wait(600);
    await sayB(`??????? era in realtà... ${target}!`);
    await sayB(`${target}${G.payload.form ? ` (forma ${G.payload.form})` : ""} è nelle tue mani: dovrai fargli il REGALO!`);
    Sfx.dex();
    await sayB(`I dati di ${target} sono stati registrati nel POKÉDEX.`);
    writeSave({ player: G.player, payload: G.payload, capturedAt: Date.now(), gifts: World.gifts.found });
    G.save = loadSave();
    await fadeOut();
    Music.play("dex");
    dex(false);
    await fadeIn();
  }

  // =====================================================================
  // POKEDEX + CARD
  // =====================================================================
  const avatarFile = (p) => (p || "").split("/").pop();
  function caughtSlot() {
    const i = C.avatars.indexOf(avatarFile(G.payload.sprite));
    return i >= 0 ? i : 0;
  }

  function dex(returning) {
    show("dex");
    const list = $("#dex-list");
    list.innerHTML = "";
    const slot = caughtSlot();
    $("#dex-trainer").textContent = NAME();
    C.avatars.forEach((file, i) => {
      const li = document.createElement("li");
      const no = String(i + 1).padStart(3, "0");
      const img = i === slot ? G.payload.sprite : "assets/sprites/" + file;
      if (i === slot) {
        li.className = "caught";
        li.innerHTML = `<img src="${img}" alt=""><span class="no">No.${no}</span><span class="nm">${G.payload.target.toUpperCase()}</span><span class="arrow">▶</span>`;
        li.addEventListener("click", () => { Sfx.select(); card(no); });
      } else {
        li.className = "ghost";
        li.innerHTML = `<img src="${img}" alt=""><span class="no">No.${no}</span><span class="nm">?????</span>`;
        li.addEventListener("click", () => { Sfx.deny(); dexMsg("Dati non disponibili. Qualcun altro lo catturerà."); });
      }
      list.appendChild(li);
    });
    const gifts = G.save && G.save.gifts != null ? G.save.gifts : World.gifts.found;
    $("#dex-count").textContent = `CATTURATI 1/6 · 🎁 ${gifts}/5`;
    $("#dex-reset").onclick = () => {
      Sfx.blip();
      if (!confirm("Vuoi cancellare la partita e ricominciare da capo?")) return;
      localStorage.removeItem(C.saveKey);
      G.save = null; G.payload = null; G.player = null; G.decoysSeen = 0; G.talked = {}; G.masterBall = false; G.gifts = 0;
      balls = C.safariBalls;
      Music.stop();
      title();
    };
    if (returning) Sfx.dex();
  }
  let dexMsgT = 0;
  function dexMsg(t) { const m = $("#dex-msg"); m.textContent = t; m.classList.add("on"); clearTimeout(dexMsgT); dexMsgT = setTimeout(() => m.classList.remove("on"), 1800); }

  function card(no) {
    show("card");
    const p = G.payload;
    $("#card-img").src = p.sprite;
    $("#card-no").textContent = no;
    $("#card-name").textContent = p.target.toUpperCase();
    $("#card-form").textContent = p.form ? `forma ${p.form}` : "";
    $("#card-type").textContent = p.type || "???";
    $("#card-flavor").textContent = p.flavor || `${p.target} ti è stato assegnato dal destino (e da nessun altro).`;
    $("#card-target").textContent = p.target.toUpperCase();
    $("#card-date").textContent = C.eventDate;
    $("#card-budget").textContent = C.budget;
    $("#card-trainer").textContent = NAME();
    $("#card-back").onclick = () => { Sfx.blip(); dex(false); };
  }

  // ---------- tasto B: indietro dove ha senso ----------
  bBtn.addEventListener("click", () => {
    if (G.scr === "card") { Sfx.blip(); dex(false); }
    else if (G.scr === "pin") { Sfx.blip(); login(); }
    else if (typing) skipType = true;
  });

  // ---------- decorazioni ----------
  (function drawTrainer() {
    const t = $("#trainer").getContext("2d");
    Pix.draw(t, Pix.TRAINER_BACK, 0, 0);
  })();
  (function drawMissingNo() {
    const t = $("#missingno").getContext("2d");
    const inside = (x, y) => !(x < 12 && y < 14);
    const paint = () => {
      t.clearRect(0, 0, 32, 32);
      for (let y = 0; y < 32; y += 2) for (let x = 0; x < 32; x += 2) {
        if (!inside(x, y)) continue;
        const v = Math.random();
        t.fillStyle = v < 0.35 ? "#101010" : v < 0.6 ? "#6a6a6a" : v < 0.8 ? "#b8b8b8" : "#f0f0f0";
        t.fillRect(x, y, Math.random() < 0.3 ? 4 : 2, 2);
      }
    };
    paint();
    setInterval(() => { if (G.scr === "title") paint(); }, 160);
  })();

  title();
})();
