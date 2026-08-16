"use client";

/**
 * useJourney — the learner's on-device state for the roadmap experience.
 *
 * Persists to localStorage (the web stand-in for the app's on-device store):
 * which role you're in, the roadmap you're following, what you've marked known,
 * and which AI branch-suggestions you've accepted onto your map.
 *
 * From that it derives the *evolving* map: only the revealed slice of the
 * roadmap plus any accepted branches, with frontier branches offered as ghost
 * suggestions you can open and add.
 */

import { graph as engine, type Edge, type Topic } from "@abh/core";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  branchTopic,
  getRoadmap,
  pathEdges,
  pathTopics,
  seedEdges,
  type RoadmapDef,
} from "./roadmaps";

export type Role = "learner" | "explorer" | "guardian";

interface Persisted {
  role: Role | null;
  activeRoadmapId: string | null;
  known: string[];
  accepted: string[];
}

const KEY = "abh.journey.v1";

function load(): Persisted {
  if (typeof window === "undefined")
    return { role: null, activeRoadmapId: null, known: [], accepted: [] };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Persisted;
  } catch {
    /* ignore corrupt state */
  }
  return { role: null, activeRoadmapId: null, known: [], accepted: [] };
}

export function useJourney() {
  const [state, setState] = useState<Persisted>({
    role: null,
    activeRoadmapId: null,
    known: [],
    accepted: [],
  });
  const [hydrated, setHydrated] = useState(false);

  // Hydrate from localStorage on mount (avoids SSR mismatch).
  useEffect(() => {
    setState(load());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* storage full / disabled — non-fatal */
    }
  }, [state, hydrated]);

  const def: RoadmapDef | null = state.activeRoadmapId
    ? getRoadmap(state.activeRoadmapId) ?? null
    : null;

  const known = useMemo(() => new Set(state.known), [state.known]);
  const accepted = useMemo(() => new Set(state.accepted), [state.accepted]);

  // The full graph = the roadmap path + any accepted branches, progress applied.
  const { topics, edges } = useMemo(() => {
    if (!def) return { topics: [] as Topic[], edges: [] as Edge[] };
    const path = pathTopics(def, known);
    const acceptedBranches = def.branches
      .filter((b) => accepted.has(b.id))
      .map((b) => {
        const t = branchTopic(b);
        return known.has(b.id) ? { ...t, progress: "known" as const } : t;
      });
    const branchEdges = seedEdges(def.branches.filter((b) => accepted.has(b.id)));
    return {
      topics: [...path, ...acceptedBranches],
      edges: [...pathEdges(def), ...branchEdges],
    };
  }, [def, known, accepted]);

  // The revealed slice — the map that visibly grows as you progress. We also
  // pull in every ancestor of a revealed node so each shown topic has all its
  // prerequisites on screen and its status is computed correctly.
  const revealedIds = useMemo(() => {
    if (!def) return new Set<string>();
    const base = engine.revealedTopicIds({ topics, edges }, { lookahead: 1 });
    const incoming = new Map<string, string[]>();
    for (const e of edges) {
      if (!incoming.has(e.to)) incoming.set(e.to, []);
      incoming.get(e.to)!.push(e.from);
    }
    const out = new Set(base);
    const stack = [...base];
    while (stack.length) {
      const id = stack.pop()!;
      for (const from of incoming.get(id) ?? []) {
        if (!out.has(from)) {
          out.add(from);
          stack.push(from);
        }
      }
    }
    return out;
  }, [def, topics, edges]);

  // Frontier branch suggestions: branches whose prerequisites you already know,
  // not yet accepted — the AI proposals that "come along the map".
  const suggestions = useMemo(() => {
    if (!def) return [] as Topic[];
    return def.branches
      .filter((b) => !accepted.has(b.id))
      .filter((b) => (b.needs ?? []).every((n) => known.has(n)))
      .map(branchTopic);
  }, [def, known, accepted]);

  // What the graph canvas renders: revealed real topics + ghost suggestions.
  const visibleTopics = useMemo(
    () => topics.filter((t) => revealedIds.has(t.id)),
    [topics, revealedIds],
  );
  const graphTopics = useMemo(
    () => [...visibleTopics, ...suggestions],
    [visibleTopics, suggestions],
  );
  const ghostIds = useMemo(() => new Set(suggestions.map((s) => s.id)), [suggestions]);
  const graphEdges = useMemo(() => {
    const shown = new Set(graphTopics.map((t) => t.id));
    const suggestionEdges = seedEdges(
      def?.branches.filter((b) => ghostIds.has(b.id)) ?? [],
    );
    return [...edges, ...suggestionEdges].filter(
      (e) => shown.has(e.from) && shown.has(e.to),
    );
  }, [def, edges, graphTopics, ghostIds]);

  // ---- Actions ----
  const setRole = useCallback((role: Role) => setState((s) => ({ ...s, role })), []);
  const chooseRoadmap = useCallback(
    (id: string) =>
      setState((s) => ({ ...s, role: "learner", activeRoadmapId: id })),
    [],
  );
  const complete = useCallback(
    (id: string) =>
      setState((s) =>
        s.known.includes(id) ? s : { ...s, known: [...s.known, id] },
      ),
    [],
  );
  const uncomplete = useCallback(
    (id: string) => setState((s) => ({ ...s, known: s.known.filter((k) => k !== id) })),
    [],
  );
  const acceptSuggestion = useCallback(
    (id: string) =>
      setState((s) =>
        s.accepted.includes(id) ? s : { ...s, accepted: [...s.accepted, id] },
      ),
    [],
  );
  const reset = useCallback(
    () => setState({ role: null, activeRoadmapId: null, known: [], accepted: [] }),
    [],
  );
  const leaveRoadmap = useCallback(
    () => setState((s) => ({ ...s, activeRoadmapId: null, known: [], accepted: [] })),
    [],
  );

  return {
    hydrated,
    role: state.role,
    def,
    known,
    accepted,
    topics,
    edges,
    graphTopics,
    graphEdges,
    ghostIds,
    revealedIds,
    suggestions,
    visibleTopics,
    setRole,
    chooseRoadmap,
    complete,
    uncomplete,
    acceptSuggestion,
    reset,
    leaveRoadmap,
  };
}
