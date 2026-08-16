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
import type {
  Capture,
  Edge,
  Guardian,
  MapSnapshot,
  Roadmap,
  Suggestion,
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
}

const DB_NAME = "abh";
const DB_VERSION = 1;

async function open(): Promise<IDBPDatabase<AbhDB>> {
  return openDB<AbhDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore("topics", { keyPath: "id" });
      const edges = db.createObjectStore("edges", { keyPath: "id" });
      edges.createIndex("by_from", "from");
      edges.createIndex("by_to", "to");
      db.createObjectStore("roadmaps", { keyPath: "id" });
      const sug = db.createObjectStore("suggestions", { keyPath: "id" });
      sug.createIndex("by_status", "status");
      db.createObjectStore("guardians", { keyPath: "id" });
      db.createObjectStore("captures", { keyPath: "id" });
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

  async exportSnapshot(): Promise<MapSnapshot> {
    return {
      version: 1,
      topics: await this.getTopics(),
      edges: await this.getEdges(),
      roadmaps: await this.getRoadmaps(),
      suggestions: await this.getSuggestions(),
      guardians: await this.getGuardians(),
      captures: await this.getCaptures(),
      exportedAt: Date.now(),
    };
  }

  async importSnapshot(snapshot: MapSnapshot, mode: "replace" | "merge") {
    if (mode === "replace") await this.clear();
    const db = await this.dbp;
    const tx = db.transaction(
      ["topics", "edges", "roadmaps", "suggestions", "guardians", "captures"],
      "readwrite",
    );
    await Promise.all([
      ...snapshot.topics.map((t) => tx.objectStore("topics").put(t)),
      ...snapshot.edges.map((e) => tx.objectStore("edges").put(e)),
      ...snapshot.roadmaps.map((r) => tx.objectStore("roadmaps").put(r)),
      ...snapshot.suggestions.map((s) => tx.objectStore("suggestions").put(s)),
      ...snapshot.guardians.map((g) => tx.objectStore("guardians").put(g)),
      ...snapshot.captures.map((c) => tx.objectStore("captures").put(c)),
    ]);
    await tx.done;
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
    ] as const;
    const tx = db.transaction(stores, "readwrite");
    await Promise.all(stores.map((s) => tx.objectStore(s).clear()));
    await tx.done;
  }
}
