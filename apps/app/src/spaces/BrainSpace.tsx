import { domainColor, GraphView, MasterDetail, STATUS, useAbh } from "@abh/ui";
import { useMemo, useState } from "react";
import { buildGraphData } from "../lib/graphData";

/**
 * The Mind Map / second brain — the superset. Everything you've learned,
 * explored, asked, or captured, in one graph. Rich and explorable.
 */
export function BrainSpace() {
  const { topics, edges, statuses, proposals } = useAbh();
  const complete = useAbh((s) => s.complete);
  const setProgress = useAbh((s) => s.setProgress);
  const acceptProposal = useAbh((s) => s.acceptProposal);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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
    <div className="p-5">
      {proposal ? (
        <>
          <div className="mb-2 inline-flex rounded-full bg-ai/10 px-2.5 py-1 text-[11px] font-medium text-ai">✦ AI suggests</div>
          <h2 className="text-xl font-semibold">{proposal.title}</h2>
          <p className="mt-3 text-sm leading-relaxed text-fg">{proposal.why}</p>
          <button onClick={() => { void acceptProposal(proposal); setSelectedId(proposal.nodeId); }} className="mt-6 w-full rounded-lg bg-ai py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110">+ Add to your map</button>
        </>
      ) : topic ? (
        <>
          <div className="mb-2 inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium" style={{ background: `${domainColor(topic.tags[0])}22`, color: domainColor(topic.tags[0]) }}>{topic.tags[0] ?? "topic"}</div>
          <h2 className="text-xl font-semibold">{topic.title}</h2>
          <div className="mt-2 flex items-center gap-1.5 text-xs text-muted"><span className="h-2 w-2 rounded-full" style={{ background: STATUS[status].dot }} />{STATUS[status].label}</div>
          {topic.whyItMatters && <p className="mt-4 text-sm leading-relaxed text-fg">{topic.whyItMatters}</p>}
          {needs.length > 0 && <Rel title="Needs first" ids={needs} title2={title} onSel={setSelectedId} />}
          {unlocks.length > 0 && <Rel title="Unlocks" ids={unlocks} title2={title} onSel={setSelectedId} />}
          <div className="mt-6">
            {status === "known" ? (
              <button onClick={() => void setProgress(topic.id, "not_started")} className="w-full rounded-lg border border-hairline py-2.5 text-sm font-semibold text-fg transition hover:bg-surface">✓ Known — undo</button>
            ) : (
              <button onClick={() => void complete(topic.id)} disabled={status === "locked"} className="w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-accent-ink transition hover:brightness-110 disabled:opacity-40">Mark known</button>
            )}
          </div>
        </>
      ) : null}
    </div>
  );

  const master = (
    <div className="absolute inset-0">
      <div className="bg-grid absolute inset-0 opacity-40" />
      {nodes.length === 0 ? (
        <div className="grid h-full place-items-center px-6 text-center">
          <div>
            <div className="text-4xl">🧠</div>
            <h2 className="mt-3 text-xl font-semibold">Your brain is empty — for now</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted">Ask how something works, or start a roadmap. Everything you learn lands here and connects.</p>
          </div>
        </div>
      ) : (
        <GraphView nodes={nodes} links={links} selectedId={selectedId} onSelect={setSelectedId} className="absolute inset-0 h-full w-full" />
      )}
      <div className="glass pointer-events-none absolute left-3 top-3 rounded-lg px-3 py-1.5 text-[11px] text-subtle">Your second brain · {topics.length} topics</div>
    </div>
  );

  return <MasterDetail master={master} detail={inspector} detailOpen={selectedId != null} onCloseDetail={() => setSelectedId(null)} />;
}

function Rel({ title, ids, title2, onSel }: { title: string; ids: string[]; title2: (id: string) => string; onSel: (id: string) => void }) {
  return (
    <div className="mt-5">
      <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-accent">{title}</div>
      <div className="flex flex-col gap-1">
        {ids.map((id) => (
          <button key={id} onClick={() => onSel(id)} className="truncate rounded-md border border-hairline px-2.5 py-1.5 text-left text-[13px] text-fg transition hover:border-hairline hover:bg-surface">{title2(id)}</button>
        ))}
      </div>
    </div>
  );
}
