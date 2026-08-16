import type { Capture, Suggestion, Topic } from "@abh/core";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { getStore, seedIfEmpty } from "../../lib/store";

interface Snapshot {
  available: Topic[];
  captures: Capture[];
  suggestions: Suggestion[];
  known: number;
  total: number;
}

export function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [newTopic, setNewTopic] = useState("");

  const refresh = useCallback(async () => {
    const store = getStore();
    await seedIfEmpty();
    const [available, captures, suggestions, g] = await Promise.all([
      store.availableNow(),
      store.export().then((s) => s.captures),
      store.pendingSuggestions(),
      store.graph(),
    ]);
    setSnap({
      available,
      captures: captures.sort((a, b) => b.createdAt - a.createdAt).slice(0, 5),
      suggestions,
      known: g.topics.filter((t) => t.progress === "known").length,
      total: g.topics.length,
    });
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function complete(id: string) {
    await getStore().complete(id);
    await refresh();
  }
  async function accept(id: string) {
    await getStore().acceptSuggestion(id);
    await refresh();
  }
  async function reject(id: string) {
    await getStore().rejectSuggestion(id);
    await refresh();
  }
  async function addTopic() {
    const title = newTopic.trim();
    if (!title) return;
    await getStore().addTopic({ title, origin: "user" });
    setNewTopic("");
    await refresh();
  }
  async function saveThisPage() {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    await getStore().addCapture({ kind: "page", title: tab?.title ?? "", url: tab?.url });
    await refresh();
  }

  if (!snap) {
    return <div className="loading">Loading your map…</div>;
  }

  const percent = snap.total ? Math.round((snap.known / snap.total) * 100) : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">A</span>
          <span>ABH</span>
        </div>
        <div className="progress">{percent}% known</div>
      </header>

      <button className="save-btn" onClick={saveThisPage}>
        + Save this page to my map
      </button>

      {snap.suggestions.length > 0 && (
        <section>
          <h2 className="section-title">AI suggests</h2>
          {snap.suggestions.map((s) => (
            <div key={s.id} className="card suggestion">
              <div className="card-title">
                {String((s.payload as { title?: string }).title ?? "Suggestion")}
              </div>
              {s.rationale && <div className="card-sub">{s.rationale}</div>}
              <div className="row">
                <button className="accept" onClick={() => accept(s.id)}>
                  Accept
                </button>
                <button className="reject" onClick={() => reject(s.id)}>
                  Dismiss
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section>
        <h2 className="section-title">Open to you now</h2>
        {snap.available.length === 0 && (
          <div className="empty">Nothing unlocked yet — add a topic below.</div>
        )}
        {snap.available.map((t) => (
          <div key={t.id} className="card">
            <div className="card-title">{t.title}</div>
            {t.whyItMatters && <div className="card-sub">{t.whyItMatters}</div>}
            <button className="done" onClick={() => complete(t.id)}>
              Mark known
            </button>
          </div>
        ))}
        <div className="row add-row">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder="Add something to learn…"
          />
          <button className="add" onClick={addTopic}>
            Add
          </button>
        </div>
      </section>

      {snap.captures.length > 0 && (
        <section>
          <h2 className="section-title">Recently captured</h2>
          {snap.captures.map((c) => (
            <a
              key={c.id}
              className="capture"
              href={c.url}
              target="_blank"
              rel="noreferrer"
            >
              <span className="capture-kind">{c.kind}</span>
              <span className="capture-title">{c.title || c.url || "Untitled"}</span>
            </a>
          ))}
        </section>
      )}

      <footer className="footer">Private — nothing leaves this device.</footer>
    </div>
  );
}
