import { preload } from "react-dom";

/**
 * Still image of a 3D scene, shown instantly while (or instead of) the live
 * WebGL scene loading. Regenerate with `node scripts/capture-posters.mjs`.
 */
export function ScenePoster({ name, priority = false }: { name: "landing" | "archive"; priority?: boolean }) {
  const mobile = `/posters/${name}-mobile.jpg`;
  const desktop = `/posters/${name}-desktop.jpg`;
  if (priority) {
    // It's the largest thing on screen: fetch the right variant from the <head>.
    preload(mobile, { as: "image", fetchPriority: "high", media: "(max-width: 767px)" });
    preload(desktop, { as: "image", fetchPriority: "high", media: "(min-width: 768px)" });
  }
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={mobile} />
      <img
        src={desktop}
        alt=""
        aria-hidden="true"
        width={1600}
        height={900}
        fetchPriority={priority ? "high" : "auto"}
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}
