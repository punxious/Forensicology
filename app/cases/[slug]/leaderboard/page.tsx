import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { formatDuration } from "@/lib/client/format";
import { getUser } from "@/lib/server/auth";
import { getBriefing } from "@/lib/server/cases";
import { getDb } from "@/lib/server/db";
import { getProfile } from "@/lib/server/repo/profiles";
import { leaderboard, leaderboardPosition } from "@/lib/server/repo/runs";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const c = getBriefing((await params).slug);
  return c ? { title: `${c.title} leaderboard`, description: `Fastest solves of ${c.title}.` } : {};
}

export default async function LeaderboardPage({ params }: Props) {
  const { slug } = await params;
  const c = getBriefing(slug);
  if (!c) notFound();
  const db = await getDb();
  const [entries, user] = await Promise.all([leaderboard(db, slug, 50), getUser()]);
  const profile = user ? await getProfile(db, user.id) : null;
  const mine = user ? await leaderboardPosition(db, slug, user.id) : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-4xl px-4 py-10">
        <p className="font-mono text-xs tracking-widest text-muted uppercase">Leaderboard</p>
        <h1 className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">{c.title}</h1>
        <p className="mt-2 text-muted">Fastest first solves. Only each examiner&apos;s first completion counts, and only for players who opt in.</p>

        <div className="mt-4 rounded-md border border-line bg-surface p-4 text-sm" role="status">
          {!user ? (
            <>
              <Link href={`/login?next=/cases/${slug}/leaderboard`} className="font-semibold underline">Sign in</Link> to put your time on the board.
            </>
          ) : mine ? (
            <>You&apos;re <strong>#{mine}</strong> on this board.</>
          ) : !profile?.leaderboardOptIn ? (
            <>
              You&apos;re hidden from leaderboards. <Link href="/account#settings" className="font-semibold underline">Choose a display name and opt in</Link>.
            </>
          ) : (
            <>
              Solve the case to get on the board. <Link href={`/play/${slug}`} className="font-semibold underline">Play now</Link>.
            </>
          )}
        </div>

        {entries.length === 0 ? (
          <p className="mt-8 text-muted">No solves on the board yet. Be the first.</p>
        ) : (
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left">
              <caption className="sr-only">Fastest solves of {c.title}</caption>
              <thead className="border-b border-line text-xs tracking-wider text-muted uppercase">
                <tr>
                  <th scope="col" className="py-2 pr-3">#</th>
                  <th scope="col" className="py-2 pr-3">Examiner</th>
                  <th scope="col" className="py-2 pr-3">Time</th>
                  <th scope="col" className="py-2 pr-3">Score</th>
                  <th scope="col" className="py-2 pr-3">Rank</th>
                  <th scope="col" className="py-2 pr-3">Hints</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {entries.map((e) => (
                  <tr key={e.position} className={e.userId === user?.id ? "bg-uv/10 font-semibold" : undefined}>
                    <td className="py-2 pr-3 font-mono">{e.position}</td>
                    <th scope="row" className="py-2 pr-3 font-semibold">
                      {e.displayName}
                      {e.userId === user?.id && <span className="ml-2 text-xs text-uv">(you)</span>}
                    </th>
                    <td className="py-2 pr-3 font-mono">{formatDuration(e.elapsedMs)}</td>
                    <td className="py-2 pr-3 font-mono">{e.score.toLocaleString("en-AU")}</td>
                    <td className="py-2 pr-3">{e.rank}</td>
                    <td className="py-2 pr-3 font-mono">{e.hintsUsed}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
