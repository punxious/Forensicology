import type { PublicEvidence, PublicPuzzle } from "@/lib/engine/game";

export type SubmitResult = { status: "correct" } | { status: "wrong"; message?: string } | { status: "error"; message: string };

export type PuzzleProps<T extends PublicPuzzle["type"]> = {
  puzzle: Extract<PublicPuzzle, { type: T }>;
  submit: (answer: unknown) => Promise<SubmitResult>;
  evidence: ReadonlyMap<string, PublicEvidence>;
  openEvidence: (id: string) => void;
  penalties: { wrongGuess: number; wrongAccusation: number };
};
