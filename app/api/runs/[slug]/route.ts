import { getCase } from "@/lib/server/cases";
import { getDb } from "@/lib/server/db";
import { canPlay } from "@/lib/server/entitlements";
import { abandonCurrentRun, createRun, findCurrentRun, stateFor } from "@/lib/server/repo/runs";
import { caseAndRun, getOwner, json, jsonError, readGameRequest, viewFor } from "@/lib/server/runs";

type Ctx = { params: Promise<{ slug: string }> };

/** Current run view. */
export async function GET(_req: Request, { params }: Ctx) {
  const r = await caseAndRun((await params).slug);
  if (!r.ok) return r.res;
  return json(viewFor(r.c, r.s));
}

/** Start a run (or resume the current one). `{ restart: true }` abandons it and starts over. */
export async function POST(req: Request, { params }: Ctx) {
  const { slug } = await params;
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const c = getCase(slug);
  if (!c) return jsonError(404, "Unknown case.");
  if (!(await canPlay(c))) return jsonError(402, "This case needs to be unlocked first.");
  const owner = (await getOwner(true))!;
  const db = await getDb();
  const now = Date.now();
  if (body.body.restart === true) await abandonCurrentRun(db, owner, slug, now);
  const existing = await findCurrentRun(db, owner, slug);
  const row = existing ?? (await createRun(db, owner, c, now));
  return json(viewFor(c, stateFor(c, row)), { status: existing ? 200 : 201 });
}

/** Abandon the current run. */
export async function DELETE(req: Request, { params }: Ctx) {
  const body = await readGameRequest(req);
  if (!body.ok) return body.res;
  const owner = await getOwner(false);
  if (owner) await abandonCurrentRun(await getDb(), owner, (await params).slug, Date.now());
  return new Response(null, { status: 204 });
}
