"use client";

import { useState } from "react";
import { Button, Feedback } from "@/components/ui/primitives";
import type { PuzzleProps } from "./types";
import { useSubmit } from "./useSubmit";

export function Accusation({ puzzle, submit, penalties }: PuzzleProps<"accusation">) {
  const { suspects, motives, methods } = puzzle.config;
  const [choice, setChoice] = useState<{ suspect?: string; motive?: string; method?: string }>({});
  const [confirming, setConfirming] = useState(false);
  const s = useSubmit(submit, "The coroner isn't convinced. At least one part of your case doesn't hold.");
  const complete = choice.suspect && choice.motive && choice.method;
  const label = (list: { id: string; label: string }[], id?: string) => list.find((o) => o.id === id)?.label;

  const group = (key: "suspect" | "motive" | "method", legend: string, list: typeof suspects) => (
    <fieldset>
      <legend className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">{legend}</legend>
      <div className="grid gap-2">
        {list.map((o) => (
          <label
            key={o.id}
            className={`flex cursor-pointer items-center gap-3 rounded-md border p-3 has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-[var(--focus)] ${choice[key] === o.id ? "border-ink bg-surface-2 ring-1 ring-ink" : "border-line bg-surface"}`}
          >
            <input
              type="radio"
              name={`${puzzle.id}-${key}`}
              checked={choice[key] === o.id}
              onChange={() => {
                setChoice((c) => ({ ...c, [key]: o.id }));
                setConfirming(false);
              }}
              className="size-4 accent-[var(--accent)]"
            />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-3">
        {group("suspect", "Who", suspects)}
        {group("motive", "Why", motives)}
        {group("method", "How", methods)}
      </div>
      {complete && (
        <blockquote className="paper doc rounded-sm px-4 py-3">
          I accuse <strong>{label(suspects, choice.suspect)}</strong>. Motive: <strong>{label(motives, choice.motive)?.toLowerCase()}</strong>. Method:{" "}
          <strong>{label(methods, choice.method)?.toLowerCase()}</strong>.
        </blockquote>
      )}
      <div className="flex flex-wrap items-center gap-3">
        {!confirming ? (
          <Button variant="primary" disabled={!complete || s.busy} onClick={() => setConfirming(true)}>
            Make the accusation
          </Button>
        ) : (
          <>
            <Button variant="primary" disabled={s.busy} onClick={() => s.run(choice)}>
              {s.busy ? "Presenting…" : "Yes, present it to the coroner"}
            </Button>
            <Button variant="ghost" onClick={() => setConfirming(false)}>
              Not yet
            </Button>
            <span className="text-sm text-muted">A wrong accusation costs {penalties.wrongAccusation.toLocaleString("en-GB")} points.</span>
          </>
        )}
      </div>
      <div aria-live="polite">{s.feedback && <Feedback tone={s.feedback.tone}>{s.feedback.text}</Feedback>}</div>
    </div>
  );
}
