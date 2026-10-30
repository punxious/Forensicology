import type { Metadata } from "next";
import Link from "next/link";
import { listCases } from "@/lib/server/cases";
import { DIFFICULTY_LABELS } from "@/lib/client/format";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ScenePoster } from "@/components/site/ScenePoster";
import { GalleryShelf3D } from "@/components/three/Lazy";

export const metadata: Metadata = {
  title: "Cases",
  description: "Browse Forensicology cases by difficulty, duration and team size.",
};

export default function CasesPage() {
  const cases = listCases();
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-20">
        <SiteHeader overlay />
      </div>
      <main id="main">
        <section aria-labelledby="archive-title" className="relative isolate h-[78svh] min-h-[560px] overflow-hidden bg-[#0a0b0e] text-[#ece6d8]">
          <div className="absolute inset-0 -z-10">
            <ScenePoster name="archive" priority />
            <GalleryShelf3D cases={cases.map((c) => ({ slug: c.slug, title: c.title, sub: `${c.durationMinutes} MIN · ${DIFFICULTY_LABELS[c.difficulty]!.toUpperCase()}` }))} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-[#0a0b0e] to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-[#0a0b0e] via-[#0a0b0e]/70 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 mx-auto max-w-6xl px-4 pb-8 [&_*]:pointer-events-auto">
            <h1 id="archive-title" className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">
              The archive
            </h1>
            <p className="mt-2 max-w-lg text-[#cfc8b8]">Pull a box off the shelf. Each case is a self-contained investigation, and your progress saves as you go.</p>
          </div>
        </section>
        <div className="mx-auto max-w-6xl px-4 pb-16">
        <h2 className="mt-4 text-xs font-bold tracking-widest text-muted uppercase">All cases</h2>
        <ul className="mt-4 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
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
        </div>
      </main>
    </>
  );
}
