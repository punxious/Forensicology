import { beforeEach, describe, expect, it } from "vitest";
import { attempt, type RunState } from "@/lib/engine/game";
import type { Db } from "@/lib/server/db";
import { PostgresRateLimiter } from "@/lib/server/rate-limit";
import { deleteProfile, ensureProfile, updateProfile, validateDisplayName } from "@/lib/server/repo/profiles";
import {
  abandonCurrentRun,
  claimAnonymousRuns,
  createRun,
  findCurrentRun,
  leaderboard,
  leaderboardPosition,
  RunConflictError,
  saveRunState,
  stateFor,
  type Owner,
} from "@/lib/server/repo/runs";
import { compiledSample, PEPPER, sampleSource } from "./helpers";
import { testDb } from "./db-helpers";

const c = compiledSample();
const answers = Object.fromEntries(sampleSource().puzzles.map((p) => [p.id, p.answer]));
const marks = ["A3", "B2", "B4", "C3", "C5", "D2"].map((cell) => ({ cell, type: "dot" }));
const T0 = Date.UTC(2026, 9, 1);
const MIN = 60_000;

/** Plays the whole sample case through the engine, saving each step. */
async function playToEnd(db: Db, owner: Owner, minutes: number, wrong = 0) {
  let row = await createRun(db, owner, c, T0);
  const step = async (next: RunState, now = T0) => {
    row = await saveRunState(db, row, next, c, now);
  };
  for (let i = 0; i < wrong; i++) {
    const out = attempt(c, stateFor(c, row), "desk-drawer", "0000", PEPPER, T0);
    if (!out.ok) throw new Error(out.error);
    await step(out.state);
  }
  for (const id of ["desk-drawer", "timeline", "statements", "alibis", "lab", "fingerprint", "journal", "accusation"]) {
    const s = stateFor(c, row);
    const answer = id === "lab" ? null : id === "fingerprint" ? { card: answers.fingerprint, marks } : answers[id];
    if (id === "lab") {
      const { runLab } = await import("@/lib/engine/game");
      const out = runLab(c, s, "lab", answers.lab, PEPPER, T0);
      if (!out.ok) throw new Error(out.error);
      await step(out.state);
      continue;
    }
    const now = id === "accusation" ? T0 + minutes * MIN : T0;
    const out = attempt(c, s, id, answer, PEPPER, now);
    if (!out.ok || !out.correct) throw new Error(`failed at ${id}`);
    await step(out.state, now);
  }
  return row;
}

let db: Db;
beforeEach(async () => {
  db = await testDb();
});

describe("runs", () => {
  it("creates, finds and resumes the current run per owner", async () => {
    const anon: Owner = { userId: null, anonId: "00000000-0000-4000-8000-000000000001" };
    const other: Owner = { userId: null, anonId: "00000000-0000-4000-8000-000000000002" };
    const row = await createRun(db, anon, c, T0);
    expect((await findCurrentRun(db, anon, c.slug))?.id).toBe(row.id);
    expect(await findCurrentRun(db, other, c.slug)).toBeNull();

    await abandonCurrentRun(db, anon, c.slug, T0 + 1);
    expect(await findCurrentRun(db, anon, c.slug)).toBeNull();
  });

  it("rejects a stale save (optimistic concurrency)", async () => {
    const owner: Owner = { userId: null, anonId: "00000000-0000-4000-8000-000000000003" };
    const row = await createRun(db, owner, c, T0);
    const s = stateFor(c, row);
    await saveRunState(db, row, { ...s, hints: { "desk-drawer": 1 } }, c, T0);
    await expect(saveRunState(db, row, { ...s, hints: { "desk-drawer": 2 } }, c, T0)).rejects.toBeInstanceOf(RunConflictError);
  });

  it("records the score when a run finishes, and only the first completion counts for leaderboards", async () => {
    const user = await ensureProfile(db, { id: "10000000-0000-4000-8000-000000000001", email: "a@example.com" });
    const owner: Owner = { userId: user.id };
    const first = await playToEnd(db, owner, 40, 1);
    expect(first).toMatchObject({ score: 10000 - 2000 - 100, rank: "Senior Examiner", elapsedMs: 40 * MIN, firstCompletion: true, hintsUsed: 0 });

    await abandonCurrentRun(db, owner, c.slug, T0);
    const second = await playToEnd(db, owner, 20);
    expect(second.firstCompletion).toBe(false);
  });
});

describe("claiming anonymous progress", () => {
  it("moves anonymous runs to the user and makes a finished one their first completion", async () => {
    const anonId = "00000000-0000-4000-8000-0000000000aa";
    const finished = await playToEnd(db, { userId: null, anonId }, 30);
    expect(finished.firstCompletion).toBe(false);

    const user = await ensureProfile(db, { id: "10000000-0000-4000-8000-000000000002", email: "b@example.com" });
    expect(await claimAnonymousRuns(db, anonId, user.id)).toBe(1);
    const mine = await findCurrentRun(db, { userId: user.id }, c.slug);
    expect(mine).toMatchObject({ id: finished.id, userId: user.id, firstCompletion: true });
    expect(await findCurrentRun(db, { userId: null, anonId }, c.slug)).toBeNull();
  });
});

describe("leaderboards", () => {
  it("lists opted-in players' first completions, fastest first", async () => {
    const players = [
      { id: "20000000-0000-4000-8000-000000000001", name: "Ada", minutes: 35, opt: true },
      { id: "20000000-0000-4000-8000-000000000002", name: "Bo", minutes: 25, opt: true },
      { id: "20000000-0000-4000-8000-000000000003", name: "Cy", minutes: 15, opt: false },
    ];
    for (const p of players) {
      await ensureProfile(db, { id: p.id, email: `${p.name}@example.com` });
      await updateProfile(db, p.id, { displayName: p.name, leaderboardOptIn: p.opt, marketingOptIn: false });
      await playToEnd(db, { userId: p.id }, p.minutes);
    }
    const board = await leaderboard(db, c.slug);
    expect(board.map((e) => [e.position, e.displayName, e.elapsedMs])).toEqual([
      [1, "Bo", 25 * MIN],
      [2, "Ada", 35 * MIN],
    ]);
    expect(JSON.stringify(board)).not.toContain("@example.com");
    expect(await leaderboardPosition(db, c.slug, players[0]!.id)).toBe(2);
    expect(await leaderboardPosition(db, c.slug, players[2]!.id)).toBeNull();
  });

  it("needs a display name to opt in, and validates names", async () => {
    await ensureProfile(db, { id: "30000000-0000-4000-8000-000000000001", email: "x@example.com" });
    await expect(updateProfile(db, "30000000-0000-4000-8000-000000000001", { displayName: null, leaderboardOptIn: true, marketingOptIn: false })).rejects.toThrow(/display name/);
    expect(validateDisplayName("  Chief  Ada ")).toEqual({ ok: true, value: "Chief Ada" });
    expect(validateDisplayName("a").ok).toBe(false);
    expect(validateDisplayName("me@mail.com").ok).toBe(false);
    expect(validateDisplayName("<script>").ok).toBe(false);
    expect(validateDisplayName("")).toEqual({ ok: true, value: null });
  });
});

describe("account deletion", () => {
  it("removes the profile and every run", async () => {
    const id = "40000000-0000-4000-8000-000000000001";
    await ensureProfile(db, { id, email: "gone@example.com" });
    await playToEnd(db, { userId: id }, 30);
    await deleteProfile(db, id);
    expect(await findCurrentRun(db, { userId: id }, c.slug)).toBeNull();
    expect(await leaderboard(db, c.slug)).toEqual([]);
  });
});

describe("postgres rate limiter", () => {
  it("counts hits per window across calls", async () => {
    let now = 1_000_000;
    const rl = new PostgresRateLimiter(async () => db, () => now);
    for (let i = 0; i < 3; i++) expect((await rl.hit("k", 3, 60_000)).ok).toBe(true);
    const blocked = await rl.hit("k", 3, 60_000);
    expect(blocked.ok).toBe(false);
    now += 60_000;
    expect((await rl.hit("k", 3, 60_000)).ok).toBe(true);
  });
});
