import "server-only";
import { randomUUID } from "node:crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildView, newRunState, reconcileState, type RunState } from "@/lib/engine/game";
import type { CompiledCase } from "@/lib/engine/types";
import { getCase } from "./cases";
import { decodeRun, encodeRun, getRunSecret } from "./run-token";
import { LIMITS, rateLimiter } from "./rate-limit";

const cookieName = (slug: string) => `fx_run_${slug}`;
const MAX_AGE = 60 * 60 * 24 * 30;

export async function loadRun(c: CompiledCase): Promise<RunState | null> {
  const jar = await cookies();
  const state = decodeRun(jar.get(cookieName(c.slug))?.value, getRunSecret());
  if (!state || state.slug !== c.slug) return null;
  return reconcileState(c, state);
}

export async function saveRun(state: RunState) {
  const jar = await cookies();
  jar.set(cookieName(state.slug), encodeRun(state, getRunSecret()), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE,
  });
}

export async function clearRun(slug: string) {
  (await cookies()).delete(cookieName(slug));
}

export async function startRun(c: CompiledCase, now = Date.now()): Promise<RunState> {
  const state = newRunState(c.slug, randomUUID(), now);
  await saveRun(state);
  return state;
}

export function viewFor(c: CompiledCase, s: RunState) {
  return buildView(c, s, Date.now());
}

// ---------------------------------------------------------------- request helpers

export function jsonError(status: number, error: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error, ...extra }, { status, headers: { "Cache-Control": "no-store" } });
}

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, { ...init, headers: { "Cache-Control": "no-store", ...init?.headers } });
}

function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "local";
}

/**
 * Common guard for mutating game requests: same-origin check (CSRF), body size,
 * JSON parsing and the per-IP rate limit.
 */
export async function readGameRequest(req: Request): Promise<{ ok: true; body: Record<string, unknown> } | { ok: false; res: Response }> {
  const origin = req.headers.get("origin");
  if (origin && origin !== new URL(req.url).origin) return { ok: false, res: jsonError(403, "Cross-origin request blocked.") };
  const ip = rateLimiter.hit(`ip:${clientIp(req)}`, LIMITS.ip.limit, LIMITS.ip.windowMs);
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

/** Loads the case and the player's run, or returns the error response. */
export async function caseAndRun(slug: string): Promise<{ ok: true; c: CompiledCase; s: RunState } | { ok: false; res: Response }> {
  const c = getCase(slug);
  if (!c) return { ok: false, res: jsonError(404, "Unknown case.") };
  const s = await loadRun(c);
  if (!s) return { ok: false, res: jsonError(409, "No case in progress. Open the case file to start.") };
  return { ok: true, c, s };
}
