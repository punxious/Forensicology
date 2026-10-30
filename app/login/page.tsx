import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SiteHeader } from "@/components/site/SiteHeader";
import { authMode, getUser, safeNext } from "@/lib/server/auth";
import { signInWithGoogle } from "./actions";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

type Props = { searchParams: Promise<{ next?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { next: rawNext, error } = await searchParams;
  const next = safeNext(rawNext);
  if (await getUser()) redirect(next);
  const mode = authMode();
  const google = mode === "supabase" && process.env.NEXT_PUBLIC_AUTH_GOOGLE === "1";

  return (
    <>
      <SiteHeader />
      <main id="main" className="mx-auto max-w-md px-4 py-12">
        <div className="paper rounded-sm px-6 py-8">
          <h1 className="font-[family-name:var(--font-stamp)] text-3xl text-[#221f1a]">Sign in</h1>
          <p className="mt-2 mb-6 text-sm text-[#4a4438]">
            Save your progress across devices, keep your scores and join the leaderboards. No password needed.
          </p>
          {error && (
            <p role="alert" className="mb-4 text-sm font-semibold text-[#a3271c]">
              That sign-in link didn&apos;t work. It may have expired; request a new one.
            </p>
          )}
          {mode === "none" ? (
            <p className="text-[#221f1a]">Accounts aren&apos;t switched on yet. You can still play the free case without one.</p>
          ) : (
            <div className="space-y-5 text-[#221f1a]">
              <LoginForm next={next} mode={mode} />
              {google && (
                <form action={signInWithGoogle}>
                  <input type="hidden" name="next" value={next} />
                  <button type="submit" className="inline-flex min-h-11 w-full items-center justify-center rounded-md border border-[#bfb294] bg-white px-4 font-semibold">
                    Continue with Google
                  </button>
                </form>
              )}
            </div>
          )}
          <p className="mt-6 text-xs text-[#4a4438]">
            By signing in you agree to the <Link href="/terms" className="underline">terms</Link> and{" "}
            <Link href="/privacy" className="underline">privacy policy</Link>. Progress you made without an account in this browser is kept.
          </p>
        </div>
      </main>
    </>
  );
}
