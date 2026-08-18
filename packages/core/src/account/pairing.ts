/**
 * Pairing a second device.
 *
 * The flow the user sees: on a device that's already signed in, tap "Add a
 * device". It shows a QR code and a short code. Scan it (or type the code) on
 * the new device, and everything is there. No password, no email, no reset
 * link.
 *
 * What is actually happening matters more than it looks. Pairing is **key
 * transfer**, not authentication. The payload carries the account key, so it
 * must travel device-to-device — optically via the QR, or by the user typing
 * it — and never through a server. Two design choices enforce that:
 *
 * - When the offer is encoded as a URL, the payload lives in the **fragment**
 *   (`#…`). Browsers never send a fragment to the server, so even scanning a
 *   pairing link with an ordinary camera app can't leak the key.
 * - `serverView()` returns the only fields a server is ever allowed to see —
 *   the account id, the short code, and the expiry. Anything that talks to a
 *   backend takes that, never the offer itself.
 *
 * Offers expire in five minutes. A pairing code is a bearer credential: anyone
 * who photographs the screen in that window gets the account, which is exactly
 * the trade the user is making when they choose to show it.
 */

/** Format marker, so a future format can be told apart from this one. */
export const PAIRING_SCHEME = "abh1";

/** Short enough to type, long enough that guessing it inside the window is hopeless. */
export const PAIRING_CODE_LENGTH = 8;

export const PAIRING_TTL_MS = 5 * 60_000;

/**
 * No 0/O/1/I/L/U — the pairs people misread when copying a code off a screen,
 * and the letter that turns codes into words nobody wants to read aloud.
 */
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTVWXYZ";

export interface PairingOffer {
  accountId: string;
  /** Human-typeable, shown under the QR. The server matches devices on this. */
  code: string;
  /** The account key, base64url. Device-to-device only — never send this up. */
  key: string;
  expiresAt: number;
}

/** Exactly the fields that may leave the device. Nothing here reveals the key. */
export interface PairingRequest {
  accountId: string;
  code: string;
  expiresAt: number;
}

function randomCode(length = PAIRING_CODE_LENGTH): string {
  const bytes = new Uint8Array(length);
  (globalThis.crypto as Crypto).getRandomValues(bytes);
  // Modulo bias is negligible here (256 % 30), and the code's security comes
  // from the five-minute window and server-side rate limiting, not its entropy.
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function createPairingOffer(input: {
  accountId: string;
  /** The account key, already exported via `exportAccountKey`. */
  key: string;
  now?: number;
  ttlMs?: number;
}): PairingOffer {
  const now = input.now ?? Date.now();
  return {
    accountId: input.accountId,
    code: randomCode(),
    key: input.key,
    expiresAt: now + (input.ttlMs ?? PAIRING_TTL_MS),
  };
}

/**
 * Encode for a QR code. With `baseUrl`, the payload goes in the fragment so a
 * scan by a generic camera app opens the site without ever transmitting the
 * key; without one, it's a compact bare string for an in-app scanner.
 */
export function encodePairingOffer(offer: PairingOffer, baseUrl?: string): string {
  const payload = [PAIRING_SCHEME, offer.accountId, offer.code, offer.key, offer.expiresAt].join(
    ":",
  );
  return baseUrl ? `${baseUrl}#${payload}` : payload;
}

/** Parse a scanned or pasted offer. Throws on anything malformed. */
export function decodePairingOffer(text: string): PairingOffer {
  const raw = (text.includes("#") ? text.slice(text.indexOf("#") + 1) : text).trim();
  const parts = raw.split(":");
  if (parts.length !== 5) throw new Error("That doesn't look like a pairing code.");
  const [scheme, accountId, code, key, expiresAt] = parts as [
    string, string, string, string, string,
  ];
  if (scheme !== PAIRING_SCHEME) {
    throw new Error(`Unsupported pairing format: ${scheme}`);
  }
  const expiry = Number(expiresAt);
  if (!accountId || !code || !key || !Number.isFinite(expiry)) {
    throw new Error("That pairing code is incomplete.");
  }
  return { accountId, code, key, expiresAt: expiry };
}

/** Strip the key. Everything that talks to a server takes this, not the offer. */
export function serverView(offer: PairingOffer): PairingRequest {
  return { accountId: offer.accountId, code: offer.code, expiresAt: offer.expiresAt };
}

export function isExpired(offer: Pick<PairingOffer, "expiresAt">, now = Date.now()): boolean {
  return now >= offer.expiresAt;
}

/** For the countdown under the QR. Never negative. */
export function secondsRemaining(
  offer: Pick<PairingOffer, "expiresAt">,
  now = Date.now(),
): number {
  return Math.max(0, Math.ceil((offer.expiresAt - now) / 1000));
}

/** Display form: `ABCD-EFGH` reads back over a phone call far better. */
export function formatCode(code: string): string {
  return code.length > 4 ? `${code.slice(0, 4)}-${code.slice(4)}` : code;
}

/** Accept what the user typed however they typed it. */
export function normaliseCode(input: string): string {
  return input.toUpperCase().replace(/[^0-9A-Z]/g, "");
}
