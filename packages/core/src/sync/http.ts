/**
 * The HTTP transport.
 *
 * This is the piece that turns "sync is designed" into "sync works". It
 * implements `SealedTransport`, so it slots under `EncryptedSyncAdapter` and
 * the engine above it never learns that a network exists — the same code path
 * the loopback has been exercising all along.
 *
 * It speaks only in sealed blobs. Nothing here can name a topic, and the server
 * on the other end is a log that cannot read what it stores.
 */

import type { Cursor, PushAck } from "./types.js";
import type { SealedEntry, SealedPage, SealedTransport } from "./encrypted.js";

export interface HttpTransportOptions {
  /** Base URL of the relay, e.g. `https://sync.abh.app`. */
  endpoint: string;
  /** This device's bearer token, from account creation or pairing. */
  token: string;
  /** Entries per pull. The server caps this. */
  pageSize?: number;
  /** Injected for tests; defaults to global fetch. */
  fetch?: typeof globalThis.fetch;
  /** Abort a request that hangs. Default 20s. */
  timeoutMs?: number;
}

/** A server said no in a way that retrying won't fix. */
export class SyncHttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "SyncHttpError";
  }

  /**
   * Whether the engine should keep the outbox and try again. 401 and 413 are
   * permanent — retrying a bad token or an oversized payload forever just
   * burns battery — everything else (network, 5xx, 429) is worth another go.
   */
  get retryable(): boolean {
    return this.status !== 401 && this.status !== 403 && this.status !== 413;
  }
}

export class HttpSyncTransport implements SealedTransport {
  private readonly endpoint: string;
  private readonly token: string;
  private readonly pageSize: number;
  private readonly doFetch: typeof globalThis.fetch;
  private readonly timeoutMs: number;
  /** Flipped by a failed request so the engine reports "offline", not "error". */
  private reachable = true;

  constructor(opts: HttpTransportOptions) {
    this.endpoint = opts.endpoint.replace(/\/+$/, "");
    this.token = opts.token;
    this.pageSize = opts.pageSize ?? 200;
    this.doFetch = opts.fetch ?? globalThis.fetch.bind(globalThis);
    this.timeoutMs = opts.timeoutMs ?? 20_000;
  }

  get connected(): boolean {
    return this.reachable;
  }

  async push(entry: SealedEntry): Promise<PushAck> {
    const body = await this.request<{ cursor: string }>("POST", "/v1/sync/push", {
      // deviceId rides in the body for symmetry with the loopback, but the
      // server trusts the token, not this field.
      deviceId: entry.deviceId,
      sealed: entry.sealed,
    });
    return { cursor: body.cursor };
  }

  async pull(since: Cursor | null): Promise<SealedPage | null> {
    const qs = new URLSearchParams({ since: since ?? "0", limit: String(this.pageSize) });
    const page = await this.request<SealedPage>("GET", `/v1/sync/pull?${qs}`);
    // An empty page means "nothing new" — the engine reads null as exactly that.
    return page.items.length === 0 ? null : page;
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);
    try {
      const res = await this.doFetch(`${this.endpoint}${path}`, {
        method,
        headers: {
          authorization: `Bearer ${this.token}`,
          ...(body === undefined ? {} : { "content-type": "application/json" }),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      if (!res.ok) {
        // A refused request still proves the network is up.
        this.reachable = true;
        const detail = await res.text().catch(() => "");
        throw new SyncHttpError(res.status, `${res.status}: ${detail.slice(0, 200)}`);
      }
      this.reachable = true;
      return (await res.json()) as T;
    } catch (err) {
      // A transport failure (DNS, timeout, offline) is not an error the user
      // should see — it's the normal state of a device on a train.
      if (!(err instanceof SyncHttpError)) this.reachable = false;
      throw err;
    } finally {
      clearTimeout(timer);
    }
  }
}

/**
 * Enrol with a relay. Called once per device: either creating the account, or
 * redeeming a pairing code shown by a device that already has one.
 *
 * The account key is never a parameter here and never crosses the wire — it
 * travels device-to-device through the QR. What comes back is only the right to
 * append to a log of ciphertext.
 */
export async function enrolDevice(input: {
  endpoint: string;
  accountId: string;
  /** Omit to create the account; supply to join an existing one. */
  code?: string;
  deviceName?: string;
  fetch?: typeof globalThis.fetch;
}): Promise<{ accountId: string; deviceId: string; token: string }> {
  const doFetch = input.fetch ?? globalThis.fetch.bind(globalThis);
  const path = input.code ? "/v1/pairings/claim" : "/v1/accounts";
  const res = await doFetch(`${input.endpoint.replace(/\/+$/, "")}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      accountId: input.accountId,
      code: input.code,
      deviceName: input.deviceName ?? "",
    }),
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new SyncHttpError(res.status, detail.slice(0, 200) || `Enrolment failed (${res.status})`);
  }
  return (await res.json()) as { accountId: string; deviceId: string; token: string };
}

/** Publish a pairing code so another device can redeem it. Key stays home. */
export async function publishPairingCode(input: {
  endpoint: string;
  token: string;
  code: string;
  expiresAt: number;
  fetch?: typeof globalThis.fetch;
}): Promise<void> {
  const doFetch = input.fetch ?? globalThis.fetch.bind(globalThis);
  const res = await doFetch(`${input.endpoint.replace(/\/+$/, "")}/v1/pairings`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${input.token}` },
    body: JSON.stringify({ code: input.code, expiresAt: input.expiresAt }),
  });
  if (!res.ok) {
    throw new SyncHttpError(res.status, `Could not publish the pairing code (${res.status})`);
  }
}
