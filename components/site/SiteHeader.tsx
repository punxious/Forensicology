import Link from "next/link";
import { SoundToggle, ThemeToggle, ThreeDToggle } from "@/components/game/Toggles";

/** `overlay`: transparent header that sits on top of a dark 3D hero. */
export function SiteHeader({ overlay = false }: { overlay?: boolean }) {
  return (
    <header className={overlay ? "text-[#ece6d8]" : "border-b border-line"}>
      <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
        <Link href="/" className="font-[family-name:var(--font-stamp)] text-xl tracking-wide">
          Forensicology
        </Link>
        <nav aria-label="Main" className="ml-auto flex items-center gap-0.5 text-sm">
          <Link href="/cases" className="rounded-md px-3 py-2 hover:bg-white/10">
            Cases
          </Link>
          <ThreeDToggle />
          <SoundToggle />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
