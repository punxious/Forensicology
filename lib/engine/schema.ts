/**
 * Case file schema.
 *
 * A case is authored as `cases/<slug>/case.yaml` plus Markdown documents and
 * assets. This module validates the *source* shape (which contains plaintext
 * answers). `compile.ts` turns a validated source into a `CompiledCase`, where
 * answers are HMAC-hashed and nothing secret is left in plaintext.
 */
import { z } from "zod";

const id = z
  .string()
  .regex(/^[a-z0-9][a-z0-9-]{0,63}$/, "ids must be lowercase kebab-case (a-z, 0-9, -)");

const nonEmpty = z.string().trim().min(1);

/** Grid cell on a fingerprint image, e.g. "C4" (column letter, row number). */
const cell = z.string().regex(/^[A-H][1-8]$/, "cells look like A1..H8");

export const MINUTIA_TYPES = ["ending", "bifurcation", "dot", "enclosure"] as const;
export const minutiaType = z.enum(MINUTIA_TYPES);

const print = z.object({
  pattern: z.enum(["loop", "whorl", "arch"]),
  /** Size of the comparison grid (columns = rows). */
  grid: z.number().int().min(4).max(8).default(6),
  /** Ridge features visible on this print. */
  features: z.array(z.object({ cell, type: minutiaType })).min(1),
  /** Cells obscured by smudging on a latent lift. */
  smudged: z.array(cell).default([]),
  /** Seed for the procedural ridge background, so prints differ visually. */
  seed: z.number().int().default(1),
});

const transcriptLine = z.object({
  id,
  speaker: nonEmpty,
  text: nonEmpty,
});

const evidenceBase = {
  id,
  title: nonEmpty,
  /** Evidence tag printed on the item, e.g. "EV-07". */
  tag: nonEmpty,
  summary: nonEmpty,
  /** Available from the start of the case (otherwise a puzzle must unlock it). */
  initial: z.boolean().default(false),
  /** Optional image shown above the document body (path relative to the case folder). */
  image: z.string().optional(),
  imageAlt: z.string().optional(),
};

export const evidenceSchema = z.discriminatedUnion("kind", [
  z.object({
    ...evidenceBase,
    kind: z.literal("document"),
    /** Markdown file relative to the case folder. Supports `{{uv: hidden text}}` and `[[redacted]]`. */
    document: z.string(),
  }),
  z.object({
    ...evidenceBase,
    kind: z.literal("transcript"),
    intro: z.string().optional(),
    lines: z.array(transcriptLine).min(1),
  }),
  z.object({
    ...evidenceBase,
    kind: z.literal("print"),
    /** Who the print belongs to (shown on tenprint cards), or the lift location for latents. */
    subject: nonEmpty,
    latent: z.boolean().default(false),
    print,
  }),
  z.object({
    ...evidenceBase,
    kind: z.literal("image"),
    image: z.string(),
    imageAlt: nonEmpty,
    document: z.string().optional(),
  }),
]);

const answers = z
  .union([nonEmpty, z.array(z.unknown()).min(1), z.record(z.string(), z.unknown())])
  .transform((v) => v);

const option = z.object({ id, label: nonEmpty });

const lockConfig = z.object({
  variant: z.enum(["keypad", "padlock", "dial", "word"]),
  /** Number of digits / letters / dial numbers. */
  length: z.number().int().min(1).max(12),
  /** Dial size (numbers on the dial) for the `dial` variant. */
  dialSize: z.number().int().min(10).max(100).default(40),
  label: z.string().optional(),
});

const timelineConfig = z.object({
  cards: z
    .array(
      z.object({
        id,
        source: nonEmpty,
        /** Time exactly as printed on the source (may need converting). */
        stamp: nonEmpty,
        text: nonEmpty,
      }),
    )
    .min(3),
});

const statementsConfig = z.object({
  transcripts: z.array(id).min(1),
  /** How many lines the player must flag. Shown to the player. */
  flagCount: z.number().int().min(1),
});

const labConfig = z.object({
  samples: z.array(option.extend({ description: z.string().optional() })).min(2),
  tests: z.array(option.extend({ description: z.string().optional() })).min(1),
  /** Seconds of "processing" animation (purely cosmetic). */
  processingSeconds: z.number().min(0).max(30).default(4),
});

const fingerprintConfig = z.object({
  latent: id,
  cards: z.array(id).min(2),
  /** Minimum points of comparison the player must mark before declaring a match. */
  minMarks: z.number().int().min(1).max(20).default(6),
});

const boardConfig = z.object({
  nodes: z
    .array(
      option.extend({
        group: z.enum(["left", "right"]),
        evidence: id.optional(),
        note: z.string().optional(),
      }),
    )
    .min(2),
});

const accusationConfig = z.object({
  suspects: z.array(option).min(2),
  motives: z.array(option).min(2),
  methods: z.array(option).min(2),
});

const puzzleBase = {
  id,
  title: nonEmpty,
  /** Markdown shown above the puzzle. */
  prompt: nonEmpty,
  /** Puzzles that must be solved before this one becomes available. */
  requires: z.array(id).default([]),
  /** Evidence the player needs to solve this puzzle (validated for reachability). */
  uses: z.array(id).default([]),
  unlocks: z.object({ evidence: z.array(id).default([]) }).default({ evidence: [] }),
  /** Exactly three hint tiers: nudge, pointer, near-solution. */
  hints: z.tuple([nonEmpty, nonEmpty, nonEmpty]),
  /** Shown once solved. Markdown. */
  solvedText: nonEmpty,
  /** One answer, or several accepted answers via `answers`. */
  answer: answers.optional(),
  answers: z.array(answers).min(1).optional(),
};

export const puzzleSchema = z.discriminatedUnion("type", [
  z.object({ ...puzzleBase, type: z.literal("lock"), config: lockConfig }),
  z.object({ ...puzzleBase, type: z.literal("timeline"), config: timelineConfig }),
  z.object({ ...puzzleBase, type: z.literal("statements"), config: statementsConfig }),
  z.object({
    ...puzzleBase,
    type: z.literal("lab"),
    config: labConfig,
    /** Server-only. Result slip for each `sample|test` pair; `default` covers the rest. */
    results: z.record(z.string(), nonEmpty),
  }),
  z.object({ ...puzzleBase, type: z.literal("fingerprint"), config: fingerprintConfig }),
  z.object({ ...puzzleBase, type: z.literal("board"), config: boardConfig }),
  z.object({ ...puzzleBase, type: z.literal("accusation"), config: accusationConfig }),
]);

export const scoringSchema = z
  .object({
    base: z.number().int().positive().default(10000),
    perMinute: z.number().min(0).default(50),
    perOvertimeMinute: z.number().min(0).default(150),
    hintTiers: z.tuple([z.number(), z.number(), z.number()]).default([200, 400, 800]),
    wrongGuess: z.number().min(0).default(100),
    wrongAccusation: z.number().min(0).default(1000),
  })
  .default({
    base: 10000,
    perMinute: 50,
    perOvertimeMinute: 150,
    hintTiers: [200, 400, 800],
    wrongGuess: 100,
    wrongAccusation: 1000,
  });

export const caseSourceSchema = z.object({
  slug: id,
  version: z.number().int().min(1),
  title: nonEmpty,
  tagline: nonEmpty,
  /** 1 (gentle) – 5 (fiendish). */
  difficulty: z.number().int().min(1).max(5),
  durationMinutes: z.number().int().min(10).max(240),
  players: z.object({ min: z.number().int().min(1), max: z.number().int().min(1) }),
  /** Free cases need no purchase (Phase 3 entitlements). */
  free: z.boolean().default(false),
  /** Markdown file for the opening briefing. */
  briefing: z.string(),
  /** Markdown file for the epilogue, revealed only after a correct accusation. */
  epilogue: z.string(),
  evidence: z.array(evidenceSchema).min(1),
  puzzles: z.array(puzzleSchema).min(1),
  scoring: scoringSchema,
});

export type CaseSource = z.infer<typeof caseSourceSchema>;
export type EvidenceSource = z.infer<typeof evidenceSchema>;
export type PuzzleSource = z.infer<typeof puzzleSchema>;
export type PuzzleType = PuzzleSource["type"];
export type MinutiaType = z.infer<typeof minutiaType>;
export type PrintData = z.infer<typeof print>;
export type ScoringConfig = z.infer<typeof scoringSchema>;
export type LockConfig = z.infer<typeof lockConfig>;
export type TimelineConfig = z.infer<typeof timelineConfig>;
export type StatementsConfig = z.infer<typeof statementsConfig>;
export type LabConfig = z.infer<typeof labConfig>;
export type FingerprintConfig = z.infer<typeof fingerprintConfig>;
export type BoardConfig = z.infer<typeof boardConfig>;
export type AccusationConfig = z.infer<typeof accusationConfig>;
