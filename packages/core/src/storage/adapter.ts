/**
 * Storage is an interface, not a database.
 *
 * Every app (website, extension, desktop, and the Flutter bridge) talks to the
 * map through this contract. The default implementations are fully on-device
 * (IndexedDB in the browser, in-memory for tests). An optional encrypted-sync
 * adapter can implement the same interface later without touching a line of
 * domain logic — that's the "on-device + optional sync" promise, kept.
 */

import type {
  Capture,
  Edge,
  Guardian,
  MapSnapshot,
  Profile,
  Roadmap,
  Suggestion,
  Topic,
} from "../types.js";

export type Collection =
  | "topics"
  | "edges"
  | "roadmaps"
  | "suggestions"
  | "guardians"
  | "captures";

export interface StorageAdapter {
  // Topics
  getTopics(): Promise<Topic[]>;
  putTopic(topic: Topic): Promise<void>;
  deleteTopic(id: string): Promise<void>;

  // Edges
  getEdges(): Promise<Edge[]>;
  putEdge(edge: Edge): Promise<void>;
  deleteEdge(id: string): Promise<void>;

  // Roadmaps
  getRoadmaps(): Promise<Roadmap[]>;
  putRoadmap(roadmap: Roadmap): Promise<void>;
  deleteRoadmap(id: string): Promise<void>;

  // Suggestions
  getSuggestions(): Promise<Suggestion[]>;
  putSuggestion(s: Suggestion): Promise<void>;
  deleteSuggestion(id: string): Promise<void>;

  // Guardians
  getGuardians(): Promise<Guardian[]>;
  putGuardian(g: Guardian): Promise<void>;
  deleteGuardian(id: string): Promise<void>;

  // Captures
  getCaptures(): Promise<Capture[]>;
  putCapture(c: Capture): Promise<void>;
  deleteCapture(id: string): Promise<void>;

  // Profile — a single on-device record (null until onboarding).
  getProfile(): Promise<Profile | null>;
  putProfile(p: Profile): Promise<void>;

  /** Full-dataset read/replace — powers export, import, backup and sync. */
  exportSnapshot(): Promise<MapSnapshot>;
  importSnapshot(snapshot: MapSnapshot, mode: "replace" | "merge"): Promise<void>;

  /** Wipe everything on this device. */
  clear(): Promise<void>;
}
