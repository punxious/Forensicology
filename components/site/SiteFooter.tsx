import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-8 text-sm text-muted">
        <span className="font-[family-name:var(--font-stamp)] text-base text-ink">Forensicology</span>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/cases" className="hover:underline">Cases</Link>
          <Link href="/account" className="hover:underline">Account</Link>
          <Link href="/terms" className="hover:underline">Terms</Link>
          <Link href="/privacy" className="hover:underline">Privacy</Link>
          <Link href="/refunds" className="hover:underline">Refunds</Link>
        </nav>
        <span className="ml-auto">All cases and characters are fictional.</span>
      </div>
    </footer>
  );
}
