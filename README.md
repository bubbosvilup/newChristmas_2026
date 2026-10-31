# Babbo Natale Segreto · Versione Glitch

Mini-gioco in stile Pokémon (Game Boy) per sorteggiare i regali di Natale tra 6 amici di Barberino di Mugello.
La storia: tanti Natali fa sei amici fecero un patto (un regalo segreto a testa), il Prof. Oak li registrò in un
Pokédex speciale che ogni anno decideva gli accoppiamenti... e quest'anno il Pokédex si è corrotto. L'unico modo
per ricostruirlo è tornare nell'erba alta e ricatturare, uno per uno, i propri amici.
Dopo il prologo il Prof. Oak ti accoglie, scegli chi sei, poi esplori la Zona Safari innevata (lago ghiacciato, abete con le luci,
Babbo Natale, un rivale insopportabile). Nell'erba alta incontri qualche Pokémon normale e poi **???????**, un
Pokémon dai dati corrotti: lo catturi con le Safari Ball (lancio a tempo) e nel Pokédex scopri a chi devi fare il
regalo. L'esito sembra casuale ma è deciso in anticipo.

Extra: sul lago ghiacciato si scivola (puzzle del ghiaccio), in giro ci sono 5 regali nascosti e, trovati tutti,
Babbo Natale regala una Master Ball che cattura al primo colpo. Il rivale ti sfida a palle di neve (lancia e schiva a tempo).
Cinque medaglie da collezionare e una carta allenatore (START nel mondo) con statistiche e Pokémon visti. Tieni premuto B per correre.

- Solo HTML/CSS/JS, nessuna dipendenza, nessun backend: gira su **GitHub Pages**.
- Pensato per il telefono (d-pad e tasti A/B su schermo), funziona anche da PC (frecce/WASD, Invio).
- Gli accoppiamenti sono **cifrati** (AES-GCM, chiave da nome + PIN): nel codice pubblico non si legge nulla.
- Il risultato viene salvato nel browser: riaprendo il sito si va dritti al Pokédex.

## Configurare gli accoppiamenti

1. Copia `tools/pairings.example.json` in `tools/pairings.json` (è ignorato da git, **non committarlo**).
2. Metti gli avatar (PNG con sfondo trasparente) in `assets/sprites/`. Compila `people` (nome → `sprite`, oppure `pokemon`
   per uno sprite PokéAPI; `form`, tipo scherzoso, testo flavour), `pairings` (chi regala a chi) e,
   se vuoi, `pins` (6 cifre; altrimenti vengono generati).
3. Genera i segreti:

```bash
node tools/build-secrets.mjs
```

Lo script valida gli accoppiamenti (niente auto-regali, ognuno riceve un solo regalo), scrive `js/secrets.js`
e stampa i PIN da mandare in privato a ciascuno.

4. In `js/config.js` aggiorna `names` (deve coincidere con i nomi in `people`), data e budget.
5. Committa `js/secrets.js` e `js/config.js` e pubblica.

> Il file `js/secrets.js` attualmente nel repo è generato dall'esempio (PIN `111111`…`666666`): va rigenerato con i dati veri.

## Musica

Di default suona una colonna sonora chiptune generata nel browser (`js/music.js`: Jingle Bells al titolo, brani
originali per mondo, battaglia, vittoria e Pokédex). Per usare file propri metti gli mp3/ogg in `assets/music/` e
indicali in `js/config.js`:

```js
music: { title: "assets/music/title.mp3", world: "assets/music/world.mp3", battle: "assets/music/battle.mp3",
         victory: "assets/music/victory.mp3", dex: "assets/music/dex.mp3" }
```

Le scene non indicate continuano a usare il chiptune.

## Pubblicare su GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → branch principale, cartella `/ (root)`.

## Provare in locale

Serve un server (la cifratura usa WebCrypto, che richiede https o localhost):

```bash
npx http-server -p 8080
```

Per rigiocare dopo aver completato: tasto **NUOVA PARTITA** in fondo al Pokédex, oppure apri `index.html?reset`.

## Struttura

```
index.html        schermate (titolo, login, PIN, mondo, battaglia, Pokédex, scheda)
style.css         stile Game Boy, controlli touch
js/config.js      configurazione pubblica (nomi, data, budget)
js/secrets.js     accoppiamenti cifrati (generato)
js/vault.js       decifratura nel browser (il nome evita i filtri anti-miner dei blocker)
js/audio.js       effetti sonori 8-bit con WebAudio
js/music.js       sequencer chiptune e colonna sonora
js/sprites.js     sprite e ritratti in pixel art (non chiamarlo pixel.js: gli ad blocker lo bloccano)
js/world.js       overworld: mappa 20x18 con camera, edifici, NPC, cartelli
js/game.js        macchina a stati: titolo, intro, login, mondo, battaglia, Pokédex
assets/sprites/   avatar dei partecipanti (PNG trasparenti)
tools/            generatore dei segreti
tools/cutout.py   rimuove lo sfondo bianco da un avatar e lo rende sprite quadrato
```
