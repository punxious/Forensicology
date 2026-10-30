import { describe, expect, it } from "vitest";
import { attempt, buildView, forceSolve, newRunState, runLab, takeHint, type RunState } from "@/lib/engine/game";
import { compileCase } from "@/lib/engine/compile";
import { hashAnswer } from "@/lib/engine/hash";
import { compiledSample, PEPPER, sampleFiles, sampleSource } from "./helpers";

const source = sampleSource();
const c = compiledSample(source);
const T0 = 1_000_000;

/** The authored (plaintext) answers, read from the source YAML. */
const answers = Object.fromEntries(source.puzzles.map((p) => [p.id, p.answer]));
const latentMarks = [
  { cell: "A3", type: "dot" }, { cell: "B2", type: "ending" }, { cell: "B4", type: "bifurcation" },
  { cell: "C3", type: "bifurcation" }, { cell: "C5", type: "ending" }, { cell: "D2", type: "dot" },
];

function play(s: RunState, puzzleId: string, answer: unknown, now = T0) {
  const out = attempt(c, s, puzzleId, answer, PEPPER, now);
  if (!out.ok) throw new Error(out.error);
  return out;
}

/** Every secret the compiled case holds that must never reach a client. */
function secretsIn(view: unknown) {
  const text = JSON.stringify(view);
  const hashes = c.puzzles.flatMap((p) => p.answerHashes).filter((h) => text.includes(h));
  return { hashes, hasAnswerKey: /answerHashes|labResults|pepperCheck/.test(text) };
}

describe("compiler", () => {
  it("never stores plaintext answers", () => {
    const text = JSON.stringify(c);
    expect(text).not.toContain('"answer"');
    expect(text).not.toContain('"answers"');
    expect(text).not.toContain("6092");
    expect(c.puzzles.find((p) => p.id === "desk-drawer")!.answerHashes).toEqual([
      hashAnswer(PEPPER, "greenhouse-affair", "desk-drawer", "6092"),
    ]);
  });

  it("rejects an authored answer that can't be valid", () => {
    const bad = structuredClone(source);
    bad.puzzles.find((p) => p.id === "desk-drawer")!.answer = "12345";
    const r = compileCase(bad, sampleFiles, PEPPER);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors[0]).toMatch(/desk-drawer.*authored answer is invalid/);
  });

  it("produces different hashes with a different pepper", () => {
    const other = compileCase(source, sampleFiles, "another-pepper-0123456789-0123456789");
    expect(other.ok && other.compiled.puzzles[0]!.answerHashes[0]).not.toBe(c.puzzles[0]!.answerHashes[0]);
  });
});

describe("answer checking", () => {
  it("accepts the right answer in any reasonable format", () => {
    const s = newRunState(c.slug, "r", T0);
    expect(play(s, "desk-drawer", "6 0 9 2").correct).toBe(true);
  });

  it("counts wrong guesses but not malformed ones", () => {
    let s = newRunState(c.slug, "r", T0);
    const wrong = play(s, "desk-drawer", "2906");
    expect(wrong.correct).toBe(false);
    s = wrong.state;
    expect(s.wrong["desk-drawer"]).toBe(1);
    const malformed = attempt(c, s, "desk-drawer", "29", PEPPER, T0);
    expect(malformed).toMatchObject({ ok: false, status: 400 });
  });

  it("refuses puzzles that aren't available yet or don't exist", () => {
    const s = newRunState(c.slug, "r", T0);
    expect(attempt(c, s, "accusation", answers.accusation, PEPPER, T0)).toMatchObject({ ok: false, status: 403 });
    expect(attempt(c, s, "nope", "1", PEPPER, T0)).toMatchObject({ ok: false, status: 404 });
  });

  it("needs enough fingerprint marks before checking the card", () => {
    let s = newRunState(c.slug, "r", T0);
    for (const id of ["desk-drawer", "timeline", "statements", "lab"]) s = (forceSolve(c, s, id, T0) as { state: RunState }).state;
    expect(attempt(c, s, "fingerprint", { card: "card-wren", marks: latentMarks.slice(0, 3) }, PEPPER, T0)).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(play(s, "fingerprint", { card: "card-felix", marks: latentMarks }).correct).toBe(false);
    expect(play(s, "fingerprint", { card: "card-wren", marks: latentMarks }).correct).toBe(true);
  });
});

describe("a full play-through", () => {
  it("unlocks evidence step by step, scores the run and reveals the epilogue only at the end", () => {
    let s = newRunState(c.slug, "r", T0);
    const views = [buildView(c, s, T0)];
    expect(views[0]!.puzzles.map((p) => p.id)).toEqual(["desk-drawer"]);
    expect(views[0]!.result).toBeNull();
    expect(views[0]!.evidence.some((e) => e.id === "access-log")).toBe(false);

    let r = play(s, "desk-drawer", answers["desk-drawer"]);
    expect(r.unlockedEvidence).toEqual(["access-log", "drawer-note", "phone-records", "library-log"]);
    expect(r.unlockedPuzzles).toEqual(["timeline"]);
    s = r.state;

    const hint = takeHint(c, s, "timeline");
    if (!hint.ok) throw new Error(hint.error);
    expect(hint.tier).toBe(1);
    s = hint.state;
    views.push(buildView(c, s, T0));
    expect(views.at(-1)!.puzzles.find((p) => p.id === "timeline")!.hintsHtml).toHaveLength(1);

    for (const id of ["timeline", "statements", "alibis"]) {
      r = play(s, id, answers[id]);
      expect(r.correct).toBe(true);
      s = r.state;
      views.push(buildView(c, s, T0));
    }

    const decoy = runLab(c, s, "lab", { sample: "blood", test: "glycoside" }, PEPPER, T0);
    if (!decoy.ok) throw new Error(decoy.error);
    expect(decoy.solved).toBe(false);
    expect(decoy.resultHtml).toContain("POSITIVE");
    s = decoy.state;
    expect(s.wrong.lab).toBeUndefined();

    const lab = runLab(c, s, "lab", { sample: "flask", test: "glycoside" }, PEPPER, T0);
    if (!lab.ok) throw new Error(lab.error);
    expect(lab.solved).toBe(true);
    expect(lab.unlockedPuzzles.sort()).toEqual(["fingerprint", "journal"]);
    s = lab.state;
    views.push(buildView(c, s, T0));
    expect(views.at(-1)!.puzzles.find((p) => p.id === "lab")!.labLog).toHaveLength(2);

    s = play(s, "fingerprint", { card: "card-wren", marks: latentMarks }).state;
    s = play(s, "journal", "nerium").state;

    const wrongAccusation = play(s, "accusation", { suspect: "wren", motive: "data", method: "foxglove" });
    expect(wrongAccusation.correct).toBe(false);
    s = wrongAccusation.state;
    views.push(buildView(c, s, T0));
    expect(views.at(-1)!.result).toBeNull();

    const end = play(s, "accusation", answers.accusation, T0 + 40 * 60_000);
    expect(end.correct).toBe(true);
    s = end.state;
    expect(s.finishedAt).toBe(T0 + 40 * 60_000);

    const final = buildView(c, s, T0 + 50 * 60_000);
    expect(final.result).toMatchObject({
      // 40 min × 50, one tier-1 hint, one wrong accusation
      score: 10000 - 2000 - 200 - 1000,
      rank: { label: "Senior Examiner" },
      elapsedMs: 40 * 60_000,
    });
    expect(final.result!.epilogueHtml).toContain("What Really Happened");
    views.push(final);

    // The closed case refuses further attempts.
    expect(attempt(c, s, "desk-drawer", "6092", PEPPER, T0)).toMatchObject({ ok: false, status: 409 });

    // No view at any point leaks hashes, lab tables, unrevealed hints or the epilogue early.
    for (const v of views) expect(secretsIn(v)).toEqual({ hashes: [], hasAnswerKey: false });
    for (const v of views.slice(0, -1)) expect(JSON.stringify(v)).not.toContain("What Really Happened");
    const unrevealedHint = c.puzzles.find((p) => p.id === "timeline")!.hintsHtml[1]!;
    expect(JSON.stringify(views[1])).not.toContain(unrevealedHint);
  });
});

describe("3D stations", () => {
  it("lists every puzzle's prop but hides locked puzzles' ids", () => {
    const v = buildView(c, newRunState(c.slug, "r", T0), T0);
    expect(v.stations).toHaveLength(c.puzzles.length);
    expect(v.stations.filter((s) => s.puzzleId !== null).map((s) => s.puzzleId)).toEqual(["desk-drawer"]);
    expect(v.stations.map((s) => s.kind)).toEqual(["lockbox", "timeline", "recorder", "corkboard", "microscope", "lightbox", "journal", "report"]);
    const text = JSON.stringify(v.stations);
    // Only the prop kind is exposed: no titles, and no puzzle ids beyond the open one.
    for (const p of c.puzzles) expect(text).not.toContain(p.title);
    expect(v.stations.every((s) => Object.keys(s).sort().join() === "index,kind,puzzleId")).toBe(true);
  });
});
