import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { listCases } from "@/lib/server/cases";

// Phase 1 placeholder. The full landing page (pricing, FAQ, teams) arrives in Phase 2.
export default function Home() {
  const free = listCases().find((c) => c.free);
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto flex max-w-4xl flex-col items-start gap-6 px-4 py-16 sm:py-24">
        <p className="font-mono text-xs tracking-[0.3em] text-muted uppercase">Forensic escape rooms</p>
        <h1 className="font-[family-name:var(--font-stamp)] text-4xl leading-tight sm:text-6xl">
          The evidence is on your desk.
          <br />
          <span className="text-uv">The clock is running.</span>
        </h1>
        <p className="max-w-2xl text-lg text-muted">
          Examine documents, lift prints, run lab tests and break alibis to work out who did it, why and how. Each case takes 45–60 minutes, alone or as a team.
        </p>
        <div className="flex flex-wrap gap-3">
          {free && (
            <Link href={`/play/${free.slug}`} className="inline-flex min-h-12 items-center rounded-md bg-accent px-6 font-semibold text-accent-ink">
              Play “{free.title}” free
            </Link>
          )}
          <Link href="/cases" className="inline-flex min-h-12 items-center rounded-md border border-line px-6 font-semibold">
            Browse cases
          </Link>
        </div>
      </main>
    </>
  );
}
