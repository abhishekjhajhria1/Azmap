/**
 * In-memory storage adapter.
 *
 * The reference implementation of `StorageAdapter`: used by tests, by SSR
 * previews, and as the shape the Flutter bridge mirrors. Its merge semantics
 * are the canonical definition every other adapter follows — see
 * `sync/merge.ts` for why the ordering rule matters.
 */

import { mergeRecords, mergeTombstones, tombstoneKey, tombstoneWins } from "../sync/merge.js";
import type {
  Capture, Collection, Edge, Guardian, MapSnapshot, Profile, Roadmap,
  Suggestion, Tombstone, Topic,
} from "../types.js";
import type { StorageAdapter } from "./adapter.js";

export class MemoryStorage implements StorageAdapter {
  private topics = new Map<string, Topic>();
  private edges = new Map<string, Edge>();
  private roadmaps = new Map<string, Roadmap>();
  private suggestions = new Map<string, Suggestion>();
  private guardians = new Map<string, Guardian>();
  private captures = new Map<string, Capture>();
  private deletions = new Map<string, Tombstone>();
  private profile: Profile | null = null;
  private deviceId: string;

  constructor(deviceId = `mem_${Math.random().toString(36).slice(2, 10)}`) {
    this.deviceId = deviceId;
  }

  async getDeviceId() { return this.deviceId; }

  async getTopics() { return [...this.topics.values()]; }
  async putTopic(t: Topic) { this.topics.set(t.id, t); }
  async deleteTopic(id: string) { this.topics.delete(id); }

  async getEdges() { return [...this.edges.values()]; }
  async putEdge(e: Edge) { this.edges.set(e.id, e); }
  async deleteEdge(id: string) { this.edges.delete(id); }

  async getRoadmaps() { return [...this.roadmaps.values()]; }
  async putRoadmap(r: Roadmap) { this.roadmaps.set(r.id, r); }
  async deleteRoadmap(id: string) { this.roadmaps.delete(id); }

  async getSuggestions() { return [...this.suggestions.values()]; }
  async putSuggestion(s: Suggestion) { this.suggestions.set(s.id, s); }
  async deleteSuggestion(id: string) { this.suggestions.delete(id); }

  async getGuardians() { return [...this.guardians.values()]; }
  async putGuardian(g: Guardian) { this.guardians.set(g.id, g); }
  async deleteGuardian(id: string) { this.guardians.delete(id); }

  async getCaptures() { return [...this.captures.values()]; }
  async putCapture(c: Capture) { this.captures.set(c.id, c); }
  async deleteCapture(id: string) { this.captures.delete(id); }

  async getProfile() { return this.profile; }
  async putProfile(p: Profile) { this.profile = p; }

  async getDeletions() { return [...this.deletions.values()]; }
  async putDeletion(t: Tombstone) { this.deletions.set(tombstoneKey(t.collection, t.id), t); }
  async pruneDeletions(before: number) {
    for (const [k, t] of this.deletions) if (t.deletedAt < before) this.deletions.delete(k);
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
      profile: this.profile,
      exportedAt: Date.now(),
    };
  }

  /**
   * Merge is: upsert every record by the total order, then apply tombstones.
   * Deletions are applied LAST so a delete always beats a stale live copy that
   * arrived in the same batch.
   */
  async importSnapshot(snapshot: MapSnapshot, mode: "replace" | "merge") {
    if (mode === "replace") await this.clear();

    mergeRecords(this.topics, snapshot.topics);
    mergeRecords(this.edges, snapshot.edges);
    mergeRecords(this.roadmaps, snapshot.roadmaps);
    mergeRecords(this.suggestions, snapshot.suggestions);
    mergeRecords(this.guardians, snapshot.guardians);
    mergeRecords(this.captures, snapshot.captures);

    const incoming = snapshot.deletions ?? [];
    mergeTombstones(this.deletions, incoming);
    for (const t of this.deletions.values()) this.applyTombstone(t);

    if (snapshot.profile) {
      if (!this.profile || snapshot.profile.rev > this.profile.rev) {
        this.profile = snapshot.profile;
      }
    }
  }

  /** Remove a record iff the tombstone outranks the copy we hold. */
  private applyTombstone(t: Tombstone) {
    const store = this.storeFor(t.collection);
    const rec = store.get(t.id);
    if (tombstoneWins(rec, t)) store.delete(t.id);
  }

  private storeFor(c: Collection): Map<string, { id: string; rev: number; updatedAt?: number; deviceId?: string }> {
    switch (c) {
      case "topics": return this.topics;
      case "edges": return this.edges;
      case "roadmaps": return this.roadmaps;
      case "suggestions": return this.suggestions;
      case "guardians": return this.guardians;
      case "captures": return this.captures;
    }
  }

  async clear() {
    this.topics.clear();
    this.edges.clear();
    this.roadmaps.clear();
    this.suggestions.clear();
    this.guardians.clear();
    this.captures.clear();
    this.deletions.clear();
    this.profile = null;
  }
}
