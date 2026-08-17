/**
 * The outbox: what this device has written and the remote hasn't acknowledged.
 *
 * It stores *references* (`collection:id`), never copies. At drain time the
 * current version of each record is read from storage, so a burst of edits to
 * one topic costs one entry and ships once, and a retry always sends the latest
 * version rather than a stale queued copy.
 *
 * Entries survive restarts via `SyncStateStore`, which is what makes "edited on
 * the plane, landed, opened the laptop" work.
 */

import type { StorageAdapter } from "../storage/adapter.js";
import type {
  Capture,
  Collection,
  Edge,
  Guardian,
  MapSnapshot,
  Profile,
  Roadmap,
  Suggestion,
  Tombstone,
  Topic,
} from "../types.js";
import { tombstoneKey } from "./merge.js";
import type { PersistedSyncState, PushDelta, RecordSet, SyncStateStore } from "./types.js";
import { MemorySyncState } from "./types.js";

const COLLECTIONS: Collection[] = [
  "topics",
  "edges",
  "roadmaps",
  "suggestions",
  "guardians",
  "captures",
];

function key(collection: Collection, id: string): string {
  return `${collection}:${id}`;
}

function parseKey(k: string): { collection: Collection; id: string } {
  const at = k.indexOf(":");
  return { collection: k.slice(0, at) as Collection, id: k.slice(at + 1) };
}

export class Outbox {
  /** A Set, so repeated edits to one record collapse to a single entry. */
  private keys = new Set<string>();
  private profileDirty = false;
  private cursorValue: string | null = null;
  private loaded = false;
  private writing: Promise<void> = Promise.resolve();

  constructor(private readonly state: SyncStateStore = new MemorySyncState()) {}

  /** Restore a persisted outbox. Safe to call more than once. */
  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    const saved = await this.state.load();
    if (!saved) return;
    for (const k of saved.outbox) this.keys.add(k);
    this.profileDirty = saved.profileDirty;
    this.cursorValue = saved.cursor;
  }

  get size(): number {
    return this.keys.size + (this.profileDirty ? 1 : 0);
  }

  get cursor(): string | null {
    return this.cursorValue;
  }

  mark(collection: Collection, id: string): void {
    this.keys.add(key(collection, id));
    this.persist();
  }

  markProfile(): void {
    this.profileDirty = true;
    this.persist();
  }

  setCursor(cursor: string | null): void {
    this.cursorValue = cursor;
    this.persist();
  }

  /**
   * Turn queued references into a delta by reading the current state of each
   * one. A reference whose record is gone ships as its tombstone instead.
   */
  async drain(
    storage: StorageAdapter,
  ): Promise<{ delta: PushDelta; keys: string[] } | null> {
    if (this.size === 0) return null;

    const batch = [...this.keys];
    const wanted = new Map<Collection, Set<string>>();
    for (const k of batch) {
      const { collection, id } = parseKey(k);
      const set = wanted.get(collection) ?? new Set<string>();
      set.add(id);
      wanted.set(collection, set);
    }

    const records: RecordSet = {};
    const deletions: Tombstone[] = [];
    const tombs = new Map(
      (await storage.getDeletions()).map((t) => [tombstoneKey(t.collection, t.id), t]),
    );

    for (const [collection, ids] of wanted) {
      const live = (await readAll(storage, collection)).filter((r) => ids.has(r.id));
      if (live.length > 0) assign(records, collection, live);
      for (const id of ids) {
        if (live.some((r) => r.id === id)) continue;
        const t = tombs.get(tombstoneKey(collection, id));
        if (t) deletions.push(t);
      }
    }

    const delta: PushDelta = {
      deviceId: await storage.getDeviceId(),
      records,
      deletions,
    };
    if (this.profileDirty) delta.profile = await storage.getProfile();

    return { delta, keys: batch };
  }

  /**
   * Drop the entries the remote accepted — and only those. Writes that landed
   * while the push was in flight stay queued for the next round.
   */
  ack(keys: readonly string[], profileIncluded: boolean): void {
    for (const k of keys) this.keys.delete(k);
    if (profileIncluded) this.profileDirty = false;
    this.persist();
  }

  /** Persistence is fire-and-forget but serialised, so saves can't interleave. */
  private persist(): void {
    const snapshot: PersistedSyncState = {
      cursor: this.cursorValue,
      outbox: [...this.keys],
      profileDirty: this.profileDirty,
    };
    this.writing = this.writing.then(() => this.state.save(snapshot)).catch(() => {});
  }

  /** Await any in-flight persistence — used by tests and by clean shutdown. */
  async flush(): Promise<void> {
    await this.writing;
  }
}

type AnyRecord = Topic | Edge | Roadmap | Suggestion | Guardian | Capture;

async function readAll(storage: StorageAdapter, c: Collection): Promise<AnyRecord[]> {
  switch (c) {
    case "topics":
      return storage.getTopics();
    case "edges":
      return storage.getEdges();
    case "roadmaps":
      return storage.getRoadmaps();
    case "suggestions":
      return storage.getSuggestions();
    case "guardians":
      return storage.getGuardians();
    case "captures":
      return storage.getCaptures();
  }
}

function assign(target: RecordSet, c: Collection, values: AnyRecord[]): void {
  (target as Record<Collection, AnyRecord[]>)[c] = values;
}

/**
 * A `StorageAdapter` that records every write into an outbox, then delegates.
 *
 * Apps wrap their real adapter in this and hand the wrapper to `MapStore`, so
 * *every* write path is tracked — including ones added later — without a single
 * `outbox.mark()` call scattered through the domain logic.
 *
 * The engine deliberately holds the **unwrapped** adapter for applying inbound
 * deltas, so remote records are never queued straight back to the remote.
 */
export class TrackedStorage implements StorageAdapter {
  constructor(
    private readonly inner: StorageAdapter,
    private readonly outbox: Outbox,
  ) {}

  async getTopics() {
    return this.inner.getTopics();
  }
  async putTopic(t: Topic) {
    await this.inner.putTopic(t);
    this.outbox.mark("topics", t.id);
  }
  async deleteTopic(id: string) {
    await this.inner.deleteTopic(id);
    this.outbox.mark("topics", id);
  }

  async getEdges() {
    return this.inner.getEdges();
  }
  async putEdge(e: Edge) {
    await this.inner.putEdge(e);
    this.outbox.mark("edges", e.id);
  }
  async deleteEdge(id: string) {
    await this.inner.deleteEdge(id);
    this.outbox.mark("edges", id);
  }

  async getRoadmaps() {
    return this.inner.getRoadmaps();
  }
  async putRoadmap(r: Roadmap) {
    await this.inner.putRoadmap(r);
    this.outbox.mark("roadmaps", r.id);
  }
  async deleteRoadmap(id: string) {
    await this.inner.deleteRoadmap(id);
    this.outbox.mark("roadmaps", id);
  }

  async getSuggestions() {
    return this.inner.getSuggestions();
  }
  async putSuggestion(s: Suggestion) {
    await this.inner.putSuggestion(s);
    this.outbox.mark("suggestions", s.id);
  }
  async deleteSuggestion(id: string) {
    await this.inner.deleteSuggestion(id);
    this.outbox.mark("suggestions", id);
  }

  async getGuardians() {
    return this.inner.getGuardians();
  }
  async putGuardian(g: Guardian) {
    await this.inner.putGuardian(g);
    this.outbox.mark("guardians", g.id);
  }
  async deleteGuardian(id: string) {
    await this.inner.deleteGuardian(id);
    this.outbox.mark("guardians", id);
  }

  async getCaptures() {
    return this.inner.getCaptures();
  }
  async putCapture(c: Capture) {
    await this.inner.putCapture(c);
    this.outbox.mark("captures", c.id);
  }
  async deleteCapture(id: string) {
    await this.inner.deleteCapture(id);
    this.outbox.mark("captures", id);
  }

  async getProfile() {
    return this.inner.getProfile();
  }
  async putProfile(p: Profile) {
    await this.inner.putProfile(p);
    this.outbox.markProfile();
  }

  async getDeletions() {
    return this.inner.getDeletions();
  }
  async putDeletion(t: Tombstone) {
    await this.inner.putDeletion(t);
    this.outbox.mark(t.collection, t.id);
  }
  async pruneDeletions(before: number) {
    return this.inner.pruneDeletions(before);
  }

  async getDeviceId() {
    return this.inner.getDeviceId();
  }

  async exportSnapshot() {
    return this.inner.exportSnapshot();
  }

  /**
   * A user-initiated import is local data: queue everything it brought in so it
   * reaches the account's other devices.
   */
  async importSnapshot(snapshot: MapSnapshot, mode: "replace" | "merge") {
    await this.inner.importSnapshot(snapshot, mode);
    for (const c of COLLECTIONS) for (const r of snapshot[c]) this.outbox.mark(c, r.id);
    for (const t of snapshot.deletions ?? []) this.outbox.mark(t.collection, t.id);
    if (snapshot.profile) this.outbox.markProfile();
  }

  async clear() {
    return this.inner.clear();
  }
}
