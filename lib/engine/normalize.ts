/**
 * Answer normalisation.
 *
 * Every puzzle type turns a submitted answer into one canonical string, so
 * "6 0 9 2", "6092" and "6-0-9-2" all hash the same way, and set-style answers
 * don't depend on the order the player clicked things. The same functions run
 * on authored answers at compile time and on player submissions at runtime.
 *
 * Returns `{ ok: false }` for malformed input. Malformed submissions are
 * rejected without counting as a wrong guess.
 */
import type { PuzzleSource } from "./schema";

export type Normalized = { ok: true; value: string } | { ok: false; error: string };

const ok = (value: string): Normalized => ({ ok: true, value });
const fail = (error: string): Normalized => ({ ok: false, error });

const MAX_STRING = 200;

function asIdList(input: unknown, max = 100): string[] | null {
  if (!Array.isArray(input) || input.length > max) return null;
  if (!input.every((v) => typeof v === "string" && v.length > 0 && v.length <= 64)) return null;
  return input as string[];
}

function field(input: unknown, key: string): unknown {
  return input && typeof input === "object" && !Array.isArray(input)
    ? (input as Record<string, unknown>)[key]
    : undefined;
}

/** Puzzle shape needed for normalisation: type plus public config. */
export type NormalizablePuzzle = Pick<PuzzleSource, "type" | "config"> & {
  /** Valid ids for transcript lines (statements puzzles only). */
  lineIds?: readonly string[];
};

export function normalizeAnswer(puzzle: NormalizablePuzzle, input: unknown): Normalized {
  switch (puzzle.type) {
    case "lock": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "lock" }>["config"];
      if (cfg.variant === "dial") {
        const nums = Array.isArray(input)
          ? input
          : typeof input === "string"
            ? input.split(/[^0-9]+/).filter(Boolean).map(Number)
            : null;
        if (!nums || nums.length !== cfg.length) return fail(`Enter ${cfg.length} numbers.`);
        if (!nums.every((n) => Number.isInteger(n) && n >= 0 && n < cfg.dialSize)) {
          return fail("Dial numbers are out of range.");
        }
        return ok(nums.join("-"));
      }
      if (typeof input !== "string" && typeof input !== "number") return fail("Enter a code.");
      const raw = String(input);
      if (raw.length > MAX_STRING) return fail("Too long.");
      const value = raw.normalize("NFKD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (value.length !== cfg.length) return fail(`The lock takes ${cfg.length} characters.`);
      if ((cfg.variant === "keypad" || cfg.variant === "padlock") && !/^[0-9]+$/.test(value)) {
        return fail("Digits only.");
      }
      if (cfg.variant === "word" && !/^[A-Z]+$/.test(value)) return fail("Letters only.");
      return ok(value);
    }

    case "timeline": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "timeline" }>["config"];
      const ids = asIdList(input);
      const valid = new Set(cfg.cards.map((c) => c.id));
      if (!ids || ids.length !== valid.size || new Set(ids).size !== ids.length || !ids.every((i) => valid.has(i))) {
        return fail("Place every card exactly once.");
      }
      return ok(ids.join(">"));
    }

    case "statements": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "statements" }>["config"];
      const ids = asIdList(input);
      if (!ids) return fail("Flag some statements.");
      const unique = [...new Set(ids)];
      if (puzzle.lineIds && !unique.every((i) => puzzle.lineIds!.includes(i))) return fail("Unknown statement.");
      if (unique.length !== cfg.flagCount) return fail(`Flag exactly ${cfg.flagCount} statements.`);
      return ok(unique.sort().join(","));
    }

    case "lab": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "lab" }>["config"];
      let sample: unknown = field(input, "sample");
      let test: unknown = field(input, "test");
      if (typeof input === "string") [sample, test] = input.split("|");
      if (!cfg.samples.some((s) => s.id === sample) || !cfg.tests.some((t) => t.id === test)) {
        return fail("Choose a sample and a test.");
      }
      return ok(`${sample}|${test}`);
    }

    case "fingerprint": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "fingerprint" }>["config"];
      const card = typeof input === "string" ? input : field(input, "card");
      if (typeof card !== "string" || !cfg.cards.includes(card)) return fail("Choose a print card.");
      return ok(card);
    }

    case "board": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "board" }>["config"];
      if (!Array.isArray(input) || input.length === 0 || input.length > 50) return fail("Connect some pins.");
      const nodes = new Set(cfg.nodes.map((n) => n.id));
      const edges = new Set<string>();
      for (const pair of input) {
        const ids = asIdList(pair, 2);
        if (!ids || ids.length !== 2 || ids[0] === ids[1] || !nodes.has(ids[0]!) || !nodes.has(ids[1]!)) {
          return fail("Invalid connection.");
        }
        edges.add([...ids].sort().join("~"));
      }
      return ok([...edges].sort().join(","));
    }

    case "accusation": {
      const cfg = puzzle.config as Extract<PuzzleSource, { type: "accusation" }>["config"];
      let parts: unknown[] = [field(input, "suspect"), field(input, "motive"), field(input, "method")];
      if (typeof input === "string") parts = input.split("|");
      const [suspect, motive, method] = parts;
      if (
        !cfg.suspects.some((o) => o.id === suspect) ||
        !cfg.motives.some((o) => o.id === motive) ||
        !cfg.methods.some((o) => o.id === method)
      ) {
        return fail("Choose a suspect, a motive and a method.");
      }
      return ok(`${suspect}|${motive}|${method}`);
    }
  }
}
