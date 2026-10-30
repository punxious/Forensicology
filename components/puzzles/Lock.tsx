"use client";

import { useRef, useState } from "react";
import { Button, Feedback } from "@/components/ui/primitives";
import { play } from "@/lib/client/sfx";
import type { PuzzleProps } from "./types";
import { useSubmit } from "./useSubmit";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const DIGITS = "0123456789";

export function Lock({ puzzle, submit }: PuzzleProps<"lock">) {
  const { variant, length, label, dialSize } = puzzle.config;
  const s = useSubmit(submit, "The lock doesn't budge.");
  const name = label ?? puzzle.title;
  return (
    <div className="space-y-4">
      <div key={s.shake} className={s.shake ? "fx-shake" : undefined}>
        {variant === "keypad" && <Keypad length={length} label={name} busy={s.busy} onSubmit={s.run} />}
        {(variant === "padlock" || variant === "word") && (
          <Wheels length={length} alphabet={variant === "word" ? LETTERS : DIGITS} label={name} busy={s.busy} onSubmit={s.run} />
        )}
        {variant === "dial" && <Dial length={length} size={dialSize} label={name} busy={s.busy} onSubmit={s.run} />}
      </div>
      <div aria-live="polite" className="min-h-6">
        {s.feedback && <Feedback tone={s.feedback.tone}>{s.feedback.text}</Feedback>}
      </div>
    </div>
  );
}

type LockUiProps = { length: number; label: string; busy: boolean; onSubmit: (answer: unknown) => void };

function Keypad({ length, label, busy, onSubmit }: LockUiProps) {
  const [code, setCode] = useState("");
  const press = (d: string) => {
    play("type");
    setCode((c) => (c.length < length ? c + d : c));
  };
  const back = () => setCode((c) => c.slice(0, -1));
  const enter = () => code.length === length && onSubmit(code);
  const onKey = (e: React.KeyboardEvent) => {
    if (/^[0-9]$/.test(e.key)) press(e.key);
    else if (e.key === "Backspace") back();
    else return;
    e.preventDefault();
  };
  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9"];
  return (
    <div role="group" aria-label={label} onKeyDown={onKey} className="mx-auto w-full max-w-xs rounded-xl border border-line bg-surface-2 p-4 shadow-inner">
      <output
        aria-label={`Entered ${code.length} of ${length} digits${code ? `: ${code.split("").join(" ")}` : ""}`}
        className="mb-4 flex h-14 items-center justify-center gap-3 rounded-md bg-[#0f1a12] font-mono text-3xl tracking-[0.3em] text-[#8dffb0]"
      >
        {Array.from({ length }, (_, i) => (
          <span key={i} aria-hidden="true">{code[i] ?? "_"}</span>
        ))}
      </output>
      <div className="grid grid-cols-3 gap-2">
        {keys.map((k) => (
          <KeyButton key={k} onClick={() => press(k)} label={k} />
        ))}
        <KeyButton onClick={() => setCode("")} label="CLR" aria="Clear" small />
        <KeyButton onClick={() => press("0")} label="0" />
        <KeyButton onClick={back} label="⌫" aria="Delete last digit" small />
      </div>
      <Button variant="primary" className="mt-3 w-full" onClick={enter} disabled={busy || code.length !== length}>
        {busy ? "Checking…" : "Enter"}
      </Button>
    </div>
  );
}

function KeyButton({ label, aria, onClick, small }: { label: string; aria?: string; onClick: () => void; small?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={aria ?? label}
      className={`h-14 rounded-md border border-line bg-surface font-mono ${small ? "text-sm" : "text-2xl"} shadow-sm transition active:translate-y-px hover:bg-surface-2`}
    >
      {label}
    </button>
  );
}

function Wheels({ length, alphabet, label, busy, onSubmit }: LockUiProps & { alphabet: string }) {
  const [values, setValues] = useState<number[]>(() => Array(length).fill(0));
  const refs = useRef<(HTMLDivElement | null)[]>([]);
  const isWord = alphabet === LETTERS;

  const set = (i: number, v: number) => {
    play("type");
    setValues((vals) => vals.map((x, j) => (j === i ? (v + alphabet.length) % alphabet.length : x)));
  };
  const onKey = (i: number) => (e: React.KeyboardEvent) => {
    const v = values[i]!;
    const typed = e.key.length === 1 ? alphabet.indexOf(e.key.toUpperCase()) : -1;
    if (e.key === "ArrowUp") set(i, v - 1);
    else if (e.key === "ArrowDown") set(i, v + 1);
    else if (e.key === "ArrowRight") refs.current[i + 1]?.focus();
    else if (e.key === "ArrowLeft") refs.current[i - 1]?.focus();
    else if (e.key === "Enter") onSubmit(values.map((x) => alphabet[x]).join(""));
    else if (typed >= 0) {
      set(i, typed);
      refs.current[i + 1]?.focus();
    } else return;
    e.preventDefault();
  };

  return (
    <div className="space-y-3">
      <div role="group" aria-label={`${label}: ${length} ${isWord ? "letter" : "number"} wheels`} className="flex flex-wrap justify-center gap-2">
        {values.map((v, i) => (
          <div key={i} className="flex flex-col items-center gap-1">
            <button type="button" aria-label={`Wheel ${i + 1} up`} tabIndex={-1} onClick={() => set(i, v - 1)} className="h-9 w-12 rounded-t-md border border-line bg-surface-2 text-lg">
              ▲
            </button>
            <div
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="spinbutton"
              tabIndex={0}
              aria-label={`Wheel ${i + 1} of ${length}`}
              aria-valuenow={v}
              aria-valuemin={0}
              aria-valuemax={alphabet.length - 1}
              aria-valuetext={alphabet[v]}
              onKeyDown={onKey(i)}
              className="flex h-16 w-12 items-center justify-center rounded-sm border-y-4 border-[#6b5a3a] bg-gradient-to-b from-[#c9b27a] via-[#f2e3b8] to-[#c9b27a] font-mono text-3xl font-bold text-[#2a2214] shadow-inner"
            >
              {alphabet[v]}
            </div>
            <button type="button" aria-label={`Wheel ${i + 1} down`} tabIndex={-1} onClick={() => set(i, v + 1)} className="h-9 w-12 rounded-b-md border border-line bg-surface-2 text-lg">
              ▼
            </button>
          </div>
        ))}
      </div>
      <p className="text-center text-xs text-muted">
        Tap the arrows, or focus a wheel and use ↑ ↓ (or type {isWord ? "a letter" : "a digit"}).
      </p>
      <div className="flex justify-center">
        <Button variant="primary" disabled={busy} onClick={() => onSubmit(values.map((x) => alphabet[x]).join(""))}>
          {busy ? "Checking…" : "Try the lock"}
        </Button>
      </div>
    </div>
  );
}

function Dial({ length, size, label, busy, onSubmit }: LockUiProps & { size: number }) {
  const [pos, setPos] = useState(0);
  const [seq, setSeq] = useState<number[]>([]);
  const drag = useRef<{ angle: number; pos: number } | null>(null);
  const turn = (d: number) => {
    play("type");
    setPos((p) => (p + d + size) % size);
  };
  const angleOf = (e: React.PointerEvent<SVGSVGElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    return Math.atan2(e.clientY - (box.top + box.height / 2), e.clientX - (box.left + box.width / 2));
  };
  const onKey = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 5 : 1;
    if (e.key === "ArrowRight" || e.key === "ArrowUp") turn(step);
    else if (e.key === "ArrowLeft" || e.key === "ArrowDown") turn(-step);
    else if (e.key === "Enter" || e.key === " ") setSeq((s) => (s.length < length ? [...s, pos] : s));
    else return;
    e.preventDefault();
  };
  return (
    <div className="flex flex-col items-center gap-3">
      <svg
        viewBox="-110 -110 220 220"
        className="w-56 touch-none select-none"
        role="slider"
        tabIndex={0}
        aria-label={`${label}. Arrow keys turn the dial, Enter sets the number.`}
        aria-valuemin={0}
        aria-valuemax={size - 1}
        aria-valuenow={pos}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { angle: angleOf(e), pos };
        }}
        onPointerMove={(e) => {
          if (!drag.current) return;
          const delta = angleOf(e) - drag.current.angle;
          setPos((((drag.current.pos - Math.round((delta / (2 * Math.PI)) * size)) % size) + size) % size);
        }}
        onPointerUp={() => (drag.current = null)}
      >
        <circle r={104} fill="var(--surface-2)" stroke="var(--line)" strokeWidth={3} />
        <g transform={`rotate(${(-pos * 360) / size})`} style={{ transition: "transform 80ms" }}>
          <circle r={92} fill="#1d1f24" />
          {Array.from({ length: size }, (_, i) => {
            const a = (i * 2 * Math.PI) / size - Math.PI / 2;
            const major = i % 5 === 0;
            return (
              <g key={i}>
                <line x1={Math.cos(a) * 92} y1={Math.sin(a) * 92} x2={Math.cos(a) * (major ? 78 : 84)} y2={Math.sin(a) * (major ? 78 : 84)} stroke="#e8e4da" strokeWidth={major ? 2 : 1} />
                {major && (
                  <text x={Math.cos(a) * 66} y={Math.sin(a) * 66 + 4} textAnchor="middle" fontSize={12} fill="#e8e4da" fontFamily="monospace">
                    {i}
                  </text>
                )}
              </g>
            );
          })}
          <circle r={28} fill="#2b2e35" stroke="#555" />
        </g>
        <path d="M -7 -108 L 7 -108 L 0 -94 Z" fill="var(--accent)" />
      </svg>
      <p className="font-mono text-lg" aria-hidden="true">
        At <strong>{pos}</strong>
      </p>
      <div className="flex flex-wrap justify-center gap-2">
        <Button onClick={() => turn(-1)} aria-label="Turn left one">⟲</Button>
        <Button onClick={() => turn(1)} aria-label="Turn right one">⟳</Button>
        <Button onClick={() => setSeq((s) => (s.length < length ? [...s, pos] : s))} disabled={seq.length >= length}>
          Set {pos}
        </Button>
        <Button variant="ghost" onClick={() => setSeq([])}>Clear</Button>
      </div>
      <p className="font-mono" aria-live="polite">
        Sequence: {seq.length ? seq.join(" – ") : "none"} ({seq.length}/{length})
      </p>
      <Button variant="primary" disabled={busy || seq.length !== length} onClick={() => onSubmit(seq)}>
        {busy ? "Checking…" : "Pull the handle"}
      </Button>
    </div>
  );
}
