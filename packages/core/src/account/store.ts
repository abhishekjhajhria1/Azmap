/**
 * Where the account key lives on a device.
 *
 * Deliberately **not** part of `StorageAdapter`. That interface backs
 * `exportSnapshot`, which powers export, backup and sync — so anything stored
 * there is something the user can hand to someone else. The key must never
 * ride along in a file the user emails to themselves, so it lives in its own
 * store with no export path.
 */

export interface StoredAccount {
  accountId: string;
  /** The account key, base64url — see `account/crypto.ts`. */
  key: string;
  /** When this device joined the account (created it, or was paired). */
  joinedAt: number;
  /** Relay base URL, once this device has enrolled with one. */
  endpoint?: string;
  /**
   * This device's bearer token for that relay. Grants the right to append to
   * and read a log of ciphertext — never the ability to read it.
   */
  token?: string;
}

export interface AccountStore {
  load(): Promise<StoredAccount | null>;
  save(account: StoredAccount): Promise<void>;
  /** Sign this device out. The data stays; it just can no longer be synced. */
  clear(): Promise<void>;
}

export class MemoryAccountStore implements AccountStore {
  private account: StoredAccount | null = null;
  async load() {
    return this.account;
  }
  async save(account: StoredAccount) {
    this.account = { ...account };
  }
  async clear() {
    this.account = null;
  }
}

interface WebStorage {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
  removeItem(k: string): void;
}

export class LocalStorageAccountStore implements AccountStore {
  constructor(
    private readonly key = "abh:account",
    private readonly storage: WebStorage = (globalThis as unknown as { localStorage: WebStorage })
      .localStorage,
  ) {}

  async load(): Promise<StoredAccount | null> {
    try {
      const raw = this.storage.getItem(this.key);
      return raw ? (JSON.parse(raw) as StoredAccount) : null;
    } catch {
      return null;
    }
  }

  async save(account: StoredAccount): Promise<void> {
    this.storage.setItem(this.key, JSON.stringify(account));
  }

  async clear(): Promise<void> {
    this.storage.removeItem(this.key);
  }
}
