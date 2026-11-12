CREATE TABLE "robehrah"."journey_social_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"day" text NOT NULL,
	"title" text NOT NULL,
	"feared" text DEFAULT '' NOT NULL,
	"prediction" integer DEFAULT 5 NOT NULL,
	"outcome" integer DEFAULT 5 NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "journey_social_logs_day_idx" ON "robehrah"."journey_social_logs" USING btree ("day");
