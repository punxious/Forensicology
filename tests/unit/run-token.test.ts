import { describe, expect, it } from "vitest";
import { newRunState } from "@/lib/engine/game";
import { decodeRun, encodeRun } from "@/lib/server/run-token";
import { MemoryRateLimiter } from "@/lib/server/rate-limit";

const SECRET = "s".repeat(40);

describe("run token", () => {
  const state = { ...newRunState("greenhouse-affair", "run-1", 1000), solved: ["desk-drawer"] };

  it("round-trips", () => {
    expect(decodeRun(encodeRun(state, SECRET), SECRET)).toEqual(state);
  });

  it("rejects tampered payloads and wrong secrets", () => {
    const token = encodeRun(state, SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify({ ...state, solved: ["desk-drawer", "accusation"] })).toString("base64url");
    expect(decodeRun(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(decodeRun(token, "x".repeat(40))).toBeNull();
    expect(decodeRun("garbage", SECRET)).toBeNull();
    expect(decodeRun(undefined, SECRET)).toBeNull();
  });
});

describe("rate limiter", () => {
  it("blocks after the limit and recovers after the window", () => {
    let now = 0;
    const rl = new MemoryRateLimiter(() => now);
    for (let i = 0; i < 3; i++) expect(rl.hit("k", 3, 1000).ok).toBe(true);
    const blocked = rl.hit("k", 3, 1000);
    expect(blocked).toEqual({ ok: false, retryAfter: 1 });
    expect(rl.hit("other", 3, 1000).ok).toBe(true);
    now = 1001;
    expect(rl.hit("k", 3, 1000).ok).toBe(true);
  });
});
