"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { PublicPuzzle, RunView } from "@/lib/engine/game";
import { ApiError, gameApi, type Unlocks } from "@/lib/client/api";
import { play } from "@/lib/client/sfx";
import { EvidenceViewer } from "@/components/case/EvidenceViewer";
import { Button, EvidenceTag, Html } from "@/components/ui/primitives";
import type { SubmitResult } from "@/components/puzzles/types";
import { Briefing, type BriefingInfo } from "./Briefing";
import { PuzzlePanel } from "./PuzzlePanel";
import { ResultScreen } from "./ResultScreen";
import { Timer } from "./Timer";
import { SoundToggle, ThemeToggle } from "./Toggles";

type Selection = { kind: "evidence" | "puzzle"; id: string } | null;
type Toast = { id: number; text: string; evidenceId?: string; puzzleId?: string };

export function GamePlayer({ briefing, initialView, debug }: { briefing: BriefingInfo; initialView: RunView | null; debug: boolean }) {
  const api = useMemo(() => gameApi(briefing.slug), [briefing.slug]);
  const [view, setView] = useState<RunView | null>(initialView);
  const [selection, setSelection] = useState<Selection>(null);
  const [reference, setReference] = useState<string | null>(null);
  const [opened, setOpened] = useState<string[]>([]);
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [showBriefing, setShowBriefing] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mainRef = useRef<HTMLDivElement>(null);
  const toastId = useRef(0);

  const evidence = useMemo(() => new Map((view?.evidence ?? []).map((e) => [e.id, e])), [view]);
  const seenKey = view ? `fx-seen-${view.run.runId}` : null;

  // "New" badges: remember which evidence this browser has opened during this run.
  useEffect(() => {
    if (!seenKey) return;
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- restore browser-only state for this run
      setSeen(new Set(JSON.parse(localStorage.getItem(seenKey) ?? "[]")));
    } catch {
      /* ignore */
    }
  }, [seenKey]);

  const markSeen = useCallback(
    (id: string) => {
      setSeen((s) => {
        if (s.has(id)) return s;
        const next = new Set(s).add(id);
        try {
          if (seenKey) localStorage.setItem(seenKey, JSON.stringify([...next]));
        } catch {
          /* ignore */
        }
        return next;
      });
    },
    [seenKey],
  );

  const focusMain = () => requestAnimationFrame(() => mainRef.current?.querySelector<HTMLElement>("h2")?.focus());

  const select = (s: Selection) => {
    setSelection(s);
    setReference(null);
    if (s?.kind === "evidence") markSeen(s.id);
    if (s?.kind === "puzzle") setOpened((o) => (o.includes(s.id) ? o : [...o, s.id]));
    play("open");
    focusMain();
  };

  const openEvidence = (id: string) => {
    if (selection?.kind === "puzzle") {
      setReference(id);
      markSeen(id);
      play("open");
    } else select({ kind: "evidence", id });
  };

  const toast = (t: Omit<Toast, "id">) => {
    const id = ++toastId.current;
    setToasts((ts) => [...ts.slice(-3), { ...t, id }]);
    setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== id)), 7000);
  };

  const handleError = (e: unknown): SubmitResult => {
    if (e instanceof ApiError) {
      if (e.status === 409 && /No case in progress/.test(e.message)) setView(null);
      return { status: "error", message: e.message };
    }
    return { status: "error", message: "Connection problem. Your progress is safe; try again." };
  };

  const announceUnlocks = (next: RunView, u: Unlocks, solvedTitle: string) => {
    const evTitles = u.unlockedEvidence.map((id) => next.evidence.find((e) => e.id === id)?.title).filter(Boolean);
    const pzTitles = u.unlockedPuzzles.map((id) => next.puzzles.find((p) => p.id === id)?.title).filter(Boolean);
    toast({
      text: [`Solved: ${solvedTitle}.`, evTitles.length ? `New evidence: ${evTitles.join(", ")}.` : "", pzTitles.length ? `New task: ${pzTitles.join(", ")}.` : ""]
        .filter(Boolean)
        .join(" "),
      evidenceId: u.unlockedEvidence[0],
      puzzleId: u.unlockedPuzzles[0],
    });
  };

  const submit = (puzzle: PublicPuzzle) => async (answer: unknown): Promise<SubmitResult> => {
    try {
      const r = await api.attempt(puzzle.id, answer);
      setView(r.view);
      if (r.correct) {
        play("stamp");
        if (!r.view.result) announceUnlocks(r.view, r, puzzle.title);
        return { status: "correct" };
      }
      play("wrong");
      return { status: "wrong" };
    } catch (e) {
      return handleError(e);
    }
  };

  const runLab = (puzzle: PublicPuzzle) => async (sample: string, test: string) => {
    try {
      const r = await api.lab(puzzle.id, sample, test);
      setView(r.view);
      if (r.unlockedPuzzles.length || r.unlockedEvidence.length) {
        play("stamp");
        announceUnlocks(r.view, r, puzzle.title);
      }
      return { ok: true as const, resultHtml: r.resultHtml };
    } catch (e) {
      const r = handleError(e);
      return { ok: false as const, message: r.status === "error" ? r.message : "Error" };
    }
  };

  const takeHint = async (puzzleId: string) => {
    try {
      const r = await api.hint(puzzleId);
      setView(r.view);
      return null;
    } catch (e) {
      const r = handleError(e);
      return r.status === "error" ? r.message : null;
    }
  };

  const start = async (restart = false) => {
    setStarting(true);
    setError(null);
    try {
      const v = await api.start(restart);
      setView(v);
      setSelection(null);
      setOpened([]);
      setReference(null);
      play("open");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't open the case file. Check your connection.");
    } finally {
      setStarting(false);
    }
  };

  const restart = async () => {
    setConfirmRestart(false);
    try {
      await api.abandon();
    } catch {
      /* fall through: starting again replaces the run anyway */
    }
    await start(true);
  };

  const debugSolve = async (puzzleId: string) => {
    const r = await api.debugSolve(puzzleId);
    setView(r.view);
  };

  if (!view) return <Briefing info={briefing} onStart={() => start()} starting={starting} error={error} />;
  if (view.result) return <ResultScreen view={view} onRestart={() => start(true)} />;

  const selectedPuzzle = selection?.kind === "puzzle" ? view.puzzles.find((p) => p.id === selection.id) : undefined;
  const selectedEvidence = selection?.kind === "evidence" ? evidence.get(selection.id) : undefined;
  const referenceEvidence = reference ? evidence.get(reference) : undefined;
  const unsolved = view.puzzles.filter((p) => !p.solved);
  const solved = view.puzzles.filter((p) => p.solved);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2">
          <Link href="/cases" className="font-[family-name:var(--font-stamp)] text-lg tracking-wide">
            Forensicology
          </Link>
          <span className="hidden truncate text-sm text-muted md:inline">/ {view.case.title}</span>
          <div className="ml-auto flex items-center gap-1 sm:gap-3">
            <Timer deadline={view.run.deadline} startedAt={view.run.startedAt} serverNow={view.run.serverNow} finishedAt={view.run.finishedAt} />
            <span className="hidden text-xs text-muted lg:inline">
              Hints {view.totals.hintsUsed} · Wrong {view.totals.wrongGuesses}
            </span>
            <SoundToggle />
            <ThemeToggle />
            <details className="relative">
              <summary className="flex min-h-11 min-w-11 cursor-pointer list-none items-center justify-center rounded-md px-2 hover:bg-surface-2">
                <span aria-hidden="true">☰</span>
                <span className="sr-only">Case menu</span>
              </summary>
              <div className="absolute right-0 mt-1 w-56 rounded-md border border-line bg-surface p-1 shadow-xl">
                <button type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => setShowBriefing(true)}>
                  Reread the briefing
                </button>
                <button type="button" className="block w-full rounded px-3 py-2 text-left text-sm hover:bg-surface-2" onClick={() => setConfirmRestart(true)}>
                  Restart the case…
                </button>
                {debug && (
                  <Link href={`/debug/${view.case.slug}`} className="block rounded px-3 py-2 text-sm text-uv hover:bg-surface-2">
                    Debug: unlock graph
                  </Link>
                )}
              </div>
            </details>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1600px] flex-1 lg:grid-cols-[300px_1fr] xl:grid-cols-[300px_1fr_auto]">
        {/* ---------------------------------------------------------- desk */}
        <nav aria-label="Case file" className={`border-line p-4 lg:block lg:border-r ${selection ? "hidden" : "block"}`}>
          <div className="space-y-6 lg:sticky lg:top-20">
            <section aria-labelledby="tasks-heading">
              <h2 id="tasks-heading" className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
                Tasks
              </h2>
              <ul className="space-y-1">
                {[...unsolved, ...solved].map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => select({ kind: "puzzle", id: p.id })}
                      aria-current={selection?.kind === "puzzle" && selection.id === p.id ? "true" : undefined}
                      className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition aria-[current]:bg-surface-2 aria-[current]:ring-1 aria-[current]:ring-line hover:bg-surface-2 ${p.solved ? "text-muted" : "font-semibold"}`}
                    >
                      <span aria-hidden="true" className="w-4 text-center">{p.solved ? "✔" : p.type === "accusation" ? "⚖" : "○"}</span>
                      <span className="flex-1">{p.title}</span>
                      <span className="text-[10px] tracking-wider uppercase">{p.solved ? "Solved" : "Open"}</span>
                    </button>
                  </li>
                ))}
              </ul>
              {view.lockedPuzzleCount > 0 && (
                <p className="mt-2 px-3 text-xs text-muted">
                  <span aria-hidden="true">🔒</span> {view.lockedPuzzleCount} more lead{view.lockedPuzzleCount === 1 ? "" : "s"} still sealed
                </p>
              )}
            </section>

            <section aria-labelledby="evidence-heading">
              <h2 id="evidence-heading" className="mb-2 text-xs font-bold tracking-widest text-muted uppercase">
                Evidence ({view.evidence.length})
              </h2>
              <ul className="space-y-1">
                {view.evidence.map((e) => {
                  const isNew = !seen.has(e.id);
                  const current = (selection?.kind === "evidence" && selection.id === e.id) || reference === e.id;
                  return (
                    <li key={e.id}>
                      <button
                        type="button"
                        onClick={() => openEvidence(e.id)}
                        aria-current={current ? "true" : undefined}
                        className="group flex w-full items-start gap-2 rounded-md bg-folder/40 px-3 py-2 text-left text-sm text-ink transition aria-[current]:ring-2 aria-[current]:ring-uv hover:bg-folder/70"
                      >
                        <EvidenceTag tag={e.tag} className="mt-0.5 shrink-0 text-[10px]" />
                        <span className="flex-1 leading-snug">{e.title}</span>
                        {isNew && (
                          <span className="shrink-0 rounded-sm bg-accent px-1 text-[10px] font-bold text-accent-ink">
                            NEW
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>
        </nav>

        {/* ---------------------------------------------------------- workspace */}
        <main id="main" ref={mainRef} className={`min-w-0 p-4 sm:p-6 lg:block ${selection ? "block" : "hidden"}`}>
          {selection && (
            <Button variant="ghost" className="mb-3 lg:hidden" onClick={() => setSelection(null)}>
              ← Back to case file
            </Button>
          )}
          {!selection && (
            <div className="mx-auto max-w-2xl space-y-4 py-8 text-center">
              <h2 tabIndex={-1} className="font-[family-name:var(--font-stamp)] text-2xl outline-none">
                {view.case.title}
              </h2>
              <p className="text-muted">Pick a task or open a piece of evidence from the case file.</p>
              {unsolved[0] && (
                <Button variant="primary" onClick={() => select({ kind: "puzzle", id: unsolved[0]!.id })}>
                  Start with: {unsolved[0].title}
                </Button>
              )}
            </div>
          )}
          {selectedEvidence && <EvidenceViewer key={selectedEvidence.id} evidence={selectedEvidence} assetUrl={api.assetUrl} />}
          {/* Opened puzzles stay mounted so half-finished work survives switching tabs. */}
          {opened.map((id) => {
            const p = view.puzzles.find((x) => x.id === id);
            if (!p) return null;
            return (
              <div key={id} hidden={selectedPuzzle?.id !== id}>
                <PuzzlePanel
                  puzzle={p}
                  evidence={evidence}
                  penalties={view.case.penalties}
                  submit={submit(p)}
                  runLab={runLab(p)}
                  takeHint={takeHint}
                  openEvidence={openEvidence}
                  onDebugSolve={debug ? debugSolve : undefined}
                  next={view.puzzles.filter((x) => !x.solved && x.id !== p.id)}
                  onOpenPuzzle={(pid) => select({ kind: "puzzle", id: pid })}
                />
              </div>
            );
          })}
        </main>

        {/* ---------------------------------------------------------- reference (side column on xl, sheet below) */}
        {referenceEvidence && (
          <aside
            aria-label={`Reference: ${referenceEvidence.title}`}
            className="fixed inset-0 z-40 overflow-y-auto bg-bg p-4 sm:p-6 xl:static xl:z-auto xl:w-[min(560px,38vw)] xl:border-l xl:border-line"
          >
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-bold tracking-widest text-muted uppercase">Reference</span>
              <Button variant="ghost" onClick={() => setReference(null)} autoFocus>
                Close <span aria-hidden="true">✕</span>
              </Button>
            </div>
            <EvidenceViewer key={referenceEvidence.id} evidence={referenceEvidence} assetUrl={api.assetUrl} />
          </aside>
        )}
      </div>

      {/* ---------------------------------------------------------- toasts */}
      <div aria-live="polite" className="pointer-events-none fixed right-4 bottom-4 left-4 z-50 flex flex-col items-end gap-2 sm:left-auto sm:w-96">
        {toasts.map((t) => (
          <div key={t.id} className="pointer-events-auto w-full rounded-md border border-uv/60 bg-surface p-3 text-sm shadow-2xl">
            <p>{t.text}</p>
            <div className="mt-2 flex gap-2">
              {t.evidenceId && (
                <button type="button" className="text-xs font-bold text-uv underline" onClick={() => openEvidence(t.evidenceId!)}>
                  Open new evidence
                </button>
              )}
              {t.puzzleId && (
                <button type="button" className="text-xs font-bold text-uv underline" onClick={() => select({ kind: "puzzle", id: t.puzzleId! })}>
                  Go to new task
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {showBriefing && (
        <Modal title="Briefing" onClose={() => setShowBriefing(false)}>
          <Html html={view.case.briefingHtml} className="paper doc rounded-sm px-5 py-6" />
        </Modal>
      )}
      {confirmRestart && (
        <Modal title="Restart the case?" onClose={() => setConfirmRestart(false)}>
          <p className="mb-4">Your progress, hints and timer will reset. This can&apos;t be undone.</p>
          <div className="flex gap-2">
            <Button variant="primary" onClick={restart}>
              Restart
            </Button>
            <Button onClick={() => setConfirmRestart(false)}>Keep playing</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    d?.showModal();
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="modal-title"
      className="m-auto w-[min(640px,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-5 text-ink backdrop:bg-black/60"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <h2 id="modal-title" className="font-[family-name:var(--font-stamp)] text-xl">
          {title}
        </h2>
        <Button variant="ghost" onClick={onClose} aria-label="Close">
          ✕
        </Button>
      </div>
      {children}
    </dialog>
  );
}
