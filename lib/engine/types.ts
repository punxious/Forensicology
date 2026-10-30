/**
 * Compiled case shapes. A compiled case is server-only: it holds answer hashes,
 * hints, lab results and the epilogue. Clients only ever see `RunView`
 * (see view.ts), built from the parts the player has unlocked.
 */
import type {
  AccusationConfig,
  BoardConfig,
  FingerprintConfig,
  LabConfig,
  LockConfig,
  PrintData,
  ScoringConfig,
  StatementsConfig,
  TimelineConfig,
} from "./schema";

export type PuzzleConfigByType = {
  lock: LockConfig;
  timeline: TimelineConfig;
  statements: StatementsConfig;
  lab: LabConfig;
  fingerprint: FingerprintConfig;
  board: BoardConfig;
  accusation: AccusationConfig;
};

export type PuzzleType = keyof PuzzleConfigByType;

export type CompiledEvidence = {
  id: string;
  kind: "document" | "transcript" | "print" | "image";
  title: string;
  tag: string;
  summary: string;
  initial: boolean;
  /** Sanitised HTML for document bodies. */
  html?: string;
  /** Asset path (served via the run asset route once unlocked). */
  image?: string;
  imageAlt?: string;
  intro?: string;
  lines?: { id: string; speaker: string; text: string }[];
  subject?: string;
  latent?: boolean;
  print?: PrintData;
};

type CompiledPuzzleOf<T extends PuzzleType> = {
  id: string;
  type: T;
  title: string;
  promptHtml: string;
  requires: string[];
  uses: string[];
  unlocks: { evidence: string[] };
  /** Public configuration safe to send once the puzzle is available. */
  config: PuzzleConfigByType[T];
  hintsHtml: [string, string, string];
  solvedHtml: string;
  answerHashes: string[];
  /** Lab only: result slips (HTML) keyed by `sample|test`, plus `default`. */
  labResults?: Record<string, string>;
};

export type CompiledPuzzle = { [T in PuzzleType]: CompiledPuzzleOf<T> }[PuzzleType];

export type CompiledAsset = { contentType: string; base64: string };

export type CompiledCase = {
  slug: string;
  version: number;
  /** Hash of the compiled content; changes whenever the case changes. */
  contentHash: string;
  pepperCheck: string;
  title: string;
  tagline: string;
  difficulty: number;
  durationMinutes: number;
  players: { min: number; max: number };
  free: boolean;
  briefingHtml: string;
  epilogueHtml: string;
  evidence: CompiledEvidence[];
  puzzles: CompiledPuzzle[];
  scoring: ScoringConfig;
  assets: Record<string, CompiledAsset>;
};

/** Public card for galleries and the briefing screen. */
export type CaseSummary = Pick<
  CompiledCase,
  "slug" | "title" | "tagline" | "difficulty" | "durationMinutes" | "players" | "free"
> & { puzzleCount: number };
