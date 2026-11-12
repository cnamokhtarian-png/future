import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings, tasks, applications, projects, checkins, transactions, notes } from "@/db/schema";
import { getWorkspace } from "@/lib/data";
import { todayKey } from "@/lib/types";

export const dynamic = "force-dynamic";
const id = z.string().min(1).max(150);
const title = z.string().trim().min(1, "عنوان را وارد کن").max(250);
const safeUrl = z.string().trim().max(2000).refine((value) => !value || /^https?:\/\/[^\s]+$/i.test(value), "لینک باید با https:// یا http:// شروع شود");
const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ساعت باید به شکل ۰۷:۳۰ باشد");
const jobStatus = z.enum(["planned", "applied", "interview", "waiting", "offer", "rejected"]);
const startDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((value) => !Number.isNaN(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value && value <= todayKey() && value >= "2000-01-01", "تاریخ شروع باید معتبر و تا امروز باشد");
const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("task.create"), title, category: z.enum(["career", "project", "health", "learning", "personal"]), minutes: z.number().int().min(1).max(480), time: clock.nullable().optional() }),
  z.object({ action: z.literal("task.toggle"), id, done: z.boolean() }),
  z.object({ action: z.literal("task.time"), id, time: clock.nullable() }),
  z.object({ action: z.literal("task.delete"), id }),
  z.object({ action: z.literal("job.create"), company: title, role: title, status: jobStatus, url: safeUrl.default(""), note: z.string().max(3000).default("") }),
  z.object({ action: z.literal("job.update"), id, status: jobStatus }),
  z.object({ action: z.literal("job.delete"), id }),
  z.object({ action: z.literal("project.step"), id, index: z.number().int().min(0).max(100), done: z.boolean() }),
  z.object({ action: z.literal("project.link"), id, link: safeUrl }),
  z.object({ action: z.literal("checkin.save"), mood: z.number().int().min(1).max(5), note: z.string().max(5000), cannabisFree: z.boolean().optional(), alcoholFree: z.boolean().optional(), walked: z.boolean().optional(), sleepHours: z.number().int().min(0).max(24).nullable().optional(), cigarettes: z.number().int().min(0).max(200).nullable().optional() }),
  z.object({ action: z.literal("finance.create"), title, amount: z.number().int().positive().max(2000000000), type: z.enum(["income", "expense", "saving"]) }),
  z.object({ action: z.literal("finance.delete"), id }),
  z.object({ action: z.literal("note.save"), id: id.optional(), title, body: z.string().trim().min(1).max(20000) }),
  z.object({ action: z.literal("note.delete"), id }),
  z.object({ action: z.literal("settings.update"), name: z.string().trim().min(1).max(40), startedOn: startDate, savingGoal: z.number().int().positive().max(2000000000), dailyTarget: z.number().int().min(1).max(20) }),
]);

export async function GET() {
  try {
    return NextResponse.json({ data: await getWorkspace() });
  } catch (error) {
    console.error("Workspace read failed", error);
    return NextResponse.json({ error: "دریافت اطلاعات ممکن نشد. دوباره تلاش کن." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    let body: unknown;
    try { body = await request.json(); }
    catch { return NextResponse.json({ error: "بدنه درخواست باید JSON معتبر باشد." }, { status: 400 }); }
    const result = schema.safeParse(body);
    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0]?.message || "اطلاعات واردشده معتبر نیست." }, { status: 400 });
    }
    const input = result.data;
    switch (input.action) {
      case "task.create":
        await db.insert(tasks).values({ id: crypto.randomUUID(), title: input.title, category: input.category, minutes: input.minutes, day: todayKey(), time: input.time || null });
        break;
      case "task.toggle":
        await db.update(tasks).set({ done: input.done }).where(eq(tasks.id, input.id));
        break;
      case "task.time":
        await db.update(tasks).set({ time: input.time }).where(eq(tasks.id, input.id));
        break;
      case "task.delete":
        await db.delete(tasks).where(eq(tasks.id, input.id));
        break;
      case "job.create":
        await db.insert(applications).values({ id: crypto.randomUUID(), company: input.company, role: input.role, status: input.status, url: input.url, note: input.note });
        break;
      case "job.update":
        await db.update(applications).set({ status: input.status }).where(eq(applications.id, input.id));
        break;
      case "job.delete":
        await db.delete(applications).where(eq(applications.id, input.id));
        break;
      case "project.step": {
        const [project] = await db.select().from(projects).where(eq(projects.id, input.id));
        if (!project || !project.steps[input.index]) return NextResponse.json({ error: "مرحله پیدا نشد." }, { status: 404 });
        const steps = project.steps.map((step, index) => index === input.index ? { ...step, done: input.done } : step);
        await db.update(projects).set({ steps }).where(eq(projects.id, input.id));
        break;
      }
      case "project.link":
        await db.update(projects).set({ link: input.link }).where(eq(projects.id, input.id));
        break;
      case "checkin.save": {
        const { action: _action, ...values } = input;
        await db.insert(checkins).values({ day: todayKey(), ...values }).onConflictDoUpdate({ target: checkins.day, set: { ...values, updatedAt: new Date().toISOString() } });
        break;
      }
      case "finance.create":
        await db.insert(transactions).values({ id: crypto.randomUUID(), title: input.title, amount: input.amount, type: input.type });
        break;
      case "finance.delete":
        await db.delete(transactions).where(eq(transactions.id, input.id));
        break;
      case "note.save": {
        const noteId = input.id || crypto.randomUUID();
        await db.insert(notes).values({ id: noteId, title: input.title, body: input.body }).onConflictDoUpdate({ target: notes.id, set: { title: input.title, body: input.body } });
        break;
      }
      case "note.delete":
        await db.delete(notes).where(eq(notes.id, input.id));
        break;
      case "settings.update":
        await db.update(settings).set({ name: input.name, startedOn: input.startedOn, savingGoal: input.savingGoal, dailyTarget: input.dailyTarget }).where(eq(settings.id, "personal"));
        break;
    }
    return NextResponse.json({ data: await getWorkspace() });
  } catch (error) {
    console.error("Workspace update failed", error);
    return NextResponse.json({ error: "تغییرات ذخیره نشد؛ اتصال را بررسی کن و دوباره تلاش کن." }, { status: 500 });
  }
}
