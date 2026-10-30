/**
 * HMAC-signed values for cookies the player must not be able to forge
 * (anonymous owner id, local dev sign-in).
 */
import { createHmac, timingSafeEqual } from "node:crypto";

const DEV_SECRET = "forensicology-dev-cookie-secret-do-not-use-in-production";

export function getCookieSecret(): string {
  const s = process.env.COOKIE_SECRET;
  if (s && s.length >= 32) return s;
  if (process.env.NODE_ENV === "production") throw new Error("COOKIE_SECRET must be set (32+ characters) in production.");
  return DEV_SECRET;
}

const mac = (secret: string, payload: string) => createHmac("sha256", secret).update(payload).digest("base64url");

export function signValue(value: unknown, secret: string): string {
  const payload = Buffer.from(JSON.stringify(value)).toString("base64url");
  return `${payload}.${mac(secret, payload)}`;
}

export function verifyValue<T>(token: string | undefined, secret: string): T | null {
  if (!token || token.length > 4096) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = Buffer.from(mac(secret, payload));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}
