/**
 * Which physical prop represents each puzzle in the 3D lab. Derived from the
 * puzzle type (and lock variant) so cases need no extra scene data.
 */
import type { CompiledPuzzle } from "./types";

export type StationKind = "lockbox" | "journal" | "safe" | "timeline" | "recorder" | "microscope" | "lightbox" | "corkboard" | "report";

export function stationKind(p: Pick<CompiledPuzzle, "type" | "config">): StationKind {
  switch (p.type) {
    case "lock": {
      const variant = (p.config as { variant: string }).variant;
      return variant === "word" ? "journal" : variant === "dial" ? "safe" : "lockbox";
    }
    case "timeline":
      return "timeline";
    case "statements":
      return "recorder";
    case "lab":
      return "microscope";
    case "fingerprint":
      return "lightbox";
    case "board":
      return "corkboard";
    case "accusation":
      return "report";
  }
}

export const WALL_STATIONS: ReadonlySet<StationKind> = new Set(["timeline", "corkboard"]);
