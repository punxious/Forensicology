import Link from "next/link";
import { SoundToggle, ThemeToggle } from "@/components/game/Toggles";

export function SiteHeader() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
        <Link href="/" className="font-[family-name:var(--font-stamp)] text-xl tracking-wide">
          Forensicology
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-1 text-sm">
          <Link href="/cases" className="rounded-md px-3 py-2 hover:bg-surface-2">
            Cases
          </Link>
          <SoundToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
