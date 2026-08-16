import { useAbh } from "@abh/ui";
import { useState } from "react";

/**
 * Capture — the inbox for things you grab (notes, links, and, once wired, clips
 * and screenshots from the browser extension). Each can be added into your brain
 * as a connected node. This is the "second brain catches everything" surface.
 */
export function CaptureSpace() {
  const captures = useAbh((s) => s.captures);
  const addCapture = useAbh((s) => s.addCapture);
  const explore = useAbh((s) => s.explore);
  const [text, setText] = useState("");

  const recent = [...captures].sort((a, b) => b.createdAt - a.createdAt);

  async function add() {
    const t = text.trim();
    if (!t) return;
    const isUrl = /^https?:\/\//i.test(t);
    await addCapture({ kind: isUrl ? "page" : "note", title: isUrl ? t : t.slice(0, 80), url: isUrl ? t : undefined, text: isUrl ? "" : t });
    setText("");
  }

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto px-5 py-8">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Capture</p>
      <h1 className="mt-2 text-2xl font-bold">Catch it before it's gone</h1>
      <p className="mt-2 text-sm text-muted">Paste a link or jot a note. Add it to your brain to connect it to what you already know. The browser extension drops clips here too.</p>

      <div className="mt-5 flex gap-2">
        <input value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder="Paste a link or write a note…" className="flex-1 rounded-lg border border-hairline bg-surface px-3 py-2.5 text-sm outline-none placeholder:text-subtle focus:border-accent" />
        <button onClick={add} className="rounded-lg bg-surface-2 px-4 py-2.5 text-sm font-semibold transition hover:bg-surface-2">Capture</button>
      </div>

      <div className="mt-6">
        {recent.length === 0 && <div className="rounded-xl border border-hairline bg-surface px-4 py-8 text-center text-sm text-subtle">Nothing captured yet.</div>}
        {recent.map((c) => (
          <div key={c.id} className="mb-2 flex items-center justify-between gap-3 rounded-xl border border-hairline bg-surface px-4 py-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="shrink-0 rounded border border-hairline px-1.5 py-0.5 text-[10px] uppercase text-muted">{c.kind}</span>
                <span className="truncate text-sm">{c.title || c.url || "Untitled"}</span>
              </div>
              {c.text && <div className="mt-1 line-clamp-2 text-xs text-subtle">{c.text}</div>}
            </div>
            <button onClick={() => void explore({ title: c.title || c.url || "Captured", why: c.text || c.url || "", domain: "everyday" })} className="shrink-0 rounded-md bg-surface-2 px-2.5 py-1.5 text-xs font-semibold transition hover:bg-surface-2">→ Brain</button>
          </div>
        ))}
      </div>
    </div>
  );
}
