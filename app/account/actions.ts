"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { deleteAuthUser, getUser, signOut } from "@/lib/server/auth";
import { getDb } from "@/lib/server/db";
import { deleteProfile, updateProfile, validateDisplayName } from "@/lib/server/repo/profiles";

export type SettingsState = { ok?: boolean; error?: string } | undefined;

export async function saveSettings(_prev: SettingsState, form: FormData): Promise<SettingsState> {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  const name = validateDisplayName(String(form.get("displayName") ?? ""));
  if (!name.ok) return { error: name.error };
  const leaderboardOptIn = form.get("leaderboardOptIn") === "on";
  if (leaderboardOptIn && !name.value) return { error: "Choose a display name to appear on leaderboards." };
  await updateProfile(await getDb(), user.id, {
    displayName: name.value,
    leaderboardOptIn,
    marketingOptIn: form.get("marketingOptIn") === "on",
  });
  revalidatePath("/account");
  return { ok: true };
}

export type DeleteState = { error?: string } | undefined;

export async function deleteAccount(_prev: DeleteState, form: FormData): Promise<DeleteState> {
  const user = await getUser();
  if (!user) redirect("/login?next=/account");
  if (String(form.get("confirm") ?? "").trim() !== "DELETE") return { error: "Type DELETE to confirm." };
  await deleteAuthUser(user.id);
  await deleteProfile(await getDb(), user.id);
  await signOut();
  redirect("/?account=deleted");
}
