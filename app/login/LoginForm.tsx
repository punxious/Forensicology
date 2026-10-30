"use client";

import { useActionState } from "react";
import { signInWithEmail, type LoginState } from "./actions";

export function LoginForm({ next, mode }: { next: string; mode: "supabase" | "dev" }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(signInWithEmail, undefined);
  if (state?.sent) {
    return (
      <div role="status" className="space-y-2">
        <p className="font-semibold">Check your inbox.</p>
        <p className="text-sm">
          We sent a sign-in link to <strong>{state.sent}</strong>. It expires in an hour. You can close this tab.
        </p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="next" value={next} />
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Email</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          inputMode="email"
          className="w-full rounded-md border border-[#bfb294] bg-white px-3 py-2.5 text-base text-[#221f1a]"
        />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-[#a3271c]">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-[#a3271c] px-4 font-semibold text-white disabled:opacity-60">
        {pending ? "Sending…" : mode === "dev" ? "Sign in (local dev: no email sent)" : "Email me a sign-in link"}
      </button>
    </form>
  );
}
