import { describe, expect, it } from "vitest";
import { signValue, verifyValue } from "@/lib/server/signed";
import { MemoryRateLimiter } from "@/lib/server/rate-limit";

const SECRET = "s".repeat(40);

describe("signed values", () => {
  it("round-trips", () => {
    const v = { id: "abc", email: "a@b.c" };
    expect(verifyValue(signValue(v, SECRET), SECRET)).toEqual(v);
  });

  it("rejects tampering, wrong secrets and garbage", () => {
    const token = signValue("anon-1", SECRET);
    const [, sig] = token.split(".");
    const forged = Buffer.from(JSON.stringify("anon-2")).toString("base64url");
    expect(verifyValue(`${forged}.${sig}`, SECRET)).toBeNull();
    expect(verifyValue(token, "x".repeat(40))).toBeNull();
    expect(verifyValue("garbage", SECRET)).toBeNull();
    expect(verifyValue(undefined, SECRET)).toBeNull();
  });
});

describe("memory rate limiter", () => {
  it("blocks after the limit and recovers after the window", async () => {
    let now = 0;
    const rl = new MemoryRateLimiter(() => now);
    for (let i = 0; i < 3; i++) expect((await rl.hit("k", 3, 1000)).ok).toBe(true);
    expect(await rl.hit("k", 3, 1000)).toEqual({ ok: false, retryAfter: 1 });
    expect((await rl.hit("other", 3, 1000)).ok).toBe(true);
    now = 1001;
    expect((await rl.hit("k", 3, 1000)).ok).toBe(true);
  });
});
