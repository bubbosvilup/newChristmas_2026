// Cifratura lato browser: la chiave si ricava da nome + PIN (PBKDF2),
// il payload è cifrato con AES-GCM. Senza il PIN giusto non si decifra nulla.
window.Vault = (() => {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const ITER = 150000;

  const slug = (name) => name.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

  const b64ToBuf = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

  async function deriveKey(name, pin) {
    const base = await crypto.subtle.importKey("raw", enc.encode(pin), "PBKDF2", false, ["deriveKey"]);
    return crypto.subtle.deriveKey(
      { name: "PBKDF2", salt: enc.encode("ssp2026:" + slug(name)), iterations: ITER, hash: "SHA-256" },
      base,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
  }

  // Ritorna il payload { target, pokemon, type, flavor } oppure null se il PIN è sbagliato.
  async function unlock(name, pin) {
    const entry = window.SECRETS && window.SECRETS[slug(name)];
    if (!entry) return null;
    try {
      const key = await deriveKey(name, pin);
      const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64ToBuf(entry.iv) }, key, b64ToBuf(entry.ct));
      return JSON.parse(dec.decode(plain));
    } catch {
      return null;
    }
  }

  return { unlock, slug };
})();
