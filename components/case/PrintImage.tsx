import type { MinutiaType, PrintData } from "@/lib/engine/schema";

/**
 * Procedural fingerprint. Ridges are drawn from the pattern type and seed;
 * ridge features (minutiae) are drawn as clear glyphs in their grid cells so
 * they can be compared by shape alone, with no reliance on colour.
 */

export const MINUTIA_LABELS: Record<MinutiaType, { name: string; short: string }> = {
  ending: { name: "ridge ending", short: "END" },
  bifurcation: { name: "bifurcation (fork)", short: "FORK" },
  dot: { name: "dot (island)", short: "DOT" },
  enclosure: { name: "enclosure (lake)", short: "LAKE" },
};

const SIZE = 300;
export const COLUMNS = "ABCDEFGH";

function rng(seed: number) {
  let s = seed * 9301 + 49297;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function ridgePaths(pattern: PrintData["pattern"], seed: number): string[] {
  const r = rng(seed);
  const paths: string[] = [];
  const cx = SIZE * (0.46 + r() * 0.08);
  const cy = SIZE * (0.5 + r() * 0.08);
  const wob = () => (r() - 0.5) * 4;
  if (pattern === "whorl") {
    for (let i = 1; i < 22; i++) {
      const rx = i * 7.5 + wob();
      const ry = i * 6.8 + wob();
      paths.push(`M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 1 ${cx + rx} ${cy + 2} A ${rx} ${ry} 0 1 1 ${cx - rx + 3} ${cy}`);
    }
  } else if (pattern === "loop") {
    // Nested hairpins: up one side, over the core, down the other.
    for (let i = 0; i < 28; i++) {
      const r = 5 + i * 8.5 + wob();
      const top = cy - r * 1.15;
      const lean = r * 0.25;
      paths.push(
        `M ${cx - r - lean} ${SIZE + 10} C ${cx - r} ${cy + r * 0.4}, ${cx - r} ${top}, ${cx} ${top} S ${cx + r} ${cy - r * 0.2}, ${cx + r - lean * 0.5} ${cy + r * 0.5} S ${cx + r * 0.3} ${SIZE - 10}, ${cx + r * 0.1 - lean} ${SIZE + 10}`,
      );
    }
  } else {
    for (let i = 0; i < 30; i++) {
      const y = SIZE + 20 - i * 11 + wob();
      paths.push(`M -10 ${y} Q ${cx} ${y - 60 - i * 1.2 + wob()} ${SIZE + 10} ${y + wob()}`);
    }
  }
  return paths;
}

function cellCenter(cell: string, grid: number) {
  const col = COLUMNS.indexOf(cell[0]!);
  const row = Number(cell.slice(1)) - 1;
  const step = SIZE / grid;
  return { x: col * step + step / 2, y: row * step + step / 2 };
}

function Glyph({ type, x, y, stroke }: { type: MinutiaType; x: number; y: number; stroke: string }) {
  const common = { stroke, strokeWidth: 3, fill: "none", strokeLinecap: "round" as const };
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={17} fill="var(--print-bg)" />
      {/* context ridges above and below */}
      <path d="M -16 -11 Q 0 -13 16 -11" {...common} strokeWidth={2.2} opacity={0.6} />
      <path d="M -16 11 Q 0 13 16 11" {...common} strokeWidth={2.2} opacity={0.6} />
      {type === "ending" && <path d="M -16 0 L 4 0" {...common} />}
      {type === "bifurcation" && <path d="M -16 0 L -2 0 M -2 0 Q 6 0 16 -6 M -2 0 Q 6 0 16 6" {...common} />}
      {type === "dot" && (
        <>
          <path d="M -16 0 L -8 0 M 8 0 L 16 0" {...common} strokeWidth={2.2} opacity={0.6} />
          <circle r={3.5} fill={stroke} />
        </>
      )}
      {type === "enclosure" && (
        <>
          <path d="M -16 0 L -9 0 M 9 0 L 16 0" {...common} />
          <ellipse rx={9} ry={5} {...common} />
        </>
      )}
    </g>
  );
}

type Props = {
  print: PrintData;
  /** Faint powder look for latent lifts. */
  latent?: boolean;
  /** Draw examiner annotation rings and numbers around charted features. */
  annotate?: boolean;
  showGrid?: boolean;
  title: string;
  className?: string;
};

export function PrintImage({ print, latent, annotate, showGrid, title, className = "" }: Props) {
  const { grid } = print;
  const step = SIZE / grid;
  const ink = latent ? "#3b3b3b" : "#1d1b18";
  const id = `p${print.seed}${latent ? "l" : "c"}${print.pattern}`;
  const sorted = [...print.features].sort((a, b) => a.cell.localeCompare(b.cell));
  return (
    <svg
      viewBox={`-22 -22 ${SIZE + 30} ${SIZE + 30}`}
      role="img"
      aria-label={title}
      className={className}
      style={{ ["--print-bg" as string]: latent ? "#ecebe6" : "#f7f3ea" }}
    >
      <defs>
        <clipPath id={`${id}-clip`}>
          <rect x={-6} y={-6} width={SIZE + 12} height={SIZE + 12} rx={SIZE * 0.22} />
        </clipPath>
        <filter id={`${id}-smudge`}>
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>
      <rect x={-22} y={-22} width={SIZE + 30} height={SIZE + 30} fill="var(--print-bg)" />
      <g clipPath={`url(#${id}-clip)`}>
        <g stroke={ink} strokeWidth={2.4} fill="none" opacity={latent ? 0.55 : 0.75}>
          {ridgePaths(print.pattern, print.seed).map((d, i) => (
            <path key={i} d={d} strokeDasharray={latent ? "26 3 40 2" : undefined} />
          ))}
        </g>
        {print.smudged.map((cell) => {
          const c = cellCenter(cell, grid);
          return <rect key={cell} x={c.x - step / 2 - 6} y={c.y - step / 2 - 6} width={step + 12} height={step + 12} fill="#9a9890" opacity={0.85} filter={`url(#${id}-smudge)`} />;
        })}
        {print.features.map((f) => {
          const c = cellCenter(f.cell, grid);
          return <Glyph key={f.cell} type={f.type} x={c.x} y={c.y} stroke={ink} />;
        })}
      </g>
      {annotate &&
        sorted.map((f, i) => {
          const c = cellCenter(f.cell, grid);
          return (
            <g key={f.cell}>
              <circle cx={c.x} cy={c.y} r={20} fill="none" stroke="#a3271c" strokeWidth={1.5} />
              <text x={c.x + 15} y={c.y - 15} fontSize={11} fontFamily="monospace" fill="#a3271c" fontWeight="bold">
                {i + 1}
              </text>
            </g>
          );
        })}
      {showGrid && (
        <g fontFamily="monospace" fontSize={11} fill="#555">
          {Array.from({ length: grid + 1 }, (_, i) => (
            <g key={i} stroke="#777" strokeWidth={0.6} strokeDasharray="3 3">
              <line x1={i * step} y1={0} x2={i * step} y2={SIZE} />
              <line x1={0} y1={i * step} x2={SIZE} y2={i * step} />
            </g>
          ))}
          {Array.from({ length: grid }, (_, i) => (
            <g key={`l${i}`} stroke="none">
              <text x={i * step + step / 2 - 3} y={-8}>{COLUMNS[i]}</text>
              <text x={-16} y={i * step + step / 2 + 4}>{i + 1}</text>
            </g>
          ))}
        </g>
      )}
    </svg>
  );
}

/** Text equivalent of a charted print card. */
export function PrintFeatureList({ print }: { print: PrintData }) {
  const sorted = [...print.features].sort((a, b) => a.cell.localeCompare(b.cell));
  return (
    <ol className="grid grid-cols-1 gap-x-4 gap-y-0.5 font-mono text-sm sm:grid-cols-2">
      {sorted.map((f, i) => (
        <li key={f.cell}>
          <span className="font-bold">{i + 1}.</span> {f.cell}: {MINUTIA_LABELS[f.type].name}
        </li>
      ))}
    </ol>
  );
}
