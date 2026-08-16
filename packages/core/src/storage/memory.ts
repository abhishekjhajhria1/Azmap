/**
 * In-memory storage adapter.
 *
 * The reference implementation of `StorageAdapter`: used by tests, by SSR
 * previews on the website, and as the shape the Flutter bridge mirrors. Merge
 * semantics here are the canonical definition every other adapter follows.
 */

import type { MapSnapshot } from "../types.js";
import type { StorageAdapter } from "./adapter.js";

interface HasId {
  id: string;
}
interface HasRev extends HasId {
  rev: number;
}

export class MemoryStorage implements StorageAdapter {
  private topics = new Map<string, MapSnapshot["topics"][number]>();
  private edges = new Map<string, MapSnapshot["edges"][number]>();
  private roadmaps = new Map<string, MapSnapshot["roadmaps"][number]>();
  private suggestions = new Map<string, MapSnapshot["suggestions"][number]>();
  private guardians = new Map<string, MapSnapshot["guardians"][number]>();
  private captures = new Map<string, MapSnapshot["captures"][number]>();
  private profile: MapSnapshot["profile"] = null;

  async getTopics() {
    return [...this.topics.values()];
  }
  async putTopic(t: MapSnapshot["topics"][number]) {
    this.topics.set(t.id, t);
  }
  async deleteTopic(id: string) {
    this.topics.delete(id);
  }

  async getEdges() {
    return [...this.edges.values()];
  }
  async putEdge(e: MapSnapshot["edges"][number]) {
    this.edges.set(e.id, e);
  }
  async deleteEdge(id: string) {
    this.edges.delete(id);
  }

  async getRoadmaps() {
    return [...this.roadmaps.values()];
  }
  async putRoadmap(r: MapSnapshot["roadmaps"][number]) {
    this.roadmaps.set(r.id, r);
  }
  async deleteRoadmap(id: string) {
    this.roadmaps.delete(id);
  }

  async getSuggestions() {
    return [...this.suggestions.values()];
  }
  async putSuggestion(s: MapSnapshot["suggestions"][number]) {
    this.suggestions.set(s.id, s);
  }
  async deleteSuggestion(id: string) {
    this.suggestions.delete(id);
  }

  async getGuardians() {
    return [...this.guardians.values()];
  }
  async putGuardian(g: MapSnapshot["guardians"][number]) {
    this.guardians.set(g.id, g);
  }
  async deleteGuardian(id: string) {
    this.guardians.delete(id);
  }

  async getCaptures() {
    return [...this.captures.values()];
  }
  async putCapture(c: MapSnapshot["captures"][number]) {
    this.captures.set(c.id, c);
  }
  async deleteCapture(id: string) {
    this.captures.delete(id);
  }

  async getProfile() {
    return this.profile;
  }
  async putProfile(p: NonNullable<MapSnapshot["profile"]>) {
    this.profile = p;
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
      profile: this.profile,
      exportedAt: Date.now(),
    };
  }

  async importSnapshot(snapshot: MapSnapshot, mode: "replace" | "merge") {
    if (mode === "replace") await this.clear();
    mergeInto(this.topics, snapshot.topics, mode);
    mergeInto(this.edges, snapshot.edges, mode);
    mergeInto(this.roadmaps, snapshot.roadmaps, mode);
    // Suggestions/guardians/captures aren't rev-tracked yet; import by id.
    for (const s of snapshot.suggestions) this.suggestions.set(s.id, s);
    for (const g of snapshot.guardians) this.guardians.set(g.id, g);
    for (const c of snapshot.captures) this.captures.set(c.id, c);
    // Profile: last-writer-by-rev, same rule as the graph records.
    if (snapshot.profile) {
      if (!this.profile || snapshot.profile.rev >= this.profile.rev) {
        this.profile = snapshot.profile;
      }
    }
  }

  async clear() {
    this.topics.clear();
    this.edges.clear();
    this.roadmaps.clear();
    this.suggestions.clear();
    this.guardians.clear();
    this.captures.clear();
    this.profile = null;
  }
}

/**
 * Canonical merge rule for rev-tracked records: on `merge`, an incoming record
 * wins only if its `rev` is greater than the local one (last-writer-by-rev).
 * On `replace` the map is already empty, so everything is inserted.
 */
function mergeInto<T extends HasRev>(
  target: Map<string, T>,
  incoming: T[],
  mode: "replace" | "merge",
) {
  for (const rec of incoming) {
    if (mode === "merge") {
      const existing = target.get(rec.id);
      if (existing && existing.rev >= rec.rev) continue;
    }
    target.set(rec.id, rec);
  }
}
