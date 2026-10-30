"use client";

import { useActionState } from "react";
import { deleteAccount, saveSettings, type DeleteState, type SettingsState } from "./actions";

const input = "w-full rounded-md border border-line bg-surface px-3 py-2.5 text-base text-ink";

export function SettingsForm({ displayName, leaderboardOptIn, marketingOptIn }: { displayName: string; leaderboardOptIn: boolean; marketingOptIn: boolean }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSettings, undefined);
  return (
    <form action={action} className="space-y-4">
      <label className="block">
        <span className="mb-1 block text-sm font-semibold">Display name</span>
        <input name="displayName" defaultValue={displayName} maxLength={24} className={input} aria-describedby="dn-help" />
        <span id="dn-help" className="mt-1 block text-xs text-muted">
          Shown on leaderboards if you opt in. 2–24 characters; never your email.
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="leaderboardOptIn" defaultChecked={leaderboardOptIn} className="mt-1 size-5 accent-[var(--uv)]" />
        <span>
          <span className="block font-semibold">Show me on leaderboards</span>
          <span className="block text-sm text-muted">Your display name, time and rank for your first solve of each case.</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" name="marketingOptIn" defaultChecked={marketingOptIn} className="mt-1 size-5 accent-[var(--uv)]" />
        <span>
          <span className="block font-semibold">Email me when new cases open</span>
          <span className="block text-sm text-muted">Occasional; every email has an unsubscribe link.</span>
        </span>
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-md bg-accent px-5 font-semibold text-accent-ink disabled:opacity-60">
          {pending ? "Saving…" : "Save settings"}
        </button>
        <p aria-live="polite" className={`text-sm font-semibold ${state?.error ? "text-accent" : "text-ok"}`}>
          {state?.error ?? (state?.ok ? "✔ Saved." : "")}
        </p>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState<DeleteState, FormData>(deleteAccount, undefined);
  return (
    <form action={action} className="space-y-3">
      <p className="text-sm">
        Deletes your account, progress, scores and leaderboard entries permanently. Purchases (coming soon) are kept on our payment
        provider&apos;s records as the law requires.
      </p>
      <label className="block max-w-xs">
        <span className="mb-1 block text-sm font-semibold">Type DELETE to confirm</span>
        <input name="confirm" autoComplete="off" className={input} />
      </label>
      {state?.error && (
        <p role="alert" className="text-sm font-semibold text-accent">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="inline-flex min-h-11 items-center rounded-md border border-accent px-4 font-semibold text-accent">
        {pending ? "Deleting…" : "Delete my account"}
      </button>
    </form>
  );
}
