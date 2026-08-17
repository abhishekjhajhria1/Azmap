/**
 * Account encryption.
 *
 * The product promise is "your learning never leaves your device". Sync bends
 * that — data does leave — so the only honest version is: **what leaves is
 * unreadable to anyone but you**. Everything pushed to a remote is sealed with
 * an account key that exists only on the user's own devices and is never sent
 * to a server, not even during pairing.
 *
 * That has a consequence worth stating plainly: lose every paired device and
 * the data is gone. There is no reset link, because a reset link would mean we
 * held the key. The pairing flow exists so people always have a second device.
 *
 * AES-GCM, 256-bit, fresh 96-bit IV per message. WebCrypto only — no
 * dependency, and the same code runs in the browser, the extension, Node and
 * (through the bridge) Flutter.
 */

const ALGORITHM = "AES-GCM";
const KEY_BITS = 256;
const IV_BYTES = 12;

/** A sealed payload. Opaque to the server, which only ever relays it. */
export interface Sealed {
  /** Envelope version, so the format can change without breaking old data. */
  v: 1;
  /** Initialisation vector, base64url. Unique per message; never reused. */
  iv: string;
  /** Ciphertext (with the GCM tag appended), base64url. */
  ct: string;
}

function subtle(): SubtleCrypto {
  const c = (globalThis as { crypto?: Crypto }).crypto;
  if (!c?.subtle) {
    throw new Error(
      "WebCrypto is unavailable. Encrypted sync needs a secure context (HTTPS or localhost).",
    );
  }
  return c.subtle;
}

export function toBase64Url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// The explicit `<ArrayBuffer>` matters: a bare `Uint8Array` is backed by
// `ArrayBufferLike`, which WebCrypto's `BufferSource` rejects because it could
// be a `SharedArrayBuffer`.
export function fromBase64Url(text: string): Uint8Array<ArrayBuffer> {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

/** Mint a new account key. Called once, on the first device. */
export async function generateAccountKey(): Promise<CryptoKey> {
  return subtle().generateKey({ name: ALGORITHM, length: KEY_BITS }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Serialise a key for the pairing payload or for on-device storage. */
export async function exportAccountKey(key: CryptoKey): Promise<string> {
  return toBase64Url(new Uint8Array(await subtle().exportKey("raw", key)));
}

export async function importAccountKey(raw: string): Promise<CryptoKey> {
  const bytes = fromBase64Url(raw);
  if (bytes.length !== KEY_BITS / 8) {
    throw new Error("Invalid account key: wrong length");
  }
  return subtle().importKey("raw", bytes, { name: ALGORITHM }, true, [
    "encrypt",
    "decrypt",
  ]);
}

/** Encrypt any JSON-serialisable value. */
export async function seal(key: CryptoKey, value: unknown): Promise<Sealed> {
  const iv = new Uint8Array(IV_BYTES);
  (globalThis.crypto as Crypto).getRandomValues(iv);
  const plaintext = new TextEncoder().encode(JSON.stringify(value));
  const ct = await subtle().encrypt({ name: ALGORITHM, iv }, key, plaintext);
  return { v: 1, iv: toBase64Url(iv), ct: toBase64Url(new Uint8Array(ct)) };
}

/**
 * Decrypt. Throws if the key is wrong or the ciphertext was altered — GCM
 * authenticates, so a tampered payload fails loudly instead of decoding to
 * garbage a merge might then persist.
 */
export async function open<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
  if (sealed?.v !== 1) throw new Error(`Unsupported envelope version: ${sealed?.v}`);
  const iv = fromBase64Url(sealed.iv);
  const ct = fromBase64Url(sealed.ct);
  const plaintext = await subtle().decrypt({ name: ALGORITHM, iv }, key, ct);
  return JSON.parse(new TextDecoder().decode(plaintext)) as T;
}
