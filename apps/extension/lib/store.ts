/**
 * The extension's bridge to @abh/core.
 *
 * Both the background service worker and the popup run in the same
 * extension-origin, so they share one IndexedDB — the same on-device map the
 * mobile and desktop apps will eventually sync with. Nothing here ever calls
 * the network; a capture is written locally and that's the whole transaction.
 */

import { MapStore } from "@abh/core";
import { IndexedDbStorage } from "@abh/core/storage/indexeddb";

let singleton: MapStore | null = null;

export function getStore(): MapStore {
  if (!singleton) singleton = new MapStore(new IndexedDbStorage());
  return singleton;
}

/**
 * Seed a tiny, believable map the first time the extension runs, so the popup
 * has something to show and the "AI proposes / you accept" flow is visible.
 * Idempotent: does nothing once any topic exists.
 */
export async function seedIfEmpty(): Promise<void> {
  const store = getStore();
  const g = await store.graph();
  if (g.topics.length > 0) return;

  const html = await store.addTopic({
    title: "HTML & the DOM",
    whyItMatters: "Everything you render on the web is a DOM tree.",
    origin: "curated",
  });
  await store.setProgress(html.id, "known");

  const css = await store.addTopic({
    title: "CSS layout",
    whyItMatters: "Flexbox and grid are how modern pages are composed.",
    origin: "curated",
  });
  const js = await store.addTopic({
    title: "JavaScript fundamentals",
    whyItMatters: "The language the whole platform runs on.",
    origin: "curated",
  });
  await store.addEdge(html.id, css.id);
  await store.addEdge(html.id, js.id);

  // A locked topic waiting on JS, to show the gating.
  const react = await store.addTopic({
    title: "React",
    whyItMatters: "Component model built on the JS you just learned.",
    origin: "curated",
  });
  await store.addEdge(js.id, react.id);

  await store.addRoadmap({
    title: "Front-end foundations",
    domain: "web",
    curated: true,
    topicIds: [html.id, css.id, js.id, react.id],
  });

  // A pending AI proposal the user can accept or reject from the popup.
  await store.proposeSuggestion({
    kind: "topic",
    payload: {
      title: "TypeScript",
      whyItMatters: "Types catch the bugs JavaScript lets through.",
    },
    rationale: "Sits right at the edge of what you already know.",
  });
}
