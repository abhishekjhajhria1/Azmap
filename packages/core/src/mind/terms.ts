/**
 * Term overlap, weighted by how unusual a word is *in this user's own map*.
 *
 * ## Why not just count shared words
 *
 * Because the answer would be "everything is related to everything". A learner
 * studying for JEE has "physics" in forty titles; two notes sharing it tells you
 * nothing. Two notes sharing "rotational" tells you a lot. Raw overlap ranks the
 * first pair above the second, which is exactly backwards.
 *
 * So terms are weighted by inverse document frequency computed over the user's
 * own corpus rather than a fixed stopword list. That adapts on its own: for the
 * JEE learner "physics" is worthless and "hydrolysis" is gold, while for someone
 * mapping cooking it's the reverse, and nobody has to maintain a per-domain
 * dictionary. It also means the signal improves as the map grows, which is the
 * right direction for a tool you're supposed to keep for years.
 *
 * This is deliberately not a model. It runs in a millisecond, offline, on every
 * keystroke if it wants to, and it can explain itself in the user's own
 * vocabulary — "shares *rotational*, *inertia*". A model that is asked to do
 * this job should have to beat it.
 */

/**
 * Structural words only — the ones that carry no topic signal in any domain.
 * Everything domain-specific is left to IDF, which is better at it than a list.
 */
const STRUCTURAL = new Set([
  "a", "an", "the", "and", "or", "but", "if", "then", "than", "that", "this",
  "these", "those", "of", "in", "on", "at", "to", "for", "from", "by", "with",
  "without", "into", "onto", "about", "as", "is", "are", "was", "were", "be",
  "been", "being", "do", "does", "did", "doing", "have", "has", "had", "can",
  "could", "will", "would", "should", "may", "might", "must", "it", "its",
  "you", "your", "we", "our", "they", "their", "i", "my", "me", "he", "she",
  "his", "her", "not", "no", "yes", "how", "what", "why", "when", "where",
  "which", "who", "whom", "all", "any", "some", "each", "every", "more",
  "most", "other", "such", "own", "same", "so", "too", "very", "just", "up",
  "out", "down", "over", "under", "again", "once", "here", "there", "one",
  "two", "part", "intro", "introduction", "guide", "tutorial", "basics",
]);

/**
 * Site furniture. A capture's title is usually "Real thing — Site Name", and
 * the site name would otherwise become a high-IDF term that links every page
 * you saved from the same place. That's a false connection with a confident
 * explanation attached, which is the worst kind.
 */
const SITE_SUFFIX =
  /\s*[|–—\-·:]\s*(youtube|medium|wikipedia|github|stack overflow|substack|dev\.to|hacker news|reddit|x|twitter|linkedin|arxiv|nature|the guardian|bbc|freecodecamp|geeksforgeeks|khan academy|byju'?s|vedantu|physics wallah|unacademy)\s*$/i;

/** Strip site furniture from a captured title. Idempotent and safe on notes. */
export function cleanTitle(raw: string): string {
  let out = raw.trim();
  // Twice: "Thing - Blog | Medium" is common enough to be worth the second pass.
  for (let i = 0; i < 2; i++) out = out.replace(SITE_SUFFIX, "").trim();
  return out.replace(/\s+/g, " ");
}

/**
 * Split text into comparable terms.
 *
 * Two decisions here are load-bearing, and both were bugs first:
 *
 * **`\p{M}` is kept, not just `\p{L}\p{N}`.** Devanagari and Bengali vowel signs
 * (ि, ा, ্) are Unicode *Marks*, not Letters. Leaving them out of the keep-set
 * doesn't merely lose an accent — it makes them act as *separators*, so "गति"
 * shreds into "गत" and "त्वरण" into "त" + "वरण". ABH is built for Indian exam
 * students first, and a tokeniser that quietly minces their language would make
 * the second brain useless for exactly the people it's for.
 *
 * **The floor is two characters, not three.** Three throws away "ai", "ml",
 * "js", "go", "c#" — which on a developer roadmap are the most meaningful terms
 * on the page. Short English function words are handled by `STRUCTURAL`, which
 * is the right tool for them; length is not.
 *
 * Known limit, stated rather than papered over: scripts written without spaces
 * (Chinese, Japanese, Thai) come out as one token per run of text. Fixing that
 * needs a real segmenter, and pretending otherwise would be worse than saying so.
 */
export function terms(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.toLowerCase().split(/[^\p{L}\p{N}\p{M}+#]+/u)) {
    if (raw.length < 2) continue;
    if (STRUCTURAL.has(raw)) continue;
    out.push(stem(raw));
  }
  return out;
}

/**
 * Crude suffix folding, not a real stemmer — a proper one is a dependency plus
 * a language assumption, and this gets the cases that actually collide on a
 * study map.
 *
 * The trailing-`e` strip at the end is what makes the pairs line up:
 * "integrating" → `integrat` and "integrate" → `integrat`; "derivatives" →
 * `derivative` → `derivativ` and "derivative" → `derivativ`. Restoring the
 * silent `e` after `-ing` instead would need Porter's CVC test, which is a lot
 * of machinery to reach the same equivalence classes.
 *
 * `-es` only collapses after a sibilant (`box → boxes`), because the naive rule
 * turns "derivatives" into "derivativ" and "derivative" into "derivative" —
 * the two words that most need to match, not matching.
 */
function stem(w: string): string {
  let s = w;
  if (s.length > 5 && s.endsWith("ing")) s = s.slice(0, -3);
  else if (s.length > 4 && /(s|x|z|ch|sh)es$/.test(s)) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith("s") && !s.endsWith("ss")) s = s.slice(0, -1);
  if (s.length > 4 && s.endsWith("e")) s = s.slice(0, -1);
  return s;
}

/** Distinct terms, order preserved. */
export function termSet(text: string): Set<string> {
  return new Set(terms(text));
}

/**
 * Term weights over a corpus: rarer in *these* documents means more meaningful.
 *
 * Smoothed IDF (`ln(1 + N/df)`), so a term appearing in every document scores
 * near zero instead of exactly zero — the difference matters on a five-node map
 * where every term is technically in most documents.
 */
export class TermWeights {
  private readonly df = new Map<string, number>();
  private readonly n: number;

  constructor(documents: string[]) {
    this.n = Math.max(1, documents.length);
    for (const doc of documents) {
      for (const t of termSet(doc)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
  }

  weight(term: string): number {
    return Math.log(1 + this.n / (1 + (this.df.get(term) ?? 0)));
  }

  /**
   * How strongly two texts are about the same thing: 0 (unrelated) to 1.
   *
   * Weighted Jaccard rather than cosine — no vector length to normalise, and on
   * short texts like titles the two agree anyway. `shared` comes back with the
   * result because the explanation is built from it, and an explanation
   * reconstructed later from a second pass is an explanation that can disagree
   * with the score it's explaining.
   */
  similarity(a: string, b: string): { score: number; shared: string[] } {
    const ta = termSet(a);
    const tb = termSet(b);
    if (ta.size === 0 || tb.size === 0) return { score: 0, shared: [] };

    let inter = 0;
    let union = 0;
    const shared: Array<[string, number]> = [];
    for (const t of ta) {
      const w = this.weight(t);
      union += w;
      if (tb.has(t)) {
        inter += w;
        shared.push([t, w]);
      }
    }
    for (const t of tb) if (!ta.has(t)) union += this.weight(t);

    shared.sort((x, y) => y[1] - x[1]);
    return {
      score: union === 0 ? 0 : inter / union,
      shared: shared.map(([t]) => t),
    };
  }
}

/** "shares *gradient*, *descent*" — the sentence a proposal is judged on. */
export function sharedTermsPhrase(shared: string[], max = 3): string {
  const picked = shared.slice(0, max);
  if (picked.length === 0) return "";
  if (picked.length === 1) return `“${picked[0]}”`;
  return picked
    .slice(0, -1)
    .map((t) => `“${t}”`)
    .join(", ") + ` and “${picked[picked.length - 1]}”`;
}
