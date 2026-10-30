import Link from "next/link";
import { SiteHeader } from "@/components/site/SiteHeader";
import { ScenePoster } from "@/components/site/ScenePoster";
import { LandingHero3D } from "@/components/three/Lazy";
import { SiteFooter } from "@/components/site/SiteFooter";
import { FAQ } from "@/config/faq";
import { formatPrice, PRICES_INCLUDE_GST, TIERS } from "@/config/pricing";
import { visibleTestimonials } from "@/config/testimonials";
import { DIFFICULTY_LABELS } from "@/lib/client/format";
import { listCases } from "@/lib/server/cases";

const STEPS = [
  { n: "01", title: "Open the case file", body: "A briefing, a crime scene and a stack of evidence. The clock starts when you break the seal." },
  { n: "02", title: "Work the evidence", body: "Lift prints, run toxicology, sweep documents with a UV torch, crack locks and catch witnesses lying." },
  { n: "03", title: "Make the accusation", body: "Name who did it, why and how. All three must be right, and the case file remembers every wrong guess." },
];

const section = "mx-auto max-w-6xl px-4 py-16 sm:py-24";
const h2 = "font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl";

export default function Home() {
  const cases = listCases();
  const free = cases.find((c) => c.free);
  const testimonials = visibleTestimonials();
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

        <section aria-labelledby="cases-title" className={section}>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 id="cases-title" className={h2}>
              From the archive
            </h2>
            <Link href="/cases" className="font-semibold underline">
              All cases →
            </Link>
          </div>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {cases.map((c) => (
              <li key={c.slug}>
                <Link href={`/play/${c.slug}`} className="group block h-full rounded-md bg-folder p-1 pt-6 shadow-lg transition hover:-translate-y-0.5">
                  <div className="paper flex h-full flex-col rounded-sm p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-[family-name:var(--font-stamp)] text-2xl leading-tight group-hover:underline">{c.title}</h3>
                      {c.free && <span className="stamp shrink-0 text-xs">Free</span>}
                    </div>
                    <p className="mt-3 flex-1 text-sm text-[#4a4438]">{c.tagline}</p>
                    <p className="mt-4 border-t border-[#cfc2a3] pt-3 font-mono text-xs">
                      {DIFFICULTY_LABELS[c.difficulty]} · {c.durationMinutes} min · {c.players.min}–{c.players.max} players
                    </p>
                  </div>
                </Link>
              </li>
            ))}
            <li className="flex min-h-48 items-center justify-center rounded-md border border-dashed border-line p-6 text-center text-muted">
              More cases are being processed.
              <br />
              New ones arrive monthly.
            </li>
          </ul>
        </section>

        <section aria-labelledby="teams-title" className="border-y border-line bg-surface-2">
          <div className={`${section} grid items-center gap-10 md:grid-cols-2`}>
            <div>
              <p className="font-mono text-xs tracking-[0.3em] text-muted uppercase">For teams</p>
              <h2 id="teams-title" className={`${h2} mt-3`}>
                Solve it together
              </h2>
              <p className="mt-4 text-lg text-muted">
                A host opens a team session, everyone joins with a room code, and the whole team works one shared evidence board in real time. Built for
                team-building days, classrooms and clubs. PG-13, no gore, no graphic imagery.
              </p>
              <p className="mt-4 text-sm text-muted">Team sessions are coming soon. Until then, one shared screen works brilliantly.</p>
            </div>
            <ul className="grid gap-3 text-sm">
              {[
                ["⏱", "45–60 minutes", "Fits a lunch break or a lesson."],
                ["🧩", "Every puzzle type", "Prints, lab tests, UV, locks, timelines, witness statements."],
                ["🏆", "Scores and ranks", "Hints and wrong guesses cost points; see who's Chief Examiner."],
                ["♿", "Accessible", "Keyboard, screen reader and colour-blind friendly."],
              ].map(([icon, title, body]) => (
                <li key={title} className="flex gap-3 rounded-md border border-line bg-surface p-4">
                  <span aria-hidden="true" className="text-xl">{icon}</span>
                  <span>
                    <strong className="block">{title}</strong>
                    <span className="text-muted">{body}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="pricing-title" id="pricing" className={section}>
          <h2 id="pricing-title" className={h2}>
            Pricing
          </h2>
          <p className="mt-2 text-muted">
            Start free. {PRICES_INCLUDE_GST ? "All prices in Australian dollars and include GST." : ""} No ads, ever.
          </p>
          <ul className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
            {TIERS.map((t) => (
              <li key={t.id} className={`flex flex-col rounded-md border p-5 ${t.highlight ? "border-uv bg-uv/5 ring-1 ring-uv" : "border-line bg-surface"}`}>
                <h3 className="font-semibold">{t.name}</h3>
                <p className="mt-1 text-sm text-muted">{t.blurb}</p>
                <p className="mt-4 font-mono text-2xl font-bold">
                  {formatPrice(t.priceCents)}
                  {t.per && t.priceCents ? <span className="text-sm font-normal text-muted">{t.per}</span> : null}
                </p>
                <ul className="mt-4 flex-1 space-y-1.5 text-sm">
                  {t.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <span aria-hidden="true" className="text-ok">✔</span>
                      {f}
                    </li>
                  ))}
                </ul>
                {t.id === "free" && free ? (
                  <Link href={`/play/${free.slug}`} className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md bg-accent px-4 font-semibold text-accent-ink">
                    Play free
                  </Link>
                ) : (
                  <span className="mt-5 inline-flex min-h-11 items-center justify-center rounded-md border border-dashed border-line px-4 text-sm text-muted">
                    {t.available ? "Buy" : "Coming soon"}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>

        {testimonials.length > 0 && (
          <section aria-labelledby="quotes-title" className={section}>
            <h2 id="quotes-title" className={h2}>
              From the field
            </h2>
            <ul className="mt-8 grid gap-6 md:grid-cols-3">
              {testimonials.map((t, i) => (
                <li key={i} className="paper doc relative rounded-sm p-6">
                  {t.placeholder && <span className="stamp absolute top-3 right-3 text-xs">Placeholder</span>}
                  <blockquote>“{t.quote}”</blockquote>
                  <p className="mt-3 text-sm">
                    <strong>{t.name}</strong>, {t.role}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-labelledby="faq-title" className={section}>
          <h2 id="faq-title" className={h2}>
            Questions
          </h2>
          <div className="mt-8 divide-y divide-line rounded-md border border-line bg-surface">
            {FAQ.map((f) => (
              <details key={f.q} className="group p-5">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-semibold">
                  {f.q}
                  <span aria-hidden="true" className="transition group-open:rotate-45">＋</span>
                </summary>
                <p className="mt-3 text-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
