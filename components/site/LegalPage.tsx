import type { ReactNode } from "react";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";

/** Shared layout for legal pages. Text in [brackets] is for the owner to fill in. */
export function LegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-3xl px-4 py-10">
        <p role="note" className="mb-6 rounded-md border border-warn/60 bg-warn/10 p-3 text-sm">
          <strong>Draft for review.</strong> This page is placeholder text and has not been reviewed by a lawyer. Items in [brackets] need filling in.
        </p>
        <h1 className="font-[family-name:var(--font-stamp)] text-3xl sm:text-4xl">{title}</h1>
        <p className="mt-1 text-sm text-muted">Last updated {updated}</p>
        <div className="mt-8 space-y-4 leading-relaxed [&_h2]:mt-8 [&_h2]:font-[family-name:var(--font-stamp)] [&_h2]:text-xl [&_li]:ml-5 [&_ul]:list-disc [&_ul]:space-y-1">
          {children}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
