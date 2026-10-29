#!/usr/bin/env node
// Genera js/secrets.js (accoppiamenti cifrati) a partire da tools/pairings.json.
// Uso:  node tools/build-secrets.mjs [tools/pairings.json]
// Stampa a video i PIN da inviare in privato a ciascuno. Non committare pairings.json!

import { readFileSync, writeFileSync } from "node:fs";
import { webcrypto as crypto, randomInt } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const input = resolve(process.argv[2] || resolve(here, "pairings.json"));
const output = resolve(here, "..", "js", "secrets.js");
const ITER = 150000; // deve coincidere con js/crypto.js

const slug = (n) => n.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const enc = new TextEncoder();
const b64 = (buf) => Buffer.from(buf).toString("base64");

const data = JSON.parse(readFileSync(input, "utf8"));
const people = data.people || {};
const pairings = data.pairings || {};
const pins = data.pins || {};
const names = Object.keys(people);

// ---- validazione: ognuno fa un regalo e ne riceve uno, mai a sé stesso ----
const errors = [];
for (const giver of names) {
  const receiver = pairings[giver];
  if (!receiver) errors.push(`${giver} non ha un destinatario`);
  else if (!people[receiver]) errors.push(`${giver} → ${receiver}: "${receiver}" non è in "people"`);
  else if (receiver === giver) errors.push(`${giver} si regala a sé stesso`);
}
const received = {};
for (const r of Object.values(pairings)) received[r] = (received[r] || 0) + 1;
for (const n of names) if ((received[n] || 0) !== 1) errors.push(`${n} riceve ${received[n] || 0} regali (deve essere 1)`);
for (const g of Object.keys(pairings)) if (!people[g]) errors.push(`"${g}" in pairings non è in "people"`);
if (errors.length) { console.error("ERRORI:\n - " + errors.join("\n - ")); process.exit(1); }

async function encrypt(name, pin, payload) {
  const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("ssp2026:" + slug(name)), iterations: ITER, hash: "SHA-256" },
    base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, enc.encode(JSON.stringify(payload)));
  return { iv: b64(iv), ct: b64(ct) };
}

const out = {};
const table = [];
for (const giver of names) {
  const receiver = pairings[giver];
  const r = people[receiver];
  const pin = String(pins[giver] || String(randomInt(0, 1000000)).padStart(6, "0"));
  if (!/^\d{6}$/.test(pin)) { console.error(`PIN di ${giver} deve essere di 6 cifre`); process.exit(1); }
  const payload = {
    target: receiver,
    pokemon: { id: r.pokemon, name: r.pokemonName || `#${r.pokemon}` },
    type: r.type || "",
    flavor: r.flavor || ""
  };
  out[slug(giver)] = await encrypt(giver, pin, payload);
  table.push({ Allenatore: giver, PIN: pin });
}

writeFileSync(output,
  "// GENERATO da tools/build-secrets.mjs — accoppiamenti cifrati (AES-GCM, chiave da nome+PIN).\n" +
  "window.SECRETS = " + JSON.stringify(out, null, 2) + ";\n");

console.log(`Scritto ${output}\n\nPIN da inviare IN PRIVATO (non committare!):`);
console.table(table);
console.log("\nRicorda: in js/config.js la lista 'names' deve contenere esattamente:", names.join(", "));
