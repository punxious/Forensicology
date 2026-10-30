"use client";

import { useState } from "react";
import { Button, Feedback } from "@/components/ui/primitives";
import type { PuzzleProps } from "./types";
import { useSubmit } from "./useSubmit";

export function Statements({ puzzle, submit, evidence }: PuzzleProps<"statements">) {
  const { transcripts, flagCount } = puzzle.config;
  const [flags, setFlags] = useState<string[]>([]);
  const s = useSubmit(submit, "Not quite. At least one of those lines holds up, or you've missed a lie.");
  const toggle = (id: string) => setFlags((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));

  return (
    <div className="space-y-5">
      <p className="text-sm font-semibold" aria-live="polite">
        Flagged {flags.length} of {flagCount}
      </p>
      {transcripts.map((tid) => {
        const t = evidence.get(tid);
        if (!t?.lines) return null;
        return (
          <section key={tid} aria-labelledby={`st-${tid}`} className="paper doc rounded-sm px-4 py-4 sm:px-6">
            <h3 id={`st-${tid}`} className="!mt-0">{t.title}</h3>
            <ul className="!list-none !pl-0 space-y-1.5">
              {t.lines.map((l) => {
                const on = flags.includes(l.id);
                return (
                  <li key={l.id}>
                    <button
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggle(l.id)}
                      className={`w-full rounded px-2 py-1.5 text-left transition ${on ? "bg-[#a3271c]/10 outline-2 outline-[#a3271c] outline-dashed" : "hover:bg-black/5"}`}
                    >
                      <span className="mr-2 inline-block w-20 font-bold uppercase">{on ? "⚑ FLAG" : " "}</span>
                      <span className={on ? "underline decoration-wavy decoration-2 underline-offset-4" : ""}>
                        <span className="sr-only">{l.speaker}: </span>
                        {l.text}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={s.busy || flags.length !== flagCount} onClick={() => s.run(flags)}>
          {s.busy ? "Checking…" : `Submit ${flagCount} contradictions`}
        </Button>
        <div aria-live="polite">{s.feedback && <Feedback tone={s.feedback.tone}>{s.feedback.text}</Feedback>}</div>
      </div>
    </div>
  );
}
