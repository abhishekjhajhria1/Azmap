/**
 * Account — one identity across the devices a person owns.
 *
 * There is no login in the usual sense. The first device *creates* the account
 * (an id and a key, both generated locally); every other device *joins* it by
 * scanning a pairing code. Nothing is ever typed into a password field,
 * nothing is emailed, and the server never learns the key.
 *
 * ```ts
 * // First device
 * const account = new AccountManager(new LocalStorageAccountStore());
 * await account.create();
 * const offer = await account.offerPairing();       // render offer as a QR
 *
 * // Second device
 * await account.join(decodePairingOffer(scanned));  // done — same account
 * ```
 */

export {
  exportAccountKey,
  fromBase64Url,
  generateAccountKey,
  importAccountKey,
  open,
  seal,
  toBase64Url,
  type Sealed,
} from "./crypto.js";
export {
  PAIRING_CODE_LENGTH,
  PAIRING_SCHEME,
  PAIRING_TTL_MS,
  createPairingOffer,
  decodePairingOffer,
  encodePairingOffer,
  formatCode,
  isExpired,
  normaliseCode,
  secondsRemaining,
  serverView,
  type PairingOffer,
  type PairingRequest,
} from "./pairing.js";
export {
  LocalStorageAccountStore,
  MemoryAccountStore,
  type AccountStore,
  type StoredAccount,
} from "./store.js";

import { exportAccountKey, generateAccountKey, importAccountKey } from "./crypto.js";
import {
  createPairingOffer,
  isExpired,
  type PairingOffer,
} from "./pairing.js";
import { MemoryAccountStore, type AccountStore, type StoredAccount } from "./store.js";

export class NotSignedInError extends Error {
  constructor() {
    super("This device isn't part of an account yet.");
    this.name = "NotSignedInError";
  }
}

export class AccountManager {
  private cached: StoredAccount | null = null;
  private key: CryptoKey | null = null;

  constructor(private readonly store: AccountStore = new MemoryAccountStore()) {}

  /** The account this device belongs to, or null if it's standalone. */
  async current(): Promise<StoredAccount | null> {
    if (!this.cached) this.cached = await this.store.load();
    return this.cached;
  }

  async isSignedIn(): Promise<boolean> {
    return (await this.current()) !== null;
  }

  /**
   * Create an account on this device. Local-only work: an id and a key, both
   * generated here. Sync stays off until a remote is configured — creating an
   * account doesn't send anything anywhere.
   */
  async create(now = Date.now()): Promise<StoredAccount> {
    const existing = await this.current();
    if (existing) return existing;
    const key = await generateAccountKey();
    const account: StoredAccount = {
      accountId: `acc_${(globalThis.crypto as Crypto).randomUUID()}`,
      key: await exportAccountKey(key),
      joinedAt: now,
    };
    await this.store.save(account);
    this.cached = account;
    this.key = key;
    return account;
  }

  /** The live key, for sealing sync payloads. */
  async accountKey(): Promise<CryptoKey> {
    if (this.key) return this.key;
    const account = await this.current();
    if (!account) throw new NotSignedInError();
    this.key = await importAccountKey(account.key);
    return this.key;
  }

  /**
   * Show this account to a new device. The returned offer contains the key —
   * render it as a QR or let the user type the code, but never transmit the
   * offer itself. Use `serverView()` for anything that talks to a backend.
   */
  async offerPairing(opts: { now?: number; ttlMs?: number } = {}): Promise<PairingOffer> {
    const account = await this.current();
    if (!account) throw new NotSignedInError();
    return createPairingOffer({
      accountId: account.accountId,
      key: account.key,
      now: opts.now,
      ttlMs: opts.ttlMs,
    });
  }

  /**
   * Join the account an offer describes. Rejects an expired offer and a key
   * that isn't a valid account key, so a mistyped code fails here rather than
   * silently producing a device that can never read its own data.
   */
  async join(offer: PairingOffer, now = Date.now()): Promise<StoredAccount> {
    if (isExpired(offer, now)) {
      throw new Error("That pairing code has expired. Generate a new one.");
    }
    const key = await importAccountKey(offer.key); // throws if malformed
    const account: StoredAccount = {
      accountId: offer.accountId,
      key: offer.key,
      joinedAt: now,
    };
    await this.store.save(account);
    this.cached = account;
    this.key = key;
    return account;
  }

  /**
   * Sign this device out. The map stays on the device and stays usable — this
   * only removes the ability to sync. Nothing is deleted, because "sign out"
   * should never be a data-loss button.
   */
  async signOut(): Promise<void> {
    await this.store.clear();
    this.cached = null;
    this.key = null;
  }
}
