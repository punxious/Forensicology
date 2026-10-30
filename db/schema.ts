/**
 * Database schema (Drizzle). Applied with `pnpm db:migrate`; migrations live
 * in db/migrations and are generated with `pnpm db:generate`.
 *
 * Every table has row level security enabled with NO policies (see the
 * migrations). Supabase exposes the public schema through its REST API with
 * the anon key; with RLS on and no policies, that API can read nothing. All
 * access goes through this app's server code, which connects as the database
 * owner.
 */
import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const profiles = pgTable("profiles", {
  /** Same id as the auth user (Supabase `auth.users.id`, or the dev provider's id). */
  id: uuid("id").primaryKey(),
  email: text("email").notNull(),
  /** Shown on leaderboards when `leaderboardOptIn` is true. */
  displayName: text("display_name"),
  leaderboardOptIn: boolean("leaderboard_opt_in").notNull().default(false),
  /** Explicit consent to marketing email (Spam Act 2003). Never pre-ticked. */
  marketingOptIn: boolean("marketing_opt_in").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const runs = pgTable(
  "runs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Signed-in owner. Null for anonymous runs until claimed. */
    userId: uuid("user_id").references(() => profiles.id, { onDelete: "cascade" }),
    /** Anonymous owner id from the signed `fx_anon` cookie. */
    anonId: uuid("anon_id"),
    caseSlug: text("case_slug").notNull(),
    caseVersion: integer("case_version").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    finishedAt: timestamp("finished_at", { withTimezone: true }),
    abandonedAt: timestamp("abandoned_at", { withTimezone: true }),
    solved: text("solved").array().notNull().default(sql`'{}'::text[]`),
    hints: jsonb("hints").$type<Record<string, number>>().notNull().default({}),
    wrong: jsonb("wrong").$type<Record<string, number>>().notNull().default({}),
    lab: text("lab").array().notNull().default(sql`'{}'::text[]`),
    /** Set when finished. */
    score: integer("score"),
    rank: text("rank"),
    elapsedMs: integer("elapsed_ms"),
    hintsUsed: integer("hints_used"),
    /** The owner's first completed run of this case; only these go on leaderboards. */
    firstCompletion: boolean("first_completion").notNull().default(false),
    /** Optimistic concurrency: bumped on every write. */
    version: integer("version").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("runs_user_case_idx").on(t.userId, t.caseSlug),
    index("runs_anon_case_idx").on(t.anonId, t.caseSlug),
    index("runs_leaderboard_idx").on(t.caseSlug, t.firstCompletion, t.elapsedMs),
    // At most one leaderboard entry per player per case, even under concurrent finishes.
    uniqueIndex("runs_first_completion_uq").on(t.userId, t.caseSlug).where(sql`${t.firstCompletion}`),
  ],
);

/** Fixed-window counters for rate limiting across serverless instances. */
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.key, t.windowStart] })],
);

export type Profile = typeof profiles.$inferSelect;
export type RunRow = typeof runs.$inferSelect;

