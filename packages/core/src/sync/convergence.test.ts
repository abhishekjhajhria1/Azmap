/**
 * End-to-end sync properties, exercised through the real `MapStore` +
 * `MemoryStorage` path rather than the merge helpers in isolation.
 *
 * The product promise these defend: **nothing you wrote is ever lost, and
 * nothing you deleted ever comes back** — even after two devices edit offline
 * and then meet. `merge.test.ts` proves the ordering rule; this file proves the
 * storage layer actually applies it.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { MapStore } from "../store.js";
import { MemoryStorage } from "../storage/memory.js";
import type { MapSnapshot } from "../types.js";

/** Two devices on one account — the only topology the product supports. */
let laptopDb: MemoryStorage;
let phoneDb: MemoryStorage;
let laptop: MapStore;
let phone: MapStore;

beforeEach(() => {
  // Fixed device ids so tie-breaks are reproducible: "dev-a" < "dev-b".
  laptopDb = new MemoryStorage("dev-a");
  phoneDb = new MemoryStorage("dev-b");
  laptop = new MapStore(laptopDb);
  phone = new MapStore(phoneDb);
});

/** Ship one device's state to the other, over a wire that can only carry JSON. */
async function push(from: MapStore, to: MapStore): Promise<void> {
  const snapshot = JSON.parse(JSON.stringify(await from.export())) as MapSnapshot;
  await to.import(snapshot, "merge");
}

/** Both directions — what "a sync" actually means for a pair of peers. */
async function syncBoth(): Promise<void> {
  const fromLaptop = JSON.parse(JSON.stringify(await laptop.export())) as MapSnapshot;
  const fromPhone = JSON.parse(JSON.stringify(await phone.export())) as MapSnapshot;
  await phone.import(fromLaptop, "merge");
  await laptop.import(fromPhone, "merge");
}

/** Order-independent view of a device's data, for equality assertions. */
async function canonical(store: MapStore) {
  const s = await store.export();
  const by = <T extends { id: string }>(xs: readonly T[]) =>
    [...xs].sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return {
    topics: by(s.topics),
    edges: by(s.edges),
    roadmaps: by(s.roadmaps),
    suggestions: by(s.suggestions),
    guardians: by(s.guardians),
    captures: by(s.captures),
    deletions: [...s.deletions].sort((a, b) =>
      `${a.collection}:${a.id}` < `${b.collection}:${b.id}` ? -1 : 1,
    ),
    profile: s.profile,
  };
}

describe("convergence", () => {
  it("two devices that sync both ways hold identical state", async () => {
    await laptop.addTopic({ title: "Limits" });
    await laptop.addCapture({ kind: "note", text: "from the laptop" });
    await phone.addTopic({ title: "Vectors" });
    await phone.addCapture({ kind: "link", url: "https://example.com" });

    await syncBoth();

    expect(await canonical(laptop)).toEqual(await canonical(phone));
  });

  it("converges even when both devices edit the same record offline", async () => {
    const t = await laptop.addTopic({ title: "Limits" });
    await push(laptop, phone);

    // Both go offline and edit the same topic to the same rev.
    await laptop.updateTopic(t.id, { summary: "laptop wins?" });
    await phone.updateTopic(t.id, { summary: "phone wins?" });

    await syncBoth();

    const onLaptop = (await laptop.graph()).topics.find((x) => x.id === t.id);
    const onPhone = (await phone.graph()).topics.find((x) => x.id === t.id);
    expect(onLaptop).toEqual(onPhone);
    // The tie-break is deterministic, not "whoever synced last".
    expect(onLaptop!.deviceId).toBe("dev-b");
  });

  it("is idempotent — re-delivering the same snapshot changes nothing", async () => {
    await laptop.addTopic({ title: "Limits" });
    await laptop.addCapture({ kind: "note", text: "keep me" });
    await push(laptop, phone);

    const afterFirst = await canonical(phone);
    await push(laptop, phone);
    await push(laptop, phone);

    expect(await canonical(phone)).toEqual(afterFirst);
  });

  it("is order-independent — sync direction doesn't change the outcome", async () => {
    await laptop.addTopic({ title: "Limits" });
    await phone.addTopic({ title: "Vectors" });

    // Same edits, opposite sync order, on a fresh pair.
    const mirrorA = new MapStore(new MemoryStorage("dev-a"));
    const mirrorB = new MapStore(new MemoryStorage("dev-b"));
    await mirrorA.import(JSON.parse(JSON.stringify(await laptop.export())), "merge");
    await mirrorB.import(JSON.parse(JSON.stringify(await phone.export())), "merge");

    await push(laptop, phone);
    await push(phone, laptop);

    await mirrorB.import(JSON.parse(JSON.stringify(await mirrorA.export())), "merge");
    await mirrorA.import(JSON.parse(JSON.stringify(await mirrorB.export())), "merge");

    const titles = async (s: MapStore) =>
      (await s.graph()).topics.map((t) => t.title).sort();
    expect(await titles(laptop)).toEqual(await titles(mirrorA));
    expect(await titles(phone)).toEqual(await titles(mirrorB));
  });
});

describe("tombstones — deletes must not resurrect", () => {
  it("a deleted topic stays deleted after merging a peer that still has it", async () => {
    const t = await laptop.addTopic({ title: "Mistake" });
    await push(laptop, phone); // phone now holds it

    await laptop.removeTopic(t.id);
    await push(laptop, phone); // the delete travels
    await push(phone, laptop); // ...and the phone's stale copy comes back at us

    expect((await laptop.graph()).topics).toHaveLength(0);
    expect((await phone.graph()).topics).toHaveLength(0);
  });

  it("deleting on one device removes it from the other", async () => {
    const t = await laptop.addTopic({ title: "Mistake" });
    await syncBoth();
    expect((await phone.graph()).topics).toHaveLength(1);

    await laptop.removeTopic(t.id);
    await syncBoth();

    expect((await phone.graph()).topics).toHaveLength(0);
    expect(await canonical(laptop)).toEqual(await canonical(phone));
  });

  it("a later edit beats an older delete — an un-delete is possible", async () => {
    const t = await laptop.addTopic({ title: "Limits" });
    await push(laptop, phone);

    await laptop.removeTopic(t.id); // tombstone at rev 1
    await phone.updateTopic(t.id, { summary: "one" }); // rev 1
    await phone.updateTopic(t.id, { summary: "two" }); // rev 2 — outranks it

    await syncBoth();

    const survivors = (await laptop.graph()).topics;
    expect(survivors.map((x) => x.summary)).toEqual(["two"]);
    expect(await canonical(laptop)).toEqual(await canonical(phone));
  });

  it("an older edit loses to a newer delete", async () => {
    const t = await laptop.addTopic({ title: "Limits" });
    await push(laptop, phone);

    await laptop.updateTopic(t.id, { summary: "one" }); // rev 1
    await laptop.updateTopic(t.id, { summary: "two" }); // rev 2
    await laptop.removeTopic(t.id); // tombstone at rev 3
    // The phone edited only once while offline — rev 1, older than the delete.
    await phone.updateTopic(t.id, { summary: "stale" });

    await syncBoth();

    expect((await laptop.graph()).topics).toHaveLength(0);
    expect((await phone.graph()).topics).toHaveLength(0);
  });

  it("removing a topic tombstones its edges too, so they don't resurrect", async () => {
    const a = await laptop.addTopic({ title: "a" });
    const b = await laptop.addTopic({ title: "b" });
    await laptop.addEdge(a.id, b.id);
    await push(laptop, phone);

    await laptop.removeTopic(a.id);
    await push(laptop, phone);
    await push(phone, laptop);

    expect((await laptop.graph()).edges).toHaveLength(0);
    expect((await phone.graph()).edges).toHaveLength(0);
  });

  it("tombstones are keyed per collection, so ids never collide across stores", async () => {
    const t = await laptop.addTopic({ title: "gone" });
    const e = await laptop.addTopic({ title: "kept" });
    await laptop.removeTopic(t.id);

    const deletions = await laptopDb.getDeletions();
    expect(deletions.map((d) => d.collection)).toEqual(["topics"]);
    expect((await laptop.graph()).topics.map((x) => x.id)).toEqual([e.id]);
  });

  it("pruning old tombstones leaves recent ones intact", async () => {
    const t = await laptop.addTopic({ title: "gone" });
    await laptop.removeTopic(t.id);
    expect(await laptopDb.getDeletions()).toHaveLength(1);

    await laptopDb.pruneDeletions(Date.now() - 1000); // retention window not yet passed
    expect(await laptopDb.getDeletions()).toHaveLength(1);

    await laptopDb.pruneDeletions(Date.now() + 1000);
    expect(await laptopDb.getDeletions()).toHaveLength(0);
  });
});

describe("no data loss — the promise that must never break", () => {
  it("captures written on both devices all survive a sync", async () => {
    for (let i = 0; i < 5; i++) await laptop.addCapture({ kind: "note", text: `L${i}` });
    for (let i = 0; i < 5; i++) await phone.addCapture({ kind: "note", text: `P${i}` });

    await syncBoth();

    const texts = async (s: MapStore) => (await s.export()).captures.map((c) => c.text).sort();
    expect(await texts(laptop)).toHaveLength(10);
    expect(await texts(laptop)).toEqual(await texts(phone));
  });

  it("a merge never drops a record the receiver already had", async () => {
    await laptop.addTopic({ title: "mine" });
    await laptop.addCapture({ kind: "note", text: "mine" });
    const before = await canonical(laptop);

    // An empty peer must be a no-op, not a wipe.
    await push(phone, laptop);

    const after = await canonical(laptop);
    expect(after.topics).toEqual(before.topics);
    expect(after.captures).toEqual(before.captures);
  });

  it("an older copy of a capture cannot clobber a newer one", async () => {
    const c = await laptop.addCapture({ kind: "note", text: "v0" });
    await push(laptop, phone);

    // The laptop revises it; the phone still holds v0 and pushes back.
    await laptopDb.putCapture({ ...c, text: "v1", rev: c.rev + 1, updatedAt: c.updatedAt + 1 });
    await push(phone, laptop);

    expect((await laptop.export()).captures[0]!.text).toBe("v1");
  });

  it("suggestions and guardians reconcile by version, not by arrival order", async () => {
    const t = await laptop.addTopic({ title: "Limits" });
    const g = await laptop.addGuardian({ name: "Ada", relationship: "parent" });
    await laptop.proposeSuggestion({ title: "Continuity", reason: "prerequisite" });
    await push(laptop, phone);

    await laptop.updateProfile({ name: "renamed" });
    await phone.import(JSON.parse(JSON.stringify(await laptop.export())), "merge");

    const onPhone = await phone.export();
    expect(onPhone.guardians.map((x) => x.id)).toEqual([g.id]);
    expect(onPhone.suggestions).toHaveLength(1);
    expect(onPhone.topics.map((x) => x.id)).toEqual([t.id]);
  });

  it("replace mode is the only path that discards local data", async () => {
    await laptop.addTopic({ title: "mine" });
    await laptop.import(await phone.export(), "replace");
    expect((await laptop.graph()).topics).toHaveLength(0);
  });
});

describe("profile", () => {
  it("the higher-rev profile wins and both devices agree", async () => {
    await laptop.ensureProfile("Ada");
    await push(laptop, phone);

    await laptop.updateProfile({ name: "Ada Lovelace" });
    await syncBoth();

    expect((await laptop.getProfile())!.name).toBe("Ada Lovelace");
    expect((await phone.getProfile())!.name).toBe("Ada Lovelace");
  });
});
