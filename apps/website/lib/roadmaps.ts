import type { Edge, Topic } from "@abh/core";

/**
 * The pre-existing roadmap library.
 *
 * Each roadmap is a goal plus a `path` (the core prerequisite graph you follow)
 * and `branches` (adjacent topics the AI proposes at the frontier — for now a
 * hand-authored stand-in for the model we can't yet afford to deploy). This is
 * exactly the data we'll "feed later"; the shapes won't change when we do.
 */

export interface TopicSeed {
  id: string;
  title: string;
  why: string;
  domain: string;
  needs?: string[];
  /** Seed a couple as already known so a demo starts mid-journey. */
  progress?: Topic["progress"];
}

export interface RoadmapDef {
  id: string;
  title: string;
  goal: string;
  blurb: string;
  accent: string;
  path: TopicSeed[];
  /** Optional side-quests the AI surfaces as ghost suggestions on the map. */
  branches: TopicSeed[];
}

/** One color map spanning every domain used across roadmaps. */
export const DOMAIN_COLOR: Record<string, string> = {
  web: "#5ea0e9",
  css: "#8bd3dd",
  js: "#e9b949",
  react: "#74c69d",
  tooling: "#c77dff",
  math: "#74c69d",
  ml: "#e9b949",
  dl: "#c77dff",
  music: "#e9967a",
  theory: "#8bd3dd",
  practice: "#74c69d",
};

export const ROADMAPS: RoadmapDef[] = [
  {
    id: "frontend",
    title: "Front-End Developer",
    goal: "Build and ship modern web interfaces",
    blurb: "From a blank HTML file to a component-driven app you can deploy.",
    accent: "#5ea0e9",
    path: [
      { id: "html", title: "HTML", why: "The structure every page is built on.", domain: "web", progress: "known" },
      { id: "css", title: "CSS", why: "Styling — turning structure into design.", domain: "css", needs: ["html"], progress: "known" },
      { id: "flexgrid", title: "Flexbox & Grid", why: "How modern layouts are actually composed.", domain: "css", needs: ["css"] },
      { id: "js", title: "JavaScript", why: "The language that makes pages interactive.", domain: "js", needs: ["html"], progress: "in_progress" },
      { id: "dom", title: "The DOM", why: "Reading and changing the page from code.", domain: "js", needs: ["js"] },
      { id: "es6", title: "Modern JS (ES6+)", why: "The syntax every framework assumes you know.", domain: "js", needs: ["js"] },
      { id: "fetch", title: "Fetch & APIs", why: "Talking to servers and rendering real data.", domain: "js", needs: ["es6"] },
      { id: "react", title: "React", why: "Building UIs as reusable components.", domain: "react", needs: ["es6", "dom"] },
      { id: "state", title: "State Management", why: "Keeping a complex UI consistent.", domain: "react", needs: ["react"] },
      { id: "router", title: "Routing", why: "Turning one page into a whole app.", domain: "react", needs: ["react"] },
      { id: "deploy", title: "Build & Deploy", why: "Getting your work in front of real users.", domain: "tooling", needs: ["react"] },
    ],
    branches: [
      { id: "typescript", title: "TypeScript", why: "Types that catch bugs before your users do.", domain: "js", needs: ["es6"] },
      { id: "tailwind", title: "Tailwind CSS", why: "Styling at the speed of thought.", domain: "css", needs: ["flexgrid"] },
      { id: "testing", title: "Component Testing", why: "Confidence that changes don't break things.", domain: "tooling", needs: ["react"] },
      { id: "a11y", title: "Accessibility", why: "Building for everyone, not just some.", domain: "web", needs: ["dom"] },
    ],
  },
  {
    id: "ml",
    title: "Machine Learning",
    goal: "Understand how models learn from data",
    blurb: "The maths, the code, and the models — in the order they build on each other.",
    accent: "#e9b949",
    path: [
      { id: "algebra", title: "Algebra", why: "The grammar of every equation ahead.", domain: "math", progress: "known" },
      { id: "linalg", title: "Linear Algebra", why: "Vectors and matrices store data and weights.", domain: "math", needs: ["algebra"] },
      { id: "calculus", title: "Calculus", why: "Derivatives are how a model learns to improve.", domain: "math", needs: ["algebra"] },
      { id: "probability", title: "Probability & Stats", why: "Reasoning under uncertainty.", domain: "math", needs: ["algebra"] },
      { id: "python", title: "Python", why: "The language data science runs on.", domain: "ml", progress: "known" },
      { id: "numpy", title: "NumPy & Pandas", why: "Wrangling and computing on real data.", domain: "ml", needs: ["python", "linalg"] },
      { id: "ml_intro", title: "Intro to ML", why: "What learning from data actually means.", domain: "ml", needs: ["probability", "numpy"] },
      { id: "grad", title: "Gradient Descent", why: "The optimiser under almost every model.", domain: "ml", needs: ["calculus", "linalg"] },
      { id: "linreg", title: "Linear Regression", why: "The simplest model that teaches every idea.", domain: "ml", needs: ["ml_intro", "grad"] },
      { id: "nnets", title: "Neural Networks", why: "Stacking simple units into flexible models.", domain: "dl", needs: ["linreg"] },
      { id: "transformers", title: "Transformers", why: "The architecture behind modern AI.", domain: "dl", needs: ["nnets"] },
    ],
    branches: [
      { id: "trees", title: "Decision Trees", why: "Non-linear models you can actually read.", domain: "ml", needs: ["ml_intro"] },
      { id: "clustering", title: "Clustering", why: "Finding structure with no labels at all.", domain: "ml", needs: ["ml_intro"] },
      { id: "cnn", title: "Convolutional Nets", why: "How machines learn to see.", domain: "dl", needs: ["nnets"] },
    ],
  },
  {
    id: "guitar",
    title: "Play the Guitar",
    goal: "Go from zero to playing real songs",
    blurb: "Proof the map works for anything — not just code and exams.",
    accent: "#e9967a",
    path: [
      { id: "parts", title: "Parts & Tuning", why: "Know your instrument and get it in tune.", domain: "theory", progress: "known" },
      { id: "chords", title: "Open Chords", why: "The handful of shapes behind thousands of songs.", domain: "practice", needs: ["parts"] },
      { id: "strum", title: "Strumming Patterns", why: "Rhythm is what makes it sound like music.", domain: "practice", needs: ["chords"] },
      { id: "changes", title: "Chord Changes", why: "Switching cleanly is the real first hurdle.", domain: "practice", needs: ["chords"] },
      { id: "songs", title: "Your First Songs", why: "Playing real music keeps you going.", domain: "practice", needs: ["strum", "changes"] },
      { id: "barre", title: "Barre Chords", why: "Unlocks every key on the neck.", domain: "practice", needs: ["changes"] },
    ],
    branches: [
      { id: "finger", title: "Fingerpicking", why: "A softer, more intricate sound.", domain: "practice", needs: ["changes"] },
      { id: "theory", title: "Music Theory Basics", why: "Understand *why* chords work together.", domain: "theory", needs: ["chords"] },
    ],
  },
];

export function getRoadmap(id: string): RoadmapDef | undefined {
  return ROADMAPS.find((r) => r.id === id);
}

const ts0 = () => Date.now();

/** Build real Topics for a roadmap's core path, applying `knownIds` overrides. */
export function pathTopics(def: RoadmapDef, knownIds: Set<string>): Topic[] {
  const now = ts0();
  return def.path.map((s) => ({
    id: s.id,
    title: s.title,
    summary: "",
    whyItMatters: s.why,
    unlocks: "",
    progress: knownIds.has(s.id) ? "known" : (s.progress ?? "not_started"),
    origin: "curated",
    sources: [],
    tags: [s.domain],
    createdAt: now,
    updatedAt: now,
    rev: 0,
  }));
}

/** A branch topic inflated into a Topic (used once accepted onto the map). */
export function branchTopic(seed: TopicSeed): Topic {
  const now = ts0();
  return {
    id: seed.id,
    title: seed.title,
    summary: "",
    whyItMatters: seed.why,
    unlocks: "",
    progress: "not_started",
    origin: "ai",
    sources: [],
    tags: [seed.domain],
    createdAt: now,
    updatedAt: now,
    rev: 0,
  };
}

export function pathEdges(def: RoadmapDef): Edge[] {
  return seedEdges(def.path);
}

export function seedEdges(seeds: TopicSeed[]): Edge[] {
  const edges: Edge[] = [];
  for (const s of seeds) {
    for (const from of s.needs ?? []) {
      edges.push({ id: `${from}->${s.id}`, from, to: s.id, strength: "hard", origin: "curated", createdAt: 0, rev: 0 });
    }
  }
  return edges;
}
