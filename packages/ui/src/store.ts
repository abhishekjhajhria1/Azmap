"use client";

/**
 * useAbh — the reactive binding between React and `@abh/core`.
 *
 * The rule this file exists to enforce: **the UI never waits on I/O.**
 *
 * Memory is authoritative for reads. It's loaded once, then kept current by
 * applying the record each `MapStore` call returns — never by re-reading the
 * database. The previous version called `store.export()` after every mutation,
 * which read all six object stores, recomputed statuses for the whole graph and
 * recomputed proposals, just to learn that one topic's progress had changed.
 * That was the fluidity ceiling.
 *
 * Three mechanisms replace it:
 *
 * - **Patch, don't reload.** A mutation returns its record; we splice it in.
 * - **Optimistic where latency is felt.** Marking a topic known repaints
 *   synchronously, before the write is awaited, and rolls that one record back
 *   if the write fails. Creation flows patch on return instead — a temp-id
 *   dance would duplicate domain logic that belongs in core, and creating is
 *   not the interaction people do a hundred times an hour.
 * - **Derivations by cost.** Statuses are pure and O(V+E), so they recompute
 *   synchronously and only when the graph actually changed. Proposals are
 *   advisory, so they're debounced and never block a frame.
 */

import {
  FrontierSuggestionProvider,
  Mind,
  graph as engine,
  type ProposedLink,
  type Capture,
  type Edge,
  type InboundChange,
  type MapStatus,
  type MapStore,
  type ProposedTopic,
  type Profile,
  type Roadmap,
  type RoadmapDef,
  type SyncEngine,
  type SyncSnapshotState,
  type Topic,
} from "@abh/core";
import { create } from "zustand";

const provider = new FrontierSuggestionProvider();

/**
 * One Mind for the app. Module-level rather than in state because it holds a
 * result cache that must survive re-renders, and because swapping the provider
 * is a settings action, not a render.
 *
 * With no model configured this is `LocalMind` alone: `connect`, `distil` and
 * `next` work offline, and nothing leaves the device.
 */
export const mind = new Mind();

/** Connections are advisory and scan the whole map — never on the hot path. */
const CONNECTION_DEBOUNCE_MS = 400;

/** Long enough to coalesce a burst of edits, short enough to feel immediate. */
const PROPOSAL_DEBOUNCE_MS = 120;

interface AbhState {
  ready: boolean;
  store: MapStore | null;

  topics: Topic[];
  edges: Edge[];
  roadmaps: Roadmap[];
  captures: Capture[];
  profile: Profile | null;
  statuses: Map<string, MapStatus>;
  proposals: ProposedTopic[];
  /** Links the Mind thinks should exist. Advisory, debounced, never blocking. */
  connections: ProposedLink[];
  /** Null until a sync engine is attached. */
  sync: SyncSnapshotState | null;

  init: (store: MapStore) => Promise<void>;
  /** Full reload. Rarely needed — mutations patch in place. */
  refresh: () => Promise<void>;
  /** Mirror an engine's status and fold its inbound deltas into memory. */
  attachSync: (engine: SyncEngine) => () => void;

  // Mutations
  ensureProfile: (name?: string) => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "id" | "createdAt" | "rev">>) => Promise<void>;
  startRoadmap: (def: RoadmapDef) => Promise<void>;
  setActiveRoadmap: (id: string | null) => Promise<void>;
  /** Returns the newly-unlocked topics and the streak, so the UI can celebrate. */
  complete: (id: string) => Promise<{ unlocked: Topic[]; streak: number }>;
  setProgress: (id: string, p: Topic["progress"]) => Promise<void>;
  explore: (input: { title: string; why?: string; domain?: string; parentId?: string }) => Promise<string>;
  acceptProposal: (p: ProposedTopic) => Promise<void>;
  addCapture: (input: { kind: Capture["kind"]; title?: string; url?: string; text?: string }) => Promise<void>;
  /** Accept one proposed link. Handles all three kinds; safe to call twice. */
  acceptLink: (link: ProposedLink) => Promise<void>;
  /** Dismiss it for this session. Deliberately not persisted — see the impl. */
  dismissLink: (link: ProposedLink) => void;
}

/** Replace a record by id, or append it. Returns a new array (Zustand needs one). */
function upsert<T extends { id: string }>(list: readonly T[], rec: T): T[] {
  const i = list.findIndex((x) => x.id === rec.id);
  if (i === -1) return [...list, rec];
  const next = [...list];
  next[i] = rec;
  return next;
}

let proposalTimer: ReturnType<typeof setTimeout> | null = null;
let connectionTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * Links waved away, for this session only.
 *
 * Not persisted, and that's the design. A dismissal here means "not that one,
 * not now" — the map changes constantly, and a link that was wrong when you had
 * four notes may be exactly right at forty. Writing these to storage would also
 * mean syncing them, so a shrug on your phone would permanently silence a
 * suggestion on your laptop. The cost of being wrong is one extra glance.
 */
const dismissed = new Set<string>();

/** Identity of a proposal, independent of the wording or score attached to it. */
function linkKey(l: ProposedLink): string {
  return `${l.kind}:${l.fromId}:${l.toId}:${l.draft?.title ?? ""}`;
}

export const useAbh = create<AbhState>((set, get) => {
  /**
   * Commit a graph change: repaint now, recompute proposals later. Statuses are
   * recomputed here rather than in a selector because several spaces read them
   * and a selector would recompute per subscriber.
   */
  function commitGraph(topics: Topic[], edges: Edge[]): void {
    set({ topics, edges, statuses: engine.computeStatuses({ topics, edges }) });
    scheduleProposals();
    scheduleConnections();
  }

  /** Advisory data — worth being slightly stale, never worth a dropped frame. */
  function scheduleProposals(): void {
    if (proposalTimer) clearTimeout(proposalTimer);
    proposalTimer = setTimeout(() => {
      proposalTimer = null;
      const store = get().store;
      if (!store) return;
      void store.proposals(provider).then(
        (proposals) => set({ proposals }),
        () => {}, // a failed suggestion is not worth surfacing
      );
    }, PROPOSAL_DEBOUNCE_MS);
  }

  /**
   * Ask the Mind what should be connected to what.
   *
   * Debounced harder than proposals because it reads every topic, every edge
   * and every capture. The `Mind` cache means an unchanged map costs nothing
   * here, but the point of the debounce is the *changed* case: typing a note
   * shouldn't rescan the whole second brain on every keystroke.
   *
   * Dismissed links are filtered out on arrival rather than at render, so the
   * one a user just waved away can't reappear when the list recomputes.
   */
  function scheduleConnections(): void {
    if (connectionTimer) clearTimeout(connectionTimer);
    connectionTimer = setTimeout(() => {
      connectionTimer = null;
      const { topics, edges, captures } = get();
      void mind.connect({ graph: { topics, edges }, captures, limit: 6 }).then(
        (links) => set({ connections: links.filter((l) => !dismissed.has(linkKey(l))) }),
        () => {},
      );
    }, CONNECTION_DEBOUNCE_MS);
  }

  /** Reload only the collections a change actually touched. */
  async function reload(which: {
    graph?: boolean;
    roadmaps?: boolean;
    captures?: boolean;
    profile?: boolean;
  }): Promise<void> {
    const store = get().store;
    if (!store) return;
    const [g, roadmaps, captures, profile] = await Promise.all([
      which.graph ? store.graph() : null,
      which.roadmaps ? store.allRoadmaps() : null,
      which.captures ? store.allCaptures() : null,
      which.profile ? store.getProfile() : null,
    ]);
    if (roadmaps) set({ roadmaps });
    if (captures) set({ captures });
    if (which.profile) set({ profile });
    if (g) commitGraph(g.topics, g.edges);
  }

  return {
    ready: false,
    store: null,
    topics: [],
    edges: [],
    roadmaps: [],
    captures: [],
    profile: null,
    statuses: new Map(),
    proposals: [],
    connections: [],
    sync: null,

    async init(store) {
      set({ store });
      await get().refresh();
      set({ ready: true });
    },

    async refresh() {
      await reload({ graph: true, roadmaps: true, captures: true, profile: true });
    },

    attachSync(syncEngine) {
      set({ sync: syncEngine.state });
      const offStatus = syncEngine.subscribe((sync) => set({ sync }));
      const offInbound = syncEngine.onInbound(({ delta }: InboundChange) => {
        // The delta says which collections moved; storage has already merged
        // them by version, so re-read just those. Never a full reload.
        const r = delta.records;
        void reload({
          graph: Boolean(r.topics?.length || r.edges?.length),
          roadmaps: Boolean(r.roadmaps?.length),
          captures: Boolean(r.captures?.length),
          profile: delta.profile !== undefined,
        });
      });
      return () => {
        offStatus();
        offInbound();
      };
    },

    // ---- Mutations --------------------------------------------------------

    async ensureProfile(name) {
      set({ profile: await get().store!.ensureProfile(name) });
    },

    async updateProfile(patch) {
      const before = get().profile;
      if (before) set({ profile: { ...before, ...patch } }); // instant
      try {
        set({ profile: await get().store!.updateProfile(patch) });
      } catch (err) {
        set({ profile: before });
        throw err;
      }
    },

    async startRoadmap(def) {
      // Seeds a whole path of topics and edges — a targeted reload beats
      // reconstructing the same work here.
      await get().store!.startRoadmap(def);
      await reload({ graph: true, roadmaps: true, profile: true });
    },

    async setActiveRoadmap(id) {
      set({ profile: await get().store!.setActiveRoadmap(id) });
      scheduleProposals(); // the active roadmap is proposal context
    },

    async complete(id) {
      const before = get().topics.find((t) => t.id === id);
      if (before) commitGraph(upsert(get().topics, { ...before, progress: "known" }), get().edges);
      try {
        const { unlocked, streak } = await get().store!.complete(id);
        await reload({ graph: true, profile: true }); // unlocks ripple; the streak moved
        return { unlocked, streak };
      } catch (err) {
        if (before) commitGraph(upsert(get().topics, before), get().edges);
        throw err;
      }
    },

    async setProgress(id, p) {
      const before = get().topics.find((t) => t.id === id);
      // Repaint before the write, not after it. This is the hot path.
      if (before) commitGraph(upsert(get().topics, { ...before, progress: p }), get().edges);
      try {
        const saved = await get().store!.setProgress(id, p);
        commitGraph(upsert(get().topics, saved), get().edges);
      } catch (err) {
        // Roll back the one record, not the whole array — anything else that
        // landed while the write was in flight must survive.
        if (before) commitGraph(upsert(get().topics, before), get().edges);
        throw err;
      }
    },

    async explore(input) {
      const topic = await get().store!.explore(input);
      if (input.parentId) {
        await reload({ graph: true }); // an edge was created too
      } else {
        commitGraph(upsert(get().topics, topic), get().edges);
      }
      return topic.id;
    },

    async acceptProposal(p) {
      // Creates a topic, its prerequisite edges, and folds it into a roadmap.
      await get().store!.acceptProposal(p);
      await reload({ graph: true, roadmaps: true });
    },

    async addCapture(input) {
      const capture = await get().store!.addCapture(input);
      set({ captures: upsert(get().captures, capture) });
      // A new capture is the single most likely thing to connect to something.
      scheduleConnections();
    },

    /**
     * Accept a proposed link.
     *
     * The three kinds do genuinely different things, and collapsing them would
     * lose the distinction that makes `distil` worth having: `capture-topic`
     * files a note against a node that already exists, while `capture-newtopic`
     * mints one. Getting that wrong in either direction is how a second brain
     * fills with near-duplicates.
     *
     * Optimistically removed from the list first — accepting is the confident
     * action, and watching a row linger after you tap it reads as a bug.
     */
    async acceptLink(link) {
      dismissed.add(linkKey(link));
      set({ connections: get().connections.filter((l) => linkKey(l) !== linkKey(link)) });
      const store = get().store!;

      if (link.kind === "capture-topic") {
        const capture = await store.linkCapture(link.fromId, link.toId);
        if (capture) set({ captures: upsert(get().captures, capture) });
        return;
      }

      if (link.kind === "capture-newtopic" && link.draft) {
        const topicId = await get().explore({
          title: link.draft.title,
          why: link.draft.why,
          domain: link.draft.domain,
        });
        const capture = await store.linkCapture(link.fromId, topicId);
        if (capture) set({ captures: upsert(get().captures, capture) });
        return;
      }

      if (link.kind === "topic-topic") {
        // Soft, not hard. This is a resemblance the app noticed, not a
        // prerequisite the user asserted, and a wrong hard edge would lock a
        // topic the learner could actually have started today.
        const edge = await store.addEdge(link.fromId, link.toId, {
          strength: "soft",
          origin: "ai",
        });
        commitGraph(get().topics, upsert(get().edges, edge));
      }
    },

    dismissLink(link) {
      dismissed.add(linkKey(link));
      set({ connections: get().connections.filter((l) => linkKey(l) !== linkKey(link)) });
    },
  };
});
