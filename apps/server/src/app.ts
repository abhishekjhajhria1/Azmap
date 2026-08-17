/**
 * The sync relay.
 *
 * ## What this server is
 *
 * An append-only log of blobs it cannot read, plus just enough account
 * bookkeeping to know whose log is whose. That is the entire product surface.
 *
 * It never merges, never resolves a conflict, never validates domain shape and
 * never learns what anyone is studying. All ordering is decided on-device by
 * `compareVersions` in `@abh/core`, which is why this can be a few hundred
 * lines and still be correct: **the server does not have to be right about
 * anything.** If it hands back a page twice, or out of order, or including the
 * caller's own writes, the on-device merge absorbs it.
 *
 * ## What it deliberately cannot do
 *
 * - Read your data. Payloads are sealed with an account key that only your
 *   devices hold. A full database dump yields ciphertext and timestamps.
 * - Recover your account. There is no key escrow, so there is no reset link.
 * - Deduplicate writes. Two pushes of the same change are two different
 *   ciphertexts (fresh IV each time), so the server cannot tell they match —
 *   and doesn't need to, because applying a change twice is a no-op on-device.
 *
 * ## What it can see
 *
 * Account and device ids (opaque randoms), payload sizes, and timing. That is
 * the honest limit of this design: metadata, not content.
 */

import { createHash, randomBytes, randomUUID, timingSafeEqual } from "node:crypto";
import { Db } from "./db.js";

/** Pairing codes are short enough to type, so guessing must be expensive. */
const MAX_PAIRING_ATTEMPTS = 8;
const MAX_PULL_PAGE = 500;
const MAX_BODY_BYTES = 4 * 1024 * 1024;
/** Entries stay this long even after every device has read them. */
const RETAIN_MS = 7 * 24 * 60 * 60 * 1000;

export interface AppOptions {
  db?: Db;
  now?: () => number;
  /** Requests per minute per IP. 0 disables (tests). */
  rateLimit?: number;
}

interface Reply {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

const ok = (body: unknown): Reply => ({ status: 200, body });
const bad = (status: number, error: string): Reply => ({ status, body: { error } });

export function sha256(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

/** Compare hex digests without leaking position through timing. */
function sameDigest(a: string, b: string): boolean {
  const ab = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export class App {
  readonly db: Db;
  private readonly now: () => number;
  private readonly rateLimit: number;
  private hits = new Map<string, { count: number; resetAt: number }>();

  constructor(opts: AppOptions = {}) {
    this.db = opts.db ?? new Db();
    this.now = opts.now ?? Date.now;
    this.rateLimit = opts.rateLimit ?? 240;
  }

  /**
   * Route a request. Transport-agnostic on purpose: `main.ts` adapts
   * `node:http` to this, and a serverless handler could adapt anything else.
   */
  async handle(req: {
    method: string;
    path: string;
    query: URLSearchParams;
    headers: Record<string, string | undefined>;
    body: unknown;
    ip: string;
  }): Promise<Reply> {
    if (!this.allow(req.ip)) return bad(429, "Too many requests");

    const { method, path } = req;
    if (method === "GET" && path === "/v1/health") return ok({ ok: true });

    if (method === "POST" && path === "/v1/accounts") return this.createAccount(req.body);
    if (method === "POST" && path === "/v1/pairings") return this.offerPairing(req);
    if (method === "POST" && path === "/v1/pairings/claim") return this.claimPairing(req.body);

    if (method === "POST" && path === "/v1/sync/push") return this.push(req);
    if (method === "GET" && path === "/v1/sync/pull") return this.pull(req);
    if (method === "GET" && path === "/v1/devices") return this.listDevices(req);

    return bad(404, "Not found");
  }

  // ---- Accounts -----------------------------------------------------------

  /**
   * Create an account and enrol the calling device.
   *
   * The client generates the account id and the key locally; it sends the id
   * so both sides agree on it, and never sends the key. Nothing here is a
   * password — the returned token authenticates *this device*, not a person.
   */
  private createAccount(body: unknown): Reply {
    const b = body as { accountId?: string; deviceName?: string } | null;
    const accountId = b?.accountId;
    if (!isId(accountId)) return bad(400, "accountId is required");
    if (this.db.accountExists(accountId)) return bad(409, "Account already exists");

    const now = this.now();
    this.db.createAccount(accountId, now);
    const device = this.enrol(accountId, b?.deviceName ?? "", now);
    return ok({ accountId, ...device });
  }

  /** Register a pairing code the holder of this account is showing on screen. */
  private offerPairing(req: Parameters<App["handle"]>[0]): Reply {
    const device = this.authenticate(req.headers);
    if (!device) return bad(401, "Unauthorized");

    const b = req.body as { code?: string; expiresAt?: number } | null;
    if (!b?.code || typeof b.code !== "string" || b.code.length < 6) {
      return bad(400, "code is required");
    }
    const now = this.now();
    const expiresAt = typeof b.expiresAt === "number" ? b.expiresAt : now + 5 * 60_000;
    // A code that outlives the window the UI promises would be a lie.
    const capped = Math.min(expiresAt, now + 10 * 60_000);

    this.db.sweepPairings(now);
    this.db.createPairing(b.code.toUpperCase(), device.account_id, capped);
    return ok({ expiresAt: capped });
  }

  /**
   * Redeem a code and enrol the new device.
   *
   * Note what does *not* happen here: no key is transmitted. The key reached
   * the new device through the QR itself. All this grants is the right to
   * read and append to a log of ciphertext.
   */
  private claimPairing(body: unknown): Reply {
    const b = body as { accountId?: string; code?: string; deviceName?: string } | null;
    if (!isId(b?.accountId) || !b?.code) return bad(400, "accountId and code are required");

    const now = this.now();
    const code = b.code.toUpperCase();
    const row = this.db.getPairing(code);

    // One shape of failure for every reason, so probing can't distinguish
    // "wrong code" from "right code, wrong account".
    const reject = () => bad(400, "That pairing code isn't valid.");
    if (!row) return reject();

    this.db.countPairingAttempt(code);
    if (row.attempts + 1 > MAX_PAIRING_ATTEMPTS) return bad(429, "Too many attempts.");
    if (row.claimed_at !== null) return reject();
    if (row.expires_at <= now) return reject();
    if (row.account_id !== b.accountId) return reject();

    this.db.markPairingClaimed(code, now);
    const device = this.enrol(row.account_id, b.deviceName ?? "", now);
    return ok({ accountId: row.account_id, ...device });
  }

  private enrol(accountId: string, name: string, now: number) {
    const id = `dev_${randomUUID()}`;
    // 256 bits. The token is shown once and never stored in the clear.
    const token = randomBytes(32).toString("base64url");
    this.db.addDevice({ id, accountId, tokenHash: sha256(token), name: name.slice(0, 60), now });
    return { deviceId: id, token };
  }

  // ---- Sync ---------------------------------------------------------------

  private push(req: Parameters<App["handle"]>[0]): Reply {
    const device = this.authenticate(req.headers);
    if (!device) return bad(401, "Unauthorized");

    const b = req.body as { sealed?: unknown } | null;
    const sealed = b?.sealed;
    if (sealed === undefined) return bad(400, "sealed is required");
    const blob = JSON.stringify(sealed);
    if (blob.length > MAX_BODY_BYTES) return bad(413, "Payload too large");

    const now = this.now();
    const seq = this.db.append(device.account_id, device.id, blob, now);
    this.db.touchDevice(device.id, now);
    // Opportunistic housekeeping — no cron to operate.
    this.db.prune(device.account_id, now - RETAIN_MS);
    return ok({ cursor: String(seq) });
  }

  private pull(req: Parameters<App["handle"]>[0]): Reply {
    const device = this.authenticate(req.headers);
    if (!device) return bad(401, "Unauthorized");

    const since = Number(req.query.get("since") ?? 0);
    if (!Number.isFinite(since) || since < 0) return bad(400, "since must be a number");
    const limit = clamp(Number(req.query.get("limit") ?? 200), 1, MAX_PULL_PAGE);

    const rows = this.db.read(device.account_id, since, limit);
    const now = this.now();
    this.db.touchDevice(device.id, now);
    if (rows.length === 0) return ok({ cursor: String(since), items: [], hasMore: false });

    const cursor = rows[rows.length - 1]!.seq;
    this.db.setCursor(device.id, cursor);
    return ok({
      cursor: String(cursor),
      items: rows.map((r) => ({ deviceId: r.device_id, sealed: JSON.parse(r.sealed) })),
      hasMore: rows.length === limit,
    });
  }

  /** So a person can see what's on their account and spot one they don't know. */
  private listDevices(req: Parameters<App["handle"]>[0]): Reply {
    const device = this.authenticate(req.headers);
    if (!device) return bad(401, "Unauthorized");
    return ok({
      devices: this.db.devicesForAccount(device.account_id).map((d) => ({
        id: d.id,
        name: d.name,
        createdAt: d.created_at,
        lastSeen: d.last_seen,
        current: d.id === device.id,
      })),
    });
  }

  // ---- Plumbing -----------------------------------------------------------

  private authenticate(headers: Record<string, string | undefined>) {
    const auth = headers["authorization"] ?? headers["Authorization"];
    if (!auth?.startsWith("Bearer ")) return undefined;
    const token = auth.slice(7).trim();
    if (!token) return undefined;
    const row = this.db.deviceByToken(sha256(token));
    // Re-check with a constant-time compare: the index lookup above is the
    // fast path, this is the one that decides.
    if (!row || !sameDigest(row.token_hash, sha256(token))) return undefined;
    return row;
  }

  private allow(ip: string): boolean {
    if (this.rateLimit <= 0) return true;
    const now = this.now();
    const hit = this.hits.get(ip);
    if (!hit || hit.resetAt <= now) {
      this.hits.set(ip, { count: 1, resetAt: now + 60_000 });
      return true;
    }
    hit.count += 1;
    // Keep the table from growing without bound on a busy box.
    if (this.hits.size > 10_000) {
      for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    }
    return hit.count <= this.rateLimit;
  }
}

function isId(v: unknown): v is string {
  return typeof v === "string" && v.length > 0 && v.length <= 128 && /^[\w.:-]+$/.test(v);
}

function clamp(n: number, lo: number, hi: number): number {
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : lo;
}
