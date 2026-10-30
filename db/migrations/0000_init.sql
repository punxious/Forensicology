CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"display_name" text,
	"leaderboard_opt_in" boolean DEFAULT false NOT NULL,
	"marketing_opt_in" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "rate_limits" (
	"key" text NOT NULL,
	"window_start" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "rate_limits_key_window_start_pk" PRIMARY KEY("key","window_start")
);
--> statement-breakpoint
CREATE TABLE "runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"anon_id" uuid,
	"case_slug" text NOT NULL,
	"case_version" integer NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"finished_at" timestamp with time zone,
	"abandoned_at" timestamp with time zone,
	"solved" text[] DEFAULT '{}'::text[] NOT NULL,
	"hints" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"wrong" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"lab" text[] DEFAULT '{}'::text[] NOT NULL,
	"score" integer,
	"rank" text,
	"elapsed_ms" integer,
	"hints_used" integer,
	"first_completion" boolean DEFAULT false NOT NULL,
	"version" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "runs" ADD CONSTRAINT "runs_user_id_profiles_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."profiles"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "runs_user_case_idx" ON "runs" USING btree ("user_id","case_slug");--> statement-breakpoint
CREATE INDEX "runs_anon_case_idx" ON "runs" USING btree ("anon_id","case_slug");--> statement-breakpoint
CREATE INDEX "runs_leaderboard_idx" ON "runs" USING btree ("case_slug","first_completion","elapsed_ms");--> statement-breakpoint
CREATE UNIQUE INDEX "runs_first_completion_uq" ON "runs" USING btree ("user_id","case_slug") WHERE "runs"."first_completion";--> statement-breakpoint
-- Lock down Supabase's auto-generated REST API: RLS on, no policies, so the
-- anon/authenticated roles can read nothing. The app connects as the owner.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "runs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;
