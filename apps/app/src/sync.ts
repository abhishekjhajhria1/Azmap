/**
 * How this app is wired for sync.
 *
 * Three layers, assembled once and shared by every space:
 *
 * 1. `IndexedDbStorage` — the real on-device database.
 * 2. `TrackedStorage` — what the app writes through, so every mutation is
 *    queued in the outbox whether or not sync is on.
 * 3. `SyncEngine` — holds the *raw* storage (so inbound records don't echo
 *    back out) and whichever transport is currently appropriate.
 *
 * The transport depends on how far this device has got:
 *
 * - **No account** → `LocalOnlySync`. Nothing leaves the device. The engine
 *   still runs and the outbox still fills, so pairing later pushes everything
 *   written since install.
 * - **Account, no relay configured** → the local relay, which links windows on
 *   one machine. Real encryption, no network.
 * - **Account + enrolled with a relay** → `HttpSyncTransport` under
 *   `EncryptedSyncAdapter`. Every payload is sealed before it reaches the wire;
 *   the server stores ciphertext it cannot read.
 *
 * All three are the same code path. That's the whole point of the seam.
 */

import {
  AccountManager,
  EncryptedSyncAdapter,
  HttpSyncTransport,
  LocalOnlySync,
  LocalStorageAccountStore,
  LocalStorageRelayLog,
  LocalStorageSyncState,
  LoopbackSealedTransport,
  MapStore,
  Outbox,
  SyncEngine,
  TrackedStorage,
  enrolDevice,
  publishPairingCode,
  type SealedEntry,
} from "@abh/core";
import { IndexedDbStorage } from "@abh/core/storage/indexeddb";

const storage = new IndexedDbStorage();
const outbox = new Outbox(new LocalStorageSyncState());

/** The single source of truth every space reads and writes. */
export const store = new MapStore(new TrackedStorage(storage, outbox));

export const account = new AccountManager(new LocalStorageAccountStore());

/**
 * Where the relay lives. Set `VITE_ABH_SYNC_URL` at build time to point at a
 * deployment; leave it unset and the app is local-only, which is a legitimate
 * way to ship — the product works without a server.
 */
export const SYNC_URL: string | null =
  (import.meta.env.VITE_ABH_SYNC_URL as string | undefined)?.replace(/\/+$/, "") || null;

export const sync = new SyncEngine({
  storage,
  outbox,
  adapter: new LocalOnlySync(),
});

/**
 * Point the engine at the best transport this device currently qualifies for.
 * Called at startup and again after pairing.
 *
 * Returns false when there's no account — a device without one is a normal
 * state, not an error, so the caller doesn't need to check first.
 */
export async function useAccountSync(): Promise<boolean> {
  const current = await account.current();
  if (!current) return false;

  const key = await account.accountKey();
  const deviceId = await storage.getDeviceId();

  if (current.endpoint && current.token) {
    sync.setAdapter(
      new EncryptedSyncAdapter(
        new HttpSyncTransport({ endpoint: current.endpoint, token: current.token }),
        key,
        { deviceId },
      ),
    );
    return true;
  }

  // No relay: fall back to the local one, which still exercises the whole
  // encrypted pipeline and keeps two windows on this machine in step.
  const relay = new LocalStorageRelayLog<SealedEntry>({ key: "abh:relay", channel: "abh:relay" });
  sync.setAdapter(
    new EncryptedSyncAdapter(new LoopbackSealedTransport(relay), key, { deviceId }),
  );
  return true;
}

/**
 * Enrol this device with the relay, if one is configured.
 *
 * Called after creating an account (no code) or after joining one (with the
 * code that was scanned). Note what is *not* sent: the account key. It reached
 * this device through the QR and never touches the network.
 */
export async function enrolWithRelay(code?: string): Promise<boolean> {
  if (!SYNC_URL) return false;
  const current = await account.current();
  if (!current) return false;
  if (current.endpoint === SYNC_URL && current.token) return true; // already enrolled

  const result = await enrolDevice({
    endpoint: SYNC_URL,
    accountId: current.accountId,
    code,
    deviceName: deviceLabel(),
  });
  await account.setEnrolment(SYNC_URL, result.token);
  await useAccountSync();
  return true;
}

/** Publish a pairing code so the other device can redeem it against the relay. */
export async function announcePairing(code: string, expiresAt: number): Promise<void> {
  const current = await account.current();
  if (!SYNC_URL || !current?.token) return; // local-only: the QR alone is enough
  await publishPairingCode({ endpoint: SYNC_URL, token: current.token, code, expiresAt });
}

/** A human-readable name for the device list, from what the browser will admit. */
function deviceLabel(): string {
  const ua = globalThis.navigator?.userAgent ?? "";
  if (/iPhone|Android.*Mobile/.test(ua)) return "Phone";
  if (/iPad|Tablet/.test(ua)) return "Tablet";
  if (/Macintosh/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  if (/Linux/.test(ua)) return "Linux";
  return "This device";
}

/** Where a scanned pairing QR sends someone. The payload rides in the fragment. */
export const PAIRING_URL = `${globalThis.location?.origin ?? ""}/pair`;
