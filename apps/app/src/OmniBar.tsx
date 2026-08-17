import { useAbh } from "@abh/ui";
import {
  ArrowRight, Brain, Compass, Inbox, LayoutPanelTop, Moon, Search, Smartphone, Sparkles, Users,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { type Explainer, searchExplainers } from "./lib/howThingsWork";

/**
 * OmniBar — one floating bar for everything.
 *
 * Searches YOUR map (topics + captures), the how-things-work library, and runs
 * commands. So nothing ever requires opening another tab or leaving the view:
 * ⌘K from anywhere, type, act.
 */

type Kind = "topic" | "capture" | "explainer" | "command" | "create";

interface Result {
  id: string;
  kind: Kind;
  title: string;
  sub?: string;
  icon: ReactNode;
  run: () => void | Promise<void>;
}

const GROUP_LABEL: Record<Kind, string> = {
  topic: "Your map",
  capture: "Captures",
  explainer: "How things work",
  command: "Commands",
  create: "Create",
};
const GROUP_ORDER: Kind[] = ["create", "topic", "capture", "explainer", "command"];

interface Props {
  onGoToSpace: (id: string) => void;
  onSelectTopic: (id: string) => void;
  onOpenDevices: () => void;
}

export function OmniBar({ onGoToSpace, onSelectTopic, onOpenDevices }: Props) {
  const topics = useAbh((s) => s.topics);
  const captures = useAbh((s) => s.captures);
  const explore = useAbh((s) => s.explore);
  const profile = useAbh((s) => s.profile);
  const updateProfile = useAbh((s) => s.updateProfile);

  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [cursor, setCursor] = useState(0);
  const [reading, setReading] = useState<Explainer | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

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
    if (!open) { setQ(""); setCursor(0); setReading(null); }
  }, [open]);

  const toast = (m: string) => { setFlash(m); window.setTimeout(() => setFlash(null), 1900); };
  const close = () => setOpen(false);

  const results = useMemo<Result[]>(() => {
    const query = q.trim().toLowerCase();
    const out: Result[] = [];

    // Your own map first — this is what people look for most.
    for (const t of topics) {
      if (query && !t.title.toLowerCase().includes(query)) continue;
      out.push({
        id: `t:${t.id}`, kind: "topic", title: t.title,
        sub: t.whyItMatters || undefined,
        icon: <Brain size={15} />,
        run: () => { onGoToSpace("brain"); onSelectTopic(t.id); close(); },
      });
    }
    for (const c of captures) {
      const label = c.title || c.url || "Untitled";
      if (query && !label.toLowerCase().includes(query)) continue;
      out.push({
        id: `c:${c.id}`, kind: "capture", title: label, sub: c.url,
        icon: <Inbox size={15} />,
        run: () => { onGoToSpace("capture"); close(); },
      });
    }
    for (const e of searchExplainers(q)) {
      out.push({
        id: `e:${e.id}`, kind: "explainer", title: e.q, sub: e.blurb,
        icon: <Sparkles size={15} />,
        run: () => setReading(e),
      });
    }

    const cmds: Result[] = [
      { id: "go:brain", title: "Go to Brain", icon: <Brain size={15} />, run: () => { onGoToSpace("brain"); close(); } },
      { id: "go:roadmap", title: "Go to Roadmap", icon: <Compass size={15} />, run: () => { onGoToSpace("roadmap"); close(); } },
      { id: "go:capture", title: "Go to Capture", icon: <Inbox size={15} />, run: () => { onGoToSpace("capture"); close(); } },
      { id: "go:guardian", title: "Go to Guardian", icon: <Users size={15} />, run: () => { onGoToSpace("guardian"); close(); } },
      {
        id: "cmd:dock", title: `Move dock to ${dockTarget(profile?.dockPosition)}`,
        icon: <LayoutPanelTop size={15} />,
        run: async () => { await updateProfile({ dockPosition: dockTarget(profile?.dockPosition) }); toast("Dock moved"); close(); },
      },
      { id: "cmd:devices", title: "Pair a device", icon: <Smartphone size={15} />,
        run: () => { onOpenDevices(); close(); } },
      { id: "cmd:theme", title: "Toggle light / dark", icon: <Moon size={15} />,
        run: () => { document.documentElement.setAttribute("data-theme",
          getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() === "#0b0e10" ? "light" : "dark"); close(); } },
    ].map((c) => ({ ...c, kind: "command" as const }));

    for (const c of cmds) {
      if (query && !c.title.toLowerCase().includes(query)) continue;
      out.push(c);
    }

    // Anything you type can always become a node — never a dead end.
    if (query) {
      out.unshift({
        id: "create", kind: "create", title: `Add “${q.trim()}” to your brain`,
        sub: "AI explainer coming soon — the node joins your map now",
        icon: <ArrowRight size={15} />,
        run: async () => {
          await explore({ title: q.trim().replace(/\?$/, ""), why: "", domain: "everyday" });
          toast("Added to your brain"); close();
        },
      });
    }
    return out;
  }, [q, topics, captures, profile, onGoToSpace, onSelectTopic, onOpenDevices, explore, updateProfile]);

  const grouped = useMemo(() => {
    const m = new Map<Kind, Result[]>();
    for (const r of results) {
      if (!m.has(r.kind)) m.set(r.kind, []);
      m.get(r.kind)!.push(r);
    }
    return GROUP_ORDER.filter((k) => m.has(k)).map((k) => [k, m.get(k)!.slice(0, k === "explainer" ? 4 : 6)] as const);
  }, [results]);

  const flat = useMemo(() => grouped.flatMap(([, rs]) => rs), [grouped]);

  useEffect(() => { setCursor(0); }, [q]);
  useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-idx="${cursor}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [cursor]);

  function onInputKey(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, flat.length - 1)); }
    if (e.key === "ArrowUp") { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
    if (e.key === "Enter") { e.preventDefault(); void flat[cursor]?.run(); }
  }

  return (
    <>
      {/* The trigger floats, like everything else. */}
      <button
        onClick={() => setOpen(true)}
        className="float float--pill pressable fixed z-40 flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-muted"
        style={{ right: "var(--float-inset)", bottom: "calc(var(--float-inset) + env(safe-area-inset-bottom, 0px) + 76px)" }}
      >
        <Search size={15} />
        Search or ask
        <kbd className="ml-1 hidden rounded px-1.5 py-0.5 text-[10px] text-subtle ring-1 ring-[var(--glass-border)] sm:inline">⌘K</kbd>
      </button>

      {flash && (
        <div className="float float--pill fixed left-1/2 z-[60] -translate-x-1/2 px-4 py-2.5 text-[13px] text-accent"
             style={{ bottom: "calc(var(--float-inset) + 140px)" }}>
          {flash}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/25 p-4 pt-[10vh] backdrop-blur-[2px]" onClick={close}>
          <div className="float w-full max-w-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-5 py-4">
              <Search size={17} className="shrink-0 text-subtle" />
              <input
                autoFocus value={q}
                onChange={(e) => { setQ(e.target.value); setReading(null); }}
                onKeyDown={onInputKey}
                placeholder="Search your map, ask how something works, or run a command…"
                className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-subtle"
              />
              <button onClick={close} className="shrink-0 rounded-md px-1.5 text-[11px] text-subtle hover:text-fg">esc</button>
            </div>

            <div className="h-px w-full bg-[var(--glass-border)]" />

            <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
              {reading ? (
                <div className="p-3">
                  <button onClick={() => setReading(null)} className="mb-3 text-[12px] text-subtle hover:text-fg">← back</button>
                  <h3 className="t-title3">{reading.title}</h3>
                  <p className="t-body mt-2 text-muted">{reading.blurb}</p>
                  <button
                    onClick={async () => {
                      await explore({ title: reading.title, why: reading.blurb, domain: reading.domain });
                      toast(`Added “${reading.title}”`); close();
                    }}
                    className="pressable mt-5 rounded-full bg-ai px-4 py-2 text-[13px] font-semibold text-white"
                  >
                    Add to my brain
                  </button>
                </div>
              ) : flat.length === 0 ? (
                <p className="px-3 py-8 text-center text-[13px] text-subtle">No matches — type to add it to your brain.</p>
              ) : (
                grouped.map(([kind, rs]) => (
                  <div key={kind} className="mb-1.5">
                    <div className="t-eyebrow px-3 py-1.5 text-subtle">{GROUP_LABEL[kind]}</div>
                    {rs.map((r) => {
                      const idx = flat.indexOf(r);
                      const on = idx === cursor;
                      return (
                        <button
                          key={r.id} data-idx={idx}
                          onMouseEnter={() => setCursor(idx)}
                          onClick={() => void r.run()}
                          className="flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left"
                          style={on ? { background: "color-mix(in srgb, var(--accent) 13%, transparent)" } : undefined}
                        >
                          <span className={`shrink-0 ${on ? "text-accent" : "text-subtle"}`}>{r.icon}</span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[14px] font-medium">{r.title}</span>
                            {r.sub && <span className="mt-0.5 block truncate text-[12px] text-muted">{r.sub}</span>}
                          </span>
                          {on && <span className="t-foot shrink-0 text-subtle">↵</span>}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function dockTarget(current: string | undefined): "top" | "bottom" {
  return current === "bottom" ? "top" : "bottom";
}
