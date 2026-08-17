/**
 * The pre-existing roadmap library — content, fed in over time.
 *
 * Kept in core so every surface (web app, mobile, extension) reads the same
 * roadmaps. "Generate with AI" will produce more of these at runtime later;
 * the shape won't change.
 */

import type { RoadmapDef } from "./types.js";

export const ROADMAPS: RoadmapDef[] = [
  {
    id: "frontend",
    title: "Front-End Developer",
    goal: "Build and ship modern web interfaces",
    blurb: "From a blank HTML file to a component-driven app you can deploy.",
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
      { id: "musictheory", title: "Music Theory Basics", why: "Understand why chords work together.", domain: "theory", needs: ["chords"] },
    ],
  },
];

export function getRoadmap(id: string): RoadmapDef | undefined {
  return ROADMAPS.find((r) => r.id === id);
}
