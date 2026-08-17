/**
 * Extension-flavoured persistence for the account and the sync outbox.
 *
 * Core ships `localStorage`-backed versions of both. Those are wrong here for a
 * specific reason: an MV3 background script is a **service worker**, and
 * service workers have no `localStorage` at all. The popup does, the worker
 * doesn't, and both need to read the same account — so anything backed by
 * `localStorage` would work in the popup and throw in the worker, which is the
 * worst possible failure shape.
 *
 * `browser.storage.local` is available in both contexts, shared between them,
 * and survives the worker being torn down between events — which MV3 does
 * aggressively.
 */

import type { AccountStore, PersistedSyncState, StoredAccount, SyncStateStore } from "@abh/core";
import { browser } from "wxt/browser";

async function read<T>(key: string): Promise<T | null> {
  try {
    const bag = await browser.storage.local.get(key);
    return (bag[key] as T | undefined) ?? null;
  } catch {
    // A read failure must never stop the extension from working offline.
    return null;
  }
}

async function write(key: string, value: unknown): Promise<void> {
  try {
    await browser.storage.local.set({ [key]: value });
  } catch {
    // Quota or a torn-down worker. In-memory state still works; it just won't
    // survive a restart, which is better than throwing into a capture handler.
  }
}

export class BrowserAccountStore implements AccountStore {
  constructor(private readonly key = "abh:account") {}
  async load(): Promise<StoredAccount | null> {
    return read<StoredAccount>(this.key);
  }
  async save(account: StoredAccount): Promise<void> {
    await write(this.key, account);
  }
  async clear(): Promise<void> {
    try {
      await browser.storage.local.remove(this.key);
    } catch {
      /* nothing useful to do */
    }
  }
}

export class BrowserSyncState implements SyncStateStore {
  constructor(private readonly key = "abh:sync") {}
  async load(): Promise<PersistedSyncState | null> {
    return read<PersistedSyncState>(this.key);
  }
  async save(state: PersistedSyncState): Promise<void> {
    await write(this.key, state);
  }
}
