/**
 * End-to-end encrypted sync.
 *
 * Wraps any transport so the engine keeps speaking plain `Delta`s while the
 * wire only ever carries sealed blobs. The server stores ciphertext it cannot
 * read, in arrival order, and hands it back on request. It never learns a topic
 * title, never learns what anyone is studying, and cannot be compelled to
 * produce something it doesn't have.
 *
 * This is what makes the account feature honest. "One account across your
 * devices" normally means "we hold your data"; here it means "your devices
 * hold a key that we never see".
 *
 * ```ts
 * const adapter = new EncryptedSyncAdapter(transport, await account.accountKey(), {
 *   deviceId: await storage.getDeviceId(),
 * });
 * const engine = new SyncEngine({ storage, outbox, adapter });
 * ```
 */

import { open, seal, type Sealed } from "../account/crypto.js";
import type { Tombstone } from "../types.js";
import type { RelayLog } from "./loopback.js";
import type {
  Cursor,
  Delta,
  PushAck,
  PushDelta,
  RecordSet,
  SyncAdapter,
} from "./types.js";

/** One sealed push. `deviceId` stays in the clear — see the note below. */
export interface SealedEntry {
  /**
   * Which device produced this. Visible to the server on purpose: it's what
   * lets a device skip its own entries on pull, and the server needs *some*
   * routing key. It is an opaque random id that reveals nothing about the
   * user or the content — but it does let a server count a user's devices,
   * which is the honest limit of this design.
   */
  deviceId: string;
  sealed: Sealed;
}

export interface SealedPage {
  cursor: Cursor;
  items: SealedEntry[];
  hasMore?: boolean;
}

/**
 * The transport an encrypted adapter talks to. This is the interface a real
 * server implements — note that it is defined entirely in terms of opaque
 * blobs, with no mention of topics, roadmaps or any other domain concept.
 */
export interface SealedTransport {
  readonly connected: boolean;
  push(entry: SealedEntry): Promise<PushAck>;
  pull(since: Cursor | null): Promise<SealedPage | null>;
  subscribe?(fn: () => void): () => void;
}

export interface EncryptedSyncOptions {
  /** This device's id, so its own entries are skipped on pull. */
  deviceId?: string;
  /**
   * What to do with an entry that won't decrypt. Default `"skip"` — a single
   * bad blob (a half-rotated key, a corrupted row) must not wedge sync forever.
   * `"throw"` surfaces it, which is what you want in tests.
   */
  onUndecryptable?: "skip" | "throw";
}

export class EncryptedSyncAdapter implements SyncAdapter {
  private readonly deviceId: string | undefined;
  private readonly onUndecryptable: "skip" | "throw";
  /** Entries we failed to open, reported once for diagnostics. */
  private skipped = 0;

  constructor(
    private readonly transport: SealedTransport,
    private readonly key: CryptoKey,
    opts: EncryptedSyncOptions = {},
  ) {
    this.deviceId = opts.deviceId;
    this.onUndecryptable = opts.onUndecryptable ?? "skip";
  }

  get connected(): boolean {
    return this.transport.connected;
  }

  /** How many entries were unreadable — surfaced in diagnostics, not the UI. */
  get skippedCount(): number {
    return this.skipped;
  }

  async push(delta: PushDelta): Promise<PushAck> {
    // The whole delta is sealed, including tombstones and the profile: a
    // deletion is as revealing as a write.
    return this.transport.push({
      deviceId: delta.deviceId,
      sealed: await seal(this.key, delta),
    });
  }

  async pull(since: Cursor | null): Promise<Delta | null> {
    const page = await this.transport.pull(since);
    if (!page) return null;

    const records: RecordSet = {};
    const deletions: Tombstone[] = [];
    let profile: Delta["profile"] = undefined;

    for (const entry of page.items) {
      if (this.deviceId && entry.deviceId === this.deviceId) continue;
      let decoded: PushDelta;
      try {
        decoded = await open<PushDelta>(this.key, entry.sealed);
      } catch (err) {
        if (this.onUndecryptable === "throw") throw err;
        this.skipped += 1;
        continue;
      }
      for (const [collection, values] of Object.entries(decoded.records)) {
        if (!values?.length) continue;
        const bucket = (records as Record<string, unknown[]>)[collection] ?? [];
        bucket.push(...values);
        (records as Record<string, unknown[]>)[collection] = bucket;
      }
      deletions.push(...(decoded.deletions ?? []));
      if (decoded.profile !== undefined) profile = decoded.profile;
    }

    // The cursor advances over skipped and own entries alike, so neither is
    // rescanned on every sync.
    const delta: Delta = { cursor: page.cursor, records, deletions, hasMore: page.hasMore };
    if (profile !== undefined) delta.profile = profile;
    return delta;
  }

  subscribe(fn: () => void): () => void {
    return this.transport.subscribe?.(fn) ?? (() => {});
  }
}

/**
 * A `SealedTransport` over the same append-only log the loopback uses — so the
 * encrypted path can be exercised end to end today, and two tabs can sync with
 * real encryption before any server exists.
 */
export class LoopbackSealedTransport implements SealedTransport {
  readonly connected = true;

  constructor(
    private readonly log: RelayLog<SealedEntry>,
    private readonly pageSize = 200,
  ) {}

  async push(entry: SealedEntry): Promise<PushAck> {
    return { cursor: String(this.log.append(entry)) };
  }

  async pull(since: Cursor | null): Promise<SealedPage | null> {
    const page = this.log.read(since ? Number(since) : 0, this.pageSize);
    if (page.length === 0) return null;
    return {
      cursor: String(page[page.length - 1]!.seq),
      items: page.map((e) => e.item),
      hasMore: page.length === this.pageSize,
    };
  }

  subscribe(fn: () => void): () => void {
    return this.log.subscribe?.(fn) ?? (() => {});
  }
}
