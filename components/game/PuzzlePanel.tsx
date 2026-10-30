"use client";

import { useState } from "react";
import type { PublicEvidence, PublicPuzzle } from "@/lib/engine/game";
import { PuzzleBody } from "@/components/puzzles";
import type { LabRunner } from "@/components/puzzles/Lab";
import type { SubmitResult } from "@/components/puzzles/types";
import { Button, Feedback, Html, Stamp } from "@/components/ui/primitives";

const TIER_NAMES = ["Nudge", "Pointer", "Near-solution"];
const TYPE_LABELS: Record<PublicPuzzle["type"], string> = {
  lock: "Lock",
  timeline: "Timeline reconstruction",
  statements: "Witness statements",
  lab: "Lab analysis",
  fingerprint: "Fingerprint comparison",
  board: "Evidence board",
  accusation: "Final deduction",
};

type Props = {
  puzzle: PublicPuzzle;
  evidence: ReadonlyMap<string, PublicEvidence>;
  penalties: { wrongGuess: number; wrongAccusation: number };
  submit: (answer: unknown) => Promise<SubmitResult>;
  runLab: LabRunner;
  takeHint: (puzzleId: string) => Promise<string | null>;
  openEvidence: (id: string) => void;
  onDebugSolve?: (puzzleId: string) => void;
  next: PublicPuzzle[];
  onOpenPuzzle: (id: string) => void;
};

export function PuzzlePanel({ puzzle, evidence, penalties, submit, runLab, takeHint, openEvidence, onDebugSolve, next, onOpenPuzzle }: Props) {
  return (
    <article aria-labelledby={`pz-${puzzle.id}-title`} className="mx-auto max-w-5xl space-y-5">
      <header className="space-y-2">
        <p className="text-xs font-bold tracking-widest text-muted uppercase">{TYPE_LABELS[puzzle.type]}</p>
        <div className="flex flex-wrap items-center gap-4">
          <h2 id={`pz-${puzzle.id}-title`} tabIndex={-1} className="font-[family-name:var(--font-stamp)] text-2xl leading-tight outline-none sm:text-3xl">
            {puzzle.title}
          </h2>
          {puzzle.solved && <Stamp className="fx-stamp-in text-ok">Solved</Stamp>}
        </div>
        <Html html={puzzle.promptHtml} className="max-w-3xl space-y-2 text-base leading-relaxed [&_strong]:font-bold" />
      </header>

      {puzzle.solved ? (
        <div className="space-y-4">
          <div className="paper doc rounded-sm px-5 py-5">
            <Html html={puzzle.solvedHtml ?? ""} />
          </div>
          {next.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {next.map((p) => (
                <Button key={p.id} onClick={() => onOpenPuzzle(p.id)}>
                  Next: {p.title} →
                </Button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          <PuzzleBody puzzle={puzzle} evidence={evidence} penalties={penalties} submit={submit} runLab={runLab} openEvidence={openEvidence} />
          <HintPanel puzzle={puzzle} takeHint={takeHint} />
          {puzzle.wrongGuesses > 0 && puzzle.type !== "accusation" && (
            <p className="text-xs text-muted">
              Wrong attempts on this task: {puzzle.wrongGuesses} (−{penalties.wrongGuess} each)
            </p>
          )}
          {onDebugSolve && (
            <button type="button" onClick={() => onDebugSolve(puzzle.id)} className="rounded border border-dashed border-uv px-2 py-1 text-xs text-uv">
              Dev: force-solve this task
            </button>
          )}
        </>
      )}
    </article>
  );
}

function HintPanel({ puzzle, takeHint }: { puzzle: PublicPuzzle; takeHint: (id: string) => Promise<string | null> }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tier = puzzle.hintsHtml.length;

  const reveal = async () => {
    setBusy(true);
    setError(await takeHint(puzzle.id));
    setBusy(false);
    setConfirming(false);
  };

  return (
    <section aria-labelledby={`hints-${puzzle.id}`} className="rounded-md border border-dashed border-line p-4">
      <h3 id={`hints-${puzzle.id}`} className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
        Hints ({tier} of 3 used)
      </h3>
      {tier > 0 && (
        <ol className="mb-3 space-y-2">
          {puzzle.hintsHtml.map((h, i) => (
            <li key={i} className="text-sm">
              <span className="mr-2 font-mono text-xs font-bold uppercase">{TIER_NAMES[i]}:</span>
              <Html html={h} className="inline" />
            </li>
          ))}
        </ol>
      )}
      {puzzle.nextHintCost !== null &&
        (confirming ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm">
              Reveal the {TIER_NAMES[tier]?.toLowerCase()} for −{puzzle.nextHintCost} points?
            </span>
            <Button variant="uv" onClick={reveal} disabled={busy}>
              {busy ? "Opening…" : "Reveal"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button onClick={() => setConfirming(true)}>
            <span aria-hidden="true">💡</span> {tier === 0 ? "Need a hint?" : "Another hint"} <span className="text-muted">(−{puzzle.nextHintCost})</span>
          </Button>
        ))}
      {error && <Feedback tone="error">{error}</Feedback>}
    </section>
  );
}
