// Pixel art disegnata a mano: sprite a caratteri e ritratti a primitive.
window.Pix = (() => {
  // palette condivisa degli sprite a caratteri
  const PAL = {
    k: "#202030", r: "#d83838", s: "#f8d0a0", S: "#d8a070", b: "#3058c0", w: "#f8f8f8", W: "#c8c8d8",
    h: "#503820", g: "#687080", G: "#c8c8d0", y: "#f8e048", e: "#f8f8f8", p: "#e06060", t: "#30a080",
    o: "#f09040", c: "#c82838", v: "#8040a0", n: "#f8b060"
  };

  // ---- giocatore (16x16, 4 direzioni) ----
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
  // ---- Prof. Oak overworld ----
  const OAK = [
    "......kkkk......",
    ".....kGGGGk.....",
    "....kGGGGGkk....",
    "....kGssssGk....",
    "....kssssssk....",
    "....ksksskks....",
    "....kssssssk....",
    ".....kssssk.....",
    "....kwwwwwwk....",
    "...kswwttwwsk...",
    "...kswwwwwwsk...",
    "....kwwwwwwk....",
    "....kwwwwwwk....",
    ".....kgggkk.....",
    ".....kg..gk.....",
    ".....kk..kk....."
  ];
  // ---- Babbo Natale ----
  const SANTA = [
    "......kkkk......",
    ".....krrrrk.....",
    "....krrrrrrkw...",
    "...kwwwwwwwwk...",
    "....kssssssk....",
    "....ksksskks....",
    "....kswwwwsk....",
    "....kwwwwwwk....",
    "...kkrrrrrrkk...",
    "..kskrrrrrrksk..",
    "..kskkkkkkkksk..",
    "....krryyrrk....",
    "....krrrrrrk....",
    ".....kkkkkk.....",
    ".....kk..kk.....",
    ".....kk..kk....."
  ];
  // ---- rivale (capelli a punta, giacca viola) ----
  const RIVAL = [
    ".....k.kk.k.....",
    "....kokookok....",
    "....koooooook...",
    "....kooooook....",
    "....kssssssk....",
    "....ksksskks....",
    "....kssssssk....",
    ".....kssssk.....",
    "....kvvvvvvk....",
    "...ksvvttvvsk...",
    "...ksvvvvvvsk...",
    "....kvvvvvvk....",
    ".....kkkkkk.....",
    ".....kk..kk.....",
    ".....kk..kk.....",
    "................"
  ];
  // ---- allenatore di spalle (battaglia) ----
  const TRAINER_BACK = [
    "........kkkkkkkk........",
    ".......krrrrrrrrk.......",
    "......krrrrrrrrrrk......",
    ".....krrrrrrrrrrrrk.....",
    ".....krrrrrrrrrrrrk.....",
    ".....kkkkkkkkkkkkkk.....",
    "......khhhhhhhhhhk......",
    "......khhhhhhhhhhk......",
    ".......khhhhhhhhk.......",
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

  function draw(ctx, sp, x, y, { frame = 0, flip = false, pal = PAL } = {}) {
    for (let r = 0; r < sp.length; r++) {
      const row = sp[r];
      for (let c = 0; c < row.length; c++) {
        const ch = row[c];
        if (ch === ".") continue;
        ctx.fillStyle = pal[ch] || "#f0f";
        let dy = 0;
        if (frame && r >= 13) dy = (frame === 1 ? (c < 8 ? -1 : 0) : (c < 8 ? 0 : -1));
        const px = flip ? x + (row.length - 1 - c) : x + c;
        ctx.fillRect(px, y + r + dy, 1, 1);
      }
    }
  }

  // ---- ritratto del Prof. Oak (48x52) a primitive, stile dialogo d'apertura ----
  function oakPortrait(ctx) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const K = "#202030", HAIR = "#d8d8e0", HAIR2 = "#a8a8b8", SKIN = "#f8d0a0", SKIN2 = "#d8a070",
      COAT = "#f8f8f8", COAT2 = "#c8c8d8", SHIRT = "#30a080", EYE = "#503018", MOUTH = "#b05050";
    ctx.clearRect(0, 0, 48, 52);
    // collo e camice
    R(K, 8, 36, 32, 16); R(COAT, 9, 37, 30, 15); R(COAT2, 9, 37, 4, 15); R(COAT2, 35, 37, 4, 15);
    R(K, 18, 36, 1, 16); R(K, 29, 36, 1, 16); // baveri
    R(SHIRT, 19, 37, 10, 15); R(K, 19, 44, 10, 1);
    R(SKIN, 20, 32, 8, 6); R(K, 19, 32, 1, 5); R(K, 28, 32, 1, 5); R(SKIN2, 20, 36, 8, 2);
    // testa
    R(K, 10, 4, 28, 30); R(SKIN, 11, 10, 26, 23);
    R(K, 8, 16, 3, 7); R(SKIN, 9, 17, 2, 5); R(K, 37, 16, 3, 7); R(SKIN, 37, 17, 2, 5); // orecchie
    // capelli grigi alla Oak (a onde verso l'alto)
    R(HAIR, 11, 5, 26, 6); R(HAIR, 9, 7, 30, 4); R(HAIR2, 11, 9, 26, 2);
    R(HAIR, 13, 2, 6, 4); R(HAIR, 21, 1, 7, 4); R(HAIR, 30, 2, 6, 4); R(K, 12, 1, 1, 4); R(K, 20, 0, 1, 2); R(K, 29, 1, 1, 2); R(K, 36, 1, 1, 4);
    R(K, 13, 1, 6, 1); R(K, 21, 0, 7, 1); R(K, 30, 1, 6, 1);
    R(HAIR, 11, 11, 3, 8); R(HAIR, 34, 11, 3, 8); // basette
    // sopracciglia folte
    R(K, 14, 15, 7, 2); R(K, 27, 15, 7, 2); R(HAIR2, 14, 14, 7, 1); R(HAIR2, 27, 14, 7, 1);
    // occhi
    R("#f8f8f8", 15, 18, 5, 3); R("#f8f8f8", 28, 18, 5, 3); R(EYE, 17, 18, 2, 3); R(EYE, 30, 18, 2, 3);
    R(K, 15, 17, 5, 1); R(K, 28, 17, 5, 1);
    // naso e bocca
    R(SKIN2, 22, 20, 1, 5); R(K, 21, 25, 4, 1);
    R(MOUTH, 19, 28, 10, 1); R(K, 18, 28, 1, 1); R(K, 29, 28, 1, 1); R(SKIN2, 19, 29, 10, 1);
    // guance e mento
    R(SKIN2, 13, 24, 3, 2); R(SKIN2, 32, 24, 3, 2);
  }

  // ---- ritratto del rivale (48x52) ----
  function rivalPortrait(ctx) {
    const R = (c, x, y, w, h) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
    const K = "#202030", HAIR = "#f09040", HAIR2 = "#c06020", SKIN = "#f8d0a0", SKIN2 = "#d8a070", JK = "#8040a0", JK2 = "#602880", EYE = "#304060";
    ctx.clearRect(0, 0, 48, 52);
    R(K, 6, 36, 36, 16); R(JK, 7, 37, 34, 15); R(JK2, 7, 37, 5, 15); R(JK2, 36, 37, 5, 15); R("#30a080", 20, 37, 8, 15);
    R(SKIN, 20, 31, 8, 7); R(K, 19, 31, 1, 6); R(K, 28, 31, 1, 6);
    R(K, 10, 6, 28, 28); R(SKIN, 11, 12, 26, 21);
    R(HAIR, 11, 7, 26, 6); R(HAIR2, 11, 12, 26, 1);
    // ciuffi a punta (triangoli a gradini)
    const spike = (cx0, top, h, w) => {
      for (let i = 0; i < h; i++) {
        const ww = Math.max(1, Math.round(w * (i + 1) / h));
        const x0 = cx0 - Math.floor(ww / 2);
        R(K, x0 - 1, top + i, ww + 2, 1); R(HAIR, x0, top + i, ww, 1);
      }
    };
    spike(11, 3, 7, 7); spike(18, 0, 10, 8); spike(25, 1, 9, 8); spike(32, 0, 10, 8); spike(38, 4, 6, 6);
    R(HAIR, 11, 9, 26, 4); R(K, 10, 8, 1, 5); R(K, 37, 8, 1, 5);
    R(K, 14, 16, 7, 2); R(K, 27, 16, 7, 2); // sopracciglia aggrottate
    R(K, 20, 15, 1, 2); R(K, 27, 15, 1, 2);
    R("#f8f8f8", 15, 19, 5, 3); R("#f8f8f8", 28, 19, 5, 3); R(EYE, 17, 19, 2, 3); R(EYE, 30, 19, 2, 3);
    R(SKIN2, 23, 21, 1, 5); R(K, 19, 28, 10, 1); R(K, 28, 27, 2, 1); // ghigno
    R(SKIN2, 13, 25, 3, 2); R(SKIN2, 32, 25, 3, 2);
  }

  return { PAL, PLAYER_DOWN, PLAYER_UP, PLAYER_SIDE, OAK, SANTA, RIVAL, TRAINER_BACK, draw, oakPortrait, rivalPortrait };
})();
