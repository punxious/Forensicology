import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseCaseSource } from "@/lib/engine/compile";
import { ancestors, puzzleDepths, validateGraph } from "@/lib/engine/graph";
import type { CaseSource } from "@/lib/engine/schema";
import { getCase } from "@/lib/server/cases";
import { debugToolsEnabled } from "@/lib/server/debug";
import { loadRun } from "@/lib/server/runs";

export const metadata = { title: "Debug", robots: { index: false } };

type Props = { params: Promise<{ slug: string }> };

const COL = 230;
const ROW = 92;
const W = 190;
const H = 60;

/**
 * Playtest panel (development only): the unlock graph, plaintext answers read
 * from the source YAML, validation results, and your current run's progress.
 * Phase 3 moves this behind admin auth.
 */
export default async function DebugPage({ params }: Props) {
  if (!debugToolsEnabled()) notFound();
  const { slug } = await params;
  const compiled = getCase(slug);
  if (!compiled) notFound();
  const file = path.join(process.cwd(), "cases", slug, "case.yaml");
  const parsed = fs.existsSync(file) ? parseCaseSource(fs.readFileSync(file, "utf8")) : null;
  const source: CaseSource | null = parsed?.ok ? parsed.source : null;
  const run = await loadRun(compiled);
  const solved = new Set(run?.solved ?? []);

  const depths = puzzleDepths(compiled);
  const columns = new Map<number, string[]>();
  for (const p of compiled.puzzles) {
    const d = depths.get(p.id) ?? 0;
    columns.set(d, [...(columns.get(d) ?? []), p.id]);
  }
  const pos = new Map<string, { x: number; y: number }>();
  for (const [d, ids] of columns) ids.forEach((id, i) => pos.set(id, { x: 20 + d * COL, y: 20 + i * ROW }));
  const width = 40 + Math.max(...columns.keys()) * COL + W;
  const height = 40 + Math.max(...[...columns.values()].map((c) => c.length)) * ROW;
  const issues = source ? validateGraph(source) : [];

  return (
    <main id="main" className="mx-auto max-w-7xl space-y-8 px-4 py-8">
      <header className="flex flex-wrap items-baseline gap-4">
        <h1 className="font-[family-name:var(--font-stamp)] text-3xl">Debug: {compiled.title}</h1>
        <span className="font-mono text-xs text-muted">
          v{compiled.version} · content {compiled.contentHash}
        </span>
        <Link href={`/play/${slug}`} className="ml-auto underline">
          Open player →
        </Link>
      </header>

      <section aria-labelledby="graph-h">
        <h2 id="graph-h" className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
          Unlock graph {run ? `(your run: ${solved.size}/${compiled.puzzles.length} solved)` : "(no run in this browser)"}
        </h2>
        <div className="overflow-x-auto rounded-md border border-line bg-surface p-2">
          <svg width={width} height={height} role="img" aria-label="Puzzle unlock graph. The table below lists the same information.">
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="10" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0 0 L10 5 L0 10 z" fill="currentColor" />
              </marker>
            </defs>
            {compiled.puzzles.flatMap((p) =>
              p.requires.map((r) => {
                const a = pos.get(r)!;
                const b = pos.get(p.id)!;
                return (
                  <path
                    key={`${r}-${p.id}`}
                    d={`M ${a.x + W} ${a.y + H / 2} C ${a.x + W + 30} ${a.y + H / 2}, ${b.x - 30} ${b.y + H / 2}, ${b.x} ${b.y + H / 2}`}
                    fill="none"
                    stroke="currentColor"
                    strokeOpacity={0.5}
                    markerEnd="url(#arrow)"
                    className="text-muted"
                  />
                );
              }),
            )}
            {compiled.puzzles.map((p) => {
              const { x, y } = pos.get(p.id)!;
              const done = solved.has(p.id);
              const available = p.requires.every((r) => solved.has(r));
              return (
                <g key={p.id} transform={`translate(${x} ${y})`}>
                  <rect
                    width={W}
                    height={H}
                    rx={6}
                    fill={done ? "var(--surface-2)" : "var(--surface)"}
                    stroke={available && !done ? "var(--uv)" : "var(--line)"}
                    strokeWidth={available && !done ? 3 : 1.5}
                    strokeDasharray={done ? undefined : available ? undefined : "5 4"}
                  />
                  <text x={10} y={22} fontSize={13} fontWeight="bold" fill="var(--ink)">
                    {done ? "✔ " : available ? "▶ " : "🔒 "}
                    {p.title.length > 22 ? p.title.slice(0, 21) + "…" : p.title}
                  </text>
                  <text x={10} y={42} fontSize={11} fill="var(--muted)" fontFamily="monospace">
                    {p.type} · +{p.unlocks.evidence.length} evidence
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        <p className="mt-1 text-xs text-muted">✔ solved · ▶ available (solid violet border) · 🔒 locked (dashed border)</p>
      </section>

      <section aria-labelledby="issues-h">
        <h2 id="issues-h" className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
          Validation
        </h2>
        {!source ? (
          <p className="text-accent">Source YAML not found or invalid; showing compiled data only.</p>
        ) : issues.length === 0 ? (
          <p className="text-ok">✔ No issues.</p>
        ) : (
          <ul className="list-disc pl-5">
            {issues.map((i) => (
              <li key={i.message} className={i.level === "error" ? "text-accent" : "text-warn"}>
                {i.level.toUpperCase()}: {i.message}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="table-h">
        <h2 id="table-h" className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
          Puzzles and answers
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-line text-xs uppercase">
              <tr>
                <th className="p-2">Puzzle</th>
                <th className="p-2">Requires</th>
                <th className="p-2">Unlocks evidence</th>
                <th className="p-2">Answer (from YAML)</th>
                <th className="p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {compiled.puzzles.map((p) => {
                const src = source?.puzzles.find((x) => x.id === p.id);
                return (
                  <tr key={p.id} className="border-b border-line align-top">
                    <td className="p-2">
                      <strong>{p.title}</strong>
                      <br />
                      <code className="text-xs text-muted">
                        {p.id} ({p.type})
                      </code>
                    </td>
                    <td className="p-2 font-mono text-xs">{p.requires.join(", ") || "—"}</td>
                    <td className="p-2 font-mono text-xs">{p.unlocks.evidence.join(", ") || "—"}</td>
                    <td className="p-2 font-mono text-xs break-all">{src ? JSON.stringify(src.answers ?? src.answer) : "?"}</td>
                    <td className="p-2 text-xs">
                      {solved.has(p.id) ? "Solved" : p.requires.every((r) => solved.has(r)) ? "Available" : `Needs ${[...ancestors(compiled, p.id)].filter((a) => !solved.has(a)).length} more`}
                      {run?.hints[p.id] ? ` · hints ${run.hints[p.id]}` : ""}
                      {run?.wrong[p.id] ? ` · wrong ${run.wrong[p.id]}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section aria-labelledby="evidence-h">
        <h2 id="evidence-h" className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
          Evidence
        </h2>
        <ul className="grid gap-1 font-mono text-xs sm:grid-cols-2 lg:grid-cols-3">
          {compiled.evidence.map((e) => {
            const by = compiled.puzzles.find((p) => p.unlocks.evidence.includes(e.id));
            return (
              <li key={e.id}>
                <strong>{e.tag}</strong> {e.id} ← {e.initial ? "initial" : by?.id}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
