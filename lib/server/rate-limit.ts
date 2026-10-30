/**
 * Sliding-window rate limiter.
 *
 * Phase 1 keeps counters in memory, which is fine for a single local server.
 * Serverless instances don't share memory, so Phase 2 adds a Postgres-backed
 * implementation of the same interface.
 */
export interface RateLimiter {
  /** Records a hit; returns ok=false with seconds to wait when over the limit. */
  hit(key: string, limit: number, windowMs: number): { ok: true } | { ok: false; retryAfter: number };
}

export class MemoryRateLimiter implements RateLimiter {
  private hits = new Map<string, number[]>();
  constructor(private now: () => number = Date.now) {}

  hit(key: string, limit: number, windowMs: number) {
    const now = this.now();
    const recent = (this.hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      this.hits.set(key, recent);
      return { ok: false as const, retryAfter: Math.ceil((recent[0]! + windowMs - now) / 1000) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 50_000) this.prune(now, windowMs);
    return { ok: true as const };
  }

  private prune(now: number, windowMs: number) {
    for (const [k, v] of this.hits) if (!v.some((t) => now - t < windowMs)) this.hits.delete(k);
  }
}

const globalForLimiter = globalThis as unknown as { __fxLimiter?: RateLimiter };
export const rateLimiter: RateLimiter = (globalForLimiter.__fxLimiter ??= new MemoryRateLimiter());

export const LIMITS = {
  /** Answer attempts per puzzle per run. */
  attempt: { limit: 8, windowMs: 60_000 },
  lab: { limit: 20, windowMs: 60_000 },
  hint: { limit: 10, windowMs: 60_000 },
  /** All game API calls per client IP. */
  ip: { limit: 240, windowMs: 60_000 },
} as const;
