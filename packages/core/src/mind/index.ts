/**
 * The Mind facade — one object the apps call, with the rules enforced in one place.
 *
 * Every surface (web, extension, Flutter) gets the same guarantees without
 * re-implementing them, and there is exactly one file to audit when the question
 * is "can this send my map to a server?".
 *
 * What it enforces:
 *
 *   - **Routing.** Ask the first provider that claims the capability; fall back
 *     to the next. In practice that means a model handles `compose` while the
 *     local heuristics keep handling `connect` — which is the right split, since
 *     `connect` runs whenever a panel opens and `compose` runs once a month.
 *
 *   - **Consent.** A provider with `local: false` is skipped entirely unless the
 *     user has allowed that specific capability. Not a global AI switch: asking
 *     a model to name the steps in "quantum computing" sends a subject, while
 *     asking it to connect your notes sends the shape of everything you have
 *     ever saved. Someone can reasonably want the first and not the second.
 *
 *   - **Timeouts, and no exceptions.** Every call is raced against a deadline
 *     and every failure becomes the capability's empty value. An AI that is
 *     slow, rate-limited, offline or hallucinating degrades to "nothing to
 *     suggest right now". A map that won't load because a model timed out is
 *     worse than a map with no AI at all.
 *
 *   - **Validation.** Responses are Zod-parsed, because model output is
 *     untrusted input in the same way an HTTP body is. Malformed items are
 *     dropped individually rather than failing the batch: nine good proposals
 *     and one bad one should return nine.
 *
 *   - **Caching.** Keyed on the request, so reopening a panel is free. The user
 *     asked for this to be cheap to run, and the cheapest call is the one that
 *     never happens.
 *
 * It never writes. Results reach the map only through `MapStore.acceptProposal`
 * / `acceptSuggestion`, which is the product's oldest rule and the reason the
 * return types are drafts rather than records.
 */

import { z } from "zod";
import { LocalMind } from "./local.js";
import {
  ComposedPath,
  EMPTY_CONSENT,
  MindConsent,
  NextStep,
  ProposedLink,
  TopicBrief,
  type ComposeRequest,
  type ConnectRequest,
  type DistilRequest,
  type ExplainRequest,
  type MindCapability,
  type MindProvider,
  type NextRequest,
} from "./types.js";

export * from "./types.js";
export { LocalMind } from "./local.js";
export { TermWeights, cleanTitle, sharedTermsPhrase, terms, termSet } from "./terms.js";

export interface MindOptions {
  /**
   * Best first. `LocalMind` is appended automatically, so it is always the
   * floor — there is no configuration in which the app has no intelligence.
   */
  providers?: MindProvider[];
  consent?: MindConsent;
  /**
   * How long a capability may take before it's treated as absent. 12s is past
   * the point a person is still waiting, and a `connect` panel that resolves
   * after they've moved on is the same as one that never resolved.
   */
  timeoutMs?: number;
  /** Entries kept in the result cache. Small: these are per-session. */
  cacheSize?: number;
}

/** Why a capability isn't available — so the UI can say something true. */
export type MindGap =
  | { available: true }
  | { available: false; reason: "unsupported" }
  | { available: false; reason: "needs-consent"; providerId: string; label: string };

export class Mind {
  private readonly providers: MindProvider[];
  private consent: MindConsent;
  private readonly timeoutMs: number;
  private readonly cacheSize: number;
  private readonly cache = new Map<string, unknown>();

  constructor(opts: MindOptions = {}) {
    this.providers = [...(opts.providers ?? []), new LocalMind()];
    this.consent = opts.consent ?? EMPTY_CONSENT;
    this.timeoutMs = opts.timeoutMs ?? 12_000;
    this.cacheSize = opts.cacheSize ?? 64;
  }

  /** Consent can change at runtime (a settings toggle); the cache is now stale. */
  setConsent(consent: MindConsent): void {
    this.consent = consent;
    this.cache.clear();
  }

  getConsent(): MindConsent {
    return this.consent;
  }

  /**
   * May this provider serve this capability right now?
   *
   * The local floor is always allowed — its whole claim is that nothing leaves
   * the device, and gating it behind a privacy prompt would be theatre.
   */
  private permitted(p: MindProvider, cap: MindCapability): boolean {
    if (!p.capabilities.includes(cap)) return false;
    return p.local || this.consent.allow.includes(cap);
  }

  /**
   * Whether a capability will do anything, and if not, why.
   *
   * The distinction is the whole point: "no AI connected" and "connected, but
   * you haven't allowed this" need different words and a different button, and
   * a UI that can't tell them apart shows the wrong one half the time.
   */
  status(cap: MindCapability): MindGap {
    for (const p of this.providers) if (this.permitted(p, cap)) return { available: true };
    const blocked = this.providers.find((p) => p.capabilities.includes(cap) && !p.local);
    return blocked
      ? { available: false, reason: "needs-consent", providerId: blocked.id, label: blocked.label }
      : { available: false, reason: "unsupported" };
  }

  /** Capabilities that would work right now. Drives what the UI offers. */
  available(): MindCapability[] {
    const caps = new Set<MindCapability>();
    for (const p of this.providers) for (const c of p.capabilities) if (this.permitted(p, c)) caps.add(c);
    return [...caps];
  }

  // -------------------------------------------------------------------------
  // Capabilities
  // -------------------------------------------------------------------------

  /**
   * A subject turned into a real path. `null` when no permitted provider can
   * compose — the deliberate gap, since inventing an ordered curriculum from
   * heuristics means telling someone to study the wrong things in the wrong
   * order, with the app's confidence behind it.
   */
  async compose(req: ComposeRequest): Promise<ComposedPath | null> {
    return this.one("compose", req, (p, s) => p.compose!(req, s), ComposedPath);
  }

  /** What a topic is, why it matters, what it opens up. */
  async explain(req: ExplainRequest): Promise<TopicBrief | null> {
    return this.one("explain", req, (p, s) => p.explain!(req, s), TopicBrief);
  }

  /** One capture, filed against the map. Empty when there's nothing to say. */
  async distil(req: DistilRequest): Promise<ProposedLink[]> {
    return this.many("distil", cacheKeyDistil(req), (p, s) => p.distil!(req, s), ProposedLink);
  }

  /** Links across the whole second brain that ought to exist and don't. */
  async connect(req: ConnectRequest): Promise<ProposedLink[]> {
    return this.many("connect", cacheKeyConnect(req), (p, s) => p.connect!(req, s), ProposedLink);
  }

  /** What to do now, out of everything you could do. */
  async next(req: NextRequest): Promise<NextStep[]> {
    return this.many("next", cacheKeyNext(req), (p, s) => p.next!(req, s), NextStep);
  }

  // -------------------------------------------------------------------------
  // Plumbing
  // -------------------------------------------------------------------------

  /**
   * Generic over the schema, not over its type. `z.ZodType<T>` binds `T` to the
   * schema's *input* side, which silently erases every `.default()` and
   * `.transform()` — the parsed value comes back with everything optional.
   * `z.output<S>` is the type you actually get out of `safeParse`.
   */
  private async one<S extends z.ZodTypeAny>(
    cap: MindCapability,
    req: unknown,
    call: (p: MindProvider, signal: AbortSignal) => Promise<unknown>,
    schema: S,
  ): Promise<z.output<S> | null> {
    const key = `${cap}:${stableKey(req)}`;
    if (this.cache.has(key)) return this.cache.get(key) as z.output<S> | null;

    for (const p of this.providers) {
      if (!this.permitted(p, cap)) continue;
      const raw = await this.race(() => call(p, this.signal()));
      if (raw === FAILED) continue; // try the next provider before giving up
      const parsed = schema.safeParse(raw);
      if (!parsed.success) continue;
      this.remember(key, parsed.data);
      return parsed.data;
    }
    this.remember(key, null);
    return null;
  }

  /**
   * List-returning capabilities, where one bad item must not cost the rest.
   *
   * A provider that returns nine well-formed proposals and one with a missing
   * id has given us nine useful proposals. Failing the whole call there — the
   * obvious `z.array(...).parse()` — would throw away good work because a model
   * fumbled one line, and models fumble one line constantly.
   */
  private async many<S extends z.ZodTypeAny>(
    cap: MindCapability,
    key: string,
    call: (p: MindProvider, signal: AbortSignal) => Promise<unknown>,
    item: S,
  ): Promise<Array<z.output<S>>> {
    const cacheKey = `${cap}:${key}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey) as Array<z.output<S>>;

    for (const p of this.providers) {
      if (!this.permitted(p, cap)) continue;
      const raw = await this.race(() => call(p, this.signal()));
      if (raw === FAILED || !Array.isArray(raw)) continue;

      const out: Array<z.output<S>> = [];
      for (const entry of raw) {
        const parsed = item.safeParse(entry);
        if (parsed.success) out.push(parsed.data);
      }
      // An empty result from a permitted provider is an answer ("nothing to
      // suggest"), not a failure, so it stops here rather than falling through.
      this.remember(cacheKey, out);
      return out;
    }
    this.remember(cacheKey, []);
    return [];
  }

  private signal(): AbortSignal {
    return AbortSignal.timeout(this.timeoutMs);
  }

  /**
   * Never throws, and never hangs.
   *
   * The explicit timer matters even though every provider is handed an
   * `AbortSignal`: honouring it is a convention, and a third-party provider
   * that ignores it would otherwise hang a screen forever. The one thing this
   * facade genuinely owes its callers is that it always returns.
   */
  private async race(run: () => Promise<unknown>): Promise<unknown> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      return await Promise.race([
        run(),
        new Promise<typeof FAILED>((resolve) => {
          timer = setTimeout(() => resolve(FAILED), this.timeoutMs);
        }),
      ]);
    } catch {
      return FAILED;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  /** Bounded FIFO. Oldest out first — insertion order is Map's iteration order. */
  private remember(key: string, value: unknown): void {
    if (this.cache.size >= this.cacheSize) {
      const oldest = this.cache.keys().next();
      if (!oldest.done) this.cache.delete(oldest.value);
    }
    this.cache.set(key, value);
  }
}

/** Sentinel for "this provider didn't answer" — distinct from a valid `null`. */
const FAILED = Symbol("mind:failed");

// ---------------------------------------------------------------------------
// Cache keys
// ---------------------------------------------------------------------------

/**
 * Keys summarise the request rather than serialising it.
 *
 * A `connect` request carries the entire graph; JSON-stringifying it on every
 * call would cost more than the heuristics it's caching. Record counts plus the
 * newest `updatedAt` change exactly when the answer would change — any edit
 * bumps `updatedAt`, and any add or delete moves a count — so the summary is
 * both far cheaper and, for this purpose, equivalent.
 */
function stableKey(req: unknown): string {
  return JSON.stringify(req ?? null);
}

function watermark(records: Array<{ updatedAt: number }>): number {
  let max = 0;
  for (const r of records) if (r.updatedAt > max) max = r.updatedAt;
  return max;
}

function cacheKeyConnect(r: ConnectRequest): string {
  return [
    r.graph.topics.length,
    r.graph.edges.length,
    r.captures.length,
    watermark(r.graph.topics),
    watermark(r.graph.edges),
    watermark(r.captures),
    r.limit ?? "",
  ].join("|");
}

function cacheKeyDistil(r: DistilRequest): string {
  return [r.capture.id, r.capture.updatedAt, r.graph.topics.length, watermark(r.graph.topics)].join("|");
}

function cacheKeyNext(r: NextRequest): string {
  return [
    r.graph.topics.length,
    r.graph.edges.length,
    watermark(r.graph.topics),
    r.activeRoadmapId ?? "",
    r.minutes ?? "",
    r.limit ?? "",
  ].join("|");
}
