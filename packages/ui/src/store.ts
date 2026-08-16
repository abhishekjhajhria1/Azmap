"use client";

/**
 * useAbh — the reactive binding between React and `@abh/core`.
 *
 * A Zustand store holds an in-memory snapshot of the whole map (cheap even at
 * thousands of nodes) plus derived statuses and live frontier proposals. Every
 * mutation goes through the real `MapStore` (persisting to IndexedDB) and then
 * refreshes the snapshot — so the UI is reactive and the data is real, with one
 * source of truth shared by every space.
 */

import {
  FrontierSuggestionProvider,
  graph as engine,
  type Capture,
  type Edge,
  type MapStatus,
  type MapStore,
  type ProposedTopic,
  type Profile,
  type Roadmap,
  type RoadmapDef,
  type Topic,
} from "@abh/core";
import { create } from "zustand";

const provider = new FrontierSuggestionProvider();

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

  init: (store: MapStore) => Promise<void>;
  refresh: () => Promise<void>;

  // Mutations (all persist, then refresh)
  ensureProfile: (name?: string) => Promise<void>;
  updateProfile: (patch: Partial<Omit<Profile, "id" | "createdAt" | "rev">>) => Promise<void>;
  startRoadmap: (def: RoadmapDef) => Promise<void>;
  setActiveRoadmap: (id: string | null) => Promise<void>;
  complete: (id: string) => Promise<Topic[]>; // returns newly unlocked
  setProgress: (id: string, p: Topic["progress"]) => Promise<void>;
  explore: (input: { title: string; why?: string; domain?: string; parentId?: string }) => Promise<string>;
  acceptProposal: (p: ProposedTopic) => Promise<void>;
  addCapture: (input: { kind: Capture["kind"]; title?: string; url?: string; text?: string }) => Promise<void>;
}

export const useAbh = create<AbhState>((set, get) => ({
  ready: false,
  store: null,
  topics: [],
  edges: [],
  roadmaps: [],
  captures: [],
  profile: null,
  statuses: new Map(),
  proposals: [],

  async init(store) {
    set({ store });
    await get().refresh();
    set({ ready: true });
  },

  async refresh() {
    const store = get().store;
    if (!store) return;
    const snap = await store.export();
    const statuses = engine.computeStatuses({ topics: snap.topics, edges: snap.edges });
    const proposals = await store.proposals(provider);
    set({
      topics: snap.topics,
      edges: snap.edges,
      roadmaps: snap.roadmaps,
      captures: snap.captures,
      profile: snap.profile,
      statuses,
      proposals,
    });
  },

  async ensureProfile(name) {
    await get().store!.ensureProfile(name);
    await get().refresh();
  },
  async updateProfile(patch) {
    await get().store!.updateProfile(patch);
    await get().refresh();
  },
  async startRoadmap(def) {
    await get().store!.startRoadmap(def);
    await get().refresh();
  },
  async setActiveRoadmap(id) {
    await get().store!.setActiveRoadmap(id);
    await get().refresh();
  },
  async complete(id) {
    const { unlocked } = await get().store!.complete(id);
    await get().refresh();
    return unlocked;
  },
  async setProgress(id, p) {
    await get().store!.setProgress(id, p);
    await get().refresh();
  },
  async explore(input) {
    const t = await get().store!.explore(input);
    await get().refresh();
    return t.id;
  },
  async acceptProposal(p) {
    await get().store!.acceptProposal(p);
    await get().refresh();
  },
  async addCapture(input) {
    await get().store!.addCapture(input);
    await get().refresh();
  },
}));
