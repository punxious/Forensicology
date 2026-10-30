import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ScenePoster } from "@/components/site/ScenePoster";
import { LandingHero3D } from "@/components/three/Lazy";
import { listCases } from "@/lib/server/cases";

const STEPS = [
  { n: "01", title: "Open the case file", body: "A briefing, a crime scene and a stack of evidence. The clock starts when you break the seal." },
  { n: "02", title: "Work the evidence", body: "Lift prints, run toxicology, sweep documents with a UV torch, crack locks and catch witnesses lying." },
  { n: "03", title: "Make the accusation", body: "Name who did it, why and how. All three must be right, and the case file remembers every wrong guess." },
];

// Phase 2a: immersive hero + how it works. Pricing, FAQ, teams and testimonials arrive in Phase 2b.
export default function Home() {
  const free = listCases().find((c) => c.free);
  return (
    <>
      <div className="absolute inset-x-0 top-0 z-20">
        <SiteHeader overlay />
      </div>
      <main id="main">
        <section
          aria-labelledby="hero-title"
          className="relative isolate flex min-h-[640px] items-end overflow-hidden bg-[#08090c] text-[#ece6d8] md:h-[92svh] md:items-center"
          style={{ backgroundImage: "radial-gradient(ellipse 60% 55% at 70% 40%, rgba(255,205,140,0.18), transparent 70%), radial-gradient(ellipse 40% 40% at 85% 75%, rgba(140,90,255,0.16), transparent 70%)" }}
        >
          <div className="absolute inset-0 -z-10">
            <ScenePoster name="landing" priority />
            <LandingHero3D />
          </div>
          <div className="pointer-events-none absolute inset-0 -z-0 bg-gradient-to-t from-[#08090c] via-[#08090c]/40 to-transparent md:bg-gradient-to-r md:from-[#08090c]/95 md:via-[#08090c]/55 md:to-transparent" />
          <div className="pointer-events-none relative mx-auto w-full max-w-6xl px-4 pt-28 pb-12 md:py-0">
            <div className="pointer-events-auto max-w-xl">
              <p className="font-mono text-xs tracking-[0.3em] text-[#b9b2a3] uppercase">Forensic escape rooms</p>
              <h1 id="hero-title" className="mt-4 font-[family-name:var(--font-stamp)] text-4xl leading-tight sm:text-6xl">
                The evidence is on your desk.
                <br />
                <span className="text-[#c6aaff]">The clock is running.</span>
              </h1>
              <p className="mt-5 max-w-lg text-lg text-[#cfc8b8]">
                Step into the lab. Examine documents, lift prints, run lab tests and break alibis to work out who did it, why and how. 45–60 minutes, alone or as a team.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                {free && (
                  <Link href={`/play/${free.slug}`} className="inline-flex min-h-12 items-center rounded-md bg-[#c9402f] px-6 font-semibold text-white shadow-lg shadow-black/40 hover:brightness-110">
                    Play “{free.title}” free
                  </Link>
                )}
                <Link href="/cases" className="inline-flex min-h-12 items-center rounded-md border border-[#ece6d8]/40 px-6 font-semibold hover:bg-white/5">
                  Browse the archive
                </Link>
              </div>
              <p className="mt-4 text-sm text-[#9d9686]">No account needed for the first case.</p>
            </div>
          </div>
        </section>

        <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-16 sm:py-24">
          <h2 id="how-title" className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">
            How it works
          </h2>
          <ol className="mt-10 grid gap-6 md:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="paper doc rounded-sm p-6">
                <span className="stamp text-sm">{s.n}</span>
                <h3 className="mt-4">{s.title}</h3>
                <p>{s.body}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
