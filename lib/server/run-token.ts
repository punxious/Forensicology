/**
 * Phase 1 run storage: the run state lives in an HMAC-signed, httpOnly cookie.
 * Players can't edit it (the signature would break). They could replay an old
 * cookie to undo wrong guesses; that's acceptable until Phase 2 moves runs into
 * Postgres, before leaderboards exist.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { RunState } from "@/lib/engine/game";

const DEV_SECRET = "forensicology-dev-run-secret-do-not-use-in-production";

export function getRunSecret(): string {
  const s = process.env.RUN_TOKEN_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("RUN_TOKEN_SECRET must be set (32+ characters) in production.");
  return DEV_SECRET;
}

const sign = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function encodeRun(state: RunState, secret: string): string {
  const payload = Buffer.from(JSON.stringify(state)).toString("base64url");
  return `${payload}.${sign(secret, payload)}`;
}

export function decodeRun(token: string | undefined, secret: string): RunState | null {
  if (!token || token.length > 8192) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(sign(secret, payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const state = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as RunState;
    if (state.v !== 1 || typeof state.slug !== "string" || !Array.isArray(state.solved)) return null;
    return state;
  } catch {
    return null;
  }
}
