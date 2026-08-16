import { useAbh } from "@abh/ui";
import { useEffect, useMemo, useState } from "react";
import { type Explainer, searchExplainers } from "./lib/howThingsWork";

/**
 * Ask Anything — the curious layer, open on every space (⌘K or the button).
 * Whatever you open joins your second brain via the real store. The AI answer
 * is the coming-soon piece; exploring and evolving your map works today.
 */
export function AskAnything() {
  const explore = useAbh((s) => s.explore);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Explainer | null>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => { if (!open) { setQuery(""); setSelected(null); setAddedId(null); } }, [open]);

  const results = useMemo(() => searchExplainers(query), [query]);
  const toast = (m: string) => { setFlash(m); window.setTimeout(() => setFlash(null), 2000); };

  async function addExplainer(e: Explainer) {
    const id = await explore({ title: e.title, why: e.blurb, domain: e.domain });
    setSelected(e); setAddedId(id); toast(`Added “${e.title}” to your brain`);
  }
  async function addSpark(q: string, domain: string) {
    await explore({ title: q.replace(/\?$/, ""), why: "You asked this while exploring — the AI answer is coming soon.", domain, parentId: addedId ?? undefined });
    toast("Added to your brain");
  }
  async function addFreeform() {
    const q = query.trim(); if (!q) return;
    await explore({ title: q.replace(/\?$/, ""), why: "You wanted to understand this — the AI explainer is coming soon.", domain: "everyday" });
    toast(`Added “${q}” to your brain`); setQuery("");
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-20 right-4 z-40 flex items-center gap-2 rounded-full border border-violet/50 bg-forest-900/90 px-4 py-2.5 text-sm font-medium text-violet-soft shadow-xl backdrop-blur transition hover:border-violet md:bottom-4"
      >
        ✦ Ask anything
        <kbd className="ml-1 hidden rounded border border-forest-700 px-1.5 py-0.5 text-[10px] text-forest-400 sm:inline">⌘K</kbd>
      </button>

      {flash && <div className="fixed bottom-32 right-4 z-50 rounded-lg border border-violet/40 bg-forest-900/95 px-4 py-2.5 text-sm text-violet-soft shadow-xl md:bottom-16">✦ {flash}</div>}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-forest-950/70 p-4 pt-[8vh] backdrop-blur-sm" onClick={() => setOpen(false)}>
          <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-forest-700/70 bg-forest-900 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-forest-800 px-4 py-3">
              <span className="text-violet">✦</span>
              <input autoFocus value={query} onChange={(e) => { setQuery(e.target.value); setSelected(null); }} onKeyDown={(e) => e.key === "Enter" && !selected && results.length === 0 && addFreeform()} placeholder="Ask how anything works — or search…" className="flex-1 bg-transparent text-base outline-none placeholder:text-forest-500" />
              <button onClick={() => setOpen(false)} className="text-xs text-forest-500 hover:text-parchment">esc</button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-2">
              {selected ? (
                <div className="p-3">
                  <button onClick={() => { setSelected(null); setAddedId(null); }} className="mb-3 text-xs text-forest-400 hover:text-parchment">← back</button>
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-lg font-semibold">{selected.title}</h3>
                    {addedId && <span className="shrink-0 rounded-full bg-forest-700/60 px-2.5 py-1 text-[11px] font-medium text-forest-200">✓ In your brain</span>}
                  </div>
                  <p className="mt-2 text-sm leading-relaxed text-forest-200">{selected.blurb}</p>
                  <p className="mt-2 text-[11px] text-forest-500">A curated explainer — the personalised AI version is coming soon.</p>
                  <div className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-violet">Keep exploring</div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {selected.sparks.map((s) => (
                      <button key={s} onClick={() => addSpark(s, selected.domain)} className="rounded-full border border-forest-700 bg-forest-900/60 px-3 py-1.5 text-xs text-forest-100 transition hover:border-violet/60 hover:text-violet-soft">{s} <span className="text-violet">+</span></button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  {query.trim() && (
                    <button onClick={addFreeform} className="mb-2 flex w-full items-center gap-3 rounded-lg border border-violet/30 bg-violet/5 px-3 py-3 text-left transition hover:border-violet/60">
                      <span className="grid h-8 w-8 place-items-center rounded-full bg-violet/20 text-violet">+</span>
                      <span><span className="block text-sm font-medium text-violet-soft">Add “{query.trim()}” to your brain</span><span className="block text-xs text-forest-400">AI explainer coming soon — the node joins your brain now</span></span>
                    </button>
                  )}
                  <div className="px-1 py-1 text-[11px] font-semibold uppercase tracking-wider text-forest-400">{query.trim() ? "How things work" : "Explore how things work"}</div>
                  <div className="grid gap-1.5 sm:grid-cols-2">
                    {results.map((e) => (
                      <button key={e.id} onClick={() => addExplainer(e)} className="rounded-lg border border-forest-800 bg-forest-950/40 px-3 py-2.5 text-left transition hover:border-forest-600 hover:bg-forest-900">
                        <div className="text-sm font-medium">{e.q}</div>
                        <div className="mt-0.5 line-clamp-2 text-xs text-forest-400">{e.blurb}</div>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <div className="border-t border-forest-800 px-4 py-2 text-center text-[11px] text-forest-500">Everyone's free to explore — whatever you open joins your brain.</div>
          </div>
        </div>
      )}
    </>
  );
}
