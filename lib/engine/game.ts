/**
 * Game rules as pure functions over (CompiledCase, RunState).
 *
 * The server layer loads/saves RunState (a signed cookie in Phase 1, Postgres
 * from Phase 2) and calls these. Nothing here touches I/O, so it is easy to test.
 */
import { availablePuzzleIds, unlockedEvidenceIds } from "./graph";
import { hashAnswer, matchesAnyHash } from "./hash";
import { normalizeAnswer } from "./normalize";
import { computeScore, hintCostFor, type ScoreResult } from "./scoring";
import type { CompiledCase, CompiledEvidence, CompiledPuzzle, PuzzleConfigByType, PuzzleType } from "./types";

export type RunState = {
  v: 1;
  runId: string;
  slug: string;
  startedAt: number;
  solved: string[];
  /** Highest hint tier revealed per puzzle. */
  hints: Record<string, number>;
  /** Wrong guesses per puzzle (lab runs never count). */
  wrong: Record<string, number>;
  /** Lab runs performed, as `puzzleId:sample|test`. */
  lab: string[];
  finishedAt?: number;
};

export function newRunState(slug: string, runId: string, now: number): RunState {
  return { v: 1, runId, slug, startedAt: now, solved: [], hints: {}, wrong: {}, lab: [] };
}

/** Drop ids that no longer exist (e.g. the case was edited since the run started). */
export function reconcileState(c: CompiledCase, s: RunState): RunState {
  const ids = new Set(c.puzzles.map((p) => p.id));
  const keep = <T>(rec: Record<string, T>) => Object.fromEntries(Object.entries(rec).filter(([k]) => ids.has(k)));
  return {
    ...s,
    solved: s.solved.filter((id) => ids.has(id)),
    hints: keep(s.hints),
    wrong: keep(s.wrong),
    lab: s.lab.filter((l) => ids.has(l.split(":")[0]!)),
  };
}

// ---------------------------------------------------------------- views

export type PublicEvidence = Omit<CompiledEvidence, "initial">;

type PublicPuzzleOf<T extends PuzzleType> = {
  id: string;
  type: T;
  title: string;
  promptHtml: string;
  config: PuzzleConfigByType[T];
  solved: boolean;
  solvedHtml?: string;
  hintsHtml: string[];
  nextHintCost: number | null;
  wrongGuesses: number;
  /** Lab only: results of runs so far, newest last. */
  labLog?: { sample: string; test: string; resultHtml: string }[];
  /** Ids of transcript lines (statements) — all of them, flagged or not. */
};
export type PublicPuzzle = { [T in PuzzleType]: PublicPuzzleOf<T> }[PuzzleType];

export type RunView = {
  case: {
    slug: string;
    title: string;
    tagline: string;
    durationMinutes: number;
    briefingHtml: string;
    penalties: { wrongGuess: number; wrongAccusation: number };
  };
  run: { runId: string; startedAt: number; serverNow: number; deadline: number; finishedAt: number | null };
  evidence: PublicEvidence[];
  puzzles: PublicPuzzle[];
  lockedPuzzleCount: number;
  totals: { hintsUsed: number; wrongGuesses: number };
  result: null | {
    score: number;
    rank: { id: string; label: string };
    overtime: boolean;
    breakdown: ScoreResult["breakdown"];
    elapsedMs: number;
    epilogueHtml: string;
  };
};

function labLog(p: CompiledPuzzle, s: RunState) {
  if (p.type !== "lab") return undefined;
  return s.lab
    .filter((l) => l.startsWith(`${p.id}:`))
    .map((l) => {
      const key = l.slice(p.id.length + 1);
      const [sample, test] = key.split("|") as [string, string];
      return { sample, test, resultHtml: p.labResults?.[key] ?? p.labResults?.default ?? "" };
    });
}

export function scoreFor(c: CompiledCase, s: RunState, now: number): ScoreResult {
  const accusation = c.puzzles.find((p) => p.type === "accusation");
  const wrongAccusations = accusation ? (s.wrong[accusation.id] ?? 0) : 0;
  const wrongGuesses = Object.entries(s.wrong).reduce((sum, [id, n]) => sum + (id === accusation?.id ? 0 : n), 0);
  return computeScore(c.scoring, {
    elapsedMs: (s.finishedAt ?? now) - s.startedAt,
    durationMinutes: c.durationMinutes,
    hintTiers: Object.values(s.hints),
    wrongGuesses,
    wrongAccusations,
  });
}

export function buildView(c: CompiledCase, s: RunState, now: number): RunView {
  const solved = new Set(s.solved);
  const evidenceIds = new Set(unlockedEvidenceIds(c, solved));
  const available = new Set(availablePuzzleIds(c, solved));

  const evidence = c.evidence
    .filter((e) => evidenceIds.has(e.id))
    .map(({ initial: _initial, ...rest }) => rest);

  const puzzles = c.puzzles
    .filter((p) => available.has(p.id))
    .map((p) => {
      const tier = s.hints[p.id] ?? 0;
      const isSolved = solved.has(p.id);
      return {
        id: p.id,
        type: p.type,
        title: p.title,
        promptHtml: p.promptHtml,
        config: p.config,
        solved: isSolved,
        solvedHtml: isSolved ? p.solvedHtml : undefined,
        hintsHtml: p.hintsHtml.slice(0, tier),
        nextHintCost: tier < 3 && !isSolved ? hintCostFor(c.scoring, tier + 1) : null,
        wrongGuesses: s.wrong[p.id] ?? 0,
        labLog: labLog(p, s),
      } as PublicPuzzle;
    });

  const finished = s.finishedAt !== undefined;
  const score = finished ? scoreFor(c, s, now) : null;

  return {
    case: {
      slug: c.slug,
      title: c.title,
      tagline: c.tagline,
      durationMinutes: c.durationMinutes,
      briefingHtml: c.briefingHtml,
      penalties: { wrongGuess: c.scoring.wrongGuess, wrongAccusation: c.scoring.wrongAccusation },
    },
    run: {
      runId: s.runId,
      startedAt: s.startedAt,
      serverNow: now,
      deadline: s.startedAt + c.durationMinutes * 60_000,
      finishedAt: s.finishedAt ?? null,
    },
    evidence,
    puzzles,
    lockedPuzzleCount: c.puzzles.length - puzzles.length,
    totals: {
      hintsUsed: Object.values(s.hints).reduce((a, b) => a + b, 0),
      wrongGuesses: Object.values(s.wrong).reduce((a, b) => a + b, 0),
    },
    result:
      finished && score
        ? {
            score: score.score,
            rank: { id: score.rank.id, label: score.rank.label },
            overtime: score.overtime,
            breakdown: score.breakdown,
            elapsedMs: s.finishedAt! - s.startedAt,
            epilogueHtml: c.epilogueHtml,
          }
        : null,
  };
}

// ---------------------------------------------------------------- actions

export type ActionError = { ok: false; status: 400 | 403 | 404 | 409; error: string };

function findAvailable(c: CompiledCase, s: RunState, puzzleId: unknown): CompiledPuzzle | ActionError {
  if (typeof puzzleId !== "string") return { ok: false, status: 400, error: "Missing puzzle id." };
  const p = c.puzzles.find((x) => x.id === puzzleId);
  if (!p) return { ok: false, status: 404, error: "Unknown puzzle." };
  if (s.finishedAt !== undefined) return { ok: false, status: 409, error: "This case is closed." };
  if (!availablePuzzleIds(c, new Set(s.solved)).includes(p.id)) {
    return { ok: false, status: 403, error: "That puzzle isn't available yet." };
  }
  return p;
}

const isError = (x: unknown): x is ActionError => !!x && typeof x === "object" && (x as ActionError).ok === false;

function lineIdsFor(c: CompiledCase, p: CompiledPuzzle): string[] | undefined {
  if (p.type !== "statements") return undefined;
  return p.config.transcripts.flatMap((t) => c.evidence.find((e) => e.id === t)?.lines?.map((l) => l.id) ?? []);
}

export type AttemptOutcome =
  | ActionError
  | { ok: true; correct: boolean; alreadySolved: boolean; state: RunState; unlockedEvidence: string[]; unlockedPuzzles: string[] };

export function attempt(c: CompiledCase, s: RunState, puzzleId: unknown, answer: unknown, pepper: string, now: number): AttemptOutcome {
  const p = findAvailable(c, s, puzzleId);
  if (isError(p)) return p;
  if (p.type === "lab") return { ok: false, status: 400, error: "Run lab tests through the lab bench." };
  if (s.solved.includes(p.id)) {
    return { ok: true, correct: true, alreadySolved: true, state: s, unlockedEvidence: [], unlockedPuzzles: [] };
  }

  if (p.type === "fingerprint") {
    const marks = answer && typeof answer === "object" ? (answer as { marks?: unknown }).marks : undefined;
    const valid =
      Array.isArray(marks) &&
      marks.length <= 64 &&
      marks.every((m) => m && typeof m === "object" && /^[A-H][1-8]$/.test(String((m as { cell?: unknown }).cell)));
    if (!valid || new Set((marks as { cell: string }[]).map((m) => m.cell)).size < p.config.minMarks) {
      return { ok: false, status: 400, error: `Mark at least ${p.config.minMarks} points of comparison first.` };
    }
  }

  const n = normalizeAnswer({ type: p.type, config: p.config, lineIds: lineIdsFor(c, p) } as Parameters<typeof normalizeAnswer>[0], answer);
  if (!n.ok) return { ok: false, status: 400, error: n.error };

  const correct = matchesAnyHash(hashAnswer(pepper, c.slug, p.id, n.value), p.answerHashes);
  if (!correct) {
    return {
      ok: true,
      correct: false,
      alreadySolved: false,
      state: { ...s, wrong: { ...s.wrong, [p.id]: (s.wrong[p.id] ?? 0) + 1 } },
      unlockedEvidence: [],
      unlockedPuzzles: [],
    };
  }
  return solve(c, s, p, now);
}

function solve(c: CompiledCase, s: RunState, p: CompiledPuzzle, now: number) {
  const before = new Set(availablePuzzleIds(c, new Set(s.solved)));
  const solved = [...s.solved, p.id];
  const after = availablePuzzleIds(c, new Set(solved));
  const next: RunState = { ...s, solved, finishedAt: p.type === "accusation" ? now : s.finishedAt };
  return {
    ok: true as const,
    correct: true,
    alreadySolved: false,
    state: next,
    unlockedEvidence: p.unlocks.evidence,
    unlockedPuzzles: after.filter((id) => !before.has(id)),
  };
}

export type LabOutcome =
  | ActionError
  | {
      ok: true;
      resultHtml: string;
      solved: boolean;
      state: RunState;
      unlockedEvidence: string[];
      unlockedPuzzles: string[];
    };

export function runLab(c: CompiledCase, s: RunState, puzzleId: unknown, input: unknown, pepper: string, now: number): LabOutcome {
  const p = findAvailable(c, s, puzzleId);
  if (isError(p)) return p;
  if (p.type !== "lab") return { ok: false, status: 400, error: "That isn't a lab puzzle." };
  const n = normalizeAnswer({ type: p.type, config: p.config }, input);
  if (!n.ok) return { ok: false, status: 400, error: n.error };

  const resultHtml = p.labResults?.[n.value] ?? p.labResults?.default ?? "";
  const entry = `${p.id}:${n.value}`;
  const logged: RunState = s.lab.includes(entry) ? s : { ...s, lab: [...s.lab, entry] };

  const correct = matchesAnyHash(hashAnswer(pepper, c.slug, p.id, n.value), p.answerHashes);
  if (correct && !s.solved.includes(p.id)) {
    const solved = solve(c, logged, p, now);
    return { ...solved, resultHtml, solved: true };
  }
  return { ok: true, resultHtml, solved: s.solved.includes(p.id), state: logged, unlockedEvidence: [], unlockedPuzzles: [] };
}

export type HintOutcome = ActionError | { ok: true; state: RunState; tier: number; hintHtml: string };

export function takeHint(c: CompiledCase, s: RunState, puzzleId: unknown): HintOutcome {
  const p = findAvailable(c, s, puzzleId);
  if (isError(p)) return p;
  if (s.solved.includes(p.id)) return { ok: false, status: 409, error: "Already solved." };
  const tier = (s.hints[p.id] ?? 0) + 1;
  if (tier > 3) return { ok: false, status: 409, error: "No more hints for this puzzle." };
  return { ok: true, state: { ...s, hints: { ...s.hints, [p.id]: tier } }, tier, hintHtml: p.hintsHtml[tier - 1]! };
}

/** Dev/admin playtest helper: mark a puzzle solved without an answer. */
export function forceSolve(c: CompiledCase, s: RunState, puzzleId: string, now: number) {
  const p = findAvailable(c, s, puzzleId);
  if (isError(p)) return p;
  if (s.solved.includes(p.id)) return { ok: true as const, state: s };
  return { ok: true as const, state: solve(c, s, p, now).state };
}
