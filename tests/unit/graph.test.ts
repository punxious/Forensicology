import { describe, expect, it } from "vitest";
import { availablePuzzleIds, findCycle, unlockedEvidenceIds, validateGraph } from "@/lib/engine/graph";
import { sampleSource } from "./helpers";

describe("sample case graph", () => {
  const source = sampleSource();

  it("has no errors or warnings", () => {
    expect(validateGraph(source)).toEqual([]);
  });

  it("starts with only the desk drawer and the initial evidence", () => {
    expect(availablePuzzleIds(source, new Set())).toEqual(["desk-drawer"]);
    expect(unlockedEvidenceIds(source, new Set())).toEqual([
      "incident-report", "floor-plan", "notebook", "greenhouse-diary", "persons-of-interest", "rail-ticket",
    ]);
  });

  it("branches after the statements and joins at the accusation", () => {
    const solved = new Set(["desk-drawer", "timeline", "statements"]);
    expect(availablePuzzleIds(source, solved)).toEqual(["desk-drawer", "timeline", "statements", "alibis", "lab"]);
    solved.add("lab");
    expect(availablePuzzleIds(source, solved)).toContain("fingerprint");
    expect(availablePuzzleIds(source, solved)).toContain("journal");
    expect(availablePuzzleIds(source, solved)).not.toContain("accusation");
    ["alibis", "fingerprint", "journal"].forEach((p) => solved.add(p));
    expect(availablePuzzleIds(source, solved)).toContain("accusation");
  });
});

describe("validation", () => {
  const base = () => structuredClone(sampleSource());

  it("detects cycles", () => {
    const s = base();
    s.puzzles.find((p) => p.id === "desk-drawer")!.requires = ["accusation"];
    expect(findCycle(s)).not.toBeNull();
    expect(validateGraph(s).some((i) => i.message.startsWith("Unlock cycle"))).toBe(true);
  });

  it("detects evidence that is never unlocked", () => {
    const s = base();
    s.puzzles.find((p) => p.id === "desk-drawer")!.unlocks.evidence = ["access-log", "drawer-note", "phone-records"];
    expect(validateGraph(s).map((i) => i.message)).toContain(
      'Evidence "library-log" is never unlocked (mark it initial or add it to a puzzle\'s unlocks).',
    );
  });

  it("detects puzzles that need evidence the player can't have yet", () => {
    const s = base();
    s.puzzles.find((p) => p.id === "desk-drawer")!.uses.push("tox-report");
    expect(validateGraph(s).some((i) => i.message.includes('needs evidence "tox-report"'))).toBe(true);
  });

  it("detects unknown references and a missing accusation", () => {
    const s = base();
    s.puzzles.find((p) => p.id === "timeline")!.requires = ["nope"];
    s.puzzles = s.puzzles.filter((p) => p.type !== "accusation");
    const messages = validateGraph(s).map((i) => i.message);
    expect(messages).toContain('Puzzle "timeline" requires unknown puzzle "nope".');
    expect(messages.some((m) => m.startsWith("A case needs exactly one accusation"))).toBe(true);
  });

  it("warns about skippable puzzles", () => {
    const s = base();
    s.puzzles.find((p) => p.id === "accusation")!.requires = ["fingerprint", "journal"];
    expect(validateGraph(s)).toContainEqual({
      level: "warning",
      message: 'Puzzle "alibis" isn\'t required before the accusation, so players can skip it.',
    });
  });
});
