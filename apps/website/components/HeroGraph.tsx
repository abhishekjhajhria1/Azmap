"use client";

import { useState } from "react";
import GraphCanvas from "@/components/GraphCanvas";
import {
  buildSampleEdges,
  buildSampleTopics,
  DOMAIN_COLOR,
  domainOf,
} from "@/lib/sampleMap";
import type { Topic } from "@abh/core";

const EDGES = buildSampleEdges();

/**
 * The hero's live graph — the real product engine, playable right on the
 * landing page. Click a glowing node to complete it and watch the map react.
 */
export default function HeroGraph() {
  const [topics, setTopics] = useState<Topic[]>(buildSampleTopics);

  function complete(id: string) {
    setTopics((prev) =>
      prev.map((t) => (t.id === id ? { ...t, progress: "known" } : t)),
    );
  }

  return (
    <div className="glass relative overflow-hidden rounded-2xl shadow-2xl">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-2.5">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="h-2 w-2 rounded-full bg-accent animate-pulse-soft" />
          Live map — drag, zoom, tap a glowing node
        </div>
        <a href="#waitlist" className="text-xs font-medium text-accent transition hover:brightness-110">
          Get early access →
        </a>
      </div>
      <div className="relative h-[420px]">
        <GraphCanvas
          topics={topics}
          edges={EDGES}
          colorOf={(t) => DOMAIN_COLOR[domainOf(t)]}
          onComplete={complete}
          className="absolute inset-0 h-full w-full"
        />
      </div>
    </div>
  );
}
