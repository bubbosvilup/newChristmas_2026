# Babbo Natale Segreto · Versione Glitch

Mini-gioco in stile Pokémon (Game Boy) per sorteggiare i regali di Natale tra 6 persone.
Cammini nell'erba alta della Zona Safari, incontri un **???????** glitchato, lo catturi con le Safari Ball
e nel Pokédex scopri a chi devi fare il regalo. L'esito sembra casuale ma è deciso in anticipo.

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

## Pubblicare su GitHub Pages

Settings → Pages → Source: *Deploy from a branch* → branch principale, cartella `/ (root)`.

## Provare in locale

Serve un server (la cifratura usa WebCrypto, che richiede https o localhost):

```bash
npx http-server -p 8080
```

Per rigiocare dopo aver completato: apri `index.html?reset`.

## Struttura

```
index.html        schermate (titolo, login, PIN, mondo, battaglia, Pokédex, scheda)
style.css         stile Game Boy, controlli touch
js/config.js      configurazione pubblica (nomi, data, budget)
js/secrets.js     accoppiamenti cifrati (generato)
js/crypto.js      decifratura nel browser
js/audio.js       suoni 8-bit con WebAudio
js/game.js        macchina a stati e logica di gioco
assets/sprites/   avatar dei partecipanti (PNG trasparenti)
tools/            generatore dei segreti
tools/cutout.py   rimuove lo sfondo bianco da un avatar e lo rende sprite quadrato
```
