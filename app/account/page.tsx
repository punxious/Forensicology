import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatDuration } from "@/lib/client/format";
import { RANKS } from "@/lib/engine/scoring";
import { getUser } from "@/lib/server/auth";
import { listCases } from "@/lib/server/cases";
import { getDb } from "@/lib/server/db";
import { ensureProfile } from "@/lib/server/repo/profiles";
import { finishedRunsForUser, leaderboardPosition, runsForUser } from "@/lib/server/repo/runs";
import { DeleteAccountForm, SettingsForm } from "./Forms";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

const card = "rounded-md border border-line bg-surface p-5";
const h2 = "mb-3 text-xs font-bold tracking-widest text-muted uppercase";

export default async function AccountPage() {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const db = await getDb();
  const profile = await ensureProfile(db, user);
  const [current, finished] = await Promise.all([runsForUser(db, user.id), finishedRunsForUser(db, user.id)]);
  const cases = listCases();
  const title = (slug: string) => cases.find((c) => c.slug === slug)?.title ?? slug;

  const inProgress = current.filter((r) => !r.finishedAt);
  const solvedSlugs = [...new Set(finished.map((r) => r.caseSlug))];
  const best = solvedSlugs.map((slug) => {
    const runs = finished.filter((r) => r.caseSlug === slug);
    const top = runs.reduce((a, b) => ((b.score ?? 0) > (a.score ?? 0) ? b : a));
    const fastest = runs.reduce((a, b) => ((b.elapsedMs ?? Infinity) < (a.elapsedMs ?? Infinity) ? b : a));
    return { slug, top, fastest, attempts: runs.length };
  });
  const positions = Object.fromEntries(await Promise.all(solvedSlugs.map(async (s) => [s, await leaderboardPosition(db, s, user.id)] as const)));
  const rankOrder = (label: string | null) => RANKS.findIndex((r) => r.label === label);
  const bestRank = finished.length ? finished.reduce((a, b) => (rankOrder(b.rank) < rankOrder(a.rank) ? b : a)).rank : null;
  const fastest = finished.length ? Math.min(...finished.map((r) => r.elapsedMs ?? Infinity)) : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-5xl space-y-8 px-4 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-xs tracking-widest text-muted uppercase">Examiner file</p>
            <h1 className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">{profile.displayName ?? "Your account"}</h1>
            <p className="text-sm text-muted">{user.email}</p>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="inline-flex min-h-11 items-center rounded-md border border-line px-4 font-semibold hover:bg-surface-2">
              Sign out
            </button>
          </form>
        </header>

        <section aria-labelledby="stats-h" className="grid gap-3 sm:grid-cols-4">
          <h2 id="stats-h" className="sr-only">
            Stats
          </h2>
          {[
            ["Cases solved", String(solvedSlugs.length)],
            ["Completed runs", String(finished.length)],
            ["Best rank", bestRank ?? "—"],
            ["Fastest solve", fastest !== null && Number.isFinite(fastest) ? formatDuration(fastest) : "—"],
          ].map(([label, value]) => (
            <div key={label} className={card}>
              <p className="text-xs tracking-widest text-muted uppercase">{label}</p>
              <p className="mt-1 font-mono text-2xl font-bold">{value}</p>
            </div>
          ))}
        </section>

        <section aria-labelledby="progress-h" className={card}>
          <h2 id="progress-h" className={h2}>
            In progress
          </h2>
          {inProgress.length === 0 ? (
            <p className="text-sm text-muted">
              Nothing open. <Link href="/cases" className="underline">Pick a case</Link>.
            </p>
          ) : (
            <ul className="divide-y divide-line">
              {inProgress.map((r) => {
                const total = cases.find((c) => c.slug === r.caseSlug)?.puzzleCount ?? 0;
                return (
                  <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <div>
                      <p className="font-semibold">{title(r.caseSlug)}</p>
                      <p className="text-sm text-muted">
                        {r.solved.length} of {total} tasks solved · started {r.startedAt.toLocaleDateString("en-AU")}
                      </p>
                    </div>
                    <Link href={`/play/${r.caseSlug}`} className="inline-flex min-h-11 items-center rounded-md bg-accent px-4 font-semibold text-accent-ink">
                      Resume
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section aria-labelledby="solved-h" className={card}>
          <h2 id="solved-h" className={h2}>
            Solved cases
          </h2>
          {best.length === 0 ? (
            <p className="text-sm text-muted">No solved cases yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted uppercase">
                  <tr>
                    <th scope="col" className="py-2 pr-3">Case</th>
                    <th scope="col" className="py-2 pr-3">Best score</th>
                    <th scope="col" className="py-2 pr-3">Rank</th>
                    <th scope="col" className="py-2 pr-3">Fastest</th>
                    <th scope="col" className="py-2 pr-3">Leaderboard</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {best.map((b) => (
                    <tr key={b.slug}>
                      <th scope="row" className="py-2 pr-3 font-semibold">{title(b.slug)}</th>
                      <td className="py-2 pr-3 font-mono">{(b.top.score ?? 0).toLocaleString("en-AU")}</td>
                      <td className="py-2 pr-3">{b.top.rank}</td>
                      <td className="py-2 pr-3 font-mono">{b.fastest.elapsedMs ? formatDuration(b.fastest.elapsedMs) : "—"}</td>
                      <td className="py-2 pr-3">
                        <Link href={`/cases/${b.slug}/leaderboard`} className="underline">
                          {positions[b.slug] ? `#${positions[b.slug]}` : profile.leaderboardOptIn ? "View" : "Not shown"}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section aria-labelledby="owned-h" className={card}>
          <h2 id="owned-h" className={h2}>
            Your cases
          </h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {cases.map((c) => (
              <li key={c.slug} className="flex items-center justify-between rounded-md bg-surface-2 px-3 py-2">
                <Link href={`/play/${c.slug}`} className="font-semibold underline-offset-2 hover:underline">
                  {c.title}
                </Link>
                <span className="stamp text-xs">{c.free ? "Free" : "Locked"}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Purchased cases and passes will appear here once the shop opens.</p>
        </section>

        <section aria-labelledby="settings-h" id="settings" className={card}>
          <h2 id="settings-h" className={h2}>
            Settings
          </h2>
          <SettingsForm displayName={profile.displayName ?? ""} leaderboardOptIn={profile.leaderboardOptIn} marketingOptIn={profile.marketingOptIn} />
        </section>

        <section aria-labelledby="danger-h" className={`${card} border-accent/50`}>
          <h2 id="danger-h" className={h2}>
            Delete account
          </h2>
          <DeleteAccountForm />
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
