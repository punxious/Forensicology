import { runLab } from "@/lib/engine/game";
import { getPepper } from "@/lib/engine/hash";
import { getRateLimiter, LIMITS } from "@/lib/server/rate-limit";
import { caseAndRun, json, jsonError, persist, readGameRequest, viewFor } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const r = await caseAndRun((await params).slug);
  if (!r.ok) return r.res;
  const limited = await getRateLimiter().hit(`lab:${r.s.runId}`, LIMITS.lab.limit, LIMITS.lab.windowMs);
  if (!limited.ok) return jsonError(429, "The lab is backed up. Try again shortly.", { retryAfter: limited.retryAfter });

  const { puzzleId, sample, test } = body.body;
  const out = runLab(r.c, r.s, puzzleId, { sample, test }, getPepper(), Date.now());
  if (!out.ok) return jsonError(out.status, out.error);
  const saved = await persist(r, out.state);
  if (!saved.ok) return saved.res;
  return json({
    resultHtml: out.resultHtml,
    solved: out.solved,
    unlockedEvidence: out.unlockedEvidence,
    unlockedPuzzles: out.unlockedPuzzles,
    view: viewFor(r.c, saved.s),
  });
}
