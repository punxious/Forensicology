"use client";

import { useState } from "react";
import { COLUMNS, MINUTIA_LABELS, PrintFeatureList, PrintImage } from "@/components/case/PrintImage";
import { Button, Feedback } from "@/components/ui/primitives";
import { MINUTIA_TYPES, type MinutiaType } from "@/lib/engine/schema";
import { play } from "@/lib/client/sfx";
import type { PuzzleProps } from "./types";
import { useSubmit } from "./useSubmit";

const CYCLE: (MinutiaType | null)[] = [...MINUTIA_TYPES, null];

/**
 * Mark ridge features on the latent lift (each cell cycles through the
 * feature types), compare against the charted print cards, then declare a match.
 */
export function Fingerprint({ puzzle, submit, evidence }: PuzzleProps<"fingerprint">) {
  const { latent: latentId, cards, minMarks } = puzzle.config;
  const latent = evidence.get(latentId);
  const [marks, setMarks] = useState<Record<string, MinutiaType>>({});
  const [card, setCard] = useState(cards[0]!);
  const [match, setMatch] = useState<string | null>(null);
  const s = useSubmit(submit, "The examiner disagrees. Compare feature types as well as positions.");

  if (!latent?.print) return <p>The latent lift hasn&apos;t arrived yet.</p>;
  const print = latent.print;
  const grid = print.grid;
  const count = Object.keys(marks).length;
  const visible = new Map(print.features.map((f) => [f.cell, f.type]));
  const smudged = new Set(print.smudged);

  const cycle = (cell: string) => {
    play("type");
    setMarks((m) => {
      const next = CYCLE[(CYCLE.indexOf(m[cell] ?? null) + 1) % CYCLE.length];
      const copy = { ...m };
      if (next) copy[cell] = next;
      else delete copy[cell];
      return copy;
    });
  };

  const selected = evidence.get(card);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        <section aria-labelledby="fp-latent" className="space-y-2">
          <h3 id="fp-latent" className="text-xs font-bold tracking-widest text-muted uppercase">
            1 · Mark the latent ({count} marked, {minMarks} needed)
          </h3>
          <p className="text-sm text-muted">
            Tap a cell to cycle: {MINUTIA_TYPES.map((t) => MINUTIA_LABELS[t].short).join(" → ")} → clear.
          </p>
          <div className="paper relative mx-auto w-full max-w-sm rounded-sm p-2">
            <PrintImage print={print} latent showGrid title={`Latent lift: ${latent.subject}`} className="h-auto w-full" />
            {/* Clickable grid over the print area. Matches the SVG viewBox (-22 offset, 330 units wide). */}
            <div
              role="grid"
              aria-label={`Latent print, ${grid} by ${grid} grid. Columns A to ${COLUMNS[grid - 1]}, rows 1 to ${grid}.`}
              className="absolute grid"
              style={{
                left: `calc(0.5rem + (100% - 1rem) * ${22 / 330})`,
                top: `calc(0.5rem + (100% - 1rem) * ${22 / 330})`,
                width: `calc((100% - 1rem) * ${300 / 330})`,
                aspectRatio: "1",
                gridTemplateColumns: `repeat(${grid}, 1fr)`,
              }}
            >
              {Array.from({ length: grid }, (_, r) => (
                <div role="row" key={r} className="contents">
                  {Array.from({ length: grid }, (_, c) => {
                    const cell = `${COLUMNS[c]}${r + 1}`;
                    const mark = marks[cell];
                    const seen = smudged.has(cell) ? "smudged, unreadable" : visible.has(cell) ? `visible detail: ${MINUTIA_LABELS[visible.get(cell)!].name}` : "plain ridges";
                    return (
                      <div role="gridcell" key={cell} className="contents">
                        <button
                          type="button"
                          onClick={() => cycle(cell)}
                          aria-label={`${cell}, ${seen}. Your mark: ${mark ? MINUTIA_LABELS[mark].name : "none"}.`}
                          className={`flex items-end justify-center p-0.5 font-mono text-[10px] leading-none font-bold sm:text-xs ${mark ? "bg-uv/15 ring-2 ring-uv ring-inset" : "hover:bg-black/5"}`}
                        >
                          {mark && <span className="rounded-sm bg-uv px-1 py-0.5 text-white">{MINUTIA_LABELS[mark].short}</span>}
                        </button>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
          {count > 0 && (
            <p className="font-mono text-xs">
              Your marks:{" "}
              {Object.entries(marks)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([cell, t]) => `${cell} ${MINUTIA_LABELS[t].short}`)
                .join(" · ")}
            </p>
          )}
        </section>

        <section aria-labelledby="fp-cards" className="space-y-2">
          <h3 id="fp-cards" className="text-xs font-bold tracking-widest text-muted uppercase">
            2 · Compare the print cards
          </h3>
          <div role="tablist" aria-label="Print cards" className="flex flex-wrap gap-1">
            {cards.map((id) => (
              <button
                key={id}
                role="tab"
                type="button"
                aria-selected={card === id}
                aria-controls="fp-card-panel"
                onClick={() => setCard(id)}
                className={`rounded-t-md border border-b-0 px-3 py-2 text-sm ${card === id ? "border-line bg-surface-2 font-bold" : "border-transparent text-muted"}`}
              >
                {evidence.get(id)?.subject ?? id}
              </button>
            ))}
          </div>
          {selected?.print && (
            <div id="fp-card-panel" role="tabpanel" className="space-y-2 rounded-b-md rounded-tr-md border border-line bg-surface-2 p-3">
              <div className="paper mx-auto w-full max-w-sm rounded-sm p-2">
                <PrintImage print={selected.print} annotate showGrid title={`Print card: ${selected.subject}, ${selected.print.pattern} pattern`} className="h-auto w-full" />
              </div>
              <p className="text-sm">
                <span className="text-muted">Pattern:</span> <strong className="capitalize">{selected.print.pattern}</strong>
              </p>
              <PrintFeatureList print={selected.print} />
            </div>
          )}
        </section>
      </div>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">3 · Declare the match</legend>
        <div className="flex flex-wrap gap-2">
          {cards.map((id) => (
            <label key={id} className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus)] ${match === id ? "border-ink bg-surface-2 ring-1 ring-ink" : "border-line"}`}>
              <input type="radio" name={`${puzzle.id}-match`} checked={match === id} onChange={() => setMatch(id)} className="size-4 accent-[var(--uv)]" />
              {evidence.get(id)?.subject ?? id}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          disabled={s.busy || !match || count < minMarks}
          onClick={() => s.run({ card: match, marks: Object.entries(marks).map(([cell, type]) => ({ cell, type })) })}
        >
          {s.busy ? "Checking…" : count < minMarks ? `Mark ${minMarks - count} more feature${minMarks - count === 1 ? "" : "s"}` : "Declare identification"}
        </Button>
        <div aria-live="polite">{s.feedback && <Feedback tone={s.feedback.tone}>{s.feedback.text}</Feedback>}</div>
      </div>
    </div>
  );
}
