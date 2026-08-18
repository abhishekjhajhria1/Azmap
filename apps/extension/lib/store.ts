/**
 * The extension's bridge to @abh/core — wired for sync.
 *
 * ## The thing this file gets right that it previously didn't
 *
 * An extension runs on its own origin. Its IndexedDB is **not** the web app's
 * IndexedDB and never can be, no matter how much they look alike. Before this,
 * the extension wrote captures into a private database with no outbox, no
 * engine and no account — so an article you saved while reading it was
 * stranded on that origin forever, and "capture on your laptop, continue on
 * your phone" was false for the one surface built entirely around capturing.
 *
 * The relay is what fixes it, and this is exactly what the relay is for: two
 * origins that can't share storage can share an account. Writes go through
 * `TrackedStorage` into an outbox that survives the service worker being torn
 * down, and the engine drains it whenever the popup or a capture wakes us.
 *
 * Sync is still optional. With no account the extension is a local notebook
 * that keeps working; the outbox just fills up, and everything in it goes out
 * the moment a device is paired.
 */

import {
  AccountManager,
  EncryptedSyncAdapter,
  HttpSyncTransport,
  LocalOnlySync,
  MapStore,
  Outbox,
  SyncEngine,
  TrackedStorage,
} from "@abh/core";
import { IndexedDbStorage } from "@abh/core/storage/indexeddb";
import { BrowserAccountStore, BrowserSyncState } from "./browserStorage.js";

/** Set at build time; unset means local-only, which is a supported way to run. */
export const SYNC_URL: string | null =
  (import.meta.env.VITE_ABH_SYNC_URL as string | undefined)?.replace(/\/+$/, "") || null;

let storage: IndexedDbStorage | null = null;
let outbox: Outbox | null = null;
let singleton: MapStore | null = null;
let engine: SyncEngine | null = null;

export const account = new AccountManager(new BrowserAccountStore());

function init(): void {
  if (singleton) return;
  storage = new IndexedDbStorage();
  outbox = new Outbox(new BrowserSyncState());
  // Every write goes through the tracker, so a capture is queued even when
  // there's nowhere to send it yet.
  singleton = new MapStore(new TrackedStorage(storage, outbox));
  engine = new SyncEngine({
    storage,
    outbox,
    adapter: new LocalOnlySync(),
    // The worker is short-lived, so a polling interval is pointless — we sync
    // on the events that matter instead (see `syncNow`).
    intervalMs: 0,
  });
}

export function getStore(): MapStore {
  init();
  return singleton!;
}

export function getEngine(): SyncEngine {
  init();
  return engine!;
}

/**
 * Point the engine at the relay if this device is enrolled. Cheap and
 * idempotent, so it's safe to call on every wake-up.
 */
export async function connectSync(): Promise<boolean> {
  init();
  const current = await account.current();
  if (!current?.endpoint || !current.token) return false;
  const key = await account.accountKey();
  engine!.setAdapter(
    new EncryptedSyncAdapter(
      new HttpSyncTransport({ endpoint: current.endpoint, token: current.token }),
      key,
      { deviceId: await storage!.getDeviceId() },
    ),
  );
  return true;
}

/**
 * Sync now, and don't let a failure escape.
 *
 * Called after a capture and when the popup opens — the two moments an
 * extension is actually alive. A rejected sync must never surface as a broken
 * capture: the write already succeeded locally, which is the part that matters.
 */
export async function syncNow(): Promise<void> {
  try {
    if (await connectSync()) await getEngine().sync();
  } catch {
    // Queued in the outbox; it'll go out next time.
  }
}

/** Whether this device can reach a map beyond itself. */
export async function isConnected(): Promise<boolean> {
  return SYNC_URL !== null && (await account.isEnrolled());
}
