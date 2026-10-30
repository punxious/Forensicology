"use client";

import Link from "next/link";
import type { RunView } from "@/lib/engine/game";
import { formatDuration } from "@/lib/client/format";
import { Button, Html, Stamp } from "@/components/ui/primitives";

export function ResultScreen({ view, onRestart }: { view: RunView; onRestart: () => void }) {
  const r = view.result!;
  const b = r.breakdown;
  const rows: [string, number][] = [
    ["Starting score", b.base],
    ["Time", -b.time],
    ["Overtime", -b.overtime],
    ["Hints", -b.hints],
    ["Wrong guesses", -b.wrongGuesses],
    ["Wrong accusations", -b.wrongAccusations],
  ];
  return (
    <main id="main" className="mx-auto max-w-3xl space-y-8 px-4 py-10 sm:py-16">
      <section className="paper relative overflow-hidden rounded-sm px-6 py-10 text-center sm:px-10" aria-labelledby="result-title">
        <p className="font-mono text-xs tracking-widest uppercase opacity-70">{view.case.title}</p>
        <h1 id="result-title" className="mt-2 font-[family-name:var(--font-stamp)] text-4xl">
          Case closed
        </h1>
        <div className="my-6">
          <Stamp className="fx-stamp-in text-2xl sm:text-3xl">{r.rank.label}</Stamp>
        </div>
        <p className="font-mono text-5xl font-bold tabular-nums">{r.score.toLocaleString("en-AU")}</p>
        <p className="mt-1 text-sm opacity-80">
          Solved in {formatDuration(r.elapsedMs)}
          {r.overtime ? " (overtime: rank capped at Detective)" : ""}
        </p>
        <table className="mx-auto mt-6 w-full max-w-sm font-mono text-sm">
          <caption className="sr-only">Score breakdown</caption>
          <tbody>
            {rows
              .filter(([label, v]) => v !== 0 || label === "Starting score")
              .map(([label, v]) => (
                <tr key={label} className="border-b border-[#d8ccb0]">
                  <th scope="row" className="py-1 text-left font-normal">
                    {label}
                  </th>
                  <td className="py-1 text-right tabular-nums">{v > 0 ? v.toLocaleString("en-AU") : `−${Math.abs(v).toLocaleString("en-AU")}`}</td>
                </tr>
              ))}
            <tr>
              <th scope="row" className="py-1 text-left">
                Final score
              </th>
              <td className="py-1 text-right font-bold tabular-nums">{r.score.toLocaleString("en-AU")}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="paper doc rounded-sm px-6 py-8 sm:px-10" aria-label="Epilogue">
        <Html html={r.epilogueHtml} />
      </section>

      <div className="flex flex-wrap justify-center gap-3">
        <Link href="/cases" className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-ink">
          More cases
        </Link>
        <Button onClick={onRestart}>Play again</Button>
      </div>
    </main>
  );
}
