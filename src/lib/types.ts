import type { settings, tasks, applications, projects, checkins, transactions, notes, programDays, dailyReviews, planItems } from "@/db/schema";

export type Task = typeof tasks.$inferSelect;
export type Application = typeof applications.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Note = typeof notes.$inferSelect;
export type ProgramDay = typeof programDays.$inferSelect;
export type DailyReview = typeof dailyReviews.$inferSelect;
export type PlanItem = typeof planItems.$inferSelect;
export type Settings = typeof settings.$inferSelect;

export type Workspace = {
  settings: Settings;
  tasks: Task[];
  applications: Application[];
  projects: Project[];
  checkins: Checkin[];
  transactions: Transaction[];
  notes: Note[];
  programDays: ProgramDay[];
  dailyReviews: DailyReview[];
  planItems: PlanItem[];
};

export type View = "assistant" | "overview" | "roadmap" | "career" | "projects" | "progress" | "health" | "finance" | "development" | "notes" | "guide";
export type Mutation = { action: string; [key: string]: unknown };

export function todayKey() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function fa(value: number | string) {
  return typeof value === "number" ? new Intl.NumberFormat("fa-IR").format(value) : value.replace(/\d/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]);
}

export function addDaysKey(day: string, delta: number): string {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  const base = Date.UTC(year, month - 1, dayOfMonth) + delta * 86_400_000;
  return new Date(base).toISOString().slice(0, 10);
}

export function journeyDay(start: string) {
  return Math.max(1, Math.floor((Date.parse(todayKey()) - Date.parse(start)) / 86400000) + 1);
}

export function projectProgress(project: Project) {
  return project.steps.length ? Math.round(project.steps.filter((step) => step.done).length / project.steps.length * 100) : 0;
}

export const categoryLabels: Record<string, string> = {
  career: "مسیر شغلی", project: "پروژه شخصی", health: "مراقبت از خود", learning: "یادگیری", personal: "شخصی",
};

export const statusLabels: Record<string, string> = {
  planned: "برای اقدام", applied: "ارسال رزومه", interview: "مصاحبه", waiting: "منتظر پاسخ", offer: "پیشنهاد همکاری", rejected: "بسته‌شده",
};
