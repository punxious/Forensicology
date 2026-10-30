import "server-only";
import { compiledCases } from "./generated";
import { getPepper, pepperCheck } from "@/lib/engine/hash";
import type { CaseSummary, CompiledCase } from "@/lib/engine/types";

let checked = false;

/** Fails loudly if the case bundle was built with a different ANSWER_PEPPER than the server has. */
function assertPepper(c: CompiledCase) {
  if (checked) return;
  if (c.pepperCheck !== pepperCheck(getPepper())) {
    throw new Error(
      "Compiled cases were built with a different ANSWER_PEPPER than this server is using. Re-run `pnpm case:build`.",
    );
  }
  checked = true;
}

/**
 * Phase 1: cases come from the bundle compiled at build time.
 * Phase 3 swaps this for a database-backed repository (admin uploads) behind the same functions.
 */
export function getCase(slug: string): CompiledCase | null {
  const c = compiledCases.find((x) => x.slug === slug) ?? null;
  if (c) assertPepper(c);
  return c;
}

export function listCases(): CaseSummary[] {
  return compiledCases.map((c) => ({
    slug: c.slug,
    title: c.title,
    tagline: c.tagline,
    difficulty: c.difficulty,
    durationMinutes: c.durationMinutes,
    players: c.players,
    free: c.free,
    puzzleCount: c.puzzles.length,
  }));
}

/** Briefing is public: it's shown before a run starts. */
export function getBriefing(slug: string) {
  const c = compiledCases.find((x) => x.slug === slug);
  return c ? { ...listCases().find((s) => s.slug === slug)!, briefingHtml: c.briefingHtml } : null;
}
