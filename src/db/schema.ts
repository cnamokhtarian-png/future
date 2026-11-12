import { pgSchema, text, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";

export type ProjectStep = { title: string; done: boolean };

// This app stores its tables in a dedicated Postgres schema so it never
// collides with other applications sharing the same database.
export const robehrah = pgSchema("robehrah");

export const settings = robehrah.table("journey_settings", {
  id: text("id").primaryKey(),
  name: text("name").notNull().default("رفیق"),
  startedOn: text("started_on").notNull(),
  savingGoal: integer("saving_goal").notNull().default(1000000),
  lastPlannedOn: text("last_planned_on").notNull().default(""),
  dailyTarget: integer("daily_target").notNull().default(3),
});

export const tasks = robehrah.table("journey_tasks", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  category: text("category").notNull().default("personal"),
  minutes: integer("minutes").notNull().default(15),
  done: boolean("done").notNull().default(false),
  day: text("day").notNull(),
  time: text("time"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const applications = robehrah.table("journey_applications", {
  id: text("id").primaryKey(),
  company: text("company").notNull(),
  role: text("role").notNull(),
  status: text("status").notNull().default("applied"),
  url: text("url").notNull().default(""),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const projects = robehrah.table("journey_projects", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  kind: text("kind").notNull(),
  status: text("status").notNull().default("active"),
  steps: jsonb("steps").$type<ProjectStep[]>().notNull(),
  link: text("link").notNull().default(""),
  priority: integer("priority").notNull(),
});

export const checkins = robehrah.table("journey_checkins", {
  day: text("day").primaryKey(),
  mood: integer("mood").notNull(),
  note: text("note").notNull().default(""),
  cannabisFree: boolean("cannabis_free").notNull().default(false),
  alcoholFree: boolean("alcohol_free").notNull().default(false),
  walked: boolean("walked").notNull().default(false),
  sleepHours: integer("sleep_hours"),
  cigarettes: integer("cigarettes"),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

export const transactions = robehrah.table("journey_transactions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  amount: integer("amount").notNull(),
  type: text("type").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const notes = robehrah.table("journey_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
