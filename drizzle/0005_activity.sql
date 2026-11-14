CREATE TABLE IF NOT EXISTS "robehrah"."journey_activity" (
	"id" text PRIMARY KEY NOT NULL,
	"at" timestamp DEFAULT now() NOT NULL,
	"kind" text DEFAULT 'system' NOT NULL,
	"summary" text NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "journey_activity_at_idx" ON "robehrah"."journey_activity" USING btree ("at");
