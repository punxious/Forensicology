"use client";

import type { PublicEvidence } from "@/lib/engine/game";
import { EvidenceTag } from "@/components/ui/primitives";
import { UVDocument } from "./UVDocument";
import { PrintFeatureList, PrintImage } from "./PrintImage";

const PATTERN_NAMES = { loop: "Loop", whorl: "Whorl", arch: "Arch" } as const;

export function EvidenceViewer({ evidence, assetUrl }: { evidence: PublicEvidence; assetUrl: (path: string) => string }) {
  return (
    <article aria-labelledby={`ev-${evidence.id}-title`} className="space-y-4">
      <header className="space-y-1">
        <EvidenceTag tag={evidence.tag} className="text-accent" />
        <h2 id={`ev-${evidence.id}-title`} tabIndex={-1} className="font-[family-name:var(--font-stamp)] text-2xl leading-tight outline-none">
          {evidence.title}
        </h2>
        <p className="text-sm text-muted">{evidence.summary}</p>
      </header>

      {evidence.image && (
        <figure className="paper overflow-hidden rounded-sm p-2">
          {/* eslint-disable-next-line @next/next/no-img-element -- gated, per-run asset route */}
          <img src={assetUrl(evidence.image)} alt={evidence.imageAlt ?? ""} className="h-auto w-full" />
        </figure>
      )}

      {(evidence.kind === "document" || evidence.kind === "image") && evidence.html && (
        <UVDocument html={evidence.html} label={evidence.title} />
      )}

      {evidence.kind === "transcript" && (
        <div className="paper doc rounded-sm px-5 py-6 sm:px-8">
          {evidence.intro && <p className="text-sm italic">{evidence.intro}</p>}
          <dl className="mt-3 space-y-3">
            {evidence.lines?.map((l) => (
              <div key={l.id} className="grid gap-1 sm:grid-cols-[8rem_1fr]">
                <dt className="font-bold uppercase">{l.speaker}:</dt>
                <dd>{l.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {evidence.kind === "print" && evidence.print && (
        <div className="space-y-3">
          <div className="paper mx-auto max-w-md rounded-sm p-3">
            <PrintImage
              print={evidence.print}
              latent={evidence.latent}
              annotate={!evidence.latent}
              showGrid
              title={
                evidence.latent
                  ? `Latent print lifted from ${evidence.subject}. ${PATTERN_NAMES[evidence.print.pattern]} pattern. Use the fingerprint puzzle to mark its features.`
                  : `Print card for ${evidence.subject}. ${PATTERN_NAMES[evidence.print.pattern]} pattern with ${evidence.print.features.length} charted features, listed below.`
              }
              className="h-auto w-full"
            />
          </div>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 font-mono text-sm">
            <dt className="text-muted">{evidence.latent ? "Lifted from" : "Subject"}</dt>
            <dd>{evidence.subject}</dd>
            <dt className="text-muted">Pattern</dt>
            <dd>{PATTERN_NAMES[evidence.print.pattern]}</dd>
            {evidence.latent && evidence.print.smudged.length > 0 && (
              <>
                <dt className="text-muted">Smudged</dt>
                <dd>{evidence.print.smudged.join(", ")}</dd>
              </>
            )}
          </dl>
          {!evidence.latent && (
            <div>
              <h3 className="mb-1 text-xs font-bold tracking-widest text-muted uppercase">Charted features</h3>
              <PrintFeatureList print={evidence.print} />
            </div>
          )}
        </div>
      )}
    </article>
  );
}
