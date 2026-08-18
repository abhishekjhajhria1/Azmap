/**
 * Storage for the relay.
 *
 * Four tables and no cleverness. The server's entire job is to hold an
 * append-only log of blobs it cannot read and hand back everything after a
 * cursor — so the schema has no idea what a topic, a roadmap or a prerequisite
 * is, and never will. Every question about *meaning* is answered on-device.
 *
 * `node:sqlite` ships with Node, so this has no native dependency and no
 * install step. Swapping in Postgres later is a matter of replacing this file:
 * nothing above it touches SQL.
 */

import { createRequire } from "node:module";

/**
 * `node:sqlite` is still experimental, so Node leaves it out of
 * `module.builtinModules`. Bundlers therefore don't recognise it as a builtin,
 * strip the `node:` prefix and go hunting for a package called "sqlite".
 * Requiring it at runtime keeps it invisible to static analysis while the
 * `typeof import` keeps full types.
 */
const nodeRequire = createRequire(import.meta.url);
const { DatabaseSync } = nodeRequire("node:sqlite") as typeof import("node:sqlite");
type DatabaseSync = InstanceType<typeof DatabaseSync>;

export interface DeviceRow {
  id: string;
  account_id: string;
  /** SHA-256 of the bearer token. The token itself is never stored. */
  token_hash: string;
  name: string;
  created_at: number;
  last_seen: number;
  cursor: number;
}

export interface EntryRow {
  seq: number;
  device_id: string;
  sealed: string;
}

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS accounts (
  id          TEXT PRIMARY KEY,
  created_at  INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS devices (
  id          TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  -- Only the hash. A database dump must not yield working credentials.
  token_hash  TEXT NOT NULL UNIQUE,
  name        TEXT NOT NULL DEFAULT '',
  created_at  INTEGER NOT NULL,
  last_seen   INTEGER NOT NULL,
  -- How far this device has read. Used to prune entries every device has seen.
  cursor      INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS devices_by_account ON devices(account_id);

-- The log. 'sealed' is ciphertext; the server never has the key.
CREATE TABLE IF NOT EXISTS entries (
  seq         INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  device_id   TEXT NOT NULL,
  sealed      TEXT NOT NULL,
  created_at  INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS entries_by_account_seq ON entries(account_id, seq);

-- Pairing codes. Short-lived, single-use, and rate-limited on claim.
CREATE TABLE IF NOT EXISTS pairings (
  code        TEXT PRIMARY KEY,
  account_id  TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  expires_at  INTEGER NOT NULL,
  claimed_at  INTEGER,
  attempts    INTEGER NOT NULL DEFAULT 0
);
`;

export class Db {
  readonly raw: DatabaseSync;

  constructor(path = ":memory:") {
    this.raw = new DatabaseSync(path);
    this.raw.exec(SCHEMA);
  }

  close(): void {
    this.raw.close();
  }

  // ---- Accounts & devices -------------------------------------------------

  createAccount(accountId: string, now: number): void {
    this.raw.prepare("INSERT INTO accounts (id, created_at) VALUES (?, ?)").run(accountId, now);
  }

  accountExists(accountId: string): boolean {
    return this.raw.prepare("SELECT 1 FROM accounts WHERE id = ?").get(accountId) !== undefined;
  }

  addDevice(input: {
    id: string;
    accountId: string;
    tokenHash: string;
    name: string;
    now: number;
  }): void {
    this.raw
      .prepare(
        `INSERT INTO devices (id, account_id, token_hash, name, created_at, last_seen)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .run(input.id, input.accountId, input.tokenHash, input.name, input.now, input.now);
  }

  deviceByToken(tokenHash: string): DeviceRow | undefined {
    return this.raw.prepare("SELECT * FROM devices WHERE token_hash = ?").get(tokenHash) as
      | DeviceRow
      | undefined;
  }

  touchDevice(deviceId: string, now: number): void {
    this.raw.prepare("UPDATE devices SET last_seen = ? WHERE id = ?").run(now, deviceId);
  }

  devicesForAccount(accountId: string): DeviceRow[] {
    return this.raw
      .prepare("SELECT * FROM devices WHERE account_id = ? ORDER BY created_at")
      .all(accountId) as unknown as DeviceRow[];
  }

  // ---- The log ------------------------------------------------------------

  append(accountId: string, deviceId: string, sealed: string, now: number): number {
    const info = this.raw
      .prepare(
        "INSERT INTO entries (account_id, device_id, sealed, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(accountId, deviceId, sealed, now);
    return Number(info.lastInsertRowid);
  }

  read(accountId: string, since: number, limit: number): EntryRow[] {
    return this.raw
      .prepare(
        "SELECT seq, device_id, sealed FROM entries WHERE account_id = ? AND seq > ? ORDER BY seq LIMIT ?",
      )
      .all(accountId, since, limit) as unknown as EntryRow[];
  }

  /** Remember how far a device has read, so pruning knows what's safe to drop. */
  setCursor(deviceId: string, cursor: number): void {
    this.raw
      .prepare("UPDATE devices SET cursor = MAX(cursor, ?) WHERE id = ?")
      .run(cursor, deviceId);
  }

  /**
   * Drop entries every device on the account has already read.
   *
   * Deliberately conservative: the low-water mark is the *minimum* cursor
   * across devices, so a phone that's been in a drawer for a month still gets
   * its history when it wakes up. Entries also survive a minimum age, so a
   * device that has read but not yet applied isn't cut off by a crash.
   */
  prune(accountId: string, olderThan: number): number {
    const devices = this.devicesForAccount(accountId);
    if (devices.length === 0) return 0;
    const lowWater = Math.min(...devices.map((d) => d.cursor));
    const info = this.raw
      .prepare("DELETE FROM entries WHERE account_id = ? AND seq <= ? AND created_at < ?")
      .run(accountId, lowWater, olderThan);
    return Number(info.changes);
  }

  // ---- Pairing ------------------------------------------------------------

  createPairing(code: string, accountId: string, expiresAt: number): void {
    this.raw
      .prepare(
        `INSERT INTO pairings (code, account_id, expires_at) VALUES (?, ?, ?)
         ON CONFLICT(code) DO UPDATE SET account_id = excluded.account_id,
                                         expires_at = excluded.expires_at,
                                         claimed_at = NULL,
                                         attempts = 0`,
      )
      .run(code, accountId, expiresAt);
  }

  getPairing(code: string):
    | { code: string; account_id: string; expires_at: number; claimed_at: number | null; attempts: number }
    | undefined {
    return this.raw.prepare("SELECT * FROM pairings WHERE code = ?").get(code) as never;
  }

  countPairingAttempt(code: string): void {
    this.raw.prepare("UPDATE pairings SET attempts = attempts + 1 WHERE code = ?").run(code);
  }

  markPairingClaimed(code: string, now: number): void {
    this.raw.prepare("UPDATE pairings SET claimed_at = ? WHERE code = ?").run(now, code);
  }

  /** Housekeeping: expired, unclaimed codes are dead weight. */
  sweepPairings(now: number): void {
    this.raw.prepare("DELETE FROM pairings WHERE expires_at < ?").run(now);
  }
}
