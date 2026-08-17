import { useAbh } from "@abh/ui";
import { ArrowRight, Globe, Inbox, Plus, StickyNote } from "lucide-react";
import { useState } from "react";

/**
 * Capture — the inbox for things you grab. Its job is speed: one field, one
 * key, done. Connecting a capture to the map is a separate, later step, so
 * nothing blocks the save.
 */
export function CaptureSpace() {
  const captures = useAbh((s) => s.captures);
  const addCapture = useAbh((s) => s.addCapture);
  const explore = useAbh((s) => s.explore);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState<Set<string>>(new Set());

  const recent = [...captures].sort((a, b) => b.createdAt - a.createdAt);

  async function add() {
    const t = text.trim();
    if (!t) return;
    const isUrl = /^https?:\/\//i.test(t);
    await addCapture({
      kind: isUrl ? "page" : "note",
      title: isUrl ? t : t.slice(0, 80),
      url: isUrl ? t : undefined,
      text: isUrl ? "" : t,
    });
    setText("");
  }

  async function toBrain(c: (typeof recent)[number]) {
    await explore({ title: c.title || c.url || "Captured", why: c.text || c.url || "", domain: "everyday" });
    setConnected((s) => new Set(s).add(c.id));
  }

  return (
    <div className="h-full overflow-y-auto py-12">
     <div className="doc">
      <p className="t-eyebrow">Capture</p>
      <h1 className="t-title1 mt-2 text-balance">Catch it before it&apos;s gone.</h1>
      <p className="t-body mt-2.5 max-w-[34rem] text-muted">
        Paste a link or jot a note. It lands here instantly — connect it to your
        brain whenever you like.
      </p>

      {/* One field, one key. The primary action is unmistakable. */}
      <div className="mt-7 flex items-center gap-2 rounded-full bg-surface px-2 py-2 shadow-[var(--e2)] ring-1 ring-[var(--seam)] transition focus-within:ring-2 focus-within:ring-accent">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          placeholder="Paste a link or write a note…"
          className="min-w-0 flex-1 bg-transparent px-3 text-[15px] outline-none placeholder:text-subtle"
        />
        <button
          onClick={add}
          disabled={!text.trim()}
          className="pressable grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-accent-ink transition hover:brightness-[1.06] disabled:opacity-30"
          aria-label="Capture"
        >
          <Plus size={18} strokeWidth={2.5} />
        </button>
      </div>

      <div className="mt-9">
        <div className="mb-3 flex items-baseline justify-between px-1">
          <span className="t-eyebrow text-subtle">Inbox</span>
          {recent.length > 0 && <span className="t-foot text-subtle">{recent.length}</span>}
        </div>

        {recent.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-[18px] px-6 py-14 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl text-accent" style={{ background: "color-mix(in srgb, var(--accent) 12%, transparent)" }}>
              <Inbox size={26} strokeWidth={1.75} />
            </span>
            <div className="t-headline">Nothing captured yet</div>
            <p className="t-foot max-w-[22rem] text-muted">
              Save a link above, or use the browser extension to capture what
              you&apos;re reading without leaving the page.
            </p>
          </div>
        ) : (
          <div className="stack">
            {recent.map((c) => {
              const Icon = c.kind === "note" ? StickyNote : Globe;
              const done = connected.has(c.id);
              return (
                <div key={c.id} className="row-btn row-tight reveal-host cursor-default">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-surface-2 text-muted">
                    <Icon size={15} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14.5px] font-medium">
                      {c.title || c.url || "Untitled"}
                    </span>
                    {c.text && c.text !== (c.title || "") && (
                      <span className="mt-0.5 block truncate text-[12.5px] text-muted">{c.text}</span>
                    )}
                  </span>
                  <button
                    onClick={() => void toBrain(c)}
                    disabled={done}
                    className={`pressable shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition ${
                      done ? "text-known" : "reveal text-accent"
                    }`}
                    style={!done ? { background: "color-mix(in srgb, var(--accent) 14%, transparent)" } : undefined}
                  >
                    {done ? "In your brain" : <span className="flex items-center gap-1">Connect <ArrowRight size={13} /></span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
     </div>
    </div>
  );
}
