import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GamePlayer } from "@/components/game/GamePlayer";
import { getBriefing, getCase } from "@/lib/server/cases";
import { debugToolsEnabled } from "@/lib/server/debug";
import { loadRun, viewFor } from "@/lib/server/runs";

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
  const run = await loadRun(c);
  return <GamePlayer briefing={briefing} initialView={run ? viewFor(c, run) : null} debug={debugToolsEnabled()} />;
}
