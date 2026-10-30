/**
 * Answer hashing.
 *
 * HMAC-SHA256 keyed with a server-only pepper (ANSWER_PEPPER). A plain hash of
 * a 4-digit keypad code could be reversed in milliseconds by trying all 10,000
 * codes; without the pepper, a leaked hash is useless.
 *
 * The case slug and puzzle id are mixed in so identical answers in different
 * puzzles produce different hashes.
 */
import { createHmac, timingSafeEqual } from "node:crypto";

export function hashAnswer(pepper: string, caseSlug: string, puzzleId: string, normalized: string): string {
  return createHmac("sha256", pepper).update(`${caseSlug}\u0000${puzzleId}\u0000${normalized}`).digest("base64url");
}

export function matchesAnyHash(candidate: string, hashes: readonly string[]): boolean {
  const a = Buffer.from(candidate);
  let match = false;
  // Compare against every hash so timing doesn't reveal which one matched.
  for (const h of hashes) {
    const b = Buffer.from(h);
    if (a.length === b.length && timingSafeEqual(a, b)) match = true;
  }
  return match;
}

const DEV_PEPPER = "forensicology-dev-pepper-do-not-use-in-production";

/** Fingerprint of the pepper, stored in compiled cases to catch build/runtime mismatches. */
export function pepperCheck(pepper: string): string {
  return createHmac("sha256", pepper).update("forensicology:pepper-check").digest("base64url").slice(0, 16);
}

export function getPepper(): string {
  const pepper = process.env.ANSWER_PEPPER;
  if (pepper && pepper.length >= 32) return pepper;
  if (process.env.NODE_ENV === "production") {
    throw new Error("ANSWER_PEPPER must be set (32+ characters) in production.");
  }
  return DEV_PEPPER;
}
