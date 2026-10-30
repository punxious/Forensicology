"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { authMode, safeNext, setDevUser, supabaseServer } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { getRateLimiter, LIMITS } from "@/lib/server/rate-limit";
import { ensureProfile } from "@/lib/server/repo/profiles";
import { claimForUser } from "@/lib/server/runs";

export type LoginState = { error?: string; sent?: string } | undefined;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

async function siteOrigin(): Promise<string> {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

async function ipKey() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}

export async function signInWithEmail(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const next = safeNext(form.get("next"));
  if (!EMAIL.test(email) || email.length > 254) return { error: "Enter a valid email address." };

  const limited = await getRateLimiter().hit(`signin:${await ipKey()}`, LIMITS.signIn.limit, LIMITS.signIn.windowMs);
  if (!limited.ok) return { error: `Too many attempts. Try again in ${Math.ceil(limited.retryAfter / 60)} min.` };

  const mode = authMode();
  if (mode === "dev") {
    const user = await setDevUser(email);
    await ensureProfile(await getDb(), user);
    await claimForUser(user.id);
    redirect(next);
  }
  if (mode === "supabase") {
    const supabase = await supabaseServer();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}`, shouldCreateUser: true },
    });
    if (error) return { error: "We couldn't send the email. Please try again shortly." };
    return { sent: email };
  }
  return { error: "Sign-in isn't available yet." };
}

export async function signInWithGoogle(form: FormData) {
  if (authMode() !== "supabase" || process.env.NEXT_PUBLIC_AUTH_GOOGLE !== "1") redirect("/login");
  const next = safeNext(form.get("next"));
  const supabase = await supabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await siteOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}
