import { takeHint } from "@/lib/engine/game";
import { LIMITS, rateLimiter } from "@/lib/server/rate-limit";
import { caseAndRun, json, jsonError, readGameRequest, saveRun, viewFor } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const r = await caseAndRun((await params).slug);
  if (!r.ok) return r.res;
  const limited = rateLimiter.hit(`hint:${r.s.runId}`, LIMITS.hint.limit, LIMITS.hint.windowMs);
  if (!limited.ok) return jsonError(429, "Too many requests.", { retryAfter: limited.retryAfter });

  const out = takeHint(r.c, r.s, body.body.puzzleId);
  if (!out.ok) return jsonError(out.status, out.error);
  await saveRun(out.state);
  return json({ tier: out.tier, hintHtml: out.hintHtml, view: viewFor(r.c, out.state) });
}
