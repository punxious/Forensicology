import Link from "next/link";
import { SoundToggle, ThemeToggle, ThreeDToggle } from "@/components/game/Toggles";

/** `overlay`: transparent header that sits on top of a dark 3D hero. */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "text-[#ece6d8]" : "border-b border-line"}>
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="shrink-0 font-[family-name:var(--font-stamp)] text-lg tracking-wide sm:text-xl">
          Forensicology
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 text-sm">
          <Link href="/cases" className="rounded-md px-2 py-2 hover:bg-white/10 sm:px-3">
            Cases
          </Link>
          <Link href="/account" className="rounded-md px-2 py-2 hover:bg-white/10 sm:px-3">
            Account
          </Link>
          <ThreeDToggle />
          <span className="hidden sm:contents">
            <SoundToggle />
          </span>
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
