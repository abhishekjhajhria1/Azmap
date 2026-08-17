/**
 * Engine behaviour under the conditions that actually happen: a flaky network,
 * an app that quits mid-sync, two devices writing at once, and a remote that
 * delivers the same page twice.
 *
 * Every test runs the real engine against the real loopback transport and real
 * storage — the only fakes are the clock and the failure injection.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { MapStore } from "../store.js";
import { MemoryStorage } from "../storage/memory.js";
import { SyncEngine, type Scheduler } from "./engine.js";
import { LoopbackSyncAdapter, MemoryRelayLog } from "./loopback.js";
import { Outbox, TrackedStorage } from "./outbox.js";
import { LocalOnlySync } from "./index.js";
import {
  MemorySyncState,
  type Delta,
  type PushAck,
  type PushDelta,
  type SyncAdapter,
} from "./types.js";

/** A clock we control: nothing fires until a test says so. */
class FakeScheduler implements Scheduler {
  private handle = 0;
  private timers = new Map<number, { fn: () => void; at: number }>();
  now = 0;

  setTimeout(fn: () => void, ms: number): unknown {
    const id = ++this.handle;
    this.timers.set(id, { fn, at: this.now + ms });
    return id;
  }
  clearTimeout(h: unknown): void {
    this.timers.delete(h as number);
  }
  /** Fire everything due at or before `now + ms`. */
  async advance(ms: number): Promise<void> {
    this.now += ms;
    const due = [...this.timers.entries()].filter(([, t]) => t.at <= this.now);
    for (const [id, t] of due) {
      this.timers.delete(id);
      t.fn();
    }
    await flush();
  }
  get pending(): number {
    return this.timers.size;
  }
  /** Delay of the next armed timer — how backoff is asserted. */
  get nextDelay(): number {
    const next = [...this.timers.values()][0];
    return next ? next.at - this.now : -1;
  }
}

/** Let queued microtasks settle. */
const flush = () => new Promise<void>((r) => setTimeout(r, 0));

/** One device: raw storage, a tracked view for writes, an engine on the raw one. */
function device(id: string, log: MemoryRelayLog, scheduler: FakeScheduler) {
  const raw = new MemoryStorage(id);
  const outbox = new Outbox(new MemorySyncState());
  const store = new MapStore(new TrackedStorage(raw, outbox));
  const engine = new SyncEngine({
    storage: raw,
    outbox,
    adapter: new LoopbackSyncAdapter(log, { deviceId: id }),
    scheduler,
    intervalMs: 0,
    isOffline: () => false,
    random: () => 1,
  });
  return { id, raw, outbox, store, engine };
}

let log: MemoryRelayLog;
let clock: FakeScheduler;

beforeEach(() => {
  log = new MemoryRelayLog();
  clock = new FakeScheduler();
});

describe("two devices over the loopback relay", () => {
  it("a topic written on one device appears on the other", async () => {
    const laptop = device("dev-a", log, clock);
    const phone = device("dev-b", log, clock);

    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();
    await phone.engine.sync();

    expect((await phone.store.graph()).topics.map((t) => t.title)).toEqual(["Limits"]);
  });

  it("a delete on one device removes it from the other", async () => {
    const laptop = device("dev-a", log, clock);
    const phone = device("dev-b", log, clock);

    const t = await laptop.store.addTopic({ title: "Mistake" });
    await laptop.engine.sync();
    await phone.engine.sync();
    expect((await phone.store.graph()).topics).toHaveLength(1);

    await laptop.store.removeTopic(t.id);
    await laptop.engine.sync();
    await phone.engine.sync();

    expect((await phone.store.graph()).topics).toHaveLength(0);
  });

  it("concurrent offline edits converge to the same record on both devices", async () => {
    const laptop = device("dev-a", log, clock);
    const phone = device("dev-b", log, clock);

    const t = await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();
    await phone.engine.sync();

    // Both edit while apart, to the same rev.
    await laptop.store.updateTopic(t.id, { summary: "from the laptop" });
    await phone.store.updateTopic(t.id, { summary: "from the phone" });

    // Then both come back and sync twice (push, then see each other).
    await laptop.engine.sync();
    await phone.engine.sync();
    await laptop.engine.sync();
    await phone.engine.sync();

    const a = (await laptop.store.graph()).topics.find((x) => x.id === t.id);
    const b = (await phone.store.graph()).topics.find((x) => x.id === t.id);
    expect(a).toEqual(b);
  });

  it("does not push its own records back to itself", async () => {
    const laptop = device("dev-a", log, clock);
    const inbound = vi.fn();
    laptop.engine.onInbound(inbound);

    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();
    await laptop.engine.sync();

    expect(inbound).not.toHaveBeenCalled();
    expect(log.size).toBe(1); // one push, not one per sync
  });

  it("wakes immediately when a peer writes, without waiting for a tick", async () => {
    const laptop = device("dev-a", log, clock);
    const phone = device("dev-b", log, clock);
    await phone.engine.start();

    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();
    await flush();
    await flush();

    expect((await phone.store.graph()).topics).toHaveLength(1);
    phone.engine.stop();
  });
});

describe("the outbox", () => {
  it("queues while offline and drains in one push when the network returns", async () => {
    let offline = true;
    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter: new LoopbackSyncAdapter(log, { deviceId: "dev-a" }),
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => offline,
      random: () => 1,
    });

    await store.addTopic({ title: "one" });
    await store.addTopic({ title: "two" });
    let result = await engine.sync();
    expect(result.status).toBe("offline");
    expect(engine.state.pending).toBe(2);
    expect(log.size).toBe(0);

    offline = false;
    result = await engine.sync();
    expect(result.pushed).toBe(2);
    expect(engine.state.pending).toBe(0);
    expect(log.size).toBe(1); // one delta, not one per record
  });

  it("collapses repeated edits to one record into a single entry", async () => {
    const laptop = device("dev-a", log, clock);
    const t = await laptop.store.addTopic({ title: "Limits" });
    for (let i = 0; i < 10; i++) await laptop.store.updateTopic(t.id, { summary: `v${i}` });

    // Eleven writes, one queue entry — the outbox holds references, not copies.
    expect(laptop.engine.state.pending).toBe(1);
    const drained = await laptop.outbox.drain(laptop.raw);
    expect(drained!.keys).toHaveLength(1);
    // And what ships is the latest version, not the first one queued.
    expect(drained!.delta.records.topics![0]!.summary).toBe("v9");
  });

  it("survives a restart — a queued write is still there in a new engine", async () => {
    const state = new MemorySyncState();
    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(state);
    const store = new MapStore(new TrackedStorage(raw, outbox));
    await store.addTopic({ title: "written before the crash" });
    await outbox.flush();

    // The process dies. New engine, same disk.
    const revived = new Outbox(state);
    await revived.load();
    expect(revived.size).toBeGreaterThan(0);

    const engine = new SyncEngine({
      storage: raw,
      outbox: revived,
      adapter: new LoopbackSyncAdapter(log, { deviceId: "dev-a" }),
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });
    const result = await engine.sync();
    expect(result.pushed).toBeGreaterThan(0);
    expect(log.read(0, 10)[0]!.item.records.topics).toHaveLength(1);
  });

  it("keeps writes that landed while a push was in flight", async () => {
    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));

    let release!: () => void;
    const held = new Promise<void>((r) => (release = r));
    const adapter: SyncAdapter = {
      connected: true,
      async push(): Promise<PushAck> {
        await held;
        return { cursor: "1" };
      },
      async pull(): Promise<Delta | null> {
        return null;
      },
    };
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter,
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });

    await store.addTopic({ title: "first" });
    const inFlight = engine.sync();
    await flush();
    await store.addTopic({ title: "second" }); // written mid-push
    release();
    await inFlight;

    // The second topic must still be queued — acking the batch must not ack it.
    expect(engine.state.pending).toBeGreaterThan(0);
    const drained = await outbox.drain(raw);
    expect(drained!.delta.records.topics!.map((t) => t.title)).toEqual(["second"]);
  });

  it("ships a tombstone for a record that was deleted before it ever synced", async () => {
    const laptop = device("dev-a", log, clock);
    const t = await laptop.store.addTopic({ title: "typo" });
    await laptop.store.removeTopic(t.id);

    const drained = await laptop.outbox.drain(laptop.raw);
    expect(drained!.delta.records.topics ?? []).toHaveLength(0);
    expect(drained!.delta.deletions.map((d) => d.id)).toEqual([t.id]);
  });
});

describe("reliability", () => {
  it("never loses the outbox when a push fails", async () => {
    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));
    const adapter: SyncAdapter = {
      connected: true,
      async push(): Promise<PushAck> {
        throw new Error("500 from the relay");
      },
      async pull(): Promise<Delta | null> {
        return null;
      },
    };
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter,
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });

    await store.addTopic({ title: "precious" });
    const before = engine.state.pending;
    const result = await engine.sync();

    expect(result.status).toBe("error");
    expect(engine.state.error).toMatch(/500/);
    expect(engine.state.pending).toBe(before);
  });

  it("backs off exponentially, capped, with jitter on the upper half", async () => {
    const raw = new MemoryStorage("dev-a");
    const engine = new SyncEngine({
      storage: raw,
      adapter: {
        connected: true,
        async push(): Promise<PushAck> {
          throw new Error("nope");
        },
        async pull(): Promise<Delta | null> {
          throw new Error("nope");
        },
      },
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
      backoff: { baseMs: 1000, maxMs: 10_000 },
      random: () => 1, // no jitter, so the schedule is assertable
    });

    expect(engine.backoffDelay(1)).toBe(1000);
    expect(engine.backoffDelay(2)).toBe(2000);
    expect(engine.backoffDelay(3)).toBe(4000);
    expect(engine.backoffDelay(10)).toBe(10_000); // capped

    const jittered = new SyncEngine({
      storage: raw,
      adapter: new LoopbackSyncAdapter(log),
      backoff: { baseMs: 1000, maxMs: 10_000 },
      random: () => 0,
    });
    expect(jittered.backoffDelay(1)).toBe(500); // never less than half
  });

  it("retries on the backoff schedule and recovers", async () => {
    let fail = true;
    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));
    const relay = new MemoryRelayLog();
    const inner = new LoopbackSyncAdapter(relay, { deviceId: "dev-a" });
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter: {
        connected: true,
        push: (d: PushDelta) => (fail ? Promise.reject(new Error("down")) : inner.push(d)),
        pull: (s) => (fail ? Promise.reject(new Error("down")) : inner.pull(s)),
      },
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
      backoff: { baseMs: 1000, maxMs: 10_000 },
      random: () => 1,
    });

    await store.addTopic({ title: "Limits" });
    await engine.start();
    await flush();

    expect(engine.state.status).toBe("error");
    expect(engine.state.attempt).toBe(1);
    expect(clock.nextDelay).toBe(1000);

    await clock.advance(1000);
    expect(engine.state.attempt).toBe(2);
    expect(clock.nextDelay).toBe(2000);

    fail = false;
    await clock.advance(2000);
    await flush();

    expect(engine.state.status).toBe("idle");
    expect(engine.state.attempt).toBe(0);
    expect(engine.state.pending).toBe(0);
    expect(relay.size).toBe(1);
    engine.stop();
  });

  it("runs one sync at a time — concurrent callers join the run in progress", async () => {
    const raw = new MemoryStorage("dev-a");
    let concurrent = 0;
    let maxConcurrent = 0;
    const adapter: SyncAdapter = {
      connected: true,
      async push(): Promise<PushAck> {
        return { cursor: "0" };
      },
      async pull(): Promise<Delta | null> {
        concurrent += 1;
        maxConcurrent = Math.max(maxConcurrent, concurrent);
        await flush();
        concurrent -= 1;
        return null;
      },
    };
    const engine = new SyncEngine({
      storage: raw,
      adapter,
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });

    await Promise.all([engine.sync(), engine.sync(), engine.sync()]);
    expect(maxConcurrent).toBe(1);
  });

  it("reports offline rather than error when there is no network", async () => {
    const raw = new MemoryStorage("dev-a");
    const engine = new SyncEngine({
      storage: raw,
      adapter: new LoopbackSyncAdapter(log),
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => true,
    });
    const result = await engine.sync();
    expect(result.status).toBe("offline");
    expect(engine.state.error).toBeNull(); // offline is expected, not a fault
  });

  it("reports offline with no adapter configured, and keeps queueing", async () => {
    const raw = new MemoryStorage("dev-a");
    const outbox = new Outbox(new MemorySyncState());
    const store = new MapStore(new TrackedStorage(raw, outbox));
    const engine = new SyncEngine({
      storage: raw,
      outbox,
      adapter: new LocalOnlySync(),
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });

    await store.addTopic({ title: "local only" });
    expect((await engine.sync()).status).toBe("offline");
    expect(engine.state.pending).toBeGreaterThan(0);
  });

  it("notifies subscribers of status transitions", async () => {
    const laptop = device("dev-a", log, clock);
    const seen: string[] = [];
    laptop.engine.subscribe((s) => seen.push(s.status));
    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();
    expect(seen).toEqual(["syncing", "idle"]);
  });
});

describe("applying inbound deltas", () => {
  it("is idempotent — a re-delivered page changes nothing", async () => {
    const laptop = device("dev-a", log, clock);
    const phone = device("dev-b", log, clock);

    await laptop.store.addTopic({ title: "Limits" });
    await laptop.store.addCapture({ kind: "note", text: "keep me" });
    await laptop.engine.sync();

    await phone.engine.sync();
    const after = await phone.store.export();

    // Rewind the cursor and pull the same page again.
    phone.outbox.setCursor(null);
    await phone.engine.sync();
    const again = await phone.store.export();

    expect(again.topics).toEqual(after.topics);
    expect(again.captures).toEqual(after.captures);
  });

  it("advances the cursor only after a successful apply", async () => {
    const raw = new MemoryStorage("dev-b");
    const outbox = new Outbox(new MemorySyncState());
    // A storage that fails to write — the disk is full, the tab was killed.
    const failing = Object.create(raw) as MemoryStorage;
    failing.importSnapshot = () => Promise.reject(new Error("disk full"));
    const engine = new SyncEngine({
      storage: failing,
      outbox,
      adapter: new LoopbackSyncAdapter(log, { deviceId: "dev-b" }),
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });

    const laptop = device("dev-a", log, clock);
    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();

    const result = await engine.sync();
    expect(result.status).toBe("error");
    expect(outbox.cursor).toBeNull(); // not advanced past the page we dropped
  });

  it("pages through a large backlog", async () => {
    const laptop = device("dev-a", log, clock);
    for (let i = 0; i < 5; i++) {
      await laptop.store.addCapture({ kind: "note", text: `n${i}` });
      await laptop.engine.sync(); // one relay entry each
    }

    const raw = new MemoryStorage("dev-b");
    const engine = new SyncEngine({
      storage: raw,
      adapter: new LoopbackSyncAdapter(log, { deviceId: "dev-b", pageSize: 2 }),
      scheduler: clock,
      intervalMs: 0,
      isOffline: () => false,
    });

    await engine.sync();
    expect(await raw.getCaptures()).toHaveLength(5);
  });

  it("reports inbound changes so the UI can patch instead of reload", async () => {
    const laptop = device("dev-a", log, clock);
    const phone = device("dev-b", log, clock);
    const seen: Delta[] = [];
    phone.engine.onInbound((c) => seen.push(c.delta));

    await laptop.store.addTopic({ title: "Limits" });
    await laptop.engine.sync();
    await phone.engine.sync();

    expect(seen).toHaveLength(1);
    expect(seen[0]!.records.topics).toHaveLength(1);
  });
});
