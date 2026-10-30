import "server-only";
import { createHash } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { getCookieSecret, signValue, verifyValue } from "./signed";

export type AuthUser = { id: string; email: string };

/**
 * Sign-in providers:
 * - "supabase": production. Magic link email (and Google when enabled) via Supabase Auth.
 * - "dev": local development and tests only. Type any email and you're in; no
 *   email is sent. Never available on Vercel or in production builds unless
 *   FX_DEV_AUTH=1 is set for a local production test run.
 * - "none": no provider configured; sign-in is hidden.
 */
export function authMode(): "supabase" | "dev" | "none" {
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) return "supabase";
  if (process.env.VERCEL) return "none";
  if (process.env.NODE_ENV !== "production" || process.env.FX_DEV_AUTH === "1") return "dev";
  return "none";
}

export const DEV_USER_COOKIE = "fx_dev_user";

/** Supabase client bound to this request's cookies (server components, actions, route handlers). */
export async function supabaseServer() {
  const jar = await cookies();
  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // Server components can't set cookies; proxy.ts refreshes the session instead.
        }
      },
    },
  });
}

/** Stable uuid for a dev-mode email, so the same email is the same user across restarts. */
export function devUserId(email: string): string {
  const h = createHash("sha256").update(`fx-dev-user:${email.toLowerCase()}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-8${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

/** The signed-in user for this request, or null. Cached per request. */
export const getUser = cache(async (): Promise<AuthUser | null> => {
  const mode = authMode();
  if (mode === "supabase") {
    const supabase = await supabaseServer();
    // getClaims verifies the session JWT (locally with asymmetric keys, otherwise via Supabase).
    const { data } = await supabase.auth.getClaims();
    const claims = data?.claims;
    if (!claims?.sub || typeof claims.email !== "string") return null;
    return { id: claims.sub, email: claims.email };
  }
  if (mode === "dev") {
    const jar = await cookies();
    return verifyValue<AuthUser>(jar.get(DEV_USER_COOKIE)?.value, getCookieSecret());
  }
  return null;
});

export async function setDevUser(email: string): Promise<AuthUser> {
  const user = { id: devUserId(email), email: email.toLowerCase() };
  (await cookies()).set(DEV_USER_COOKIE, signValue(user, getCookieSecret()), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return user;
}

export async function signOut() {
  if (authMode() === "supabase") await (await supabaseServer()).auth.signOut();
  (await cookies()).delete(DEV_USER_COOKIE);
}

/** Removes the auth account itself (needs the service role key in Supabase mode). */
export async function deleteAuthUser(id: string) {
  if (authMode() !== "supabase") return;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is required to delete accounts.");
  const { createClient } = await import("@supabase/supabase-js");
  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, key, { auth: { persistSession: false } });
  const { error } = await admin.auth.admin.deleteUser(id);
  if (error) throw new Error(error.message);
}

/** Only allow redirects back into this site. */
export function safeNext(next: unknown, fallback = "/account"): string {
  return typeof next === "string" && /^\/(?!\/)[\w\-./?=&%#]*$/.test(next) ? next : fallback;
}
