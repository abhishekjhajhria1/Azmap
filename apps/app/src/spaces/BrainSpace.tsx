import { domainColor, GraphView, MasterDetail, STATUS, useAbh } from "@abh/ui";
import { Brain, Check, Maximize2, Plus, Search, Sparkles, X, ZoomIn, ZoomOut } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useCelebrate } from "../Celebration";
import { buildGraphData } from "../lib/graphData";

/**
 * The Mind Map / second brain — the superset. Everything you've learned,
 * explored, asked, or captured, in one graph. Rich and explorable.
 */
export function BrainSpace({ focusTopicId, onFocusHandled }: {
  focusTopicId?: string | null;
  onFocusHandled?: () => void;
} = {}) {
  const { topics, edges, statuses, proposals } = useAbh();
  const complete = useAbh((s) => s.complete);
  const setProgress = useAbh((s) => s.setProgress);
  const acceptProposal = useAbh((s) => s.acceptProposal);
  const celebrate = useCelebrate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [fitToken, setFitToken] = useState(0);
  const [zoomToken, setZoomToken] = useState(0);

  // The omni-bar can jump straight to a topic; open its inspector on arrival.
  useEffect(() => {
    if (!focusTopicId) return;
    setSelectedId(focusTopicId);
    onFocusHandled?.();
  }, [focusTopicId, onFocusHandled]);

  // Completing a topic is the payoff moment — always show what it opened.
  async function completeAndCelebrate(id: string) {
    const { unlocked, streak } = await complete(id);
    celebrate({ unlocked, streak, streakAdvanced: true });
  }

  const { nodes, links } = useMemo(
    () => buildGraphData(topics, edges, statuses, proposals),
    [topics, edges, statuses, proposals],
  );

  const topic = topics.find((t) => t.id === selectedId) ?? null;
  const proposal = proposals.find((p) => p.nodeId === selectedId) ?? null;
  const title = (id: string) => topics.find((t) => t.id === id)?.title ?? id;
  const needs = topic ? edges.filter((e) => e.to === topic.id).map((e) => e.from) : [];
  const unlocks = topic ? edges.filter((e) => e.from === topic.id).map((e) => e.to) : [];
  const status = topic ? statuses.get(topic.id) ?? "locked" : "locked";

  const inspector = (
    <div className="px-6 py-7">
      {proposal ? (
        <>
          <div className="t-eyebrow flex items-center gap-1.5 text-ai">
            <Sparkles size={12} /> AI suggests
          </div>
          <h2 className="t-title2 mt-3 text-balance">{proposal.title}</h2>
          <p className="t-body mt-3 text-muted">{proposal.why}</p>
          <button
            onClick={() => { void acceptProposal(proposal); setSelectedId(proposal.nodeId); }}
            className="pressable mt-7 flex w-full items-center justify-center gap-2 rounded-full bg-ai py-3 text-[14px] font-semibold text-white shadow-[var(--e2)] transition hover:brightness-110"
          >
            <Plus size={16} strokeWidth={2.5} /> Add to your map
          </button>
        </>
      ) : topic ? (
        <>
          <div className="t-eyebrow" style={{ color: domainColor(topic.tags[0]) }}>
            {topic.tags[0] ?? "topic"}
          </div>
          <h2 className="t-title2 mt-2.5 text-balance">{topic.title}</h2>
          <div className="mt-2.5 flex items-center gap-1.5 text-[12.5px] text-muted">
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: STATUS[status].dot }} />
            {STATUS[status].label}
          </div>
          {topic.whyItMatters && <p className="t-body mt-5 text-muted">{topic.whyItMatters}</p>}
          {needs.length > 0 && <Rel title="Needs first" ids={needs} title2={title} onSel={setSelectedId} />}
          {unlocks.length > 0 && <Rel title="Unlocks" ids={unlocks} title2={title} onSel={setSelectedId} />}
          <div className="mt-8">
            {status === "known" ? (
              <button
                onClick={() => void setProgress(topic.id, "not_started")}
                className="pressable flex w-full items-center justify-center gap-2 rounded-full bg-surface-2 py-3 text-[14px] font-semibold text-fg"
              >
                <Check size={16} className="text-known" /> Known <span className="text-muted">· undo</span>
              </button>
            ) : (
              <button
                onClick={() => void completeAndCelebrate(topic.id)}
                disabled={status === "locked"}
                className="pressable flex w-full items-center justify-center gap-2 rounded-full bg-accent py-3 text-[14px] font-semibold text-accent-ink shadow-[var(--e2)] transition hover:brightness-[1.06] disabled:opacity-40 disabled:shadow-none"
              >
                <Check size={16} /> Mark known
              </button>
            )}
            {status === "locked" && (
              <p className="t-foot mt-2.5 text-center text-subtle">Clear its prerequisites to open this</p>
            )}
          </div>
        </>
      ) : null}
    </div>
  );

  const matches = query.trim()
    ? topics.filter((t) => t.title.toLowerCase().includes(query.trim().toLowerCase())).length
    : null;

  const master = (
    <div className="absolute inset-0">
      <div className="bg-grid absolute inset-0 opacity-40" />
      {nodes.length === 0 ? (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <span
              className="mx-auto grid h-14 w-14 place-items-center rounded-[18px] text-ai"
              style={{ background: "color-mix(in srgb, var(--ai) 12%, transparent)" }}
            >
              <Brain size={26} strokeWidth={1.75} />
            </span>
            <h2 className="t-title3 mt-4">Your brain is empty — for now</h2>
            <p className="t-tight mx-auto mt-2 max-w-[30rem] text-muted">
              Everything you learn lands here and connects to what you already know.
            </p>
            <button
              onClick={() => document.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
              className="pressable mt-5 inline-flex items-center gap-2 rounded-full bg-accent px-5 py-2.5 text-[13.5px] font-semibold text-accent-ink shadow-[var(--e2)] hover:brightness-[1.06]"
            >
              <Search size={15} /> Ask how something works
            </button>
          </div>
        </div>
      ) : (
        <GraphView
          nodes={nodes} links={links} selectedId={selectedId} onSelect={setSelectedId}
          query={query} fitToken={fitToken} zoomToken={zoomToken}
          className="absolute inset-0 h-full w-full"
        />
      )}

      {/* One floating toolbar, not two clusters. Search and camera belong to the
          same job — reading the map — so they share a single piece of chrome
          with a seam between them. */}
      {nodes.length > 0 && (
        <div
          className="float float--pill absolute flex items-center py-1.5 pl-3.5 pr-1.5"
          style={{ left: "var(--float-inset)", bottom: "calc(var(--float-inset) + env(safe-area-inset-bottom, 0px))" }}
        >
          <Search size={15} className="shrink-0 text-subtle" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find on your map…"
            className="ml-2 w-32 min-w-0 bg-transparent text-[13px] outline-none placeholder:text-subtle sm:w-44"
          />
          {query && (
            <>
              <span className="t-meta shrink-0 tabular-nums">{matches}</span>
              <button onClick={() => setQuery("")} className="ml-1.5 shrink-0 text-subtle hover:text-fg" aria-label="Clear search">
                <X size={14} />
              </button>
            </>
          )}
          <span className="mx-2 h-5 w-px shrink-0" style={{ background: "var(--glass-border)" }} />
          <CtlBtn label="Zoom in" onClick={() => setZoomToken((z) => z + 1)}><ZoomIn size={16} /></CtlBtn>
          <CtlBtn label="Zoom out" onClick={() => setZoomToken((z) => z - 1)}><ZoomOut size={16} /></CtlBtn>
          <CtlBtn label="Fit to screen" onClick={() => setFitToken((f) => f + 1)}><Maximize2 size={15} /></CtlBtn>
        </div>
      )}
    </div>
  );

  return <MasterDetail master={master} detail={inspector} detailOpen={selectedId != null} onCloseDetail={() => setSelectedId(null)} />;
}

function CtlBtn({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="pressable grid h-9 w-9 place-items-center rounded-full text-muted transition-colors hover:bg-[color-mix(in_srgb,var(--fg)_7%,transparent)] hover:text-fg"
    >
      {children}
    </button>
  );
}

function Rel({ title, ids, title2, onSel }: { title: string; ids: string[]; title2: (id: string) => string; onSel: (id: string) => void }) {
  return (
    <div className="mt-6">
      <div className="t-eyebrow mb-2 text-subtle">{title}</div>
      <div className="flex flex-wrap gap-1.5">
        {ids.map((id) => (
          <button
            key={id}
            onClick={() => onSel(id)}
            className="pressable max-w-full truncate rounded-full bg-surface-2 px-3 py-1.5 text-[12.5px] font-medium text-fg transition hover:brightness-110"
          >
            {title2(id)}
          </button>
        ))}
      </div>
    </div>
  );
}
