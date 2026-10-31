// Configurazione pubblica (nessun segreto qui: questo file è leggibile da chiunque).
window.CONFIG = {
  // Nomi mostrati nella schermata "Chi sei?". Devono corrispondere a tools/pairings.json
  names: ["Bubbo", "Lollo", "Naccio", "Albe", "Piebel", "Vale"],

  // Avatar mostrati nel Pokédex (in silhouette finché non catturati). L'ordine qui
  // non c'entra con gli accoppiamenti: è solo la numerazione del Pokédex.
  avatars: ["1.png", "2.png", "3.png", "4.png", "5.png", "6.png"],

  // Info sullo scambio dei regali (mostrate nella scheda del Pokédex)
  eventDate: "da definire",
  budget: "30€ indicativi",

  // Quante Safari Ball hai (puro folklore, la cattura riesce sempre entro 3 lanci)
  safariBalls: 30,

  // Passi nell'erba alta prima dell'incontro col glitch: casuale tra min e max.
  // Prima possono capitare 1-2 incontri "normali" con i Pokémon qui sotto.
  stepsMin: 7,
  stepsMax: 11,
  decoys: [
    { id: 225, name: "Delibird" }, { id: 220, name: "Swinub" }, { id: 361, name: "Snorunt" },
    { id: 613, name: "Cubchoo" }, { id: 234, name: "Stantler" }, { id: 582, name: "Vanillite" }
  ],
  decoySprite: (id) => "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/" + id + ".png",

  // Musica: lascia vuoto per i brani chiptune integrati, oppure indica un file per scena,
  // es. { title: "assets/music/title.mp3", world: "...", battle: "...", victory: "...", dex: "..." }
  music: {},

  // Chiave localStorage
  saveKey: "ssp2026-save"
};
