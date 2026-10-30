/**
 * Still image of a 3D scene, shown instantly while (or instead of) the live
 * WebGL scene loading. Regenerate with `node scripts/capture-posters.mjs`.
 */
export function ScenePoster({ name, priority = false }: { name: "landing" | "archive"; priority?: boolean }) {
  return (
    <picture>
      <source media="(max-width: 767px)" srcSet={`/posters/${name}-mobile.jpg`} />
      <img
        src={`/posters/${name}-desktop.jpg`}
        alt=""
        aria-hidden="true"
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />
    </picture>
  );
}
