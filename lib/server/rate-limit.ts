/**
 * Rate limiting.
 *
 * Postgres-backed fixed windows when DATABASE_URL is set, so limits hold across
 * serverless instances; in-memory sliding windows for local single-process dev.
 */
import { lt, sql } from "drizzle-orm";
import { rateLimits } from "@/db/schema";
import type { Db } from "./db";

export type RateResult = { ok: true } | { ok: false; retryAfter: number };

export interface RateLimiter {
  hit(key: string, limit: number, windowMs: number): Promise<RateResult>;
}

export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private now: () => number = Date.now) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateResult> {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return { ok: false, retryAfter: Math.ceil((recent[0]! + windowMs - now) / 1000) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 50_000) this.prune(now, windowMs);
    return { ok: true };
  }

  private prune(now: number, windowMs: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < windowMs)) this.hits.delete(k);
  }
}

export class PostgresRateLimiter implements RateLimiter {
  constructor(
    private db: () => Promise<Db>,
    private now: () => number = Date.now,
  ) {}

  async hit(key: string, limit: number, windowMs: number): Promise<RateResult> {
    const now = this.now();
    const windowStart = new Date(Math.floor(now / windowMs) * windowMs);
    const db = await this.db();
    const [row] = await db
      .insert(rateLimits)
      .values({ key, windowStart, count: 1 })
      .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
      .returning({ count: rateLimits.count });
    // Occasionally clear out windows older than a day.
    if (Math.random() < 0.01) await db.delete(rateLimits).where(lt(rateLimits.windowStart, new Date(now - 86_400_000)));
    if (row!.count > limit) return { ok: false, retryAfter: Math.max(1, Math.ceil((windowStart.getTime() + windowMs - now) / 1000)) };
    return { ok: true };
  }
}

const g = globalThis as unknown as { __fxLimiter?: RateLimiter };

export function getRateLimiter(): RateLimiter {
  if (!g.__fxLimiter) {
    if (process.env.DATABASE_URL) {
      g.__fxLimiter = new PostgresRateLimiter(async () => (await import("./db")).getDb());
    } else {
      g.__fxLimiter = new MemoryRateLimiter();
    }
  }
  return g.__fxLimiter;
}

export const LIMITS = {
  /** Answer attempts per puzzle per run. */
  attempt: { limit: 8, windowMs: 60_000 },
  lab: { limit: 20, windowMs: 60_000 },
  hint: { limit: 10, windowMs: 60_000 },
  /** All game API calls per client IP. */
  ip: { limit: 240, windowMs: 60_000 },
  /** Sign-in emails per IP. */
  signIn: { limit: 5, windowMs: 10 * 60_000 },
} as const;
