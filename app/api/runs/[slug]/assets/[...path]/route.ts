import { unlockedEvidenceIds } from "@/lib/engine/graph";
import { caseAndRun, jsonError } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string; path: string[] }> };

/** Serves a case asset only if it belongs to evidence the player has unlocked. */
export async function GET(_req: Request, { params }: Ctx) {
  const { slug, path } = await params;
  const r = await caseAndRun(slug);
  if (!r.ok) return r.res;
  const rel = path.join("/");
  const unlocked = new Set(unlockedEvidenceIds(r.c, new Set(r.s.solved)));
  const allowed = r.c.evidence.some((e) => unlocked.has(e.id) && e.image === rel);
  const asset = r.c.assets[rel];
  if (!allowed || !asset) return jsonError(404, "Not found.");
  return new Response(Buffer.from(asset.base64, "base64"), {
    headers: {
      "Content-Type": asset.contentType,
      "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff",
      // SVGs are served as images only; block any script inside them.
      "Content-Security-Policy": "default-src 'none'; style-src 'unsafe-inline'; font-src 'self'",
    },
  });
}
