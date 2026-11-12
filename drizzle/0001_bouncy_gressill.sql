CREATE TABLE "robehrah"."journey_program_days" (
	"day" text PRIMARY KEY NOT NULL,
	"completed" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
