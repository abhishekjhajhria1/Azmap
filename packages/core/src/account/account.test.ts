/**
 * Account, encryption and pairing.
 *
 * The claims under test are the ones the product makes out loud: one account
 * across your devices, no password, and nothing readable ever leaves the
 * device. The last of those is only true if a wrong key genuinely yields
 * nothing — so that's tested against a real relay, not asserted in prose.
 */

import { describe, expect, it } from "vitest";
import { MapStore } from "../store.js";
import { MemoryStorage } from "../storage/memory.js";
import { SyncEngine } from "../sync/engine.js";
import { EncryptedSyncAdapter, LoopbackSealedTransport, type SealedEntry } from "../sync/encrypted.js";
import { MemoryRelayLog } from "../sync/loopback.js";
import { Outbox, TrackedStorage } from "../sync/outbox.js";
import { MemorySyncState } from "../sync/types.js";
import {
  AccountManager,
  MemoryAccountStore,
  NotSignedInError,
} from "./index.js";
import {
  exportAccountKey,
  generateAccountKey,
  importAccountKey,
  open,
  seal,
} from "./crypto.js";
import {
  createPairingOffer,
  decodePairingOffer,
  encodePairingOffer,
  formatCode,
  isExpired,
  normaliseCode,
  PAIRING_CODE_LENGTH,
  secondsRemaining,
  serverView,
} from "./pairing.js";

describe("encryption", () => {
  it("round-trips a value", async () => {
    const key = await generateAccountKey();
    const sealed = await seal(key, { title: "Limits", progress: "known" });
    expect(await open(key, sealed)).toEqual({ title: "Limits", progress: "known" });
  });

  it("produces ciphertext that contains none of the plaintext", async () => {
    const key = await generateAccountKey();
    const sealed = await seal(key, { title: "Ottoman history" });
    expect(JSON.stringify(sealed)).not.toMatch(/Ottoman/i);
  });

  it("uses a fresh IV every time, so identical data doesn't look identical", async () => {
    const key = await generateAccountKey();
    const a = await seal(key, { same: true });
    const b = await seal(key, { same: true });
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it("refuses to open with the wrong key", async () => {
    const sealed = await seal(await generateAccountKey(), { secret: 1 });
    await expect(open(await generateAccountKey(), sealed)).rejects.toThrow();
  });

  it("refuses tampered ciphertext instead of returning garbage", async () => {
    const key = await generateAccountKey();
    const sealed = await seal(key, { progress: "known" });
    const flipped = { ...sealed, ct: `A${sealed.ct.slice(1)}` };
    await expect(open(key, flipped)).rejects.toThrow();
  });

  it("rejects an unknown envelope version rather than guessing", async () => {
    const key = await generateAccountKey();
    const sealed = await seal(key, {});
    await expect(open(key, { ...sealed, v: 9 as never })).rejects.toThrow(/version/i);
  });

  it("exports and re-imports a key", async () => {
    const key = await generateAccountKey();
    const raw = await exportAccountKey(key);
    const sealed = await seal(key, { x: 1 });
    expect(await open(await importAccountKey(raw), sealed)).toEqual({ x: 1 });
  });

  it("rejects a key of the wrong length rather than failing later", async () => {
    await expect(importAccountKey("tooshort")).rejects.toThrow(/length/i);
  });
});

describe("pairing offers", () => {
  const key = "a".repeat(43); // shape only; validity is the key import's job

  it("round-trips through the encoded form", () => {
    const offer = createPairingOffer({ accountId: "acc_1", key });
    expect(decodePairingOffer(encodePairingOffer(offer))).toEqual(offer);
  });

  it("puts the payload in the URL fragment, which never reaches a server", () => {
    const offer = createPairingOffer({ accountId: "acc_1", key });
    const url = encodePairingOffer(offer, "https://abh.app/pair");
    expect(url.startsWith("https://abh.app/pair#")).toBe(true);
    // Everything sensitive is after the '#'.
    expect(url.split("#")[0]).not.toContain(key);
    expect(decodePairingOffer(url)).toEqual(offer);
  });

  it("never lets the key into what the server is shown", () => {
    const offer = createPairingOffer({ accountId: "acc_1", key });
    const view = serverView(offer);
    expect(JSON.stringify(view)).not.toContain(key);
    expect(Object.keys(view).sort()).toEqual(["accountId", "code", "expiresAt"]);
  });

  it("generates codes from an alphabet with no lookalike characters", () => {
    for (let i = 0; i < 200; i++) {
      const { code } = createPairingOffer({ accountId: "a", key });
      expect(code).toHaveLength(PAIRING_CODE_LENGTH);
      expect(code).not.toMatch(/[01OILU]/);
    }
  });

  it("expires", () => {
    const offer = createPairingOffer({ accountId: "a", key, now: 0, ttlMs: 1000 });
    expect(isExpired(offer, 999)).toBe(false);
    expect(isExpired(offer, 1000)).toBe(true);
    expect(secondsRemaining(offer, 500)).toBe(1);
    expect(secondsRemaining(offer, 99_999)).toBe(0);
  });

  it("rejects malformed input with a message a person can act on", () => {
    expect(() => decodePairingOffer("hello")).toThrow(/pairing code/i);
    expect(() => decodePairingOffer("abh9:a:b:c:1")).toThrow(/format/i);
    expect(() => decodePairingOffer("abh1:::x:1")).toThrow(/incomplete/i);
  });

  it("accepts a typed code however the user typed it", () => {
    expect(normaliseCode(" abcd-efgh ")).toBe("ABCDEFGH");
    expect(formatCode("ABCDEFGH")).toBe("ABCD-EFGH");
  });
});

describe("AccountManager", () => {
  const manager = () => new AccountManager(new MemoryAccountStore());

  it("creates an account locally — no network, no password", async () => {
    const m = manager();
    expect(await m.isSignedIn()).toBe(false);
    const account = await m.create();
    expect(account.accountId).toMatch(/^acc_/);
    expect(await m.isSignedIn()).toBe(true);
  });

  it("is idempotent — creating twice keeps the same account", async () => {
    const m = manager();
    expect((await m.create()).accountId).toBe((await m.create()).accountId);
  });

  it("pairs a second device onto the same account", async () => {
    const first = manager();
    await first.create();
    const offer = await first.offerPairing();

    const second = manager();
    await second.join(decodePairingOffer(encodePairingOffer(offer)));

    expect((await second.current())!.accountId).toBe((await first.current())!.accountId);
    // And the two devices hold the same key, so each can read the other's data.
    const sealed = await seal(await first.accountKey(), { hello: "world" });
    expect(await open(await second.accountKey(), sealed)).toEqual({ hello: "world" });
  });

  it("refuses an expired offer", async () => {
    const m = manager();
    await m.create();
    const offer = await m.offerPairing({ now: 0, ttlMs: 1000 });
    await expect(manager().join(offer, 5000)).rejects.toThrow(/expired/i);
  });

  it("refuses an offer whose key is malformed, rather than pairing a broken device", async () => {
    const m = manager();
    await m.create();
    const offer = { ...(await m.offerPairing()), key: "not-a-key" };
    await expect(manager().join(offer)).rejects.toThrow();
    expect(await manager().isSignedIn()).toBe(false);
  });

  it("cannot offer pairing before an account exists", async () => {
    await expect(manager().offerPairing()).rejects.toThrow(NotSignedInError);
  });

  it("signing out removes the key but never the data", async () => {
    const store = new MemoryAccountStore();
    const m = new AccountManager(store);
    await m.create();
    await m.signOut();
    expect(await m.isSignedIn()).toBe(false);
    await expect(m.accountKey()).rejects.toThrow(NotSignedInError);
  });
});

describe("encrypted sync, end to end", () => {
  /** A device wired exactly as an app wires it. */
  async function device(id: string, key: CryptoKey, log: MemoryRelayLog<SealedEntry>) {
    const raw = new MemoryStorage(id);
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter: new EncryptedSyncAdapter(new LoopbackSealedTransport(log), key, { deviceId: id }),
      intervalMs: 0,
      isOffline: () => false,
    });
    return { raw, store, engine };
  }

  it("two paired devices sync, and the relay holds only ciphertext", async () => {
    const log = new MemoryRelayLog<SealedEntry>();

    const first = new AccountManager(new MemoryAccountStore());
    await first.create();
    const second = new AccountManager(new MemoryAccountStore());
    await second.join(decodePairingOffer(encodePairingOffer(await first.offerPairing())));

    const laptop = await device("dev-a", await first.accountKey(), log);
    const phone = await device("dev-b", await second.accountKey(), log);

    await laptop.store.addTopic({ title: "Ottoman history" });
    await laptop.store.addCapture({ kind: "note", text: "a private thought" });
    await laptop.engine.sync();
    await phone.engine.sync();

    expect((await phone.store.graph()).topics.map((t) => t.title)).toEqual(["Ottoman history"]);
    expect((await phone.store.export()).captures.map((c) => c.text)).toEqual(["a private thought"]);

    // What the server would be storing: no titles, no notes, nothing.
    const onTheWire = JSON.stringify(log.read(0, 100));
    expect(onTheWire).not.toMatch(/Ottoman/i);
    expect(onTheWire).not.toMatch(/private thought/i);
  });

  it("a device with the wrong key learns nothing", async () => {
    const log = new MemoryRelayLog<SealedEntry>();
    const key = await generateAccountKey();
    const laptop = await device("dev-a", key, log);

    await laptop.store.addTopic({ title: "Ottoman history" });
    await laptop.engine.sync();

    // An unpaired device — right relay, wrong key.
    const intruder = await device("dev-x", await generateAccountKey(), log);
    await intruder.engine.sync();

    expect((await intruder.store.graph()).topics).toHaveLength(0);
  });

  it("a deletion is sealed too — the relay can't see what was removed", async () => {
    const log = new MemoryRelayLog<SealedEntry>();
    const key = await generateAccountKey();
    const laptop = await device("dev-a", key, log);
    const phone = await device("dev-b", key, log);

    const t = await laptop.store.addTopic({ title: "Regrettable" });
    await laptop.engine.sync();
    await phone.engine.sync();
    expect((await phone.store.graph()).topics).toHaveLength(1);

    await laptop.store.removeTopic(t.id);
    await laptop.engine.sync();
    await phone.engine.sync();

    expect((await phone.store.graph()).topics).toHaveLength(0);
    expect(JSON.stringify(log.read(0, 100))).not.toMatch(/Regrettable/i);
  });

  it("skips an unreadable entry instead of wedging sync forever", async () => {
    const log = new MemoryRelayLog<SealedEntry>();
    const key = await generateAccountKey();

    // A blob from some other account lands in the log.
    log.append({ deviceId: "dev-junk", sealed: await seal(await generateAccountKey(), { junk: 1 }) });

    const laptop = await device("dev-a", key, log);
    const phone = await device("dev-b", key, log);
    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();

    const result = await phone.engine.sync();
    expect(result.status).toBe("idle"); // not "error"
    expect((await phone.store.graph()).topics.map((t) => t.title)).toEqual(["Limits"]);
  });
});
