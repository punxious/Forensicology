/**
 * Scoring and ranks.
 *
 * score = base − time − overtime − hints − wrong guesses − wrong accusations
 *
 * Running past the case duration doesn't end the game; overtime minutes cost
 * more and cap the rank at "Detective".
 */
import type { ScoringConfig } from "./schema";

export const RANKS = [
  { id: "chief-examiner", label: "Chief Examiner", min: 8000 },
  { id: "senior-examiner", label: "Senior Examiner", min: 6500 },
  { id: "detective", label: "Detective", min: 5000 },
  { id: "investigator", label: "Investigator", min: 3000 },
  { id: "rookie", label: "Rookie", min: 0 },
] as const;

export type Rank = (typeof RANKS)[number];

const OVERTIME_RANK_CAP: Rank["id"] = "detective";

export type ScoreInput = {
  elapsedMs: number;
  durationMinutes: number;
  /** Highest hint tier revealed (1–3) for each puzzle that used hints. */
  hintTiers: number[];
  wrongGuesses: number;
  wrongAccusations: number;
};

export type ScoreResult = {
  score: number;
  rank: Rank;
  overtime: boolean;
  breakdown: { base: number; time: number; overtime: number; hints: number; wrongGuesses: number; wrongAccusations: number };
};

export function computeScore(cfg: ScoringConfig, input: ScoreInput): ScoreResult {
  const minutes = Math.max(0, input.elapsedMs) / 60_000;
  const inTime = Math.min(minutes, input.durationMinutes);
  const over = Math.max(0, minutes - input.durationMinutes);

  const hintCost = (tier: number) => cfg.hintTiers.slice(0, Math.min(3, Math.max(0, tier))).reduce((a, b) => a + b, 0);

  const breakdown = {
    base: cfg.base,
    time: Math.round(inTime * cfg.perMinute),
    overtime: Math.round(over * cfg.perOvertimeMinute),
    hints: input.hintTiers.reduce((sum, t) => sum + hintCost(t), 0),
    wrongGuesses: input.wrongGuesses * cfg.wrongGuess,
    wrongAccusations: input.wrongAccusations * cfg.wrongAccusation,
  };
  const score = Math.max(
    0,
    breakdown.base - breakdown.time - breakdown.overtime - breakdown.hints - breakdown.wrongGuesses - breakdown.wrongAccusations,
  );

  const overtime = over > 0;
  let rank: Rank = RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1]!;
  if (overtime) {
    const capIndex = RANKS.findIndex((r) => r.id === OVERTIME_RANK_CAP);
    if (RANKS.indexOf(rank) < capIndex) rank = RANKS[capIndex]!;
  }
  return { score, rank, overtime, breakdown };
}

/** Cost of revealing hint tier `tier` (1-based), for showing before the player confirms. */
export function hintCostFor(cfg: ScoringConfig, tier: number): number {
  return cfg.hintTiers[tier - 1] ?? 0;
}
