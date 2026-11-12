CREATE TABLE "robehrah"."journey_plan_items" (
	"id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"time" text DEFAULT '08:00' NOT NULL,
	"title" text NOT NULL,
	"kind" text DEFAULT 'general' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"dropped" boolean DEFAULT false NOT NULL,
	"origin" text DEFAULT 'user' NOT NULL,
	"base" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "journey_plan_items_day_position_idx" ON "robehrah"."journey_plan_items" USING btree ("day","position");
--> statement-breakpoint
ALTER TABLE "robehrah"."journey_transactions" ADD COLUMN IF NOT EXISTS "category" text DEFAULT 'general' NOT NULL;
--> statement-breakpoint
ALTER TABLE "robehrah"."journey_daily_reviews" ADD COLUMN IF NOT EXISTS "deltas" jsonb DEFAULT '{}'::jsonb NOT NULL;
