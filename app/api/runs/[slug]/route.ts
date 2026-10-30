import { getCase } from "@/lib/server/cases";
import { canPlay } from "@/lib/server/entitlements";
import { caseAndRun, clearRun, json, jsonError, loadRun, readGameRequest, startRun, viewFor } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string }> };

/** Current run view. */
export async function GET(_req: Request, { params }: Ctx) {
  const r = await caseAndRun((await params).slug);
  if (!r.ok) return r.res;
  return json(viewFor(r.c, r.s));
}

/** Start a run (or resume the existing one). `{ restart: true }` starts over. */
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const c = getCase(slug);
  if (!c) return jsonError(404, "Unknown case.");
  if (!(await canPlay(c))) return jsonError(402, "This case needs to be unlocked first.");
  const existing = body.body.restart === true ? null : await loadRun(c);
  const s = existing ?? (await startRun(c));
  return json(viewFor(c, s), { status: existing ? 200 : 201 });
}

export async function DELETE(req: Request, { params }: Ctx) {
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  await clearRun((await params).slug);
  return new Response(null, { status: 204 });
}
