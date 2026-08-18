/**
 * Data, languages and machine learning.
 *
 * These are the paths where the prerequisite structure is genuinely
 * load-bearing: you can fake your way through a framework, but gradient descent
 * without calculus is memorisation, and it shows the moment something doesn't
 * converge.
 */

import type { RoadmapDef } from "../types.js";

export const python: RoadmapDef = {
  id: "python",
  title: "Python",
  goal: "Write Python you'd be happy to hand someone else",
  blurb: "The language, then the parts that separate scripts from software.",
  kind: "skill",
  units: [
    { id: "lang", title: "The language", note: "Enough to be dangerous." },
    { id: "structure", title: "Structure", note: "Enough to be trusted." },
    { id: "real", title: "Real programs", note: "Enough to ship." },
  ],
  path: [
    { id: "syntax", unit: "lang", title: "Syntax & types", why: "Numbers, strings, truthiness. Python's rules are few and worth knowing exactly.", domain: "tech" },
    { id: "collections", unit: "lang", title: "Lists, dicts, sets", why: "Choosing the right one is most of what makes Python fast or slow.", domain: "tech", needs: ["syntax"] },
    { id: "control", unit: "lang", title: "Control flow", why: "Loops and comprehensions. The comprehension is the idiom you'll read everywhere.", domain: "tech", needs: ["collections"] },
    { id: "functions", unit: "lang", title: "Functions", why: "Arguments, defaults, scope. The mutable-default trap catches everyone once.", domain: "tech", needs: ["control"] },
    { id: "modules", unit: "structure", title: "Modules & imports", why: "How a file becomes a library, and why circular imports hurt.", domain: "tech", needs: ["functions"] },
    { id: "classes", unit: "structure", title: "Classes", why: "When state and behaviour belong together — and when a function was enough.", domain: "tech", needs: ["functions"] },
    { id: "errors", unit: "structure", title: "Exceptions", why: "Failing loudly and on purpose beats returning None and hoping.", domain: "tech", needs: ["functions"] },
    { id: "typing", unit: "structure", title: "Type hints", why: "Documentation the tools can check. Worth it the moment someone else reads the code.", domain: "tech", needs: ["classes"] },
    { id: "venv", unit: "real", title: "Environments & packaging", why: "Dependencies that don't leak between projects. Do this early; it saves days.", domain: "tooling", needs: ["modules"] },
    { id: "pytest", unit: "real", title: "Testing", why: "The safety net that makes refactoring possible instead of frightening.", domain: "tooling", needs: ["venv", "errors"] },
    { id: "files", unit: "real", title: "Files & data formats", why: "CSV, JSON, paths. Most real programs are shaped by their input.", domain: "tech", needs: ["errors"] },
    { id: "asyncpy", unit: "real", title: "Async", why: "Waiting on many things at once, and why threads aren't usually the answer here.", domain: "tech", needs: ["typing"] },
  ],
  branches: [
    { id: "stdlib", title: "The standard library", why: "The batteries. Reading it is the fastest way to get better.", domain: "tech", needs: ["modules"] },
    { id: "cli", title: "Command-line tools", why: "Turning a script into something with a real interface.", domain: "tooling", needs: ["files"] },
    { id: "perfpy", title: "Profiling", why: "Measuring before optimising, because your guess is usually wrong.", domain: "tech", needs: ["pytest"] },
  ],
};

export const sql: RoadmapDef = {
  id: "sql",
  title: "SQL & Databases",
  goal: "Ask hard questions of real data",
  blurb: "From SELECT to query plans — the skill with the longest shelf life in software.",
  kind: "skill",
  units: [
    { id: "query", title: "Asking", note: "Getting data out." },
    { id: "shape", title: "Shaping", note: "Combining and summarising." },
    { id: "design", title: "Designing", note: "Deciding how it's stored." },
  ],
  path: [
    { id: "select", unit: "query", title: "SELECT & WHERE", why: "Where every query starts. Filtering well is most of the job.", domain: "tech" },
    { id: "order", unit: "query", title: "Sorting & limiting", why: "Ordering, paging, and why OFFSET gets slow on big tables.", domain: "tech", needs: ["select"] },
    { id: "nulls", unit: "query", title: "NULL", why: "Not zero, not empty, and not equal to itself. The source of countless quiet bugs.", domain: "tech", needs: ["select"] },
    { id: "joins", unit: "shape", title: "Joins", why: "Inner, left, and the accidental cross join that returns a million rows.", domain: "tech", needs: ["order"] },
    { id: "aggregates", unit: "shape", title: "GROUP BY", why: "Turning rows into answers. Where analysis actually happens.", domain: "tech", needs: ["joins"] },
    { id: "subqueries", unit: "shape", title: "Subqueries & CTEs", why: "Naming intermediate steps so a hard query stays readable.", domain: "tech", needs: ["aggregates"] },
    { id: "window", unit: "shape", title: "Window functions", why: "Running totals and rankings without losing the individual rows.", domain: "tech", needs: ["subqueries"] },
    { id: "schema", unit: "design", title: "Schema design", why: "Tables, keys, relationships. The decisions your code will live inside.", domain: "tech", needs: ["joins"] },
    { id: "normal", unit: "design", title: "Normalisation", why: "Storing each fact once — and knowing when to break the rule deliberately.", domain: "tech", needs: ["schema"] },
    { id: "constraints", unit: "design", title: "Constraints", why: "Letting the database refuse impossible data instead of trusting every writer.", domain: "tech", needs: ["schema"] },
    { id: "idx", unit: "design", title: "Indexes", why: "Why a query is instant or unbearable, and the write cost of every index.", domain: "tech", needs: ["normal"] },
    { id: "explain", unit: "design", title: "Query plans", why: "Reading what the database decided to do. The end of guessing.", domain: "tech", needs: ["idx", "window"] },
  ],
  branches: [
    { id: "txn", title: "Transactions & isolation", why: "Concurrent writes, and the anomalies each isolation level still allows.", domain: "tech", needs: ["constraints"] },
    { id: "migrations", title: "Migrations", why: "Changing a schema that's in use, without downtime or data loss.", domain: "tech", needs: ["constraints"] },
    { id: "json", title: "JSON in SQL", why: "Semi-structured columns, and when they're a shortcut you'll pay for.", domain: "tech", needs: ["schema"] },
  ],
};

export const ml: RoadmapDef = {
  id: "ml",
  title: "Machine Learning",
  goal: "Understand how models learn, not just how to call them",
  blurb: "The maths, the code, and the models — in the order they build on each other.",
  kind: "skill",
  units: [
    { id: "maths", title: "The maths", note: "Skippable right up until it isn't." },
    { id: "tools", title: "The tools", note: "Where the data lives." },
    { id: "models", title: "The models", note: "Simple ones first, and they're often enough." },
    { id: "deep", title: "Deep learning", note: "What the last decade was about." },
  ],
  path: [
    { id: "algebra", unit: "maths", title: "Algebra", why: "The grammar of every equation ahead.", domain: "math", progress: "known" },
    { id: "linalg", unit: "maths", title: "Linear algebra", why: "Vectors and matrices are how data and weights are stored. Not optional.", domain: "math", needs: ["algebra"] },
    { id: "calculus", unit: "maths", title: "Calculus", why: "A derivative is how a model knows which way to improve.", domain: "math", needs: ["algebra"] },
    { id: "probability", unit: "maths", title: "Probability & statistics", why: "Reasoning under uncertainty — which is the whole job.", domain: "math", needs: ["algebra"] },
    { id: "pythonml", unit: "tools", title: "Python", why: "The language the field runs on.", domain: "ml", progress: "known" },
    { id: "numpy", unit: "tools", title: "NumPy & pandas", why: "Loading, cleaning and computing on real data. Most of your time goes here.", domain: "ml", needs: ["pythonml", "linalg"] },
    { id: "viz", unit: "tools", title: "Visualisation", why: "Looking at the data before modelling it catches errors nothing else will.", domain: "ml", needs: ["numpy"] },
    { id: "ml_intro", unit: "models", title: "What learning means", why: "Features, labels, generalisation. The framing everything else hangs on.", domain: "ml", needs: ["probability", "numpy"] },
    { id: "split", unit: "models", title: "Train/test splits", why: "How you avoid fooling yourself. The single most common beginner mistake.", domain: "ml", needs: ["ml_intro"] },
    { id: "linreg", unit: "models", title: "Linear regression", why: "The simplest real model, and the one every other one is compared against.", domain: "ml", needs: ["split"] },
    { id: "grad", unit: "models", title: "Gradient descent", why: "The optimiser under almost everything. Worth deriving once by hand.", domain: "ml", needs: ["calculus", "linalg"] },
    { id: "logreg", unit: "models", title: "Classification", why: "Predicting categories, and why accuracy is a misleading score.", domain: "ml", needs: ["linreg"] },
    { id: "overfit", unit: "models", title: "Overfitting", why: "Why your model was brilliant in testing and useless in production.", domain: "ml", needs: ["logreg"] },
    { id: "trees", unit: "models", title: "Trees & ensembles", why: "What actually wins on tabular data. Often beats a neural network here.", domain: "ml", needs: ["overfit"] },
    { id: "nn", unit: "deep", title: "Neural networks", why: "Layers of simple functions composing into complicated ones.", domain: "dl", needs: ["grad", "overfit"] },
    { id: "backprop", unit: "deep", title: "Backpropagation", why: "The chain rule, applied at scale. Understand it once and the rest demystifies.", domain: "dl", needs: ["nn"] },
    { id: "cnn", unit: "deep", title: "Convolutional nets", why: "Exploiting the fact that nearby pixels are related.", domain: "dl", needs: ["backprop"] },
    { id: "attention", unit: "deep", title: "Attention", why: "Letting a model decide what to look at. The idea behind the last decade.", domain: "dl", needs: ["backprop"] },
    { id: "transformers", unit: "deep", title: "Transformers", why: "The architecture behind modern language models, and why it scaled.", domain: "dl", needs: ["attention"] },
  ],
  branches: [
    { id: "featurework", title: "Feature engineering", why: "Often worth more than a better model. Underrated and unglamorous.", domain: "ml", needs: ["split"] },
    { id: "clustering", title: "Clustering", why: "Finding structure when nothing is labelled.", domain: "ml", needs: ["ml_intro"] },
    { id: "llm", title: "Large language models", why: "Prompting, fine-tuning, and what they genuinely cannot do.", domain: "dl", needs: ["transformers"] },
    { id: "mlops", title: "Putting models in production", why: "The part where a notebook has to become a service that stays up.", domain: "ml", needs: ["trees"] },
    { id: "ethics", title: "Bias & fairness", why: "A model trained on the past will reproduce it. That's a design problem, not a footnote.", domain: "ml", needs: ["overfit"] },
  ],
};

export const guitar: RoadmapDef = {
  id: "guitar",
  title: "Play the Guitar",
  goal: "Play songs people recognise, and know why they work",
  blurb: "Proof the map works for anything — not just code and exams.",
  kind: "skill",
  units: [
    { id: "hands", title: "The hands", note: "Physical before theoretical." },
    { id: "songs", title: "Songs", note: "The reason you picked it up." },
    { id: "theory", title: "Why it works", note: "Where playing becomes understanding." },
  ],
  path: [
    { id: "tune", unit: "hands", title: "Tuning", why: "An out-of-tune guitar teaches your ear the wrong thing.", domain: "practice" },
    { id: "chords", unit: "hands", title: "Open chords", why: "Five or six shapes cover a startling number of songs.", domain: "practice", needs: ["tune"] },
    { id: "changes", unit: "hands", title: "Chord changes", why: "The actual skill. Clean changes matter more than knowing more chords.", domain: "practice", needs: ["chords"] },
    { id: "strum", unit: "songs", title: "Strumming patterns", why: "Rhythm is what makes it sound like the record.", domain: "practice", needs: ["changes"] },
    { id: "firstsong", unit: "songs", title: "Your first song", why: "Finishing one whole song teaches more than practising ten fragments.", domain: "practice", needs: ["strum"] },
    { id: "barre", unit: "songs", title: "Barre chords", why: "The same shapes anywhere on the neck. Unlocks most of the rest.", domain: "practice", needs: ["changes"] },
    { id: "keys", unit: "theory", title: "Keys", why: "Why certain chords sound like they belong together.", domain: "theory", needs: ["firstsong"] },
    { id: "progressions", unit: "theory", title: "Progressions", why: "The handful of sequences behind a surprising share of popular music.", domain: "theory", needs: ["keys"] },
    { id: "scales", unit: "theory", title: "Scales", why: "Where melody comes from, and how to improvise without guessing.", domain: "theory", needs: ["keys", "barre"] },
    { id: "ear", unit: "theory", title: "Playing by ear", why: "Working a song out yourself. The point at which you stop needing tabs.", domain: "theory", needs: ["progressions", "scales"] },
  ],
  branches: [
    { id: "fingerpick", title: "Fingerpicking", why: "Melody and accompaniment at once.", domain: "practice", needs: ["strum"] },
    { id: "capo", title: "Using a capo", why: "Any song in any key without learning new shapes.", domain: "practice", needs: ["barre"] },
    { id: "record", title: "Recording yourself", why: "The fastest, least comfortable way to improve.", domain: "practice", needs: ["firstsong"] },
  ],
};
