import { beforeEach, describe, expect, it } from "vitest";
import { advanceStreak, dayKey, daysBetween, streakIsLive, type StreakState } from "./streak.js";
import { MapStore } from "./store.js";
import { MemoryStorage } from "./storage/memory.js";

const fresh = (over: Partial<StreakState> = {}): StreakState => ({
  streakDays: 0,
  bestStreak: 0,
  lastActiveDay: null,
  streakFreezes: 2,
  ...over,
});

describe("day keys", () => {
  it("formats a local day and measures gaps", () => {
    expect(dayKey(new Date(2026, 7, 16))).toBe("2026-08-16");
    expect(daysBetween("2026-08-16", "2026-08-17")).toBe(1);
    expect(daysBetween("2026-08-31", "2026-09-01")).toBe(1); // month boundary
    expect(daysBetween("2026-12-31", "2027-01-01")).toBe(1); // year boundary
  });
});

describe("advanceStreak", () => {
  it("starts a streak at 1", () => {
    const s = advanceStreak(fresh(), "2026-08-16");
    expect(s.streakDays).toBe(1);
    expect(s.bestStreak).toBe(1);
    expect(s.lastActiveDay).toBe("2026-08-16");
  });

  it("is idempotent within the same day", () => {
    const day1 = advanceStreak(fresh(), "2026-08-16");
    const again = advanceStreak(day1, "2026-08-16");
    expect(again.streakDays).toBe(1);
    expect(again.streakFreezes).toBe(day1.streakFreezes);
  });

  it("increments on consecutive days", () => {
    let s = advanceStreak(fresh(), "2026-08-16");
    s = advanceStreak(s, "2026-08-17");
    s = advanceStreak(s, "2026-08-18");
    expect(s.streakDays).toBe(3);
    expect(s.bestStreak).toBe(3);
  });

  it("repairs a single missed day using a freeze (forgiving)", () => {
    let s = advanceStreak(fresh(), "2026-08-16");
    s = advanceStreak(s, "2026-08-17"); // streak 2, freezes 2
    // Miss the 18th; return on the 19th.
    s = advanceStreak(s, "2026-08-19");
    expect(s.streakDays).toBe(3); // survived
    expect(s.streakFreezes).toBe(1); // one freeze spent
  });

  it("restarts once freezes run out", () => {
    let s = advanceStreak(fresh({ streakFreezes: 1 }), "2026-08-01");
    s = advanceStreak(s, "2026-08-03"); // repaired, freezes -> 0
    expect(s.streakDays).toBe(2);
    s = advanceStreak(s, "2026-08-05"); // missed again, no freezes left
    expect(s.streakDays).toBe(1);
  });

  it("restarts after a long gap but keeps the personal best", () => {
    let s = advanceStreak(fresh(), "2026-08-01");
    s = advanceStreak(s, "2026-08-02");
    s = advanceStreak(s, "2026-08-03"); // best 3
    s = advanceStreak(s, "2026-09-01"); // long gap
    expect(s.streakDays).toBe(1);
    expect(s.bestStreak).toBe(3);
  });
});

describe("streakIsLive", () => {
  it("is live today and yesterday, dead beyond", () => {
    const s = fresh({ lastActiveDay: "2026-08-16", streakDays: 4 });
    expect(streakIsLive(s, "2026-08-16")).toBe(true);
    expect(streakIsLive(s, "2026-08-17")).toBe(true);
    expect(streakIsLive(s, "2026-08-18")).toBe(false);
    expect(streakIsLive(fresh(), "2026-08-16")).toBe(false);
  });
});

describe("MapStore.complete records activity", () => {
  let store: MapStore;
  beforeEach(() => {
    store = new MapStore(new MemoryStorage());
  });

  it("returns the unlocked topics AND advances the streak", async () => {
    const a = await store.addTopic({ title: "Limits" });
    const b = await store.addTopic({ title: "Derivatives" });
    await store.addEdge(a.id, b.id);

    const res = await store.complete(a.id);
    expect(res.unlocked.map((t) => t.title)).toEqual(["Derivatives"]);
    expect(res.streak).toBe(1);

    // A second completion the same day doesn't double-count the streak.
    const res2 = await store.complete(b.id);
    expect(res2.streak).toBe(1);
    expect((await store.getProfile())?.streakDays).toBe(1);
  });
});
