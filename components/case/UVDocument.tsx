"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/primitives";
import { play } from "@/lib/client/sfx";

const RADIUS = 80;
const STEP = 24;

/**
 * A paper document with an optional UV torch.
 *
 * Pointer/touch: the torch follows the pointer (on touch, it sits above the
 * finger so you can see what it lights up). Keyboard: focus the page and use
 * the arrow keys. "Sweep the page" passes the torch over everything for
 * players who can't aim it. Hidden ink found under the torch is listed below
 * the page in text and announced to screen readers.
 */
export function UVDocument({ html, label }: { html: string; label: string }) {
  const [uv, setUv] = useState(false);
  const [found, setFound] = useState<string[]>([]);
  const [announce, setAnnounce] = useState("");
  const [sweeping, setSweeping] = useState(false);
  const pageRef = useRef<HTMLDivElement>(null);
  const torch = useRef({ x: 120, y: 80 });
  const spotRef = useRef<HTMLDivElement>(null);
  const findingsId = useId();

  const spans = () => Array.from(pageRef.current?.querySelectorAll<HTMLElement>(".uv-ink") ?? []);

  const moveTorch = useCallback((x: number, y: number) => {
    const page = pageRef.current;
    if (!page) return;
    const box = page.getBoundingClientRect();
    torch.current = { x: Math.max(0, Math.min(box.width, x)), y: Math.max(0, Math.min(box.height, y)) };
    const { x: tx, y: ty } = torch.current;
    if (spotRef.current) {
      spotRef.current.style.background = `radial-gradient(circle ${RADIUS + 30}px at ${tx}px ${ty}px, rgba(160,120,255,0.18) 0, rgba(160,120,255,0.06) ${RADIUS}px, rgba(8,4,20,0.55) ${RADIUS + 30}px)`;
    }
    for (const span of spans()) {
      // getClientRects handles hidden ink that wraps across lines.
      const rects = Array.from(span.getClientRects());
      const first = span.getBoundingClientRect();
      span.style.setProperty("--x", `${tx + box.left - first.left}px`);
      span.style.setProperty("--y", `${ty + box.top - first.top}px`);
      span.style.setProperty("--uv-r", `${RADIUS}px`);
      const hit = rects.some((r) => {
        const cx = Math.max(r.left, Math.min(tx + box.left, r.right));
        const cy = Math.max(r.top, Math.min(ty + box.top, r.bottom));
        return Math.hypot(cx - (tx + box.left), cy - (ty + box.top)) < RADIUS * 0.45;
      });
      if (hit && span.dataset.found !== "true") {
        span.dataset.found = "true";
        span.removeAttribute("aria-hidden");
        const text = span.textContent ?? "";
        setFound((f) => (f.includes(text) ? f : [...f, text]));
        setAnnounce(`Hidden writing revealed: ${text}`);
        play("unlock");
      }
    }
  }, []);

  useEffect(() => {
    if (!uv) return;
    const box = pageRef.current?.getBoundingClientRect();
    moveTorch(box ? box.width / 2 : 120, 60);
  }, [uv, moveTorch]);

  // Restore found markers when the document re-renders.
  useEffect(() => {
    for (const span of spans()) {
      if (found.includes(span.textContent ?? "")) {
        span.dataset.found = "true";
        span.removeAttribute("aria-hidden");
      }
    }
  });

  const onPointer = (e: React.PointerEvent) => {
    if (!uv || sweeping) return;
    const box = pageRef.current!.getBoundingClientRect();
    const lift = e.pointerType === "touch" ? 70 : 0;
    moveTorch(e.clientX - box.left, e.clientY - box.top - lift);
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (!uv) return;
    const step = e.shiftKey ? STEP * 3 : STEP;
    const d: Record<string, [number, number]> = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] };
    const move = d[e.key];
    if (!move) return;
    e.preventDefault();
    moveTorch(torch.current.x + move[0], torch.current.y + move[1]);
  };

  const sweep = async () => {
    const page = pageRef.current;
    if (!page) return;
    setSweeping(true);
    setAnnounce("Sweeping the UV torch across the page.");
    const { width, height } = page.getBoundingClientRect();
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rows = Math.max(1, Math.ceil(height / (RADIUS * 0.8)));
    for (let r = 0; r <= rows; r++) {
      const y = (r / rows) * height;
      for (let i = 0; i <= 12; i++) {
        const x = r % 2 === 0 ? (i / 12) * width : width - (i / 12) * width;
        moveTorch(x, y);
        if (!reduce) await new Promise((res) => setTimeout(res, 18));
      }
    }
    setSweeping(false);
    setAnnounce((a) => (a.startsWith("Hidden") ? a : "Sweep complete."));
  };

  const toggle = () => {
    setUv((v) => !v);
    play("open");
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Button variant={uv ? "uv" : "secondary"} aria-pressed={uv} onClick={toggle}>
          <span aria-hidden="true">🔦</span> UV torch {uv ? "on" : "off"}
        </Button>
        {uv && (
          <Button onClick={sweep} disabled={sweeping}>
            {sweeping ? "Sweeping…" : "Sweep the page"}
          </Button>
        )}
        {uv && <span className="text-xs text-muted">Move the pointer, drag a finger, or focus the page and use arrow keys.</span>}
      </div>

      <div
        ref={pageRef}
        role="document"
        aria-label={uv ? `${label}, under UV light` : label}
        aria-describedby={found.length ? findingsId : undefined}
        tabIndex={uv ? 0 : -1}
        data-uv-mode={uv ? "on" : "off"}
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onKeyDown={onKey}
        className="paper doc relative overflow-hidden rounded-sm px-5 py-6 sm:px-8 sm:py-8"
        style={uv ? { touchAction: "none", cursor: "none" } : undefined}
      >
        <div dangerouslySetInnerHTML={{ __html: html }} />
        {uv && <div ref={spotRef} aria-hidden="true" className="pointer-events-none absolute inset-0" />}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {announce}
      </p>

      {found.length > 0 && (
        <div id={findingsId} className="mt-3 rounded-md border border-uv/50 bg-surface-2 p-3">
          <p className="mb-1 text-xs font-bold tracking-widest text-uv uppercase">UV findings</p>
          <ul className="space-y-1 font-mono text-sm">
            {found.map((f) => (
              <li key={f}>“{f}”</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
