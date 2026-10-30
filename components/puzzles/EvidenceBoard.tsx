"use client";

import { useEffect, useRef, useState } from "react";
import { Button, Feedback } from "@/components/ui/primitives";
import { play } from "@/lib/client/sfx";
import type { PuzzleProps } from "./types";
import { useSubmit } from "./useSubmit";

type Pos = { x: number; y: number };

/**
 * Corkboard with movable pins. Select one pin, then another, to tie a string
 * between them (select both again to remove it). Pins can be dragged, or moved
 * with the arrow keys. Every string is also listed as text.
 *
 * Pin positions are cosmetic and saved in this browser only.
 */
export function EvidenceBoard({ puzzle, submit, openEvidence }: PuzzleProps<"board">) {
  const nodes = puzzle.config.nodes;
  const storageKey = `fx-board-${puzzle.id}`;
  const [pos, setPos] = useState<Record<string, Pos>>(() => defaultLayout(nodes));
  const [edges, setEdges] = useState<[string, string][]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [announce, setAnnounce] = useState("");
  const boardRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: string; moved: boolean; dx: number; dy: number } | null>(null);
  const s = useSubmit(submit, "Those strings don't settle it. Check each alibi against its source.");
  const label = (id: string) => nodes.find((n) => n.id === id)?.label ?? id;

  // Restore saved layout/strings after mount (localStorage isn't available during SSR).
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(storageKey) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore of browser-only state
      if (saved?.pos) setPos((p) => ({ ...p, ...saved.pos }));
      if (Array.isArray(saved?.edges)) setEdges(saved.edges.filter((e: [string, string]) => nodes.some((n) => n.id === e[0]) && nodes.some((n) => n.id === e[1])));
    } catch {
      /* ignore */
    }
  }, [storageKey, nodes]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ pos, edges }));
    } catch {
      /* ignore */
    }
  }, [storageKey, pos, edges]);

  const same = (e: [string, string], a: string, b: string) => (e[0] === a && e[1] === b) || (e[0] === b && e[1] === a);

  const choose = (id: string) => {
    if (!selected) {
      setSelected(id);
      setAnnounce(`${label(id)} selected. Choose another pin to tie a string.`);
      return;
    }
    if (selected === id) {
      setSelected(null);
      setAnnounce("Selection cleared.");
      return;
    }
    const exists = edges.some((e) => same(e, selected, id));
    setEdges((es) => (exists ? es.filter((e) => !same(e, selected, id)) : [...es, [selected, id]]));
    setAnnounce(exists ? `String removed between ${label(selected)} and ${label(id)}.` : `String tied between ${label(selected)} and ${label(id)}.`);
    play(exists ? "type" : "stamp");
    setSelected(null);
  };

  const onPointerDown = (id: string) => (e: React.PointerEvent<HTMLButtonElement>) => {
    const box = boardRef.current!.getBoundingClientRect();
    const p = pos[id]!;
    drag.current = { id, moved: false, dx: e.clientX - (box.left + (p.x / 100) * box.width), dy: e.clientY - (box.top + (p.y / 100) * box.height) };
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const box = boardRef.current!.getBoundingClientRect();
    const x = ((e.clientX - d.dx - box.left) / box.width) * 100;
    const y = ((e.clientY - d.dy - box.top) / box.height) * 100;
    const p = pos[d.id]!;
    if (!d.moved && Math.hypot(x - p.x, y - p.y) < 1.5) return;
    d.moved = true;
    setPos((ps) => ({ ...ps, [d.id]: clamp({ x, y }) }));
  };
  const onPointerUp = (id: string) => () => {
    const d = drag.current;
    drag.current = null;
    if (d && !d.moved) choose(id);
  };
  const onKey = (id: string) => (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 8 : 2;
    const delta: Record<string, Pos> = { ArrowLeft: { x: -step, y: 0 }, ArrowRight: { x: step, y: 0 }, ArrowUp: { x: 0, y: -step }, ArrowDown: { x: 0, y: step } };
    const m = delta[e.key];
    if (m) {
      e.preventDefault();
      setPos((ps) => ({ ...ps, [id]: clamp({ x: ps[id]!.x + m.x, y: ps[id]!.y + m.y }) }));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      choose(id);
    } else if (e.key === "Escape") setSelected(null);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted">
        Select a pin, then another, to tie a string. Drag pins (or use arrow keys) to tidy the board.
      </p>
      <div
        ref={boardRef}
        onPointerMove={onPointerMove}
        className="relative w-full overflow-hidden rounded-md border-8 border-[#5b4128] shadow-inner"
        style={{
          aspectRatio: "4 / 3",
          minHeight: 320,
          background: "radial-gradient(circle at 30% 20%, #c79a63, #a87b47 70%)",
          backgroundImage:
            "radial-gradient(rgba(0,0,0,.12) 1px, transparent 1.5px), radial-gradient(circle at 30% 20%, #c79a63, #a87b47 70%)",
          backgroundSize: "7px 7px, 100% 100%",
        }}
      >
        <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
          {edges.map(([a, b]) => (
            <line
              key={`${a}~${b}`}
              x1={`${pos[a]!.x}%`}
              y1={`${pos[a]!.y}%`}
              x2={`${pos[b]!.x}%`}
              y2={`${pos[b]!.y}%`}
              stroke="#b0161a"
              strokeWidth={3}
              strokeDasharray="1 0"
              style={{ filter: "drop-shadow(0 2px 1px rgba(0,0,0,.35))" }}
            />
          ))}
        </svg>
        <ul aria-label="Pins on the board">
          {nodes.map((n) => {
            const p = pos[n.id]!;
            const isSel = selected === n.id;
            const strings = edges.filter((e) => e[0] === n.id || e[1] === n.id).length;
            return (
              <li key={n.id} className="absolute" style={{ left: `${p.x}%`, top: `${p.y}%`, transform: "translate(-50%, -12px)" }}>
                <button
                  type="button"
                  aria-pressed={isSel}
                  onPointerDown={onPointerDown(n.id)}
                  onPointerUp={onPointerUp(n.id)}
                  onKeyDown={onKey(n.id)}
                  className={`relative block w-28 cursor-grab touch-none rounded-sm px-2 pt-4 pb-2 text-left shadow-md transition sm:w-36 ${
                    n.group === "left" ? "bg-[#f6efdf] text-[#24211b]" : "bg-[#fdf6c9] text-[#24211b]"
                  } ${isSel ? "-rotate-1 ring-4 ring-uv" : ""}`}
                >
                  <span aria-hidden="true" className="absolute top-1 left-1/2 size-3 -translate-x-1/2 rounded-full bg-[#b0161a] shadow" />
                  <span className="block text-xs leading-tight font-bold sm:text-sm">{n.label}</span>
                  {n.note && <span className="block text-[10px] opacity-75 sm:text-xs">{n.note}</span>}
                  <span className="sr-only">
                    {strings} string{strings === 1 ? "" : "s"}
                  </span>
                  {isSel && <span className="mt-1 block text-[10px] font-bold tracking-wider uppercase">◆ Selected</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="sr-only" aria-live="polite">{announce}</p>

      <section aria-labelledby={`${puzzle.id}-strings`}>
        <h3 id={`${puzzle.id}-strings`} className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">
          Strings ({edges.length})
        </h3>
        {edges.length === 0 ? (
          <p className="text-sm text-muted">No strings yet.</p>
        ) : (
          <ul className="space-y-1">
            {edges.map(([a, b]) => (
              <li key={`${a}~${b}`} className="flex items-center gap-2 text-sm">
                <span aria-hidden="true">🧵</span>
                <span className="flex-1">
                  {label(a)} ⟷ {label(b)}
                </span>
                <button type="button" className="rounded px-2 py-1 text-xs underline" onClick={() => setEdges((es) => es.filter((e) => !same(e, a, b)))}>
                  Remove<span className="sr-only"> string {label(a)} to {label(b)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          {nodes
            .filter((n) => n.evidence)
            .map((n) => (
              <button key={n.id} type="button" onClick={() => openEvidence(n.evidence!)} className="text-xs text-muted underline">
                Open {n.label}
              </button>
            ))}
        </div>
      </section>

      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" disabled={s.busy || edges.length === 0} onClick={() => s.run(edges)}>
          {s.busy ? "Checking…" : "Submit the board"}
        </Button>
        <div aria-live="polite">{s.feedback && <Feedback tone={s.feedback.tone}>{s.feedback.text}</Feedback>}</div>
      </div>
    </div>
  );
}

function clamp(p: Pos): Pos {
  return { x: Math.min(88, Math.max(12, p.x)), y: Math.min(85, Math.max(5, p.y)) };
}

function defaultLayout(nodes: { id: string; group: "left" | "right" }[]): Record<string, Pos> {
  const out: Record<string, Pos> = {};
  for (const group of ["left", "right"] as const) {
    const list = nodes.filter((n) => n.group === group);
    list.forEach((n, i) => {
      out[n.id] = { x: group === "left" ? 18 : 74, y: 8 + (i * 76) / Math.max(1, list.length - 1 || 1) };
    });
  }
  return out;
}
