import type { ButtonHTMLAttributes, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "uv";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-ink hover:brightness-110 border border-transparent",
  secondary: "bg-surface-2 text-ink border border-line hover:border-ink/40",
  ghost: "bg-transparent text-ink border border-transparent hover:bg-surface-2",
  uv: "bg-uv text-white border border-transparent hover:brightness-110",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      type="button"
      {...props}
      className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
    />
  );
}

/** Renders HTML that was sanitised at case-compile time. */
export function Html({ html, className = "" }: { html: string; className?: string }) {
  return <div className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

export function Stamp({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <span className={`stamp ${className}`}>{children}</span>;
}

export function EvidenceTag({ tag, className = "" }: { tag: string; className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-sm border border-dashed border-current px-1.5 py-0.5 font-mono text-xs tracking-wider uppercase ${className}`}
    >
      <span aria-hidden="true">◉</span>
      <span className="sr-only">Evidence </span>
      {tag}
    </span>
  );
}

/** Polite status line used under puzzles for feedback. */
export function Feedback({ tone, children }: { tone: "ok" | "error" | "info"; children: ReactNode }) {
  const style = tone === "ok" ? "text-ok" : tone === "error" ? "text-accent" : "text-muted";
  const icon = tone === "ok" ? "✔" : tone === "error" ? "✖" : "•";
  return (
    <p className={`flex items-start gap-2 text-sm font-medium ${style}`}>
      <span aria-hidden="true">{icon}</span>
      <span>{children}</span>
    </p>
  );
}
