"use client";

import type { PublicPuzzle } from "@/lib/engine/game";
import { Accusation } from "./Accusation";
import { EvidenceBoard } from "./EvidenceBoard";
import { Fingerprint } from "./Fingerprint";
import { Lab, type LabRunner } from "./Lab";
import { Lock } from "./Lock";
import { Statements } from "./Statements";
import { Timeline } from "./Timeline";
import type { PuzzleProps } from "./types";

type Props = Omit<PuzzleProps<PublicPuzzle["type"]>, "puzzle"> & { puzzle: PublicPuzzle; runLab: LabRunner };

/** Picks the component for a puzzle type. Add new puzzle types here. */
export function PuzzleBody({ puzzle, runLab, ...rest }: Props) {
  switch (puzzle.type) {
    case "lock":
      return <Lock puzzle={puzzle} {...rest} />;
    case "timeline":
      return <Timeline puzzle={puzzle} {...rest} />;
    case "statements":
      return <Statements puzzle={puzzle} {...rest} />;
    case "lab":
      return <Lab puzzle={puzzle} runLab={runLab} />;
    case "fingerprint":
      return <Fingerprint puzzle={puzzle} {...rest} />;
    case "board":
      return <EvidenceBoard puzzle={puzzle} {...rest} />;
    case "accusation":
      return <Accusation puzzle={puzzle} {...rest} />;
  }
}
