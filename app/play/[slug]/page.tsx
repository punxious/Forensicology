import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game/GamePlayer";
import { authMode, getUser } from "@/lib/server/auth";
import { getBriefing, getCase } from "@/lib/server/cases";
import { getDb } from "@/lib/server/db";
import { getProfile } from "@/lib/server/repo/profiles";
import { debugToolsEnabled } from "@/lib/server/debug";
import { loadCurrentRun, viewFor } from "@/lib/server/runs";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const b = getBriefing((await params).slug);
  return b ? { title: b.title, description: b.tagline, robots: { index: false } } : {};
}

export default async function PlayPage({ params }: Props) {
  const { slug } = await params;
  const c = getCase(slug);
  const briefing = getBriefing(slug);
  if (!c || !briefing) notFound();
  const [run, user] = await Promise.all([loadCurrentRun(c), getUser()]);
  const profile = user ? await getProfile(await getDb(), user.id) : null;
  const account = { signedIn: !!user, canSignIn: authMode() !== "none", leaderboardOptIn: !!profile?.leaderboardOptIn };
  return <GamePlayer briefing={briefing} initialView={run ? viewFor(c, run) : null} debug={debugToolsEnabled()} account={account} />;
}
