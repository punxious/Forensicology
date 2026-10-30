import { attempt } from "@/lib/engine/game";
import { getPepper } from "@/lib/engine/hash";
import { LIMITS, rateLimiter } from "@/lib/server/rate-limit";
import { caseAndRun, json, jsonError, readGameRequest, saveRun, viewFor } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string }> };

export async function POST(req: Request, { params }: Ctx) {
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const r = await caseAndRun((await params).slug);
  if (!r.ok) return r.res;

  const { puzzleId, answer } = body.body;
  const limited = rateLimiter.hit(`attempt:${r.s.runId}:${String(puzzleId)}`, LIMITS.attempt.limit, LIMITS.attempt.windowMs);
  if (!limited.ok) {
    return jsonError(429, `Easy, examiner. Wait ${limited.retryAfter}s before trying again.`, { retryAfter: limited.retryAfter });
  }

  const out = attempt(r.c, r.s, puzzleId, answer, getPepper(), Date.now());
  if (!out.ok) return jsonError(out.status, out.error);
  if (out.state !== r.s) await saveRun(out.state);
  return json({
    correct: out.correct,
    unlockedEvidence: out.unlockedEvidence,
    unlockedPuzzles: out.unlockedPuzzles,
    view: viewFor(r.c, out.state),
  });
}
