/**
 * Streaks — forgiving by design.
 *
 * A streak you can never repair punishes the user and causes abandonment; one
 * that survives a single bad day brings them back. So a missed day is
 * automatically repaired from a limited pool of "freezes" instead of wiping
 * progress.
 *
 * Pure functions over a local day key so every surface (web, extension,
 * mobile) computes the identical streak from the same profile record.
 */

import type { Profile } from "./types.js";

/** Local calendar day as "YYYY-MM-DD". Local, so a user's day boundary is theirs. */
export function dayKey(at: Date = new Date()): string {
  const y = at.getFullYear();
  const m = String(at.getMonth() + 1).padStart(2, "0");
  const d = String(at.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Whole days between two day keys (b - a). */
export function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split("-").map(Number) as [number, number, number];
  const [by, bm, bd] = b.split("-").map(Number) as [number, number, number];
  const ms = Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad);
  return Math.round(ms / 86_400_000);
}

export type StreakState = Pick<
  Profile,
  "streakDays" | "bestStreak" | "lastActiveDay" | "streakFreezes"
>;

/**
 * The streak after activity on `today`.
 *  - same day        → unchanged (idempotent; activity twice a day isn't two days)
 *  - next day        → +1
 *  - one day missed  → repaired with a freeze if any remain, else restart
 *  - longer gap      → restart at 1
 */
export function advanceStreak(state: StreakState, today: string = dayKey()): StreakState {
  const last = state.lastActiveDay;
  if (last === today) return state;

  const gap = last ? daysBetween(last, today) : Infinity;

  let streakDays: number;
  let streakFreezes = state.streakFreezes;

  if (gap === 1) {
    streakDays = state.streakDays + 1;
  } else if (gap === 2 && streakFreezes > 0) {
    // Exactly one missed day, and we can cover it.
    streakDays = state.streakDays + 1;
    streakFreezes -= 1;
  } else {
    streakDays = 1;
  }

  return {
    streakDays,
    bestStreak: Math.max(state.bestStreak, streakDays),
    lastActiveDay: today,
    streakFreezes,
  };
}

/** True when the streak is still live today (activity today or yesterday). */
export function streakIsLive(state: StreakState, today: string = dayKey()): boolean {
  if (!state.lastActiveDay) return false;
  return daysBetween(state.lastActiveDay, today) <= 1;
}
