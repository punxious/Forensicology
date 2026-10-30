import "server-only";

/** Debug/playtest tools are never available in production builds. Phase 3 moves them behind admin auth. */
export function debugToolsEnabled(): boolean {
  return process.env.NODE_ENV !== "production";
}
