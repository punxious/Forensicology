import { forceSolve } from "@/lib/engine/game";
import { debugToolsEnabled } from "@/lib/server/debug";
import { caseAndRun, json, jsonError, readGameRequest, saveRun, viewFor } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string }> };

/** Playtest helper: mark a puzzle solved. Disabled in production. */
export async function POST(req: Request, { params }: Ctx) {
  if (!debugToolsEnabled()) return jsonError(404, "Not found.");
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const r = await caseAndRun((await params).slug);
  if (!r.ok) return r.res;
  const out = forceSolve(r.c, r.s, String(body.body.puzzleId), Date.now());
  if (!out.ok) return jsonError(out.status, out.error);
  await saveRun(out.state);
  return json({ view: viewFor(r.c, out.state) });
}
