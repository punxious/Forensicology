import type { Metadata } from "next";
import Link from "next/link";
import { listCases } from "@/lib/server/cases";
import { DIFFICULTY_LABELS } from "@/lib/client/format";
import { SiteHeader } from "@/components/site/SiteHeader";

export const metadata: Metadata = {
  title: "Cases",
  description: "Browse Forensicology cases by difficulty, duration and team size.",
};

export default function CasesPage() {
  const cases = listCases();
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-6xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">Open cases</h1>
        <p className="mt-2 text-muted">Each case is a self-contained investigation. Your progress saves as you go.</p>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cases.map((c) => (
            <li key={c.slug}>
              <Link href={`/play/${c.slug}`} className="group block h-full rounded-md bg-folder p-1 pt-6 shadow-lg transition hover:-translate-y-0.5 hover:shadow-2xl">
                <div className="paper flex h-full flex-col rounded-sm p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-[family-name:var(--font-stamp)] text-2xl leading-tight group-hover:underline">{c.title}</h2>
                    {c.free && <span className="stamp shrink-0 text-xs">Free</span>}
                  </div>
                  <p className="mt-3 flex-1 text-sm text-[#4a4438]">{c.tagline}</p>
                  <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-[#cfc2a3] pt-3 font-mono text-xs">
                    <div>
                      <dt className="uppercase opacity-70">Difficulty</dt>
                      <dd>
                        <span aria-hidden="true">{"●".repeat(c.difficulty)}{"○".repeat(5 - c.difficulty)}</span>{" "}
                        <span className="block">{DIFFICULTY_LABELS[c.difficulty]}</span>
                      </dd>
                    </div>
                    <div>
                      <dt className="uppercase opacity-70">Time</dt>
                      <dd>{c.durationMinutes} min</dd>
                    </div>
                    <div>
                      <dt className="uppercase opacity-70">Players</dt>
                      <dd>
                        {c.players.min}–{c.players.max}
                      </dd>
                    </div>
                  </dl>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  );
}
