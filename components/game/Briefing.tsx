"use client";

import Link from "next/link";
import { Button, Html, Stamp } from "@/components/ui/primitives";
import { DIFFICULTY_LABELS } from "@/lib/client/format";

export type BriefingInfo = {
  slug: string;
  title: string;
  tagline: string;
  difficulty: number;
  durationMinutes: number;
  players: { min: number; max: number };
  briefingHtml: string;
};

export function Briefing({ info, onStart, starting, error }: { info: BriefingInfo; onStart: () => void; starting: boolean; error: string | null }) {
  return (
    <main id="main" className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <Link href="/cases" className="text-sm text-muted underline">
        ← All cases
      </Link>
      <div className="relative mt-6 rounded-md bg-folder p-1 pt-8 shadow-2xl">
        <div className="absolute -top-4 left-6 rounded-t-md bg-folder px-4 py-1 font-mono text-xs font-bold tracking-widest text-folder-ink uppercase">
          Case file · {info.slug.toUpperCase()}
        </div>
        <div className="paper rounded-sm px-5 py-8 sm:px-10">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">{info.title}</h1>
              <p className="mt-2 max-w-prose text-[#4a4438]">{info.tagline}</p>
            </div>
            <Stamp>Confidential</Stamp>
          </div>
          <dl className="mb-6 grid grid-cols-3 gap-2 border-y border-[#cfc2a3] py-3 font-mono text-sm">
            <div>
              <dt className="text-xs uppercase opacity-70">Difficulty</dt>
              <dd>{DIFFICULTY_LABELS[info.difficulty]}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase opacity-70">Time</dt>
              <dd>{info.durationMinutes} min</dd>
            </div>
            <div>
              <dt className="text-xs uppercase opacity-70">Players</dt>
              <dd>
                {info.players.min}–{info.players.max}
              </dd>
            </div>
          </dl>
          <Html html={info.briefingHtml} className="doc" />
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={onStart} disabled={starting} className="px-6 text-base">
              {starting ? "Opening…" : "Open the case file"}
            </Button>
            <span className="text-sm text-[#4a4438]">The clock starts when you open the file. Progress saves automatically in this browser.</span>
          </div>
          {error && (
            <p role="alert" className="mt-4 font-semibold text-[#a3271c]">
              {error}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
