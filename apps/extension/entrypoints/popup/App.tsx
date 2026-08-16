import { streakIsLive, type Capture, type Suggestion, type Topic } from "@abh/core";
import {
  BookOpen, Check, Flame, Globe, Inbox, Plus, ShieldCheck, Sparkles, StickyNote, TextQuote,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { browser } from "wxt/browser";
import { getStore, seedIfEmpty } from "../../lib/store";

/**
 * The popup's job is capture — one tap, never steal focus — with just enough
 * of the map to answer "what's open to me now?".
 *
 * It shares the product's design tokens, so it follows the same light/dark
 * system as the app rather than being a separate dark-only surface.
 */

interface Snapshot {
  available: Topic[];
  captures: Capture[];
  suggestions: Suggestion[];
  known: number;
  total: number;
  streakDays: number;
  streakLive: boolean;
}

const CAPTURE_ICON: Record<string, typeof Globe> = {
  page: Globe,
  selection: TextQuote,
  clipboard: StickyNote,
  screenshot: StickyNote,
  note: StickyNote,
};

export function App() {
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [newTopic, setNewTopic] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  const refresh = useCallback(async () => {
    const store = getStore();
    await seedIfEmpty();
    const [available, suggestions, g, profile, snapshot] = await Promise.all([
      store.availableNow(),
      store.pendingSuggestions(),
      store.graph(),
      store.getProfile(),
      store.export(),
    ]);
    setSnap({
      available,
      captures: snapshot.captures.sort((a, b) => b.createdAt - a.createdAt).slice(0, 4),
      suggestions,
      known: g.topics.filter((t) => t.progress === "known").length,
      total: g.topics.length,
      streakDays: profile?.streakDays ?? 0,
      streakLive: profile ? streakIsLive(profile) : false,
    });
  }, []);

  useEffect(() => { void refresh(); }, [refresh]);

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
    setJustSaved(true);
    window.setTimeout(() => setJustSaved(false), 1600);
    await refresh();
  }

  if (!snap) return <div className="loading">Loading your map…</div>;

  const percent = snap.total ? Math.round((snap.known / snap.total) * 100) : 0;

  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <span className="logo">A</span>
          <span>ABH</span>
        </div>
        <div className="stats">
          <span className="stat">{percent}% known</span>
          {snap.streakDays > 0 && (
            <span className={`stat ${snap.streakLive ? "stat--streak" : ""}`}>
              <Flame size={12} />
              {snap.streakDays}
            </span>
          )}
        </div>
      </header>

      {/* Primary action — the popup exists for this. */}
      <div className="capture">
        <button className="save-btn" onClick={saveThisPage}>
          {justSaved ? <><Check size={16} /> Saved to your map</> : <><Plus size={16} /> Save this page</>}
        </button>
        <div className="save-hint">
          or right-click anything · <span className="kbd">Ctrl+Shift+S</span>
        </div>
      </div>

      {snap.suggestions.length > 0 && (
        <section className="section">
          <div className="section-title section-title--ai"><Sparkles size={12} /> AI suggests</div>
          {snap.suggestions.map((s) => (
            <div key={s.id} className="card suggestion">
              <div className="card-title">
                {String((s.payload as { title?: string }).title ?? "Suggestion")}
              </div>
              {s.rationale && <div className="card-sub">{s.rationale}</div>}
              <div className="row">
                <button className="accept" onClick={() => accept(s.id)}>Add to map</button>
                <button className="reject" onClick={() => reject(s.id)}>Dismiss</button>
              </div>
            </div>
          ))}
        </section>
      )}

      <section className="section">
        <div className="section-title"><BookOpen size={12} /> Open to you now</div>
        {snap.available.length === 0 ? (
          <div className="empty">
            <span className="empty-icon"><BookOpen size={18} /></span>
            <span>Nothing unlocked yet — add something you want to learn.</span>
          </div>
        ) : (
          snap.available.slice(0, 3).map((t) => (
            <div key={t.id} className="card">
              <div className="card-title">{t.title}</div>
              {t.whyItMatters && <div className="card-sub">{t.whyItMatters}</div>}
              <button className="done" onClick={() => complete(t.id)}>
                <Check size={12} style={{ verticalAlign: "-2px", marginRight: 4 }} />
                Mark known
              </button>
            </div>
          ))
        )}
        <div className="add-row">
          <input
            value={newTopic}
            onChange={(e) => setNewTopic(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTopic()}
            placeholder="Add something to learn…"
          />
          <button className="add" onClick={addTopic}>Add</button>
        </div>
      </section>

      {snap.captures.length > 0 && (
        <section className="section">
          <div className="section-title"><Inbox size={12} /> Recently captured</div>
          {snap.captures.map((c) => {
            const Icon = CAPTURE_ICON[c.kind] ?? Globe;
            return (
              <a key={c.id} className="capture-item" href={c.url} target="_blank" rel="noreferrer">
                <span className="capture-kind"><Icon size={12} /></span>
                <span className="capture-title">{c.title || c.url || "Untitled"}</span>
              </a>
            );
          })}
        </section>
      )}

      <footer className="footer">
        <ShieldCheck size={11} /> Private — nothing leaves this device
      </footer>
    </div>
  );
}
