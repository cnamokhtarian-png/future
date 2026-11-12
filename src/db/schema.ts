import { pgSchema, text, integer, boolean, timestamp, jsonb, index } from "drizzle-orm/pg-core";
import type { PlanDeltas, PlanItemBase } from "@/lib/plan";

export type ProjectStep = { title: string; done: boolean };
export const emptyPlanDeltas: PlanDeltas = {
  planned: 0,
  done: 0,
  added: [],
  dropped: [],
  substituted: [],
  rescheduled: [],
  notes: [],
};

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
  // "general" | "cats" — ثبت خرج‌های مراقبت از گربه‌ها بدون شمردن آن‌ها به عنوان خرج عمومی.
  category: text("category").notNull().default("general"),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

// برنامه‌ی ساعتیِ هر روز؛ تولیدِ شبانه‌ی مربی + ویرایش‌های حین روزِ خودِ کاربر.
// «base» = عکس فوریِ اصلیِ آیتم در لحظه‌ی اولین تغییر؛ مبنای تشخیصِ جایگزینی/جابه‌جایی در جمع‌بندی.
export const planItems = robehrah.table(
  "journey_plan_items",
  {
    id: text("id").primaryKey(),
    day: text("day").notNull(),
    position: integer("position").notNull().default(0),
    time: text("time").notNull().default("08:00"),
    title: text("title").notNull(),
    kind: text("kind").notNull().default("general"),
    note: text("note").notNull().default(""),
    done: boolean("done").notNull().default(false),
    dropped: boolean("dropped").notNull().default(false),
    origin: text("origin").notNull().default("user"), // "ai" | "user"
    base: jsonb("base").$type<PlanItemBase | null>(),
    createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
  },
  (table) => [index("journey_plan_items_day_position_idx").on(table.day, table.position)],
);

export const notes = robehrah.table("journey_notes", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const programDays = robehrah.table("journey_program_days", {
  day: text("day").primaryKey(),
  completed: jsonb("completed").$type<string[]>().notNull().default([]),
  note: text("note").notNull().default(""),
  updatedAt: timestamp("updated_at", { mode: "string" }).notNull().defaultNow(),
});

// دفترچه‌ی مواجهه‌ی اجتماعی — پیش‌بینی ترس در برابر واقعیت؛ مبنای کار روی اضطراب اجتماعی.
export const socialLogs = robehrah.table("journey_social_logs", {
  id: text("id").primaryKey(),
  day: text("day").notNull(),
  title: text("title").notNull(),
  feared: text("feared").notNull().default(""),
  prediction: integer("prediction").notNull().default(5),
  outcome: integer("outcome").notNull().default(5),
  note: text("note").notNull().default(""),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const dailyReviews = robehrah.table("journey_daily_reviews", {
  day: text("day").primaryKey(),
  percent: integer("percent").notNull(),
  done: integer("done").notNull(),
  total: integer("total").notNull(),
  // Effective rule ids that were completed / missed on the closed day.
  completed: jsonb("completed").$type<string[]>().notNull().default([]),
  missed: jsonb("missed").$type<string[]>().notNull().default([]),
  gratitude: text("gratitude").notNull().default(""),
  checkinMood: integer("checkin_mood"),
  checkinSleep: integer("checkin_sleep"),
  checkinCigarettes: integer("checkin_cigarettes"),
  summary: text("summary").notNull().default(""),
  focus: text("focus").notNull().default(""),
  nextPlan: text("next_plan").notNull().default(""),
  trigger: text("trigger").notNull().default("cron"),
  aiGenerated: boolean("ai_generated").notNull().default(false),
  // جمع‌بندیِ ساختاری تغییراتِ برنامه نسبت به نسخه‌ی اصلیِ مربی (جایگزینی، حذف، اضافه، یادداشت‌ها).
  deltas: jsonb("deltas").$type<PlanDeltas>().notNull().default(emptyPlanDeltas),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});
