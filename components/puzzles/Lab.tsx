"use client";

import { useState } from "react";
import { Button, Feedback, Html } from "@/components/ui/primitives";
import { play } from "@/lib/client/sfx";
import type { PuzzleProps } from "./types";

export type LabRunner = (sample: string, test: string) => Promise<{ ok: true; resultHtml: string } | { ok: false; message: string }>;

const STAGES = ["Logging sample…", "Preparing extract…", "Running assay…", "Reviewing result…"];

export function Lab({ puzzle, runLab }: Pick<PuzzleProps<"lab">, "puzzle"> & { runLab: LabRunner }) {
  const { samples, tests, processingSeconds } = puzzle.config;
  const [sample, setSample] = useState<string | null>(null);
  const [test, setTest] = useState<string | null>(null);
  const [stage, setStage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const log = [...(puzzle.labLog ?? [])].reverse();
  const label = (list: { id: string; label: string }[], id: string) => list.find((x) => x.id === id)?.label ?? id;

  const run = async () => {
    if (!sample || !test || stage !== null) return;
    setError(null);
    play("open");
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ms = reduce ? 600 : processingSeconds * 1000;
    const request = runLab(sample, test);
    for (let i = 0; i < STAGES.length; i++) {
      setStage(i);
      await new Promise((r) => setTimeout(r, ms / STAGES.length));
    }
    const result = await request;
    setStage(null);
    if (!result.ok) setError(result.message);
  };

  const fieldset = (legend: string, list: typeof samples, value: string | null, set: (v: string) => void, name: string) => (
    <fieldset className="space-y-2">
      <legend className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">{legend}</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {list.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 transition has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus)] ${value === o.id ? "border-ink bg-surface-2 ring-1 ring-ink" : "border-line bg-surface"}`}
          >
            <input type="radio" name={name} value={o.id} checked={value === o.id} onChange={() => set(o.id)} className="mt-1 size-4 accent-[var(--uv)]" />
            <span>
              <span className="block font-semibold">{o.label}</span>
              {o.description && <span className="block text-xs text-muted">{o.description}</span>}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="space-y-5">
      {fieldset("1 · Sample", samples, sample, setSample, `${puzzle.id}-sample`)}
      {fieldset("2 · Test", tests, test, setTest, `${puzzle.id}-test`)}

      <div className="space-y-2">
        <Button variant="primary" disabled={!sample || !test || stage !== null} onClick={run}>
          {stage !== null ? "Processing…" : "Run analysis"}
        </Button>
        {stage !== null && (
          <div role="status" aria-live="polite" className="space-y-1">
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full origin-left bg-uv"
                style={{ animation: `fx-progress ${processingSeconds}s linear both` }}
              />
            </div>
            <p className="font-mono text-sm">{STAGES[stage]}</p>
          </div>
        )}
        {error && <Feedback tone="error">{error}</Feedback>}
      </div>

      {log.length > 0 && (
        <section aria-labelledby={`${puzzle.id}-log`} className="space-y-2">
          <h3 id={`${puzzle.id}-log`} className="text-xs font-bold tracking-widest text-muted uppercase">
            Result slips (newest first)
          </h3>
          <ol className="space-y-2">
            {log.map((r, i) => (
              <li key={`${r.sample}|${r.test}`} className="paper doc rounded-sm px-4 py-3">
                <p className="text-xs tracking-wider uppercase opacity-70">
                  Slip {log.length - i} · {label(samples, r.sample)} · {label(tests, r.test)}
                </p>
                <Html html={r.resultHtml} />
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
