"use client";

/**
 * Client wrappers for the marketing scenes. The page paints with a still poster
 * of the scene (see scripts/capture-posters.mjs); the live WebGL scene loads
 * on top once activated. Nothing loads when 3D is off or WebGL is unavailable.
 */
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useMediaQuery, useReducedMotion, useThreeD } from "@/lib/client/three-pref";
import type { ShelfCase } from "./GalleryScene";

const LandingScene = dynamic(() => import("./LandingScene"), { ssr: false });
const GalleryScene = dynamic(() => import("./GalleryScene"), { ssr: false });

/**
 * When to swap the still poster for the live scene. Desktop: on the first
 * interaction, or after a few seconds. Phones: only when the player asks
 * (keeps first load light). `?scene=1` forces it on (used to capture posters).
 */
function useActivation(mobile: boolean) {
  const [active, setActive] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("scene")) {
      const id = setTimeout(() => setActive(true), 0);
      return () => clearTimeout(id);
    }
    if (mobile) return;
    const go = () => setActive(true);
    const events = ["pointermove", "pointerdown", "keydown", "scroll", "touchstart"] as const;
    events.forEach((e) => window.addEventListener(e, go, { once: true, passive: true }));
    const id = setTimeout(go, 6000);
    return () => {
      clearTimeout(id);
      events.forEach((e) => window.removeEventListener(e, go));
    };
  }, [mobile]);
  return [active, () => setActive(true)] as const;
}

function EnterButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="absolute top-16 right-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-[#b393ff] bg-[#140f22]/85 px-4 text-sm font-semibold text-white shadow-lg backdrop-blur"
    >
      <span aria-hidden="true">◆</span> View in 3D
    </button>
  );
}

export function LandingHero3D() {
  const mode = useThreeD();
  const reducedMotion = useReducedMotion();
  const mobile = useMediaQuery("(max-width: 767px)");
  const [active, activate] = useActivation(mobile);
  if (mode !== "on") return null;
  if (!active) return mobile ? <EnterButton onClick={activate} /> : null;
  return <LandingScene reducedMotion={reducedMotion} mobile={mobile} />;
}

export function GalleryShelf3D({ cases }: { cases: ShelfCase[] }) {
  const mode = useThreeD();
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const mobile = useMediaQuery("(max-width: 767px)");
  const [active, activate] = useActivation(mobile);
  if (mode !== "on") return null;
  if (!active) return mobile ? <EnterButton onClick={activate} /> : null;
  return <GalleryScene cases={cases} onOpen={(slug) => router.push(`/play/${slug}`)} reducedMotion={reducedMotion} mobile={mobile} />;
}
