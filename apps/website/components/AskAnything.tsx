"use client";

/**
 * Ask Anything — the curious layer, available on every plot.
 *
 * Open it with ⌘K / Ctrl-K or the floating button. Browse "how things work"
 * explainers, or ask anything at all; whatever you open joins your map, and
 * follow-up "sparks" let curiosity branch. The actual AI answer is the
 * coming-soon piece — but exploring and evolving your map works today.
 *
 * `onAdd` creates a node on the caller's map and returns its id, so a spark can
 * be linked as a child of the thing you were just reading.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import { type Explainer, searchExplainers } from "@/lib/howThingsWork";

interface Props {
  onAdd: (input: {
    title: string;
    why?: string;
    domain?: string;
    parentId?: string;
  }) => string;
}

export default function AskAnything({ onAdd }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Explainer | null>(null);
  const [addedNodeId, setAddedNodeId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setSelected(null);
      setAddedNodeId(null);
    }
  }, [open]);

  const results = useMemo(() => searchExplainers(query), [query]);

  const toast = useCallback((msg: string) => {
    setFlash(msg);
    window.setTimeout(() => setFlash(null), 2200);
  }, []);

  function addExplainer(e: Explainer) {
    const id = onAdd({ title: e.title, why: e.blurb, domain: e.domain });
    setSelected(e);
    setAddedNodeId(id);
    toast(`Added “${e.title}” to your map`);
  }

  function addSpark(question: string, domain: string) {
    onAdd({
      title: question.replace(/\?$/, ""),
      why: "You asked this while exploring — the AI answer is coming soon.",
      domain,
      parentId: addedNodeId ?? undefined,
    });
    toast("Added to your map");
  }

  function addFreeform() {
    const q = query.trim();
    if (!q) return;
    onAdd({
      title: q.replace(/\?$/, ""),
      why: "You wanted to understand this — the AI explainer is coming soon.",
      domain: "everyday",
    });
    toast(`Added “${q}” to your map`);
    setQuery("");
  }

  return (
    <>
      {/* Floating trigger — present on every plot. */}
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-[#c77dff55] bg-forest-900/90 px-4 py-2.5 text-sm font-medium text-[#d8b6ff] shadow-xl backdrop-blur transition hover:border-[#c77dff] hover:bg-forest-900"
      >
        <span>✦</span> Ask anything
        <kbd className="ml-1 hidden rounded border border-forest-700 px-1.5 py-0.5 text-[10px] text-forest-400 sm:inline">
          ⌘K
        </kbd>
      </button>

      {flash && (
        <div className="fixed bottom-20 right-5 z-50 rounded-lg border border-[#c77dff44] bg-forest-900/95 px-4 py-2.5 text-sm text-[#d8b6ff] shadow-xl">
          ✦ {flash}
        </div>
      )}

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-forest-950/70 p-4 pt-[8vh] backdrop-blur-sm"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-forest-700/70 bg-forest-900 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search bar */}
            <div className="flex items-center gap-3 border-b border-forest-800 px-4 py-3">
              <span className="text-[#c77dff]">✦</span>
              <input
                autoFocus
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && !selected && results.length === 0 && addFreeform()}
                placeholder="Ask how anything works — or search…"
                className="flex-1 bg-transparent text-base text-parchment outline-none placeholder:text-forest-500"
              />
              <button onClick={() => setOpen(false)} className="text-xs text-forest-500 hover:text-parchment">
                esc
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {selected ? (
                <ExplainerDetail
                  explainer={selected}
                  added={addedNodeId != null}
                  onBack={() => { setSelected(null); setAddedNodeId(null); }}
                  onAddSpark={(q) => addSpark(q, selected.domain)}
                />
              ) : (
                <>
                  {query.trim() && (
                    <button
                      onClick={addFreeform}
                      className="mb-2 flex w-full items-center gap-3 rounded-lg border border-[#c77dff33] bg-[#c77dff0d] px-3 py-3 text-left transition hover:border-[#c77dff66]"
                    >
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-[#c77dff22] text-[#c77dff]">+</span>
                      <span>
                        <span className="block text-sm font-medium text-[#d8b6ff]">Add “{query.trim()}” to your map</span>
                        <span className="block text-xs text-forest-400">AI explainer coming soon — the node joins your map now</span>
                      </span>
                    </button>
                  )}

                  <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest-400">
                    {query.trim() ? "How things work" : "Explore how things work"}
                  </div>
                  {results.length === 0 && (
                    <p className="px-2 py-6 text-center text-sm text-forest-500">
                      Nothing in the library yet — add it above and it joins your map.
                    </p>
                  )}
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {results.map((e) => (
                      <button
                        key={e.id}
                        onClick={() => addExplainer(e)}
                        className="rounded-lg border border-forest-800 bg-forest-950/40 px-3 py-2.5 text-left transition hover:border-forest-600 hover:bg-forest-900"
                      >
                        <div className="text-sm font-medium text-parchment">{e.q}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-forest-400">{e.blurb}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-forest-800 px-4 py-2 text-center text-[11px] text-forest-500">
              Everyone&apos;s free to explore — whatever you open joins your map.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ExplainerDetail({
  explainer,
  added,
  onBack,
  onAddSpark,
}: {
  explainer: Explainer;
  added: boolean;
  onBack: () => void;
  onAddSpark: (q: string) => void;
}) {
  return (
    <div className="p-3">
      <button onClick={onBack} className="mb-3 text-xs text-forest-400 hover:text-parchment">
        ← back
      </button>
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-parchment">{explainer.title}</h3>
        {added && (
          <span className="shrink-0 rounded-full bg-forest-700/60 px-2.5 py-1 text-[11px] font-medium text-forest-200">
            ✓ On your map
          </span>
        )}
      </div>
      <p className="mt-2 text-sm leading-relaxed text-forest-200">{explainer.blurb}</p>
      <p className="mt-2 text-[11px] text-forest-500">
        A curated explainer — the personalised AI version is coming soon.
      </p>

      <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-[#c77dff]">
        Keep exploring
      </div>
      <div className="mt-2 flex flex-wrap gap-2">
        {explainer.sparks.map((s) => (
          <button
            key={s}
            onClick={() => onAddSpark(s)}
            className="rounded-full border border-forest-700 bg-forest-900/60 px-3 py-1.5 text-xs text-forest-100 transition hover:border-[#c77dff66] hover:text-[#d8b6ff]"
          >
            {s} <span className="text-[#c77dff]">+</span>
          </button>
        ))}
      </div>
    </div>
  );
}
