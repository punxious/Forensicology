import { NextResponse } from "next/server";
import { authMode, safeNext, supabaseServer } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { ensureProfile } from "@/lib/server/repo/profiles";
import { claimForUser } from "@/lib/server/runs";

/** Supabase magic-link / OAuth return: exchange the code, create the profile, keep anonymous progress. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const next = safeNext(url.searchParams.get("next"));
  const code = url.searchParams.get("code");
  if (authMode() !== "supabase" || !code) return NextResponse.redirect(new URL("/login?error=link", url.origin));

  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error || !data.user?.email) return NextResponse.redirect(new URL(`/login?error=link&next=${encodeURIComponent(next)}`, url.origin));

  await ensureProfile(await getDb(), { id: data.user.id, email: data.user.email });
  await claimForUser(data.user.id);
  return NextResponse.redirect(new URL(next, url.origin));
}
