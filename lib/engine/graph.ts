/**
 * Unlock graph: which puzzles are available and which evidence is visible for
 * a given set of solved puzzles, plus static validation of a case's graph.
 *
 * Rules:
 * - A puzzle is available once every puzzle in its `requires` list is solved.
 * - Evidence is visible if it is `initial` or listed in the `unlocks` of a solved puzzle.
 * - Exactly one `accusation` puzzle exists; it ends the case.
 */
import type { CaseSource } from "./schema";

type GraphPuzzle = { id: string; type: string; requires: string[]; uses: string[]; unlocks: { evidence: string[] } };
type GraphEvidence = { id: string; initial: boolean };
export type GraphCase = { puzzles: readonly GraphPuzzle[]; evidence: readonly GraphEvidence[] };

export function availablePuzzleIds(c: GraphCase, solved: ReadonlySet<string>): string[] {
  return c.puzzles.filter((p) => p.requires.every((r) => solved.has(r))).map((p) => p.id);
}

export function unlockedEvidenceIds(c: GraphCase, solved: ReadonlySet<string>): string[] {
  const unlocked = new Set(c.evidence.filter((e) => e.initial).map((e) => e.id));
  for (const p of c.puzzles) {
    if (solved.has(p.id)) for (const e of p.unlocks.evidence) unlocked.add(e);
  }
  // Keep case-file order stable.
  return c.evidence.filter((e) => unlocked.has(e.id)).map((e) => e.id);
}

/** All puzzles that must be solved (transitively) before `puzzleId` is available. */
export function ancestors(c: GraphCase, puzzleId: string): Set<string> {
  const byId = new Map(c.puzzles.map((p) => [p.id, p]));
  const seen = new Set<string>();
  const stack = [...(byId.get(puzzleId)?.requires ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    if (seen.has(id)) continue;
    seen.add(id);
    stack.push(...(byId.get(id)?.requires ?? []));
  }
  return seen;
}

/** Longest-path depth of each puzzle from the start (for laying out the debug graph). */
export function puzzleDepths(c: GraphCase): Map<string, number> {
  const byId = new Map(c.puzzles.map((p) => [p.id, p]));
  const depth = new Map<string, number>();
  const visit = (id: string, trail: Set<string>): number => {
    if (depth.has(id)) return depth.get(id)!;
    if (trail.has(id)) return 0; // cycle; reported by validateGraph
    trail.add(id);
    const p = byId.get(id);
    const d = p && p.requires.length ? Math.max(...p.requires.map((r) => visit(r, trail))) + 1 : 0;
    trail.delete(id);
    depth.set(id, d);
    return d;
  };
  for (const p of c.puzzles) visit(p.id, new Set());
  return depth;
}

export function findCycle(c: GraphCase): string[] | null {
  const byId = new Map(c.puzzles.map((p) => [p.id, p]));
  const state = new Map<string, "visiting" | "done">();
  const path: string[] = [];
  const dfs = (id: string): string[] | null => {
    if (state.get(id) === "done") return null;
    if (state.get(id) === "visiting") return [...path.slice(path.indexOf(id)), id];
    state.set(id, "visiting");
    path.push(id);
    for (const r of byId.get(id)?.requires ?? []) {
      const cycle = dfs(r);
      if (cycle) return cycle;
    }
    path.pop();
    state.set(id, "done");
    return null;
  };
  for (const p of c.puzzles) {
    const cycle = dfs(p.id);
    if (cycle) return cycle;
  }
  return null;
}

export type GraphIssue = { level: "error" | "warning"; message: string };

/** Structural checks on a case's unlock graph and cross-references. */
export function validateGraph(c: CaseSource): GraphIssue[] {
  const issues: GraphIssue[] = [];
  const error = (message: string) => issues.push({ level: "error", message });
  const warn = (message: string) => issues.push({ level: "warning", message });

  const dupes = (ids: string[], what: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) error(`Duplicate ${what} id "${id}".`);
      seen.add(id);
    }
  };
  dupes(c.evidence.map((e) => e.id), "evidence");
  dupes(c.puzzles.map((p) => p.id), "puzzle");
  dupes(
    c.evidence.flatMap((e) => (e.kind === "transcript" ? e.lines.map((l) => l.id) : [])),
    "transcript line",
  );

  const evidence = new Map(c.evidence.map((e) => [e.id, e]));
  const puzzles = new Map(c.puzzles.map((p) => [p.id, p]));

  // References
  for (const p of c.puzzles) {
    for (const r of p.requires) if (!puzzles.has(r)) error(`Puzzle "${p.id}" requires unknown puzzle "${r}".`);
    for (const e of p.unlocks.evidence) if (!evidence.has(e)) error(`Puzzle "${p.id}" unlocks unknown evidence "${e}".`);
    for (const e of p.uses) if (!evidence.has(e)) error(`Puzzle "${p.id}" uses unknown evidence "${e}".`);
  }

  // Each piece of evidence is either initial or unlocked by exactly one puzzle.
  const unlockers = new Map<string, string[]>();
  for (const p of c.puzzles) for (const e of p.unlocks.evidence) unlockers.set(e, [...(unlockers.get(e) ?? []), p.id]);
  for (const e of c.evidence) {
    const by = unlockers.get(e.id) ?? [];
    if (e.initial && by.length) error(`Evidence "${e.id}" is initial but also unlocked by ${by.join(", ")}.`);
    if (!e.initial && by.length === 0) error(`Evidence "${e.id}" is never unlocked (mark it initial or add it to a puzzle's unlocks).`);
    if (by.length > 1) error(`Evidence "${e.id}" is unlocked by more than one puzzle (${by.join(", ")}).`);
  }

  const cycle = findCycle(c);
  if (cycle) {
    error(`Unlock cycle: ${cycle.join(" → ")}.`);
    return issues; // reachability checks below assume a DAG
  }

  if (!c.puzzles.some((p) => p.requires.length === 0)) error("No puzzle is available at the start.");

  const finals = c.puzzles.filter((p) => p.type === "accusation");
  if (finals.length !== 1) error(`A case needs exactly one accusation puzzle (found ${finals.length}).`);
  const final = finals[0];
  if (final) {
    for (const p of c.puzzles) {
      if (p.requires.includes(final.id)) error(`Puzzle "${p.id}" requires the final accusation.`);
    }
    const before = ancestors(c, final.id);
    for (const p of c.puzzles) {
      if (p.id !== final.id && !before.has(p.id)) {
        warn(`Puzzle "${p.id}" isn't required before the accusation, so players can skip it.`);
      }
    }
    if (final.unlocks.evidence.length) warn("Evidence unlocked by the accusation will never be seen.");
  }

  // Evidence a puzzle uses must already be visible when the puzzle becomes available.
  for (const p of c.puzzles) {
    const before = ancestors(c, p.id);
    const visible = new Set(unlockedEvidenceIds(c, before));
    const needed = new Set(p.uses);
    if (p.type === "statements") p.config.transcripts.forEach((t) => needed.add(t));
    if (p.type === "fingerprint") [p.config.latent, ...p.config.cards].forEach((t) => needed.add(t));
    if (p.type === "board") p.config.nodes.forEach((n) => n.evidence && needed.add(n.evidence));
    for (const e of needed) {
      if (evidence.has(e) && !visible.has(e)) {
        error(`Puzzle "${p.id}" needs evidence "${e}", which isn't unlocked before the puzzle is available.`);
      }
    }
  }

  // Type-specific references
  for (const p of c.puzzles) {
    if (p.type === "statements") {
      for (const t of p.config.transcripts) {
        if (evidence.get(t) && evidence.get(t)!.kind !== "transcript") error(`Puzzle "${p.id}": "${t}" is not a transcript.`);
      }
    }
    if (p.type === "fingerprint") {
      const latent = evidence.get(p.config.latent);
      if (latent && (latent.kind !== "print" || !latent.latent)) error(`Puzzle "${p.id}": "${p.config.latent}" is not a latent print.`);
      for (const card of p.config.cards) {
        const e = evidence.get(card);
        if (e && (e.kind !== "print" || e.latent)) error(`Puzzle "${p.id}": "${card}" is not a print card.`);
      }
    }
    if (p.type === "board") {
      for (const n of p.config.nodes) {
        if (n.evidence && !evidence.has(n.evidence)) error(`Puzzle "${p.id}": board node "${n.id}" references unknown evidence.`);
      }
      const ids = p.config.nodes.map((n) => n.id);
      if (new Set(ids).size !== ids.length) error(`Puzzle "${p.id}": duplicate board node ids.`);
    }
    if (p.type === "timeline") {
      const ids = p.config.cards.map((x) => x.id);
      if (new Set(ids).size !== ids.length) error(`Puzzle "${p.id}": duplicate timeline card ids.`);
    }
  }

  return issues;
}
