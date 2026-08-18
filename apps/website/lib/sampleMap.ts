import type { Edge, Topic } from "@abh/core";

/**
 * A believable, densely cross-linked "learn machine learning" map — the kind
 * of graph ABH produces after real use. Math, programming, classic ML and deep
 * learning all connect, so the graph view has the interconnected feel that
 * makes Obsidian's graph compelling (not a tidy tree).
 *
 * Authored as plain data; `buildSampleTopics()` inflates it into real Topics.
 */

type Domain = "math" | "programming" | "ml" | "deep-learning";

interface Seed {
  id: string;
  title: string;
  domain: Domain;
  why: string;
  needs?: string[]; // prerequisite ids
  progress?: Topic["progress"]; // seed some as known / in-progress
}

const SEEDS: Seed[] = [
  // ---- Math ----
  { id: "algebra", title: "Algebra", domain: "math", why: "The grammar of every equation that follows.", progress: "known" },
  { id: "functions", title: "Functions", domain: "math", why: "Inputs to outputs — the shape of every model.", needs: ["algebra"], progress: "known" },
  { id: "linalg", title: "Linear Algebra", domain: "math", why: "Vectors and matrices are how data and weights are stored.", needs: ["algebra"] },
  { id: "calculus", title: "Calculus", domain: "math", why: "Derivatives are how a model learns which way to move.", needs: ["functions"] },
  { id: "probability", title: "Probability", domain: "math", why: "Models reason under uncertainty; this is that language.", needs: ["algebra"], progress: "in_progress" },
  { id: "stats", title: "Statistics", domain: "math", why: "Turning data into defensible conclusions.", needs: ["probability"] },

  // ---- Programming ----
  { id: "python", title: "Python", domain: "programming", why: "The lingua franca of data and ML.", progress: "known" },
  { id: "numpy", title: "NumPy", domain: "programming", why: "Fast array math — linear algebra you can run.", needs: ["python", "linalg"] },
  { id: "pandas", title: "Pandas", domain: "programming", why: "Wrangling real, messy datasets.", needs: ["python"] },
  { id: "dataviz", title: "Data Visualization", domain: "programming", why: "Seeing the data before you model it.", needs: ["pandas"] },

  // ---- Classic ML ----
  { id: "ml_intro", title: "Intro to ML", domain: "ml", why: "What learning from data actually means.", needs: ["stats", "numpy"] },
  { id: "grad_descent", title: "Gradient Descent", domain: "ml", why: "The optimiser under almost every model.", needs: ["calculus", "linalg"] },
  { id: "linreg", title: "Linear Regression", domain: "ml", why: "The simplest model that teaches every idea.", needs: ["ml_intro", "grad_descent"] },
  { id: "logreg", title: "Logistic Regression", domain: "ml", why: "Regression's jump into classification.", needs: ["linreg"] },
  { id: "overfitting", title: "Overfitting & Regularisation", domain: "ml", why: "Why a model that memorises fails in the wild.", needs: ["linreg"] },
  { id: "trees", title: "Decision Trees", domain: "ml", why: "Non-linear models you can actually read.", needs: ["ml_intro"] },
  { id: "clustering", title: "Clustering", domain: "ml", why: "Finding structure with no labels at all.", needs: ["ml_intro"] },

  // ---- Deep learning ----
  { id: "nnets", title: "Neural Networks", domain: "deep-learning", why: "Stacking simple units into flexible models.", needs: ["logreg", "grad_descent"] },
  { id: "backprop", title: "Backpropagation", domain: "deep-learning", why: "How gradients flow through a deep network.", needs: ["nnets"] },
  { id: "cnn", title: "Convolutional Nets", domain: "deep-learning", why: "Seeing images the way the eye's early layers do.", needs: ["backprop"] },
  { id: "rnn", title: "Recurrent Nets", domain: "deep-learning", why: "Models with a memory of what came before.", needs: ["backprop"] },
  { id: "attention", title: "Attention", domain: "deep-learning", why: "Letting a model weigh what actually matters.", needs: ["rnn"] },
  { id: "transformers", title: "Transformers", domain: "deep-learning", why: "The architecture behind modern AI.", needs: ["attention", "cnn"] },
  { id: "llms", title: "Large Language Models", domain: "deep-learning", why: "Transformers at a scale that changed everything.", needs: ["transformers"] },
];

export const DOMAIN_COLOR: Record<Domain, string> = {
  math: "#74c69d",
  programming: "#5ea0e9",
  ml: "#e9b949",
  "deep-learning": "#c77dff",
};

export const DOMAIN_LABEL: Record<Domain, string> = {
  math: "Mathematics",
  programming: "Programming",
  ml: "Machine Learning",
  "deep-learning": "Deep Learning",
};

export function buildSampleTopics(): Topic[] {
  const ts = Date.now();
  return SEEDS.map((s) => ({
    id: s.id,
    title: s.title,
    summary: "",
    whyItMatters: s.why,
    unlocks: "",
    progress: s.progress ?? "not_started",
    origin: "curated",
    sources: [],
    tags: [s.domain],
    createdAt: ts,
    updatedAt: ts,
    rev: 0,
    deviceId: "", // marketing sample — never stored, never synced
  }));
}

export function buildSampleEdges(): Edge[] {
  const edges: Edge[] = [];
  for (const s of SEEDS) {
    for (const from of s.needs ?? []) {
      edges.push({
        id: `${from}->${s.id}`,
        from,
        to: s.id,
        strength: "hard",
        origin: "curated",
        createdAt: 0,
        updatedAt: 0,
        rev: 0,
        deviceId: "",
      });
    }
  }
  return edges;
}

export function domainOf(topic: Topic): Domain {
  return (topic.tags[0] as Domain) ?? "ml";
}
