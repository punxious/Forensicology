import { describe, expect, it } from "vitest";
import { computeScore } from "@/lib/engine/scoring";
import { scoringSchema } from "@/lib/engine/schema";

const cfg = scoringSchema.parse(undefined);
const min = 60_000;

describe("scoring", () => {
  it("rewards a fast, clean solve with the top rank", () => {
    const r = computeScore(cfg, { elapsedMs: 30 * min, durationMinutes: 60, hintTiers: [], wrongGuesses: 0, wrongAccusations: 0 });
    expect(r.score).toBe(10000 - 30 * 50);
    expect(r.rank.label).toBe("Chief Examiner");
    expect(r.overtime).toBe(false);
  });

  it("charges cumulative hint tiers, wrong guesses and accusations", () => {
    const r = computeScore(cfg, { elapsedMs: 0, durationMinutes: 60, hintTiers: [3, 1], wrongGuesses: 2, wrongAccusations: 1 });
    expect(r.breakdown.hints).toBe(200 + 400 + 800 + 200);
    expect(r.breakdown.wrongGuesses).toBe(200);
    expect(r.breakdown.wrongAccusations).toBe(1000);
    expect(r.score).toBe(10000 - 1600 - 200 - 1000);
  });

  it("charges overtime at a higher rate and caps the rank", () => {
    const r = computeScore(
      { ...cfg, perMinute: 0, perOvertimeMinute: 10 },
      { elapsedMs: 70 * min, durationMinutes: 60, hintTiers: [], wrongGuesses: 0, wrongAccusations: 0 },
    );
    expect(r.overtime).toBe(true);
    expect(r.breakdown.overtime).toBe(100);
    expect(r.score).toBe(9900);
    expect(r.rank.label).toBe("Detective");
  });

  it("never goes below zero", () => {
    const r = computeScore(cfg, { elapsedMs: 600 * min, durationMinutes: 60, hintTiers: [3, 3, 3], wrongGuesses: 50, wrongAccusations: 5 });
    expect(r.score).toBe(0);
    expect(r.rank.label).toBe("Rookie");
  });
});
