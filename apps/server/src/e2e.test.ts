/**
 * Two devices, one account, a real HTTP server in between.
 *
 * Everything below this line has been tested in isolation — the merge, the
 * engine, the encryption, the relay. This is the test that proves they compose:
 * a real `MapStore` writing through a real `SyncEngine` and a real
 * `HttpSyncTransport`, over a real socket, to the real relay. Nothing is
 * mocked except the clock.
 *
 * If this passes, cross-device sync works.
 */

import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";
import { afterEach, beforeEach, describe, it } from "vitest";

import {
  AccountManager,
  EncryptedSyncAdapter,
  enrolDevice,
  HttpSyncTransport,
  MapStore,
  MemoryAccountStore,
  MemoryStorage,
  MemorySyncState,
  Outbox,
  publishPairingCode,
  SyncEngine,
  TrackedStorage,
  createPairingOffer,
  decodePairingOffer,
  encodePairingOffer,
} from "@abh/core";

import { App } from "./app.js";
import { Db } from "./db.js";

let server: Server;
let endpoint: string;
let app: App;

beforeEach(async () => {
  app = new App({ db: new Db(":memory:"), rateLimit: 0 });
  server = createServer(async (req, res) => {
    const url = new URL(req.url ?? "/", "http://localhost");
    let body: unknown = null;
    if (req.method === "POST") {
      const chunks: Buffer[] = [];
      for await (const c of req) chunks.push(c as Buffer);
      const raw = Buffer.concat(chunks).toString() || "null";
      try {
        body = JSON.parse(raw);
      } catch {
        res.writeHead(400).end("{}");
        return;
      }
    }
    const reply = await app.handle({
      method: req.method ?? "GET",
      path: url.pathname,
      query: url.searchParams,
      headers: req.headers as Record<string, string | undefined>,
      body,
      ip: "127.0.0.1",
    });
    res.writeHead(reply.status, { "content-type": "application/json" });
    res.end(JSON.stringify(reply.body));
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const addr = server.address();
  endpoint = `http://127.0.0.1:${typeof addr === "object" && addr ? addr.port : 0}`;
});

afterEach(async () => {
  await new Promise<void>((r) => server.close(() => r()));
});

/** A device, wired exactly the way `apps/app/src/sync.ts` wires one. */
async function device(name: string, key: CryptoKey, token: string) {
  const raw = new MemoryStorage(`dev-${name}`);
  const outbox = new Outbox(new MemorySyncState());
  const store = new MapStore(new TrackedStorage(raw, outbox));
  const engine = new SyncEngine({
    storage: raw,
    outbox,
    adapter: new EncryptedSyncAdapter(new HttpSyncTransport({ endpoint, token }), key, {
      deviceId: await raw.getDeviceId(),
    }),
    intervalMs: 0,
    isOffline: () => false,
  });
  return { raw, store, engine };
}

describe("two devices over a real relay", () => {
  it("pairs, syncs a topic, and never shows the server the plaintext", async () => {
    // --- Device A: create the account, enrol with the relay ----------------
    const accountA = new AccountManager(new MemoryAccountStore());
    const created = await accountA.create();
    const enrolA = await enrolDevice({
      endpoint,
      accountId: created.accountId,
      deviceName: "laptop",
    });
    const laptop = await device("a", await accountA.accountKey(), enrolA.token);

    // --- Device A shows a pairing code -------------------------------------
    const offer = createPairingOffer({ accountId: created.accountId, key: created.key });
    await publishPairingCode({
      endpoint,
      token: enrolA.token,
      code: offer.code,
      expiresAt: offer.expiresAt,
    });

    // --- Device B scans it, joins the account, enrols ----------------------
    const scanned = decodePairingOffer(encodePairingOffer(offer, "https://abh.app/pair"));
    const accountB = new AccountManager(new MemoryAccountStore());
    await accountB.join(scanned);
    const enrolB = await enrolDevice({
      endpoint,
      accountId: scanned.accountId,
      code: scanned.code,
      deviceName: "phone",
    });
    const phone = await device("b", await accountB.accountKey(), enrolB.token);

    assert.equal(enrolB.accountId, enrolA.accountId);
    assert.notEqual(enrolB.token, enrolA.token);

    // --- The actual thing: write here, read there --------------------------
    await laptop.store.addTopic({ title: "Ottoman history" });
    await laptop.store.addCapture({ kind: "note", text: "a private thought" });
    assert.equal((await laptop.engine.sync()).status, "idle");
    assert.equal((await phone.engine.sync()).status, "idle");

    const onPhone = await phone.store.graph();
    assert.deepEqual(
      onPhone.topics.map((t) => t.title),
      ["Ottoman history"],
    );
    assert.equal((await phone.store.export()).captures[0]!.text, "a private thought");

    // --- And what the operator of that server could read --------------------
    const stored = JSON.stringify(app.db.raw.prepare("SELECT * FROM entries").all());
    assert.doesNotMatch(stored, /Ottoman/i);
    assert.doesNotMatch(stored, /private thought/i);
  });

  it("a delete on one device removes it from the other", async () => {
    const account = new AccountManager(new MemoryAccountStore());
    const created = await account.create();
    const key = await account.accountKey();

    const enrolA = await enrolDevice({ endpoint, accountId: created.accountId });
    const laptop = await device("a", key, enrolA.token);

    const offer = createPairingOffer({ accountId: created.accountId, key: created.key });
    await publishPairingCode({ endpoint, token: enrolA.token, code: offer.code, expiresAt: offer.expiresAt });
    const enrolB = await enrolDevice({ endpoint, accountId: created.accountId, code: offer.code });
    const phone = await device("b", key, enrolB.token);

    const topic = await laptop.store.addTopic({ title: "Regrettable" });
    await laptop.engine.sync();
    await phone.engine.sync();
    assert.equal((await phone.store.graph()).topics.length, 1);

    await laptop.store.removeTopic(topic.id);
    await laptop.engine.sync();
    await phone.engine.sync();
    assert.equal((await phone.store.graph()).topics.length, 0);
  });

  it("offline writes queue and land when the relay comes back", async () => {
    const account = new AccountManager(new MemoryAccountStore());
    const created = await account.create();
    const key = await account.accountKey();
    const enrol = await enrolDevice({ endpoint, accountId: created.accountId });

    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));
    let offline = true;
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter: new EncryptedSyncAdapter(
        new HttpSyncTransport({ endpoint, token: enrol.token }),
        key,
        { deviceId: await raw.getDeviceId() },
      ),
      intervalMs: 0,
      isOffline: () => offline,
    });

    await store.addTopic({ title: "written on a plane" });
    assert.equal((await engine.sync()).status, "offline");
    assert.ok(engine.state.pending > 0);
    assert.equal(app.db.raw.prepare("SELECT COUNT(*) c FROM entries").get()!.c, 0);

    offline = false;
    assert.equal((await engine.sync()).status, "idle");
    assert.equal(engine.state.pending, 0);
    assert.equal(app.db.raw.prepare("SELECT COUNT(*) c FROM entries").get()!.c, 1);
  });

  it("a device that isn't enrolled gets nowhere", async () => {
    const account = new AccountManager(new MemoryAccountStore());
    const created = await account.create();
    await enrolDevice({ endpoint, accountId: created.accountId });

    const intruder = await device("x", await account.accountKey(), "forged-token");
    const result = await intruder.engine.sync();
    assert.equal(result.status, "error");
    assert.equal((await intruder.store.graph()).topics.length, 0);
  });
});
