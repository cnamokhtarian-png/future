CREATE TABLE "robehrah"."journey_daily_reviews" (
	"day" text PRIMARY KEY NOT NULL,
	"percent" integer NOT NULL,
	"done" integer NOT NULL,
	"total" integer NOT NULL,
	"completed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"missed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"gratitude" text DEFAULT '' NOT NULL,
	"checkin_mood" integer,
	"checkin_sleep" integer,
	"checkin_cigarettes" integer,
	"summary" text DEFAULT '' NOT NULL,
	"focus" text DEFAULT '' NOT NULL,
	"next_plan" text DEFAULT '' NOT NULL,
	"trigger" text DEFAULT 'cron' NOT NULL,
	"ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
