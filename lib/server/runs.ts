import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import type { RunRow } from "@/db/schema";
import { buildView, type RunState } from "@/lib/engine/game";
import type { CompiledCase } from "@/lib/engine/types";
import { getUser } from "./auth";
import { getCase } from "./cases";
import { getDb, type Db } from "./db";
import { getRateLimiter, LIMITS } from "./rate-limit";
import { ensureProfile } from "./repo/profiles";
import { claimAnonymousRuns, findCurrentRun, RunConflictError, saveRunState, stateFor, type Owner } from "./repo/runs";
import { getCookieSecret, signValue, verifyValue } from "./signed";

const ANON_COOKIE = "fx_anon";

/**
 * Who is playing. Signed-in players own their runs by user id; everyone else
 * gets a signed anonymous id cookie so progress survives reloads and return
 * visits in the same browser. With `write`, missing ids are created and a
 * signed-in player's anonymous runs are claimed (needs a context that can set
 * cookies: route handlers and server actions).
 */
export async function getOwner(write: boolean): Promise<Owner | null> {
  const user = await getUser();
  const jar = await cookies();
  const anonId = verifyValue<string>(jar.get(ANON_COOKIE)?.value, getCookieSecret());
  if (user) {
    if (write) {
      const db = await getDb();
      await ensureProfile(db, user);
      if (anonId) {
        await claimAnonymousRuns(db, anonId, user.id);
        jar.delete(ANON_COOKIE);
      }
    }
    return { userId: user.id };
  }
  if (anonId) return { userId: null, anonId };
  if (!write) return null;
  const id = randomUUID();
  jar.set(ANON_COOKIE, signValue(id, getCookieSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return { userId: null, anonId: id };
}

/** Claims any anonymous runs for a user who just signed in. */
export async function claimForUser(userId: string) {
  const jar = await cookies();
  const anonId = verifyValue<string>(jar.get(ANON_COOKIE)?.value, getCookieSecret());
  if (!anonId) return 0;
  const n = await claimAnonymousRuns(await getDb(), anonId, userId);
  jar.delete(ANON_COOKIE);
  return n;
}

export function viewFor(c: CompiledCase, s: RunState) {
  return buildView(c, s, Date.now());
}

/** Current run for a page render (read-only; never creates anything). */
export async function loadCurrentRun(c: CompiledCase): Promise<RunState | null> {
  const owner = await getOwner(false);
  if (!owner) return null;
  const row = await findCurrentRun(await getDb(), owner, c.slug);
  return row ? stateFor(c, row) : null;
}

// ---------------------------------------------------------------- request helpers

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Common guard for mutating requests: same-origin check (CSRF), per-IP rate
 * limit, body size and JSON parsing.
 */
export async function readGameRequest(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return { ok: false, res: jsonError(403, "Cross-origin request blocked.") };
  const ip = await getRateLimiter().hit(`ip:${clientIp(req)}`, LIMITS.ip.limit, LIMITS.ip.windowMs);
  if (!ip.ok) return { ok: false, res: jsonError(429, "Too many requests.", { retryAfter: ip.retryAfter }) };
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len > 16_384) return { ok: false, res: jsonError(413, "Request too large.") };
  try {
    const text = await req.text();
    if (text.length > 16_384) return { ok: false, res: jsonError(413, "Request too large.") };
    const body = text ? JSON.parse(text) : {};
    if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, res: jsonError(400, "Invalid body.") };
    return { ok: true, body };
  } catch {
    return { ok: false, res: jsonError(400, "Invalid JSON.") };
  }
}

export type GameContext = { c: CompiledCase; db: Db; owner: Owner; row: RunRow; s: RunState };

/** Loads the case and the player's current run, or returns the error response. */
export async function caseAndRun(slug: string): Promise<({ ok: true } & GameContext) | { ok: false; res: Response }> {
  const c = getCase(slug);
  if (!c) return { ok: false, res: jsonError(404, "Unknown case.") };
  const owner = await getOwner(true);
  const db = await getDb();
  const row = owner ? await findCurrentRun(db, owner, slug) : null;
  if (!owner || !row) return { ok: false, res: jsonError(409, "No case in progress. Open the case file to start.") };
  return { ok: true, c, db, owner, row, s: stateFor(c, row) };
}

/** Saves a new state; a concurrent save becomes a 409 the client can recover from by reloading. */
export async function persist(ctx: GameContext, next: RunState): Promise<{ ok: true; s: RunState } | { ok: false; res: Response }> {
  if (next === ctx.s) return { ok: true, s: next };
  try {
    const row = await saveRunState(ctx.db, ctx.row, next, ctx.c, Date.now());
    return { ok: true, s: stateFor(ctx.c, row) };
  } catch (e) {
    if (e instanceof RunConflictError) return { ok: false, res: jsonError(409, e.message) };
    throw e;
  }
}
