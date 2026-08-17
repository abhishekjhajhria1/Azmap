import { useAbh } from "@abh/ui";
import type { ProposedLink } from "@abh/core";
import { ArrowRight, Check, Globe, Inbox, Link2, Plus, StickyNote, X } from "lucide-react";
import { useState } from "react";

/**
 * Capture — the inbox, and the part that makes it a brain.
 *
 * Catching things is the easy half and was already solved: one field, one key,
 * done. The hard half is that a pile of forty saved articles is a pile, not a
 * brain. What makes it worth keeping is that the things in it find each other —
 * so the map's own suggestions sit directly above the inbox, where the pile you
 * haven't filed is visible in the same glance as the offer to file it.
 */
export function CaptureSpace() {
  const captures = useAbh((s) => s.captures);
  const topics = useAbh((s) => s.topics);
  const connections = useAbh((s) => s.connections);
  const addCapture = useAbh((s) => s.addCapture);
  const acceptLink = useAbh((s) => s.acceptLink);
  const dismissLink = useAbh((s) => s.dismissLink);
  const explore = useAbh((s) => s.explore);
  const [text, setText] = useState("");
  const [connected, setConnected] = useState<Set<string>>(new Set());

  const recent = [...captures].sort((a, b) => b.createdAt - a.createdAt);
  const titleOf = (id: string) => topics.find((t) => t.id === id)?.title ?? "";

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

      {/* The brain noticing something. Above the inbox because it's the part
          that's worth acting on — the pile below will still be there. */}
      {connections.length > 0 && (
        <div className="mt-9">
          <div className="mb-3 flex items-baseline gap-2 px-1">
            <span className="t-eyebrow text-subtle">Connections</span>
            <span className="t-foot text-subtle">found on this device</span>
          </div>
          <div className="stack">
            {connections.map((link) => (
              <ConnectionRow
                key={`${link.kind}:${link.fromId}:${link.toId}:${link.draft?.title ?? ""}`}
                link={link}
                captureTitle={captures.find((c) => c.id === link.fromId)?.title ?? ""}
                titleOf={titleOf}
                onAccept={() => void acceptLink(link)}
                onDismiss={() => dismissLink(link)}
              />
            ))}
          </div>
        </div>
      )}

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

/**
 * One proposed connection.
 *
 * Built around the sentence, not the buttons. An unexplained suggestion is one
 * the user has to audit themselves, which costs more than it saves — so the
 * reason the app noticed ("shares *gradient* and *descent*") is the row's
 * content, and accept/dismiss are quiet marks at the end of it.
 *
 * No confidence score on screen. It's a ranking signal, not a probability, and
 * showing "72%" would invite people to trust a number that doesn't mean what it
 * appears to mean.
 */
function ConnectionRow({
  link,
  captureTitle,
  titleOf,
  onAccept,
  onDismiss,
}: {
  link: ProposedLink;
  captureTitle: string;
  titleOf: (id: string) => string;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const headline =
    link.kind === "capture-newtopic"
      ? `Add “${link.draft?.title ?? ""}” to your map`
      : link.kind === "capture-topic"
        ? `File “${truncate(captureTitle)}” under ${titleOf(link.toId)}`
        : `Link ${titleOf(link.fromId)} → ${titleOf(link.toId)}`;

  return (
    <div className="row-btn row-tight reveal-host cursor-default">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-xl text-ai"
        style={{ background: "color-mix(in srgb, var(--ai) 13%, transparent)" }}
      >
        <Link2 size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14.5px] font-medium">{headline}</span>
        <span className="mt-0.5 block truncate text-[12.5px] text-muted">{link.why}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          onClick={onDismiss}
          aria-label="Dismiss this suggestion"
          className="reveal pressable grid h-8 w-8 place-items-center rounded-full text-subtle hover:text-fg"
        >
          <X size={15} />
        </button>
        <button
          onClick={onAccept}
          aria-label={headline}
          className="pressable grid h-8 w-8 place-items-center rounded-full text-accent transition hover:brightness-110"
          style={{ background: "color-mix(in srgb, var(--accent) 14%, transparent)" }}
        >
          <Check size={15} />
        </button>
      </span>
    </div>
  );
}

function truncate(s: string, n = 42): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}
