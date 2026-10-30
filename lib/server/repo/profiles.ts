import { eq } from "drizzle-orm";
import { profiles, type Profile } from "@/db/schema";
import type { Db } from "../db";

/** Creates the profile row on first sign-in; keeps the email current. */
export async function ensureProfile(db: Db, user: { id: string; email: string }): Promise<Profile> {
  const [row] = await db
    .insert(profiles)
    .values({ id: user.id, email: user.email })
    .onConflictDoUpdate({ target: profiles.id, set: { email: user.email } })
    .returning();
  return row!;
}

export async function getProfile(db: Db, id: string): Promise<Profile | null> {
  const [row] = await db.select().from(profiles).where(eq(profiles.id, id));
  return row ?? null;
}

export type ProfileUpdate = { displayName: string | null; leaderboardOptIn: boolean; marketingOptIn: boolean };

/** Display names are public, so keep them short and plain. */
export function validateDisplayName(raw: string): { ok: true; value: string | null } | { ok: false; error: string } {
  const value = raw.normalize("NFKC").replace(/\s+/g, " ").trim();
  if (!value) return { ok: true, value: null };
  if (value.length < 2 || value.length > 24) return { ok: false, error: "Display names are 2–24 characters." };
  if (!/^[\p{L}\p{N} ._'-]+$/u.test(value)) return { ok: false, error: "Use letters, numbers, spaces and . _ ' - only." };
  if (/@|https?:|www\./i.test(value)) return { ok: false, error: "Display names can't contain emails or links." };
  return { ok: true, value };
}

export async function updateProfile(db: Db, id: string, update: ProfileUpdate): Promise<Profile> {
  if (update.leaderboardOptIn && !update.displayName) throw new Error("Choose a display name to appear on leaderboards.");
  const [row] = await db.update(profiles).set(update).where(eq(profiles.id, id)).returning();
  if (!row) throw new Error("Profile not found.");
  return row;
}

/** Deletes the profile and (by cascade) every run. The auth account is removed separately. */
export async function deleteProfile(db: Db, id: string) {
  await db.delete(profiles).where(eq(profiles.id, id));
}
