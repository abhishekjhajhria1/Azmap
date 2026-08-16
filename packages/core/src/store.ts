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
  newProfileId,
  newRoadmapId,
  newSuggestionId,
  newTopicId,
  now,
} from "./ids.js";
import { advanceStreak, dayKey } from "./streak.js";
import { getRoadmap } from "./roadmaps/library.js";
import { roadmapNodeId, seedEdgePairs } from "./roadmaps/lens.js";
import type { RoadmapDef } from "./roadmaps/types.js";
import type { ProposedTopic, SuggestionProvider } from "./suggest/index.js";
import type { StorageAdapter } from "./storage/adapter.js";
import {
  type Capture,
  type Edge,
  type Guardian,
  type MapStatus,
  type Profile,
  type Progress,
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
  /** Explicit id (for roadmap seeding); a fresh one is generated otherwise. */
  id?: string;
  progress?: Progress;
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
      id: input.id ?? newTopicId(),
      title: input.title,
      summary: input.summary ?? "",
      whyItMatters: input.whyItMatters ?? "",
      unlocks: input.unlocks ?? "",
      progress: input.progress ?? "not_started",
      origin: input.origin ?? "user",
      tags: input.tags ?? [],
      sources: input.sources ?? [],
      completedAt: input.progress === "known" ? ts : undefined,
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
   * result — the payoff moment the product is built around — plus the streak
   * after this activity, so the UI can celebrate both in one go.
   */
  async complete(id: string): Promise<{ topic: Topic; unlocked: Topic[]; streak: number }> {
    const g = await this.graph();
    const unlocked = graph.wouldUnlock(id, g);
    const topic = await this.updateTopic(id, {
      progress: "known",
      completedAt: now(),
    });
    const profile = await this.recordActivity();
    return { topic, unlocked, streak: profile.streakDays };
  }

  /**
   * Record a day of real learning activity and advance the streak. Idempotent
   * within a day. Called by `complete()`; call it directly for other genuine
   * learning actions. Deliberately NOT called on app open — a streak should
   * mean "I learned", not "I launched the app".
   */
  async recordActivity(today: string = dayKey()): Promise<Profile> {
    const profile = await this.ensureProfile();
    const next = advanceStreak(profile, today);
    if (next === profile || next.lastActiveDay === profile.lastActiveDay) {
      return profile;
    }
    return this.updateProfile(next);
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

  /**
   * Start following a roadmap: inflate its path into real nodes on the one
   * graph (namespaced ids, so the mind map is the superset), wire the
   * prerequisite edges, record the Roadmap, and focus it on the profile.
   * Idempotent — starting an already-started roadmap just re-focuses it.
   */
  async startRoadmap(def: RoadmapDef): Promise<Roadmap> {
    const existing = (await this.storage.getRoadmaps()).find((r) => r.id === def.id);
    if (existing) {
      await this.setActiveRoadmap(def.id);
      return existing;
    }

    const topicIds: string[] = [];
    for (const seed of def.path) {
      const id = roadmapNodeId(def.id, seed.id);
      topicIds.push(id);
      await this.addTopic({
        id,
        title: seed.title,
        whyItMatters: seed.why,
        progress: seed.progress ?? "not_started",
        origin: "curated",
        tags: [seed.domain, `roadmap:${def.id}`],
      });
    }
    for (const { from, to } of seedEdgePairs(def.id, def.path)) {
      await this.addEdge(from, to, { origin: "curated" });
    }

    const ts = now();
    const roadmap: Roadmap = {
      id: def.id,
      title: def.title,
      domain: "",
      description: def.blurb,
      language: "en",
      topicIds,
      curated: true,
      createdAt: ts,
      updatedAt: ts,
      rev: 0,
    };
    await this.storage.putRoadmap(roadmap);
    await this.setActiveRoadmap(def.id);
    return roadmap;
  }

  // ---- Profile (the local user) ------------------------------------------

  async getProfile(): Promise<Profile | null> {
    return this.storage.getProfile();
  }

  /** Load the profile, creating a fresh one on first run. */
  async ensureProfile(name = ""): Promise<Profile> {
    const existing = await this.storage.getProfile();
    if (existing) return existing;
    const ts = now();
    const profile: Profile = {
      id: newProfileId(),
      name,
      activeRoadmapId: null,
      onboardedAt: null,
      streakDays: 0,
      bestStreak: 0,
      lastActiveDay: null,
      streakFreezes: 2,
      dockPosition: "auto",
      createdAt: ts,
      updatedAt: ts,
      rev: 0,
    };
    await this.storage.putProfile(profile);
    return profile;
  }

  async updateProfile(
    patch: Partial<Omit<Profile, "id" | "createdAt" | "rev">>,
  ): Promise<Profile> {
    const profile = await this.ensureProfile();
    const updated: Profile = {
      ...profile,
      ...patch,
      id: profile.id,
      createdAt: profile.createdAt,
      updatedAt: now(),
      rev: profile.rev + 1,
    };
    await this.storage.putProfile(updated);
    return updated;
  }

  async setActiveRoadmap(id: string | null): Promise<Profile> {
    return this.updateProfile({ activeRoadmapId: id });
  }

  /** The roadmap def currently in focus, resolved from the library. */
  async activeRoadmapDef(): Promise<RoadmapDef | null> {
    const profile = await this.storage.getProfile();
    if (!profile?.activeRoadmapId) return null;
    return getRoadmap(profile.activeRoadmapId) ?? null;
  }

  // ---- Explore (the curious layer feeds the second brain) -----------------

  /**
   * Add a node by asking/exploring. It joins the one graph (the second brain);
   * an optional soft edge links it to the node you were on, so sideways
   * curiosity never gates a roadmap.
   */
  async explore(input: {
    title: string;
    why?: string;
    domain?: string;
    parentId?: string;
  }): Promise<Topic> {
    const topic = await this.addTopic({
      title: input.title,
      whyItMatters: input.why ?? "",
      origin: "capture",
      tags: [input.domain ?? "everyday"],
    });
    if (input.parentId) {
      const has = (await this.storage.getTopics()).some((t) => t.id === input.parentId);
      if (has) await this.addEdge(input.parentId, topic.id, { strength: "soft", origin: "capture" });
    }
    return topic;
  }

  // ---- Frontier proposals (live, deterministic; swappable for AI) ---------

  /** Live suggestions from a provider, using the active roadmap as context. */
  async proposals(provider: SuggestionProvider): Promise<ProposedTopic[]> {
    const [g, roadmap] = await Promise.all([this.graph(), this.activeRoadmapDef()]);
    return provider.propose({ graph: g, roadmap: roadmap ?? undefined });
  }

  /**
   * Accept a live proposal onto the map — creates the namespaced topic + its
   * prerequisite edges and folds it into its roadmap. The user-tap gate that
   * keeps AI from ever writing to the map unasked.
   */
  async acceptProposal(p: ProposedTopic): Promise<Topic> {
    const topic = await this.addTopic({
      id: p.nodeId,
      title: p.title,
      whyItMatters: p.why,
      origin: "ai",
      tags: [p.domain, `roadmap:${p.roadmapId}`],
    });
    for (const from of p.needs) {
      await this.addEdge(from, p.nodeId, { origin: "ai" });
    }
    const roadmaps = await this.storage.getRoadmaps();
    const roadmap = roadmaps.find((r) => r.id === p.roadmapId);
    if (roadmap && !roadmap.topicIds.includes(p.nodeId)) {
      await this.storage.putRoadmap({
        ...roadmap,
        topicIds: [...roadmap.topicIds, p.nodeId],
        updatedAt: now(),
        rev: roadmap.rev + 1,
      });
    }
    return topic;
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
