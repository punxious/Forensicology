import { describe, expect, it } from "vitest";
import { normalizeAnswer, type NormalizablePuzzle } from "@/lib/engine/normalize";

const lock = (variant: "keypad" | "padlock" | "dial" | "word", length: number): NormalizablePuzzle => ({
  type: "lock",
  config: { variant, length, dialSize: 40 },
});

describe("lock answers", () => {
  it("ignores spacing and punctuation on keypads", () => {
    for (const input of ["6092", "6 0 9 2", "6-0-9-2", " 6092 ", 6092]) {
      expect(normalizeAnswer(lock("keypad", 4), input)).toEqual({ ok: true, value: "6092" });
    }
  });
  it("rejects the wrong length and letters on keypads", () => {
    expect(normalizeAnswer(lock("keypad", 4), "609").ok).toBe(false);
    expect(normalizeAnswer(lock("keypad", 4), "60A2").ok).toBe(false);
  });
  it("uppercases and strips accents on word locks", () => {
    expect(normalizeAnswer(lock("word", 6), "nérium")).toEqual({ ok: true, value: "NERIUM" });
    expect(normalizeAnswer(lock("word", 6), "NER1UM").ok).toBe(false);
  });
  it("accepts dial sequences as arrays or strings, within range", () => {
    expect(normalizeAnswer(lock("dial", 3), [12, 30, 5])).toEqual({ ok: true, value: "12-30-5" });
    expect(normalizeAnswer(lock("dial", 3), "12 - 30 - 5")).toEqual({ ok: true, value: "12-30-5" });
    expect(normalizeAnswer(lock("dial", 3), [12, 40, 5]).ok).toBe(false);
  });
  it("rejects non-string input and huge strings", () => {
    expect(normalizeAnswer(lock("keypad", 4), { x: 1 }).ok).toBe(false);
    expect(normalizeAnswer(lock("word", 6), "A".repeat(10_000)).ok).toBe(false);
  });
});

describe("set and sequence answers", () => {
  const timeline: NormalizablePuzzle = { type: "timeline", config: { cards: ["a", "b", "c"].map((id) => ({ id, source: "s", stamp: "t", text: "x" })) } };
  it("keeps timeline order and requires every card once", () => {
    expect(normalizeAnswer(timeline, ["c", "a", "b"])).toEqual({ ok: true, value: "c>a>b" });
    expect(normalizeAnswer(timeline, ["a", "a", "b"]).ok).toBe(false);
    expect(normalizeAnswer(timeline, ["a", "b"]).ok).toBe(false);
    expect(normalizeAnswer(timeline, ["a", "b", "z"]).ok).toBe(false);
  });

  const statements: NormalizablePuzzle = { type: "statements", config: { transcripts: ["t"], flagCount: 2 }, lineIds: ["l1", "l2", "l3"] };
  it("sorts flagged statements and checks the count", () => {
    expect(normalizeAnswer(statements, ["l3", "l1"])).toEqual({ ok: true, value: "l1,l3" });
    expect(normalizeAnswer(statements, ["l1"]).ok).toBe(false);
    expect(normalizeAnswer(statements, ["l1", "nope"]).ok).toBe(false);
  });

  const board: NormalizablePuzzle = {
    type: "board",
    config: { nodes: ["a", "b", "x", "y"].map((id) => ({ id, label: id, group: "left" as const })) },
  };
  it("treats board strings as undirected and unordered", () => {
    const one = normalizeAnswer(board, [["a", "x"], ["y", "b"]]);
    const two = normalizeAnswer(board, [["b", "y"], ["x", "a"], ["a", "x"]]);
    expect(one).toEqual(two);
    expect(normalizeAnswer(board, [["a", "a"]]).ok).toBe(false);
  });

  const accusation: NormalizablePuzzle = {
    type: "accusation",
    config: { suspects: [{ id: "s", label: "S" }, { id: "t", label: "T" }], motives: [{ id: "m", label: "M" }, { id: "n", label: "N" }], methods: [{ id: "x", label: "X" }, { id: "y", label: "Y" }] },
  };
  it("requires all three parts of an accusation", () => {
    expect(normalizeAnswer(accusation, { suspect: "s", motive: "m", method: "x" })).toEqual({ ok: true, value: "s|m|x" });
    expect(normalizeAnswer(accusation, { suspect: "s", motive: "m" }).ok).toBe(false);
  });
});
