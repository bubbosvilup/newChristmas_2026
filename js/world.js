// Overworld: mappa con camera, edifici, NPC, cartelli, erba alta.
window.World = (() => {
  const T = 16, VW = 10, VH = 10;
  const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));

  // T albero · G erba alta · . terreno · s neve · f fiori · = sentiero · ~ lago ghiacciato
  // # recinto · X abete decorato · W pupazzo di neve · S cartello · A/H edifici · D porta
  const MAP = [
    "TTTTTTTTTTTTTTTTTTTT",
    "T..s.....TTT......sT",
    "T.AAAAA..T~~~T..TT.T",
    "T.AAAAA.sT~~~~T.GG.T",
    "T.AADAA...~~~~..GG.T",
    "T...=...fT~~~T.GGG.T",
    "Ts..=.....TTT...f..T",
    "T.GG=GGG..........sT",
    "T.GG=GGG.HHHH..X...T",
    "T...=....HHHH...f..T",
    "T...=....HHDH..GGG.T",
    "T.f.=====.=....GGG.T",
    "T...S...=.=..#####.T",
    "T.GGGG..=.=..#.W.#.T",
    "T.GGGG..===..#...#.T",
    "Ts......=....##.##.T",
    "T....f..=......s...T",
    "TTTTTTTTTTTTTTTTTTTT"
  ];
  MAP.forEach((r, i) => { if (r.length !== 20) throw new Error("riga mappa " + i + " lunga " + r.length); });
  const MW = MAP[0].length, MH = MAP.length;

  const BUILDINGS = [
    { x: 2, y: 2, w: 5, h: 3, type: "lab", door: [4, 4] },
    { x: 9, y: 8, w: 4, h: 3, type: "house", door: [11, 10] }
  ];

  // regali nascosti (coordinate tile); vengono raccolti passandoci sopra
  const GIFTS = [
    { x: 10, y: 2 },  // in mezzo al lago: ci si arriva solo scivolando
    { x: 3, y: 1 },   // dietro il laboratorio
    { x: 18, y: 1 },  // angolo in alto a destra
    { x: 14, y: 13 }, // nel recinto del pupazzo
    { x: 2, y: 16 }   // angolo in basso a sinistra
  ];
  let found = new Set();
  const flakes = Array.from({ length: 36 }, (_, i) => ({ x: Math.random() * 160, y: Math.random() * 160, v: 0.25 + Math.random() * 0.45, w: i % 3 }));

  const NPCS = [
    { id: "oak", x: 5, y: 5, sprite: () => Pix.OAK, face: "left", turns: false },
    { id: "santa", x: 16, y: 7, sprite: () => Pix.SANTA, face: "down", turns: true },
    { id: "rival", x: 10, y: 13, sprite: () => Pix.RIVAL, face: "left", turns: true }
  ];

  const S = {
    px: 4, py: 5, mx: 0, my: 0, facing: "right",
    moving: null, held: null, running: false,
    stepsInGrass: 0, frame: 0, locked: true, raf: 0, lastT: 0,
    cam: { x: 0, y: 0 }
  };
  const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
  let cv, cx, hooks = {};

  const tileAt = (x, y) => (MAP[y] && MAP[y][x]) || "T";
  const npcAt = (x, y) => NPCS.find((n) => n.x === x && n.y === y);
  const blocked = (x, y) => "TAHDX#WS".includes(tileAt(x, y)) || !!npcAt(x, y);

  // ---------- tiles ----------
  const GROUND = "#88d068", GROUND2 = "#78c058", DARK = "#285828", LEAF = "#48a048", LEAF2 = "#68c858",
    TRUNK = "#805030", SNOW = "#f8f8ff", SNOW2 = "#c8d8f0", PATH = "#e8d8a8", PATH2 = "#d0b888";

  function drawTile(ch, x, y, frame, tx, ty) {
    cx.fillStyle = GROUND; cx.fillRect(x, y, T, T);
    cx.fillStyle = GROUND2;
    if ((tx * 7 + ty * 3) % 4 === 0) { cx.fillRect(x + 3, y + 5, 2, 1); cx.fillRect(x + 10, y + 11, 2, 1); }
    switch (ch) {
      case "T":
        cx.fillStyle = TRUNK; cx.fillRect(x + 6, y + 11, 4, 5);
        cx.fillStyle = DARK; cx.fillRect(x + 1, y + 3, 14, 10);
        cx.fillStyle = LEAF; cx.fillRect(x + 2, y + 2, 12, 9);
        cx.fillStyle = LEAF2; cx.fillRect(x + 4, y + 4, 3, 2); cx.fillRect(x + 9, y + 6, 2, 2); cx.fillRect(x + 3, y + 8, 2, 1);
        cx.fillStyle = SNOW; cx.fillRect(x + 3, y + 1, 10, 2); cx.fillRect(x + 5, y, 6, 1); cx.fillRect(x + 2, y + 3, 3, 1); cx.fillRect(x + 10, y + 3, 3, 1);
        cx.fillStyle = DARK; cx.fillRect(x + 5, y + 10, 6, 1);
        break;
      case "X": {
        cx.fillStyle = TRUNK; cx.fillRect(x + 7, y + 13, 2, 3);
        cx.fillStyle = DARK;
        cx.fillRect(x + 7, y, 2, 1); cx.fillRect(x + 6, y + 1, 4, 2); cx.fillRect(x + 5, y + 3, 6, 2);
        cx.fillRect(x + 4, y + 5, 8, 3); cx.fillRect(x + 3, y + 8, 10, 3); cx.fillRect(x + 2, y + 11, 12, 2);
        cx.fillStyle = LEAF; cx.fillRect(x + 7, y + 2, 2, 1); cx.fillRect(x + 6, y + 4, 3, 1); cx.fillRect(x + 5, y + 7, 4, 1); cx.fillRect(x + 4, y + 10, 5, 1);
        const on = Math.floor(frame / 15) % 2;
        [[7, 1, "#f8e048"], [5, 4, "#f85050"], [10, 5, "#58c8f8"], [4, 8, "#f85050"], [11, 9, "#f8e048"], [6, 11, "#58c8f8"], [12, 12, "#f85050"], [3, 12, "#f8e048"]]
          .forEach(([lx, ly, col], i) => { cx.fillStyle = (i % 2 === on) ? col : "#f8f8f8"; cx.fillRect(x + lx, y + ly, 1, 1); });
        cx.fillStyle = "#f8e048"; cx.fillRect(x + 7, y, 2, 1);
        break;
      }
      case "G": {
        cx.fillStyle = "#58a848"; cx.fillRect(x, y, T, T);
        cx.fillStyle = "#307838";
        const o = frame % 2 ? 1 : 0;
        for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
          const gx = x + 1 + i * 8, gy = y + 1 + j * 8 + ((i + j + o) % 2);
          cx.fillRect(gx, gy + 2, 1, 4); cx.fillRect(gx + 2, gy, 1, 6); cx.fillRect(gx + 4, gy + 1, 1, 5); cx.fillRect(gx + 1, gy + 5, 5, 1);
        }
        cx.fillStyle = "#88d868"; cx.fillRect(x + 3, y + 1, 1, 2); cx.fillRect(x + 11, y + 9, 1, 2);
        break;
      }
      case "s":
        cx.fillStyle = SNOW2; cx.fillRect(x + 2, y + 5, 12, 8);
        cx.fillStyle = SNOW; cx.fillRect(x + 3, y + 4, 10, 8); cx.fillRect(x + 1, y + 7, 14, 4);
        break;
      case "f": {
        const o = Math.floor(frame / 25) % 2;
        cx.fillStyle = "#f8e048"; cx.fillRect(x + 3 + o, y + 4, 2, 2); cx.fillRect(x + 10, y + 9 + o, 2, 2);
        cx.fillStyle = "#f85858"; cx.fillRect(x + 10 - o, y + 3, 2, 2); cx.fillRect(x + 4, y + 10 + o, 2, 2);
        cx.fillStyle = "#307838"; cx.fillRect(x + 4, y + 6, 1, 2); cx.fillRect(x + 11, y + 11, 1, 2);
        break;
      }
      case "=": {
        cx.fillStyle = PATH; cx.fillRect(x, y, T, T);
        cx.fillStyle = PATH2; cx.fillRect(x + 2, y + 3, 2, 1); cx.fillRect(x + 9, y + 7, 3, 1); cx.fillRect(x + 5, y + 12, 2, 1);
        // bordi erba sui lati non-sentiero
        cx.fillStyle = GROUND2;
        if (!"=D".includes(tileAt(tx - 1, ty))) cx.fillRect(x, y, 1, T);
        if (!"=D".includes(tileAt(tx + 1, ty))) cx.fillRect(x + 15, y, 1, T);
        if (!"=D".includes(tileAt(tx, ty - 1))) cx.fillRect(x, y, T, 1);
        if (!"=D".includes(tileAt(tx, ty + 1))) cx.fillRect(x, y + 15, T, 1);
        break;
      }
      case "~": {
        cx.fillStyle = "#a8d8f8"; cx.fillRect(x, y, T, T);
        cx.fillStyle = "#c8e8ff";
        const o = Math.floor(frame / 30) % 2;
        cx.fillRect(x + 2 + o, y + 3, 5, 1); cx.fillRect(x + 9, y + 9 + o, 4, 1); cx.fillRect(x + 4, y + 12, 2, 1);
        cx.fillStyle = "#78b8e8";
        if (tileAt(tx, ty - 1) !== "~") cx.fillRect(x, y, T, 2);
        if (tileAt(tx, ty + 1) !== "~") cx.fillRect(x, y + 14, T, 2);
        if (tileAt(tx - 1, ty) !== "~") cx.fillRect(x, y, 2, T);
        if (tileAt(tx + 1, ty) !== "~") cx.fillRect(x + 14, y, 2, T);
        break;
      }
      case "#":
        cx.fillStyle = TRUNK; cx.fillRect(x, y + 6, T, 2); cx.fillRect(x, y + 11, T, 2);
        cx.fillStyle = "#a07048"; cx.fillRect(x + 2, y + 3, 3, 12); cx.fillRect(x + 11, y + 3, 3, 12);
        cx.fillStyle = "#202030"; cx.fillRect(x + 2, y + 2, 3, 1); cx.fillRect(x + 11, y + 2, 3, 1);
        cx.fillStyle = SNOW; cx.fillRect(x + 2, y + 1, 3, 1); cx.fillRect(x + 11, y + 1, 3, 1);
        drawLights(x + 3, y + 5, 2, frame * 20 + tx, 9);
        break;
      case "W":
        cx.fillStyle = "#202030"; cx.fillRect(x + 3, y + 7, 10, 9); cx.fillRect(x + 5, y + 1, 6, 7);
        cx.fillStyle = SNOW; cx.fillRect(x + 4, y + 8, 8, 7); cx.fillRect(x + 6, y + 2, 4, 5);
        cx.fillStyle = "#202030"; cx.fillRect(x + 7, y + 3, 1, 1); cx.fillRect(x + 9, y + 3, 1, 1); cx.fillRect(x + 7, y + 10, 1, 1); cx.fillRect(x + 8, y + 12, 1, 1);
        cx.fillStyle = "#f09040"; cx.fillRect(x + 8, y + 5, 2, 1);
        cx.fillStyle = "#d83838"; cx.fillRect(x + 5, y + 7, 6, 1);
        cx.fillStyle = TRUNK; cx.fillRect(x + 1, y + 9, 3, 1); cx.fillRect(x + 12, y + 9, 3, 1);
        break;
      case "S":
        cx.fillStyle = TRUNK; cx.fillRect(x + 7, y + 9, 2, 6);
        cx.fillStyle = "#202030"; cx.fillRect(x + 2, y + 2, 12, 8);
        cx.fillStyle = "#e0b870"; cx.fillRect(x + 3, y + 3, 10, 6);
        cx.fillStyle = "#806040"; cx.fillRect(x + 4, y + 4, 8, 1); cx.fillRect(x + 4, y + 6, 6, 1);
        break;
      case "A": case "H": case "D":
        break; // disegnati dagli edifici
    }
  }

  function drawBuilding(b) {
    const x = b.x * T, y = b.y * T, w = b.w * T, h = b.h * T;
    const roofH = T + 4;
    const wall = b.type === "lab" ? "#f0e8d0" : "#f8e0b8", wall2 = b.type === "lab" ? "#c8c0a8" : "#d0b890";
    const roof = b.type === "lab" ? "#4878c0" : "#c83838", roof2 = b.type === "lab" ? "#2c5490" : "#902020";
    // muro
    cx.fillStyle = "#202030"; cx.fillRect(x, y + roofH - 2, w, h - roofH + 2);
    cx.fillStyle = wall; cx.fillRect(x + 1, y + roofH - 1, w - 2, h - roofH);
    cx.fillStyle = wall2; cx.fillRect(x + 1, y + h - 3, w - 2, 2);
    // tetto con neve
    cx.fillStyle = "#202030"; cx.fillRect(x - 2, y + 2, w + 4, roofH - 2);
    cx.fillStyle = roof; cx.fillRect(x - 1, y + 3, w + 2, roofH - 4);
    cx.fillStyle = roof2; for (let i = 0; i < w + 2; i += 6) cx.fillRect(x - 1 + i, y + 7, 3, 1);
    cx.fillStyle = SNOW; cx.fillRect(x - 1, y + 3, w + 2, 3); cx.fillRect(x + 3, y + 6, 5, 1); cx.fillRect(x + w - 10, y + 6, 6, 1);
    // finestre
    for (let i = 0; i < b.w; i++) {
      if (b.door && i === b.door[0] - b.x) continue;
      const wx = x + i * T + 4;
      cx.fillStyle = "#202030"; cx.fillRect(wx, y + roofH + 3, 8, 8);
      cx.fillStyle = "#f8e890"; cx.fillRect(wx + 1, y + roofH + 4, 6, 6);
      cx.fillStyle = "#202030"; cx.fillRect(wx + 4, y + roofH + 4, 1, 6); cx.fillRect(wx + 1, y + roofH + 7, 6, 1);
    }
    // porta
    if (b.door) {
      const dx = b.door[0] * T, dy = b.door[1] * T;
      cx.fillStyle = "#202030"; cx.fillRect(dx + 3, dy + 1, 10, 15);
      cx.fillStyle = "#805030"; cx.fillRect(dx + 4, dy + 2, 8, 14);
      cx.fillStyle = "#f8e048"; cx.fillRect(dx + 10, dy + 9, 1, 1);
      if (b.type === "house") { cx.fillStyle = "#48a048"; cx.fillRect(dx + 6, dy + 3, 4, 3); cx.fillStyle = "#d83838"; cx.fillRect(dx + 7, dy + 4, 2, 1); }
    }
    // filo di lucine sotto la gronda
    drawLights(x + 1, y + roofH, Math.floor((w - 2) / 5), S.frame);
    // ghirlanda sulla porta della casa
    if (b.type === "house" && b.door) {
      const dx = b.door[0] * T, dy = b.door[1] * T;
      cx.fillStyle = "#48a048"; cx.fillRect(dx + 5, dy + 4, 6, 1); cx.fillRect(dx + 5, dy + 8, 6, 1); cx.fillRect(dx + 4, dy + 5, 1, 3); cx.fillRect(dx + 11, dy + 5, 1, 3);
      cx.fillStyle = "#d83838"; cx.fillRect(dx + 7, dy + 8, 2, 1); cx.fillStyle = "#f8e048"; cx.fillRect(dx + 5, dy + 4, 1, 1); cx.fillRect(dx + 10, dy + 4, 1, 1);
    }
    // insegna del laboratorio
    if (b.type === "lab") {
      cx.fillStyle = "#202030"; cx.fillRect(x + w - 26, y + roofH + 2, 22, 7);
      cx.fillStyle = "#f8f8f8"; cx.fillRect(x + w - 25, y + roofH + 3, 20, 5);
      cx.fillStyle = "#202030"; cx.fillRect(x + w - 23, y + roofH + 5, 3, 1); cx.fillRect(x + w - 19, y + roofH + 5, 3, 1); cx.fillRect(x + w - 15, y + roofH + 5, 3, 1); cx.fillRect(x + w - 11, y + roofH + 5, 5, 1);
    }
  }

  function drawGift(x, y, frame) {
    const bob = Math.floor(frame / 25) % 2;
    const y0 = y + 4 - bob;
    cx.fillStyle = "rgba(0,0,0,.18)"; cx.fillRect(x + 4, y + 13, 8, 2);
    cx.fillStyle = "#202030"; cx.fillRect(x + 3, y0, 10, 9);
    cx.fillStyle = "#d83838"; cx.fillRect(x + 4, y0 + 1, 8, 7);
    cx.fillStyle = "#f8e048"; cx.fillRect(x + 7, y0 + 1, 2, 7); cx.fillRect(x + 4, y0 + 3, 8, 1);
    cx.fillStyle = "#f8e048"; cx.fillRect(x + 5, y0 - 1, 2, 2); cx.fillRect(x + 9, y0 - 1, 2, 2);
    cx.fillStyle = "#ffffff"; cx.fillRect(x + 5, y0 + 2, 1, 1);
  }

  const LIGHTS = ["#f85050", "#f8e048", "#58c8f8", "#58d858"];
  function drawLights(x, y, n, frame, step = 5) {
    const on = Math.floor(frame / 12) % 2;
    for (let i = 0; i < n; i++) {
      cx.fillStyle = (i % 2 === on) ? LIGHTS[i % 4] : "#f8f8f8";
      cx.fillRect(x + i * step, y, 1, 1);
      if (i % 2 === on) { cx.fillStyle = "rgba(255,255,255,.35)"; cx.fillRect(x + i * step - 1, y - 1, 3, 3); cx.fillStyle = LIGHTS[i % 4]; cx.fillRect(x + i * step, y, 1, 1); }
    }
  }

  function spriteFor(facing, moving, frame) {
    const walk = moving ? 1 + Math.floor(frame / 7) % 2 : 0;
    if (facing === "up") return [Pix.PLAYER_UP, { frame: walk }];
    if (facing === "left") return [Pix.PLAYER_SIDE, { frame: walk, flip: true }];
    if (facing === "right") return [Pix.PLAYER_SIDE, { frame: walk }];
    return [Pix.PLAYER_DOWN, { frame: walk }];
  }
  function npcSprite(n) {
    // gli NPC hanno un solo sprite: lo specchiamo quando guardano a sinistra
    return [n.sprite(), { flip: n.face === "left" }];
  }

  function render() {
    const ppx = S.px * T + S.mx, ppy = S.py * T + S.my;
    S.cam.x = Math.max(0, Math.min(MW * T - VW * T, ppx - (VW * T) / 2 + 8));
    S.cam.y = Math.max(0, Math.min(MH * T - VH * T, ppy - (VH * T) / 2 + 8));
    cx.save();
    cx.translate(-Math.round(S.cam.x), -Math.round(S.cam.y));
    const anim = Math.floor(S.frame / 20);
    const x0 = Math.floor(S.cam.x / T), y0 = Math.floor(S.cam.y / T);
    for (let y = y0; y <= Math.min(MH - 1, y0 + VH); y++)
      for (let x = x0; x <= Math.min(MW - 1, x0 + VW); x++) {
        const ch = tileAt(x, y);
        drawTile(ch, x * T, y * T, ch === "X" ? S.frame : anim, x, y);
      }
    BUILDINGS.forEach(drawBuilding);
    GIFTS.forEach((g) => { if (!found.has(g)) drawGift(g.x * T, g.y * T, S.frame); });
    // personaggi ordinati per Y
    const actors = NPCS.map((n) => ({ y: n.y * T, draw: () => { const [sp, o] = npcSprite(n); Pix.draw(cx, sp, n.x * T, n.y * T - 2, o); } }));
    const [sp, opt] = spriteFor(S.facing, S.moving, S.frame);
    actors.push({ y: ppy, draw: () => {
      Pix.draw(cx, sp, ppx, ppy - 2, opt);
      // nell'erba alta la parte bassa del corpo resta coperta, anche mentre si cammina
      const inGrass = tileAt(S.px, S.py) === "G" || (S.moving && S.fromTile === "G");
      if (inGrass) {
        cx.save(); cx.beginPath(); cx.rect(ppx, ppy + 9, 16, 7); cx.clip();
        for (const [tx, ty] of [[S.px, S.py], [S.px - 1, S.py], [S.px + 1, S.py], [S.px, S.py - 1], [S.px, S.py + 1]])
          if (tileAt(tx, ty) === "G") drawTile("G", tx * T, ty * T, anim, tx, ty);
        cx.restore();
        cx.save(); cx.beginPath(); cx.rect(ppx, ppy - 2, 16, 11); cx.clip(); Pix.draw(cx, sp, ppx, ppy - 2, opt); cx.restore();
      }
    } });
    actors.sort((a, b) => a.y - b.y).forEach((a) => a.draw());
    cx.restore();
    // neve in primo piano (spazio schermo)
    cx.fillStyle = "rgba(255,255,255,.9)";
    flakes.forEach((f) => {
      f.y += f.v; f.x += Math.sin((S.frame + f.x) / 40) * 0.2;
      if (f.y > 160) { f.y = -2; f.x = Math.random() * 160; }
      if (f.x < 0) f.x += 160; if (f.x > 160) f.x -= 160;
      cx.fillRect(Math.round(f.x), Math.round(f.y), f.w === 0 ? 2 : 1, f.w === 0 ? 2 : 1);
    });
  }

  function tryMove(dir) {
    S.facing = dir;
    const [dx, dy] = DIRS[dir];
    const nx = S.px + dx, ny = S.py + dy;
    if (blocked(nx, ny)) return false;
    S.fromTile = tileAt(S.px, S.py);
    S.moving = dir; S.mx = -dx * T; S.my = -dy * T; S.px = nx; S.py = ny;
    return true;
  }

  function arrived() {
    const t = tileAt(S.px, S.py);
    const gi = GIFTS.findIndex((g) => g.x === S.px && g.y === S.py && !found.has(g));
    hooks.onStep && hooks.onStep();
    if (gi >= 0) { found.add(GIFTS[gi]); hooks.onGift && hooks.onGift(found.size, GIFTS.length, GIFTS[gi]); return; }
    if (t === "~") {
      // sul ghiaccio si continua a scivolare finché non si incontra un ostacolo
      const [dx, dy] = DIRS[S.facing];
      if (!blocked(S.px + dx, S.py + dy)) { Sfx.slide(); tryMove(S.facing); return; }
      Sfx.step(); return;
    }
    if (t === "G") {
      S.stepsInGrass++;
      Sfx.rustle();
      hooks.onGrassStep && hooks.onGrassStep(S.stepsInGrass);
    } else {
      Sfx.step();
    }
  }

  let npcTurnT = 0;
  function loop(ts) {
    S.raf = requestAnimationFrame(loop);
    const dt = Math.min(50, ts - S.lastT); S.lastT = ts;
    S.frame++;
    if (S.moving) {
      const speed = (S.running ? 0.17 : 0.1) * dt;
      const [dx, dy] = DIRS[S.moving];
      S.mx += dx * speed; S.my += dy * speed;
      if ((dx && Math.sign(S.mx) === Math.sign(dx)) || (dy && Math.sign(S.my) === Math.sign(dy)) || (!S.mx && !S.my)) {
        S.mx = 0; S.my = 0; S.moving = null;
        arrived();
      }
    }
    if (!S.moving && !S.locked && S.held) tryMove(S.held);
    // gli NPC si guardano intorno
    npcTurnT += dt;
    if (npcTurnT > 1800) {
      npcTurnT = 0;
      NPCS.forEach((n) => { if (n.turns && Math.random() < 0.5) n.face = ["down", "left", "right"][rnd(0, 2)]; });
    }
    render();
  }

  // ---------- interazione ----------
  function facingTile() {
    const [dx, dy] = DIRS[S.facing];
    return { x: S.px + dx, y: S.py + dy };
  }
  function interact() {
    const { x, y } = facingTile();
    const n = npcAt(x, y);
    if (n) {
      // l'NPC si gira verso il giocatore
      n.face = S.facing === "up" ? "down" : S.facing === "down" ? "down" : S.facing === "left" ? "right" : "left";
      return { type: "npc", id: n.id };
    }
    const t = tileAt(x, y);
    if ("SDWX".includes(t)) return { type: "tile", tile: t, x, y };
    return null;
  }

  return {
    T, S,
    init(canvas, h) { cv = canvas; cx = cv.getContext("2d"); cx.imageSmoothingEnabled = false; hooks = h || {}; },
    reset() { S.px = 4; S.py = 5; S.mx = S.my = 0; S.facing = "right"; S.moving = null; S.held = null; S.stepsInGrass = 0; NPCS[0].face = "left"; found = new Set(); },
    get gifts() { return { found: found.size, total: GIFTS.length }; },
    start() { if (!S.raf) { S.lastT = performance.now(); S.raf = requestAnimationFrame(loop); } },
    stop() { cancelAnimationFrame(S.raf); S.raf = 0; },
    lock(v) { S.locked = v; if (v) S.held = null; },
    hold(dir) { S.held = dir; },
    release(dir) { if (!dir || S.held === dir) S.held = null; },
    run(v) { S.running = v; },
    interact,
    get isMoving() { return !!S.moving; },
    get locked() { return S.locked; }
  };
})();
