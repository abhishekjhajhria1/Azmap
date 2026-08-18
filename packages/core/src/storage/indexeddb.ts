/**
 * IndexedDB storage adapter — the on-device default for every web surface
 * (website, browser extension, desktop webview). Same contract as
 * `MemoryStorage`; the data simply survives a reload and never leaves the
 * device.
 *
 * Imported from a subpath (`@abh/core/storage/indexeddb`) so environments
 * without IndexedDB (Node tests, SSR) never pull in `idb`.
 */

import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { mergeRecords, mergeTombstones, tombstoneKey, tombstoneWins } from "../sync/merge.js";
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
import type { StorageAdapter } from "./adapter.js";

interface AbhDB extends DBSchema {
  topics: { key: string; value: Topic };
  edges: { key: string; value: Edge; indexes: { by_from: string; by_to: string } };
  roadmaps: { key: string; value: Roadmap };
  suggestions: { key: string; value: Suggestion; indexes: { by_status: string } };
  guardians: { key: string; value: Guardian };
  captures: { key: string; value: Capture };
  /** Tombstones, keyed "collection:id" — see sync/merge.ts. */
  deletions: { key: string; value: Tombstone };
  /** Singleton records (profile, deviceId) under fixed keys. */
  meta: { key: string; value: unknown };
}

const DB_NAME = "abh";
const DB_VERSION = 3;
const PROFILE_KEY = "profile";
const DEVICE_KEY = "deviceId";

async function open(): Promise<IDBPDatabase<AbhDB>> {
  return openDB<AbhDB>(DB_NAME, DB_VERSION, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore("topics", { keyPath: "id" });
        const edges = db.createObjectStore("edges", { keyPath: "id" });
        edges.createIndex("by_from", "from");
        edges.createIndex("by_to", "to");
        db.createObjectStore("roadmaps", { keyPath: "id" });
        const sug = db.createObjectStore("suggestions", { keyPath: "id" });
        sug.createIndex("by_status", "status");
        db.createObjectStore("guardians", { keyPath: "id" });
        db.createObjectStore("captures", { keyPath: "id" });
      }
      if (oldVersion < 2) {
        db.createObjectStore("meta");
      }
      if (oldVersion < 3) {
        // Tombstones arrived with sync; existing data merges forward unchanged.
        db.createObjectStore("deletions");
      }
    },
  });
}

export class IndexedDbStorage implements StorageAdapter {
  private dbp: Promise<IDBPDatabase<AbhDB>>;

  constructor() {
    this.dbp = open();
  }

  async getTopics() {
    return (await this.dbp).getAll("topics");
  }
  async putTopic(t: Topic) {
    await (await this.dbp).put("topics", t);
  }
  async deleteTopic(id: string) {
    await (await this.dbp).delete("topics", id);
  }

  async getEdges() {
    return (await this.dbp).getAll("edges");
  }
  async putEdge(e: Edge) {
    await (await this.dbp).put("edges", e);
  }
  async deleteEdge(id: string) {
    await (await this.dbp).delete("edges", id);
  }

  async getRoadmaps() {
    return (await this.dbp).getAll("roadmaps");
  }
  async putRoadmap(r: Roadmap) {
    await (await this.dbp).put("roadmaps", r);
  }
  async deleteRoadmap(id: string) {
    await (await this.dbp).delete("roadmaps", id);
  }

  async getSuggestions() {
    return (await this.dbp).getAll("suggestions");
  }
  async putSuggestion(s: Suggestion) {
    await (await this.dbp).put("suggestions", s);
  }
  async deleteSuggestion(id: string) {
    await (await this.dbp).delete("suggestions", id);
  }

  async getGuardians() {
    return (await this.dbp).getAll("guardians");
  }
  async putGuardian(g: Guardian) {
    await (await this.dbp).put("guardians", g);
  }
  async deleteGuardian(id: string) {
    await (await this.dbp).delete("guardians", id);
  }

  async getCaptures() {
    return (await this.dbp).getAll("captures");
  }
  async putCapture(c: Capture) {
    await (await this.dbp).put("captures", c);
  }
  async deleteCapture(id: string) {
    await (await this.dbp).delete("captures", id);
  }

  async getProfile() {
    return ((await (await this.dbp).get("meta", PROFILE_KEY)) as Profile | undefined) ?? null;
  }
  async putProfile(p: Profile) {
    await (await this.dbp).put("meta", p, PROFILE_KEY);
  }

  /** Stable per-device id, minted once and reused — the merge tiebreak. */
  async getDeviceId(): Promise<string> {
    const db = await this.dbp;
    const existing = (await db.get("meta", DEVICE_KEY)) as string | undefined;
    if (existing) return existing;
    const id = `dev_${crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)}`;
    await db.put("meta", id, DEVICE_KEY);
    return id;
  }

  async getDeletions(): Promise<Tombstone[]> {
    return (await this.dbp).getAll("deletions");
  }
  async putDeletion(t: Tombstone) {
    await (await this.dbp).put("deletions", t, tombstoneKey(t.collection, t.id));
  }
  async pruneDeletions(before: number) {
    const db = await this.dbp;
    const tx = db.transaction("deletions", "readwrite");
    for await (const cursor of tx.store) {
      if (cursor.value.deletedAt < before) await cursor.delete();
    }
    await tx.done;
  }

  async exportSnapshot(): Promise<MapSnapshot> {
    return {
      version: 2,
      topics: await this.getTopics(),
      edges: await this.getEdges(),
      roadmaps: await this.getRoadmaps(),
      suggestions: await this.getSuggestions(),
      guardians: await this.getGuardians(),
      captures: await this.getCaptures(),
      deletions: await this.getDeletions(),
      profile: await this.getProfile(),
      exportedAt: Date.now(),
    };
  }

  /**
   * Merge by the same total order as `MemoryStorage` — read what we hold, let
   * `mergeRecords` pick the winner, then apply tombstones last. The previous
   * implementation wrote every incoming record unconditionally, so an older
   * copy from a peer could silently clobber a newer local one.
   */
  async importSnapshot(snapshot: MapSnapshot, mode: "replace" | "merge") {
    if (mode === "replace") await this.clear();

    const collections: Collection[] = [
      "topics", "edges", "roadmaps", "suggestions", "guardians", "captures",
    ];
    const incoming: Record<Collection, readonly { id: string; rev: number; updatedAt?: number; deviceId?: string }[]> = {
      topics: snapshot.topics,
      edges: snapshot.edges,
      roadmaps: snapshot.roadmaps,
      suggestions: snapshot.suggestions,
      guardians: snapshot.guardians,
      captures: snapshot.captures,
    };

    for (const c of collections) {
      const current = new Map(
        (await (await this.dbp).getAll(c)).map((r) => [r.id, r as never]),
      );
      const before = new Map(current);
      mergeRecords(current, incoming[c] as never[]);
      const db = await this.dbp;
      const tx = db.transaction(c, "readwrite");
      for (const [id, rec] of current) {
        if (before.get(id) !== rec) await tx.store.put(rec as never);
      }
      await tx.done;
    }

    // Tombstones: merge the ledger, then enforce it against live records.
    const tombs = new Map((await this.getDeletions()).map((t) => [tombstoneKey(t.collection, t.id), t]));
    mergeTombstones(tombs, snapshot.deletions ?? []);
    const db = await this.dbp;
    const tdx = db.transaction("deletions", "readwrite");
    for (const [key, t] of tombs) await tdx.store.put(t, key);
    await tdx.done;

    for (const t of tombs.values()) {
      const rec = (await db.get(t.collection, t.id)) as
        | { id: string; rev: number; updatedAt?: number; deviceId?: string }
        | undefined;
      if (tombstoneWins(rec, t)) await db.delete(t.collection, t.id);
    }

    if (snapshot.profile) {
      const local = await this.getProfile();
      if (!local || snapshot.profile.rev > local.rev) {
        await this.putProfile(snapshot.profile);
      }
    }
  }

  async clear() {
    const db = await this.dbp;
    const stores = [
      "topics",
      "edges",
      "roadmaps",
      "suggestions",
      "guardians",
      "captures",
      "meta",
    ] as const;
    const tx = db.transaction(stores, "readwrite");
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }
}
