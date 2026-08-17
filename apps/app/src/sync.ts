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
 * The transport depends on whether this device belongs to an account:
 *
 * - **No account** → `LocalOnlySync`. Nothing leaves the device. The engine
 *   still runs and the outbox still fills, so pairing later pushes everything
 *   written since install.
 * - **Paired** → `EncryptedSyncAdapter`. Every payload is sealed with the
 *   account key before it reaches the transport.
 *
 * The transport underneath the encryption is currently the local relay, which
 * links tabs and windows on one machine rather than devices across the
 * internet. That is the honest state of things until the server exists — but
 * it is the same code path: swapping `LoopbackSealedTransport` for an HTTP one
 * changes this file and nothing else.
 */

import {
  AccountManager,
  EncryptedSyncAdapter,
  LocalOnlySync,
  LocalStorageAccountStore,
  LocalStorageRelayLog,
  LocalStorageSyncState,
  LoopbackSealedTransport,
  MapStore,
  Outbox,
  SyncEngine,
  TrackedStorage,
  type SealedEntry,
} from "@abh/core";
import { IndexedDbStorage } from "@abh/core/storage/indexeddb";

const storage = new IndexedDbStorage();
const outbox = new Outbox(new LocalStorageSyncState());

/** The single source of truth every space reads and writes. */
export const store = new MapStore(new TrackedStorage(storage, outbox));

export const account = new AccountManager(new LocalStorageAccountStore());

export const sync = new SyncEngine({
  storage,
  outbox,
  adapter: new LocalOnlySync(),
});

/**
 * Switch to encrypted account sync. Called at startup when this device is
 * already paired, and again the moment it pairs.
 *
 * Returns false when there's no account — the caller doesn't need to check
 * first, and a device with no account is a normal state, not an error.
 */
export async function useAccountSync(): Promise<boolean> {
  if (!(await account.isSignedIn())) return false;
  const key = await account.accountKey();
  const deviceId = await storage.getDeviceId();
  const relay = new LocalStorageRelayLog<SealedEntry>({
    key: "abh:relay",
    channel: "abh:relay",
  });
  sync.setAdapter(
    new EncryptedSyncAdapter(new LoopbackSealedTransport(relay), key, { deviceId }),
  );
  return true;
}

/** Where a scanned pairing QR sends someone. The payload rides in the fragment. */
export const PAIRING_URL = `${globalThis.location?.origin ?? ""}/pair`;
