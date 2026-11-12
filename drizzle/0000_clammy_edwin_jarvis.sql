CREATE SCHEMA "robehrah";
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_applications" (
	"id" text PRIMARY KEY NOT NULL,
	"company" text NOT NULL,
	"role" text NOT NULL,
	"status" text DEFAULT 'applied' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_checkins" (
	"day" text PRIMARY KEY NOT NULL,
	"mood" integer NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"cannabis_free" boolean DEFAULT false NOT NULL,
	"alcohol_free" boolean DEFAULT false NOT NULL,
	"walked" boolean DEFAULT false NOT NULL,
	"sleep_hours" integer,
	"cigarettes" integer,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_notes" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_projects" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"kind" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"steps" jsonb NOT NULL,
	"link" text DEFAULT '' NOT NULL,
	"priority" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_settings" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text DEFAULT 'رفیق' NOT NULL,
	"started_on" text NOT NULL,
	"saving_goal" integer DEFAULT 1000000 NOT NULL,
	"last_planned_on" text DEFAULT '' NOT NULL,
	"daily_target" integer DEFAULT 3 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_tasks" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"category" text DEFAULT 'personal' NOT NULL,
	"minutes" integer DEFAULT 15 NOT NULL,
	"done" boolean DEFAULT false NOT NULL,
	"day" text NOT NULL,
	"time" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "robehrah"."journey_transactions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"amount" integer NOT NULL,
	"type" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
