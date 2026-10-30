/**
 * Run persistence. Pure data access: callers pass a Db, so tests can use an
 * in-memory database.
 */
import { and, asc, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { profiles, runs, type RunRow } from "@/db/schema";
import { newRunState, reconcileState, scoreFor, type RunState } from "@/lib/engine/game";
import type { CompiledCase } from "@/lib/engine/types";
import type { Db } from "../db";

/** Who owns a run: a signed-in user, or an anonymous browser. */
export type Owner = { userId: string; anonId?: string | null } | { userId: null; anonId: string };

export class RunConflictError extends Error {
  constructor() {
    super("This run was updated elsewhere. Reload to continue.");
  }
}

export function toState(r: RunRow): RunState {
  return {
    v: 1,
    runId: r.id,
    slug: r.caseSlug,
    startedAt: r.startedAt.getTime(),
    solved: r.solved,
    hints: r.hints,
    wrong: r.wrong,
    lab: r.lab,
    ...(r.finishedAt ? { finishedAt: r.finishedAt.getTime() } : {}),
  };
}

function ownerFilter(owner: Owner) {
  return owner.userId !== null ? eq(runs.userId, owner.userId) : and(eq(runs.anonId, owner.anonId), isNull(runs.userId));
}

/** The owner's latest run of a case that hasn't been abandoned (finished runs count). */
export async function findCurrentRun(db: Db, owner: Owner, slug: string): Promise<RunRow | null> {
  const [row] = await db
    .select()
    .from(runs)
    .where(and(ownerFilter(owner), eq(runs.caseSlug, slug), isNull(runs.abandonedAt)))
    .orderBy(desc(runs.startedAt))
    .limit(1);
  return row ?? null;
}

export async function createRun(db: Db, owner: Owner, c: CompiledCase, now: number): Promise<RunRow> {
  const fresh = newRunState(c.slug, "pending", now);
  const [row] = await db
    .insert(runs)
    .values({
      userId: owner.userId,
      anonId: owner.userId ? (owner.anonId ?? null) : owner.anonId,
      caseSlug: c.slug,
      caseVersion: c.version,
      startedAt: new Date(fresh.startedAt),
    })
    .returning();
  return row!;
}

export async function abandonCurrentRun(db: Db, owner: Owner, slug: string, now: number) {
  await db
    .update(runs)
    .set({ abandonedAt: new Date(now), updatedAt: new Date(now) })
    .where(and(ownerFilter(owner), eq(runs.caseSlug, slug), isNull(runs.abandonedAt)));
}

/** Loads the current run's state, dropping ids the case no longer has. */
export function stateFor(c: CompiledCase, row: RunRow): RunState {
  return reconcileState(c, toState(row));
}

/**
 * Persists a new state for `row`. Fails with RunConflictError if another
 * request saved in between (optimistic concurrency on `version`). Records the
 * score when the run finishes.
 */
export async function saveRunState(db: Db, row: RunRow, next: RunState, c: CompiledCase, now: number): Promise<RunRow> {
  const finishing = next.finishedAt !== undefined && !row.finishedAt;
  const values: Partial<typeof runs.$inferInsert> = {
    solved: next.solved,
    hints: next.hints,
    wrong: next.wrong,
    lab: next.lab,
    version: row.version + 1,
    updatedAt: new Date(now),
  };
  if (finishing) {
    const s = scoreFor(c, next, now);
    Object.assign(values, {
      finishedAt: new Date(next.finishedAt!),
      score: s.score,
      rank: s.rank.label,
      elapsedMs: next.finishedAt! - next.startedAt,
      hintsUsed: Object.values(next.hints).reduce((a, b) => a + b, 0),
    });
  }
  const [saved] = await db
    .update(runs)
    .set(values)
    .where(and(eq(runs.id, row.id), eq(runs.version, row.version)))
    .returning();
  if (!saved) throw new RunConflictError();
  if (finishing && saved.userId) return (await markFirstCompletion(db, saved.userId, saved.caseSlug, saved.id)) ?? saved;
  return saved;
}

/** Marks a finished run as the user's first completion of the case, unless they already have one. */
async function markFirstCompletion(db: Db, userId: string, slug: string, runId: string): Promise<RunRow | null> {
  try {
    const [row] = await db
      .update(runs)
      .set({ firstCompletion: true })
      .where(
        and(
          eq(runs.id, runId),
          sql`not exists (select 1 from ${runs} r2 where r2.user_id = ${userId} and r2.case_slug = ${slug} and r2.first_completion)`,
        ),
      )
      .returning();
    return row ?? null;
  } catch {
    // Lost a race to a concurrent finish: the unique index kept just one.
    return null;
  }
}

/**
 * After sign-in: move this browser's anonymous runs to the user, so progress
 * made before signing up is kept. Returns how many runs were claimed.
 */
export async function claimAnonymousRuns(db: Db, anonId: string, userId: string): Promise<number> {
  const claimed = await db
    .update(runs)
    .set({ userId, updatedAt: new Date() })
    .where(and(eq(runs.anonId, anonId), isNull(runs.userId)))
    .returning();
  const finishedBySlug = new Map<string, RunRow>();
  for (const r of claimed) {
    if (!r.finishedAt) continue;
    const prev = finishedBySlug.get(r.caseSlug);
    if (!prev || r.finishedAt < prev.finishedAt!) finishedBySlug.set(r.caseSlug, r);
  }
  for (const r of finishedBySlug.values()) await markFirstCompletion(db, userId, r.caseSlug, r.id);
  return claimed.length;
}

export type LeaderboardEntry = {
  position: number;
  displayName: string;
  elapsedMs: number;
  score: number;
  rank: string;
  hintsUsed: number;
  finishedAt: Date;
  userId: string;
};

const leaderboardWhere = (slug: string) =>
  and(
    eq(runs.caseSlug, slug),
    eq(runs.firstCompletion, true),
    eq(profiles.leaderboardOptIn, true),
    isNotNull(profiles.displayName),
    isNotNull(runs.elapsedMs),
  );

/** Fastest first completions by players who opted in. Ties: higher score, then earlier finish. */
export async function leaderboard(db: Db, slug: string, limit = 50): Promise<LeaderboardEntry[]> {
  const rows = await db
    .select({
      displayName: profiles.displayName,
      elapsedMs: runs.elapsedMs,
      score: runs.score,
      rank: runs.rank,
      hintsUsed: runs.hintsUsed,
      finishedAt: runs.finishedAt,
      userId: runs.userId,
    })
    .from(runs)
    .innerJoin(profiles, eq(runs.userId, profiles.id))
    .where(leaderboardWhere(slug))
    .orderBy(asc(runs.elapsedMs), desc(runs.score), asc(runs.finishedAt))
    .limit(limit);
  return rows.map((r, i) => ({
    position: i + 1,
    displayName: r.displayName!,
    elapsedMs: r.elapsedMs!,
    score: r.score ?? 0,
    rank: r.rank ?? "",
    hintsUsed: r.hintsUsed ?? 0,
    finishedAt: r.finishedAt!,
    userId: r.userId!,
  }));
}

/** The user's position on a case leaderboard, or null if they aren't on it. */
export async function leaderboardPosition(db: Db, slug: string, userId: string): Promise<number | null> {
  const [mine] = await db
    .select({ elapsedMs: runs.elapsedMs, score: runs.score, finishedAt: runs.finishedAt })
    .from(runs)
    .innerJoin(profiles, eq(runs.userId, profiles.id))
    .where(and(leaderboardWhere(slug), eq(runs.userId, userId)));
  if (!mine) return null;
  const [{ ahead }] = (await db
    .select({ ahead: sql<number>`count(*)::int` })
    .from(runs)
    .innerJoin(profiles, eq(runs.userId, profiles.id))
    .where(
      and(
        leaderboardWhere(slug),
        sql`(${runs.elapsedMs}, -${runs.score}, ${runs.finishedAt}) < (${mine.elapsedMs}, ${-(mine.score ?? 0)}, ${mine.finishedAt})`,
      ),
    )) as [{ ahead: number }];
  return ahead + 1;
}

/** All of a user's non-abandoned runs, newest first (for the account page). */
export async function runsForUser(db: Db, userId: string): Promise<RunRow[]> {
  return db
    .select()
    .from(runs)
    .where(and(eq(runs.userId, userId), isNull(runs.abandonedAt)))
    .orderBy(desc(runs.startedAt));
}

/** All of a user's finished runs, including ones they later restarted. */
export async function finishedRunsForUser(db: Db, userId: string): Promise<RunRow[]> {
  return db
    .select()
    .from(runs)
    .where(and(eq(runs.userId, userId), isNotNull(runs.finishedAt)))
    .orderBy(desc(runs.finishedAt));
}
