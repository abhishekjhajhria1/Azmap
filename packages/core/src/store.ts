/**
 * MapStore — the one API the apps call.
 *
 * It composes a `StorageAdapter` (where the data lives) with the pure graph
 * engine (what the data means) and enforces the product's invariants in one
 * place:
 *   - edges can never create a prerequisite cycle,
 *   - AI/import proposals only join the map through `acceptSuggestion`,
 *   - every mutation bumps `rev` + `updatedAt` so sync can reconcile later.
 */

import * as graph from "./graph.js";
import {
  newCaptureId,
  newEdgeId,
  newGuardianId,
  newRoadmapId,
  newSuggestionId,
  newTopicId,
  now,
} from "./ids.js";
import type { StorageAdapter } from "./storage/adapter.js";
import {
  type Capture,
  type Edge,
  type Guardian,
  type MapStatus,
  type Roadmap,
  type Suggestion,
  Topic,
  type TopicOrigin,
} from "./types.js";

export interface NewTopicInput {
  title: string;
  summary?: string;
  whyItMatters?: string;
  unlocks?: string;
  origin?: TopicOrigin;
  tags?: string[];
  sources?: Topic["sources"];
}

export class MapStore {
  constructor(private readonly storage: StorageAdapter) {}

  /** The raw graph — topics + edges — for the pure engine functions. */
  async graph(): Promise<graph.Graph> {
    const [topics, edges] = await Promise.all([
      this.storage.getTopics(),
      this.storage.getEdges(),
    ]);
    return { topics, edges };
  }

  // ---- Topics -------------------------------------------------------------

  async addTopic(input: NewTopicInput): Promise<Topic> {
    const ts = now();
    const topic = Topic.parse({
      id: newTopicId(),
      title: input.title,
      summary: input.summary ?? "",
      whyItMatters: input.whyItMatters ?? "",
      unlocks: input.unlocks ?? "",
      origin: input.origin ?? "user",
      tags: input.tags ?? [],
      sources: input.sources ?? [],
      createdAt: ts,
      updatedAt: ts,
      rev: 0,
    });
    await this.storage.putTopic(topic);
    return topic;
  }

  async updateTopic(
    id: string,
    patch: Partial<Omit<Topic, "id" | "createdAt" | "rev">>,
  ): Promise<Topic> {
    const existing = (await this.storage.getTopics()).find((t) => t.id === id);
    if (!existing) throw new Error(`Topic not found: ${id}`);
    const updated = Topic.parse({
      ...existing,
      ...patch,
      id: existing.id,
      createdAt: existing.createdAt,
      updatedAt: now(),
      rev: existing.rev + 1,
    });
    await this.storage.putTopic(updated);
    return updated;
  }

  /**
   * Mark a topic known. Returns the topics that became newly available as a
   * result — the payoff moment the product is built around.
   */
  async complete(id: string): Promise<{ topic: Topic; unlocked: Topic[] }> {
    const g = await this.graph();
    const unlocked = graph.wouldUnlock(id, g);
    const topic = await this.updateTopic(id, {
      progress: "known",
      completedAt: now(),
    });
    return { topic, unlocked };
  }

  async setProgress(id: string, progress: Topic["progress"]): Promise<Topic> {
    return this.updateTopic(id, {
      progress,
      completedAt: progress === "known" ? now() : undefined,
    });
  }

  /** Deleting a topic also removes any edges that touch it (no dangling edges). */
  async removeTopic(id: string): Promise<void> {
    const edges = await this.storage.getEdges();
    await Promise.all(
      edges
        .filter((e) => e.from === id || e.to === id)
        .map((e) => this.storage.deleteEdge(e.id)),
    );
    await this.storage.deleteTopic(id);
  }

  // ---- Edges (prerequisites) ---------------------------------------------

  /**
   * Add a prerequisite edge `from -> to`. Throws if it would create a cycle,
   * because a prerequisite graph must stay acyclic to be answerable.
   */
  async addEdge(
    from: string,
    to: string,
    opts: { strength?: Edge["strength"]; origin?: TopicOrigin } = {},
  ): Promise<Edge> {
    const g = await this.graph();
    if (!g.topics.some((t) => t.id === from))
      throw new Error(`Unknown prerequisite topic: ${from}`);
    if (!g.topics.some((t) => t.id === to))
      throw new Error(`Unknown dependent topic: ${to}`);
    if (graph.wouldCreateCycle(from, to, g))
      throw new Error(`Edge ${from} -> ${to} would create a prerequisite cycle`);

    const edge: Edge = {
      id: newEdgeId(),
      from,
      to,
      strength: opts.strength ?? "hard",
      origin: opts.origin ?? "user",
      createdAt: now(),
      rev: 0,
    };
    await this.storage.putEdge(edge);
    return edge;
  }

  async removeEdge(id: string): Promise<void> {
    await this.storage.deleteEdge(id);
  }

  // ---- Derived views ------------------------------------------------------

  async availableNow(): Promise<Topic[]> {
    return graph.availableNow(await this.graph());
  }

  async statuses(): Promise<Map<string, MapStatus>> {
    return graph.computeStatuses(await this.graph());
  }

  // ---- Roadmaps -----------------------------------------------------------

  async addRoadmap(input: {
    title: string;
    domain?: string;
    description?: string;
    language?: string;
    country?: string;
    topicIds?: string[];
    curated?: boolean;
  }): Promise<Roadmap> {
    const ts = now();
    const roadmap: Roadmap = {
      id: newRoadmapId(),
      title: input.title,
      domain: input.domain ?? "",
      description: input.description ?? "",
      language: input.language ?? "en",
      country: input.country,
      topicIds: input.topicIds ?? [],
      curated: input.curated ?? false,
      createdAt: ts,
      updatedAt: ts,
      rev: 0,
    };
    await this.storage.putRoadmap(roadmap);
    return roadmap;
  }

  /** Progress across a roadmap's topics, as a 0–100 percentage. */
  async roadmapProgress(roadmapId: string): Promise<number> {
    const roadmaps = await this.storage.getRoadmaps();
    const roadmap = roadmaps.find((r) => r.id === roadmapId);
    if (!roadmap) throw new Error(`Roadmap not found: ${roadmapId}`);
    const topics = await this.storage.getTopics();
    const inRoadmap = topics.filter((t) => roadmap.topicIds.includes(t.id));
    return graph.progressPercent(inRoadmap);
  }

  // ---- Suggestions (the "AI proposes, you accept" rule) -------------------

  async proposeSuggestion(input: {
    kind: Suggestion["kind"];
    payload: Record<string, unknown>;
    rationale?: string;
  }): Promise<Suggestion> {
    const suggestion: Suggestion = {
      id: newSuggestionId(),
      kind: input.kind,
      payload: input.payload,
      rationale: input.rationale ?? "",
      status: "pending",
      createdAt: now(),
    };
    await this.storage.putSuggestion(suggestion);
    return suggestion;
  }

  async pendingSuggestions(): Promise<Suggestion[]> {
    return (await this.storage.getSuggestions()).filter(
      (s) => s.status === "pending",
    );
  }

  /**
   * Accept a proposal — the ONLY path by which AI/import content joins the map.
   * Creates the real Topic or Edge (tagged with the "ai" origin) and marks the
   * suggestion accepted.
   */
  async acceptSuggestion(
    id: string,
  ): Promise<{ topic?: Topic; edge?: Edge }> {
    const suggestions = await this.storage.getSuggestions();
    const s = suggestions.find((x) => x.id === id);
    if (!s) throw new Error(`Suggestion not found: ${id}`);
    if (s.status !== "pending")
      throw new Error(`Suggestion ${id} is already ${s.status}`);

    let result: { topic?: Topic; edge?: Edge } = {};
    if (s.kind === "topic") {
      const p = s.payload as Partial<NewTopicInput>;
      result.topic = await this.addTopic({
        title: String(p.title ?? "Untitled"),
        summary: p.summary,
        whyItMatters: p.whyItMatters,
        unlocks: p.unlocks,
        tags: p.tags,
        origin: "ai",
      });
    } else {
      const p = s.payload as { from?: string; to?: string };
      if (!p.from || !p.to)
        throw new Error(`Edge suggestion ${id} missing from/to`);
      result.edge = await this.addEdge(p.from, p.to, { origin: "ai" });
    }

    await this.storage.putSuggestion({ ...s, status: "accepted" });
    return result;
  }

  async rejectSuggestion(id: string): Promise<void> {
    const suggestions = await this.storage.getSuggestions();
    const s = suggestions.find((x) => x.id === id);
    if (!s) throw new Error(`Suggestion not found: ${id}`);
    await this.storage.putSuggestion({ ...s, status: "rejected" });
  }

  // ---- People -------------------------------------------------------------

  async addGuardian(input: {
    name: string;
    relationship?: Guardian["relationship"];
    canShapePlan?: boolean;
    canSignOff?: boolean;
    notifyOnSlip?: boolean;
  }): Promise<Guardian> {
    const guardian: Guardian = {
      id: newGuardianId(),
      name: input.name,
      relationship: input.relationship ?? "friend",
      canShapePlan: input.canShapePlan ?? false,
      canSignOff: input.canSignOff ?? true,
      notifyOnSlip: input.notifyOnSlip ?? true,
      createdAt: now(),
    };
    await this.storage.putGuardian(guardian);
    return guardian;
  }

  // ---- Captures (second brain) -------------------------------------------

  async addCapture(input: {
    kind: Capture["kind"];
    title?: string;
    url?: string;
    text?: string;
  }): Promise<Capture> {
    const capture: Capture = {
      id: newCaptureId(),
      kind: input.kind,
      title: input.title ?? "",
      url: input.url,
      text: input.text ?? "",
      linkedTopicIds: [],
      createdAt: now(),
    };
    await this.storage.putCapture(capture);
    return capture;
  }

  // ---- Portability --------------------------------------------------------

  export() {
    return this.storage.exportSnapshot();
  }
  import(snapshot: Parameters<StorageAdapter["importSnapshot"]>[0], mode: "replace" | "merge" = "merge") {
    return this.storage.importSnapshot(snapshot, mode);
  }
}
