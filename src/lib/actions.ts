import "server-only";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  settings,
  tasks,
  applications,
  projects,
  checkins,
  transactions,
  notes,
  programDays,
  planItems,
  socialLogs,
  activity,
} from "@/db/schema";
import { fa, statusLabels, todayKey } from "@/lib/types";
import { programRuleIds } from "@/lib/program";
import { PLAN_KIND_IDS } from "@/lib/plan";
import { isDayClosed, closeDay, generatePlanForToday } from "@/lib/daily-review";

export const id = z.string().min(1).max(150);
export const title = z.string().trim().min(1, "عنوان را وارد کن").max(250);
export const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => !value || /^https?:\/\/[^\s]+$/i.test(value), "لینک باید با https:// یا http:// شروع شود");
export const clock = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "ساعت باید به شکل ۰۷:۳۰ باشد");
export const jobStatus = z.enum(["planned", "applied", "interview", "waiting", "offer", "rejected"]);
const planKind = z.enum(PLAN_KIND_IDS);
const planPatch = z
  .object({
    time: clock.optional(),
    title: title.optional(),
    kind: planKind.optional(),
    note: z.string().max(1000).optional(),
  })
  .refine((patch) => Object.values(patch).some((value) => value !== undefined), "حداقل یک تغییر بفرست.");
export const startDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    (value) =>
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value &&
      value <= todayKey() &&
      value >= "2000-01-01",
    "تاریخ شروع باید معتبر و تا امروز باشد",
  );

export const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("task.create"),
    title,
    category: z.enum(["career", "project", "health", "learning", "personal"]),
    minutes: z.number().int().min(1).max(480),
    time: clock.nullable().optional(),
  }),
  z.object({ action: z.literal("task.toggle"), id, done: z.boolean() }),
  z.object({ action: z.literal("task.time"), id, time: clock.nullable() }),
  z.object({ action: z.literal("task.delete"), id }),
  z.object({
    action: z.literal("job.create"),
    company: title,
    role: title,
    status: jobStatus,
    url: safeUrl.default(""),
    note: z.string().max(3000).default(""),
  }),
  z.object({ action: z.literal("job.update"), id, status: jobStatus }),
  z.object({ action: z.literal("job.delete"), id }),
  z.object({ action: z.literal("project.step"), id, index: z.number().int().min(0).max(100), done: z.boolean() }),
  z.object({ action: z.literal("project.link"), id, link: safeUrl }),
  z.object({
    action: z.literal("checkin.save"),
    mood: z.number().int().min(1).max(5),
    note: z.string().max(5000),
    cannabisFree: z.boolean().optional(),
    alcoholFree: z.boolean().optional(),
    walked: z.boolean().optional(),
    sleepHours: z.number().int().min(0).max(24).nullable().optional(),
    cigarettes: z.number().int().min(0).max(200).nullable().optional(),
  }),
  z.object({
    action: z.literal("finance.create"),
    title,
    amount: z.number().int().positive().max(2000000000),
    type: z.enum(["income", "expense", "saving"]),
    category: z.enum(["general", "cats"]).default("general"),
  }),
  z.object({
    action: z.literal("plan.add"),
    time: clock,
    title,
    kind: planKind.default("general"),
    note: z.string().max(1000).optional().default(""),
  }),
  z.object({ action: z.literal("plan.update"), id, patch: planPatch }),
  z.object({ action: z.literal("plan.toggle"), id, done: z.boolean() }),
  z.object({ action: z.literal("plan.reorder"), ids: z.array(id).min(1).max(40) }),
  z.object({ action: z.literal("plan.drop"), id, dropped: z.boolean() }),
  z.object({ action: z.literal("plan.generate") }),
  z.object({ action: z.literal("finance.delete"), id }),
  z.object({ action: z.literal("note.save"), id: id.optional(), title, body: z.string().trim().min(1).max(20000) }),
  z.object({ action: z.literal("note.delete"), id }),
  z.object({
    action: z.literal("settings.update"),
    name: z.string().trim().min(1).max(40),
    startedOn: startDate,
    savingGoal: z.number().int().positive().max(2000000000),
    dailyTarget: z.number().int().min(1).max(20),
  }),
  z.object({
    action: z.literal("program.save"),
    completed: z.array(z.string().max(50)).max(30),
    note: z.string().max(5000).optional().default(""),
  }),
  z.object({
    action: z.literal("social.log"),
    title,
    feared: z.string().trim().max(300).default(""),
    prediction: z.number().int().min(1).max(10),
    outcome: z.number().int().min(1).max(10),
    note: z.string().max(1000).optional().default(""),
  }),
  z.object({ action: z.literal("social.delete"), id }),
  z.object({ action: z.literal("day.close") }),
]);


type ActionInput = z.infer<typeof actionSchema>;

const faNumber = (value: number) => new Intl.NumberFormat("fa-IR").format(value);

const planFieldLabels: Record<string, string> = {
  time: "ساعت",
  title: "عنوان",
  kind: "نوع",
  note: "یادداشت",
};

// جمله‌ی کوتاه و خوانا برای تایم‌لاین «تغییرات من»؛ برای رکوردهای فقط‌شناسه‌ای، خودِ سطر را می‌خواند.
async function describeActivity(input: ActionInput): Promise<{ kind: string; summary: string }> {
  switch (input.action) {
    case "task.create":
      return { kind: "task", summary: `قدم تازه به امروز اضافه شد: «${input.title}»` };
    case "task.toggle": {
      const [row] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, input.id));
      const titleText = row?.title ? `«${row.title}»` : "یک قدم";
      return input.done
        ? { kind: "task", summary: `تیک خورد: ${titleText} انجام شد` }
        : { kind: "task", summary: `تیک برداشته شد: ${titleText}` };
    }
    case "task.time": {
      const [row] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, input.id));
      const titleText = row?.title ? `«${row.title}»` : "یک قدم";
      return {
        kind: "task",
        summary: input.time ? `ساعت ${titleText} شد ${input.time}` : `ساعت ${titleText} حذف شد`,
      };
    }
    case "task.delete": {
      const [row] = await db.select({ title: tasks.title }).from(tasks).where(eq(tasks.id, input.id));
      return { kind: "task", summary: `قدم «${row?.title ?? "نامشخص"}» از برنامه حذف شد` };
    }
    case "job.create":
      return { kind: "job", summary: `فرصت شغلی ثبت شد: «${input.role}» در ${input.company}` };
    case "job.update": {
      const [row] = await db.select({ company: applications.company }).from(applications).where(eq(applications.id, input.id));
      return {
        kind: "job",
        summary: `وضعیت «${row?.company ?? "فرصت"}» به «${statusLabels[input.status] || input.status}» تغییر کرد`,
      };
    }
    case "job.delete": {
      const [row] = await db
        .select({ company: applications.company })
        .from(applications)
        .where(eq(applications.id, input.id));
      return { kind: "job", summary: `فرصت «${row?.company ?? "نامشخص"}» حذف شد` };
    }
    case "project.step": {
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id));
      const stepTitle = project?.steps[input.index]?.title;
      const projectName = project?.name ?? "پروژه";
      if (!stepTitle) return { kind: "project", summary: `به‌روزرسانی مراحل «${projectName}»` };
      return {
        kind: "project",
        summary: input.done ? `مرحله «${stepTitle}» در «${projectName}» انجام شد` : `مرحله «${stepTitle}» در «${projectName}» باز شد`,
      };
    }
    case "project.link": {
      const [project] = await db.select().from(projects).where(eq(projects.id, input.id));
      return { kind: "project", summary: `لینک پروژهٔ «${project?.name ?? "نامشخص"}» به‌روز شد` };
    }
    case "checkin.save":
      return { kind: "checkin", summary: `حال امروز ثبت شد (${fa(input.mood)} از ۵)` };
    case "finance.create": {
      const label = input.type === "income" ? "درآمد" : input.type === "expense" ? "هزینه" : "پس‌انداز";
      const cats = input.category === "cats" ? " (گربه‌ها)" : "";
      return { kind: "finance", summary: `${label} ثبت شد: «${input.title}»${cats} — ${faNumber(input.amount)} تومان` };
    }
    case "finance.delete": {
      const [row] = await db
        .select({ title: transactions.title })
        .from(transactions)
        .where(eq(transactions.id, input.id));
      return { kind: "finance", summary: `«${row?.title ?? "تراکنش"}» از مالی حذف شد` };
    }
    case "note.save":
      return input.id
        ? { kind: "note", summary: `یادداشت «${input.title}» به‌روز شد` }
        : { kind: "note", summary: `یادداشت تازه: «${input.title}»` };
    case "note.delete": {
      const [row] = await db.select({ title: notes.title }).from(notes).where(eq(notes.id, input.id));
      return { kind: "note", summary: `یادداشت «${row?.title ?? "نامشخص"}» حذف شد` };
    }
    case "settings.update":
      return { kind: "settings", summary: "تنظیمات مسیر به‌روز شد" };
    case "day.close":
      return { kind: "day", summary: "امروز بسته و کارنامه‌اش نوشته شد" };
    case "plan.add":
      return { kind: "plan", summary: `به برنامه اضافه شد: «${input.title}» (ساعت ${input.time})` };
    case "plan.update": {
      const [row] = await db.select({ title: planItems.title }).from(planItems).where(eq(planItems.id, input.id));
      const changed = Object.keys(input.patch)
        .map((key) => planFieldLabels[key])
        .filter(Boolean)
        .join("، ");
      return {
        kind: "plan",
        summary: `«${row?.title ?? "فعالیت"}» ویرایش شد${changed ? ` (${changed})` : ""}`,
      };
    }
    case "plan.toggle": {
      const [row] = await db.select({ title: planItems.title }).from(planItems).where(eq(planItems.id, input.id));
      const titleText = row?.title ? `«${row.title}»` : "یک فعالیت";
      return input.done
        ? { kind: "plan", summary: `انجام شد: ${titleText}` }
        : { kind: "plan", summary: `تیک برداشته شد: ${titleText}` };
    }
    case "plan.reorder":
      return { kind: "plan", summary: "ترتیب برنامهٔ امروز جابه‌جا شد" };
    case "plan.drop": {
      const [row] = await db.select({ title: planItems.title }).from(planItems).where(eq(planItems.id, input.id));
      const titleText = row?.title ? `«${row.title}»` : "یک فعالیت";
      return input.dropped
        ? { kind: "plan", summary: `کنار گذاشته شد: ${titleText}` }
        : { kind: "plan", summary: `به برنامه برگردانده شد: ${titleText}` };
    }
    case "plan.generate":
      return { kind: "plan", summary: "مربی برنامهٔ امروز را نوشت" };
    case "social.log":
      return {
        kind: "social",
        summary: `مواجههٔ اجتماعی: «${input.title}» (ترس ${fa(input.prediction)} ← واقعیت ${fa(input.outcome)})`,
      };
    case "social.delete": {
      const [row] = await db
        .select({ title: socialLogs.title })
        .from(socialLogs)
        .where(eq(socialLogs.id, input.id));
      return { kind: "social", summary: `مواجههٔ «${row?.title ?? "نامشخص"}» حذف شد` };
    }
    case "program.save":
      return { kind: "challenge", summary: `وضعیت قوانین چالش ثبت شد (${fa(input.completed.length)} قانون تیک‌خورده)` };
  }
}

export type ActionResult = { ok: true } | { ok: false; error: string; status: number };

export async function runAction(raw: unknown): Promise<ActionResult> {
  const parsed = actionSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message || "اطلاعات واردشده معتبر نیست.", status: 400 };
  }
  const input = parsed.data;
  try {
    // Once a day is closed (هر شب ساعت ۱۲) it is locked: mutations that touch
    // the day itself are rejected. Free-floating data (notes, jobs, projects,
    // settings) is not day-scoped and stays editable.
    const dayScopedActions = new Set([
      "task.create",
      "task.toggle",
      "task.time",
      "task.delete",
      "checkin.save",
      "finance.create",
      "finance.delete",
      "program.save",
      "plan.add",
      "plan.update",
      "plan.toggle",
      "plan.reorder",
      "plan.drop",
      "plan.generate",
      "social.log",
      "social.delete",
    ]);
    if (dayScopedActions.has(input.action) && (await isDayClosed(todayKey()))) {
      return {
        ok: false,
        error: "این روز بسته و جمع‌بندی شده است؛ تغییرهای امروز تا فردا پشتیبانی نمی‌شود.",
        status: 409,
      };
    }
    switch (input.action) {
      case "task.create":
        await db
          .insert(tasks)
          .values({
            id: crypto.randomUUID(),
            title: input.title,
            category: input.category,
            minutes: input.minutes,
            day: todayKey(),
            time: input.time || null,
          });
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
        await db
          .insert(applications)
          .values({
            id: crypto.randomUUID(),
            company: input.company,
            role: input.role,
            status: input.status,
            url: input.url,
            note: input.note,
          });
        break;
      case "job.update":
        await db.update(applications).set({ status: input.status }).where(eq(applications.id, input.id));
        break;
      case "job.delete":
        await db.delete(applications).where(eq(applications.id, input.id));
        break;
      case "project.step": {
        const [project] = await db.select().from(projects).where(eq(projects.id, input.id));
        if (!project || !project.steps[input.index]) return { ok: false, error: "مرحله پیدا نشد.", status: 404 };
        const steps = project.steps.map((step, index) =>
          index === input.index ? { ...step, done: input.done } : step,
        );
        await db.update(projects).set({ steps }).where(eq(projects.id, input.id));
        break;
      }
      case "project.link":
        await db.update(projects).set({ link: input.link }).where(eq(projects.id, input.id));
        break;
      case "checkin.save": {
        const { action: _action, ...values } = input;
        await db
          .insert(checkins)
          .values({ day: todayKey(), ...values })
          .onConflictDoUpdate({ target: checkins.day, set: { ...values, updatedAt: new Date().toISOString() } });
        break;
      }
      case "finance.create":
        await db
          .insert(transactions)
          .values({
            id: crypto.randomUUID(),
            title: input.title,
            amount: input.amount,
            type: input.type,
            category: input.category,
          });
        break;
      case "finance.delete":
        await db.delete(transactions).where(eq(transactions.id, input.id));
        break;
      case "note.save": {
        const noteId = input.id || crypto.randomUUID();
        await db
          .insert(notes)
          .values({ id: noteId, title: input.title, body: input.body })
          .onConflictDoUpdate({ target: notes.id, set: { title: input.title, body: input.body } });
        break;
      }
      case "note.delete":
        await db.delete(notes).where(eq(notes.id, input.id));
        break;
      case "settings.update":
        await db
          .update(settings)
          .set({
            name: input.name,
            startedOn: input.startedOn,
            savingGoal: input.savingGoal,
            dailyTarget: input.dailyTarget,
          })
          .where(eq(settings.id, "personal"));
        break;
      case "day.close": {
        const result = await closeDay(todayKey(), { trigger: "manual", useAi: true });
        if (!result.created && result.row) {
          return { ok: false, error: "امروز قبلاً بسته و جمع‌بندی شده است.", status: 409 };
        }
        break;
      }
      case "plan.add": {
        const day = todayKey();
        const rows = await db.select({ position: planItems.position }).from(planItems).where(eq(planItems.day, day));
        const nextPosition = rows.reduce((max, row) => Math.max(max, row.position), -1) + 1;
        await db
          .insert(planItems)
          .values({
            id: crypto.randomUUID(),
            day,
            position: nextPosition,
            time: input.time,
            title: input.title,
            kind: input.kind,
            note: input.note,
            origin: "user",
          });
        break;
      }
      case "plan.update": {
        const day = todayKey();
        const [row] = await db.select().from(planItems).where(eq(planItems.id, input.id));
        if (!row || row.day !== day) return { ok: false, error: "این ردیف از برنامه پیدا نشد.", status: 404 };
        const patch: Record<string, unknown> = { ...input.patch, updatedAt: new Date().toISOString() };
        // اولین انحراف نسبت به نسخه‌ی مربی را ثبت کن تا امشب در جمع‌بندی «جایگزینی/جابه‌جایی» دیده شود.
        if (row.origin === "ai" && !row.base) {
          const changedIdentity =
            (input.patch.title !== undefined && input.patch.title !== row.title) ||
            (input.patch.kind !== undefined && input.patch.kind !== row.kind) ||
            (input.patch.time !== undefined && input.patch.time !== row.time);
          if (changedIdentity) patch.base = { time: row.time, title: row.title, kind: row.kind };
        }
        await db.update(planItems).set(patch).where(eq(planItems.id, input.id));
        break;
      }
      case "plan.toggle": {
        await db
          .update(planItems)
          .set({ done: input.done, updatedAt: new Date().toISOString() })
          .where(eq(planItems.id, input.id));
        break;
      }
      case "plan.reorder": {
        const day = todayKey();
        const rows = await db.select({ id: planItems.id }).from(planItems).where(eq(planItems.day, day));
        const allowed = new Set(rows.map((row) => row.id));
        let position = 0;
        for (const itemId of input.ids) {
          if (!allowed.has(itemId)) continue;
          await db
            .update(planItems)
            .set({ position, updatedAt: new Date().toISOString() })
            .where(eq(planItems.id, itemId));
          position += 1;
        }
        break;
      }
      case "plan.drop": {
        const day = todayKey();
        const [row] = await db.select().from(planItems).where(eq(planItems.id, input.id));
        if (!row || row.day !== day) return { ok: false, error: "این ردیف از برنامه پیدا نشد.", status: 404 };
        await db
          .update(planItems)
          .set({ dropped: input.dropped, updatedAt: new Date().toISOString() })
          .where(eq(planItems.id, input.id));
        break;
      }
      case "plan.generate": {
        const result = await generatePlanForToday();
        if (!result.created) return { ok: false, error: "امروز برنامه دارد؛ همان‌ها را ویرایش کن.", status: 409 };
        break;
      }
      case "social.log": {
        await db
          .insert(socialLogs)
          .values({
            id: crypto.randomUUID(),
            day: todayKey(),
            title: input.title,
            feared: input.feared,
            prediction: input.prediction,
            outcome: input.outcome,
            note: input.note,
          });
        break;
      }
      case "social.delete": {
        await db.delete(socialLogs).where(eq(socialLogs.id, input.id));
        break;
      }
      case "program.save": {
        const completed = [...new Set(input.completed.filter((rule) => programRuleIds.includes(rule)))];
        const day = todayKey();
        await db
          .insert(programDays)
          .values({ day, completed, note: input.note, updatedAt: new Date().toISOString() })
          .onConflictDoUpdate({
            target: programDays.day,
            set: { completed, note: input.note, updatedAt: new Date().toISOString() },
          });
        break;
      }
    }
    // دفترچه‌ی تغییرات: شکستِ ثبتِ تغییرات نباید خودِ تغییر را نشده بگیرد.
    try {
      const description = await describeActivity(input);
      await db.insert(activity).values({
        id: crypto.randomUUID(),
        kind: description.kind,
        summary: description.summary,
      });
    } catch (logError) {
      console.error("Activity log failed (the change itself was saved)", logError);
    }
    return { ok: true };
  } catch (error) {
    console.error("Workspace action failed", error);
    return { ok: false, error: "تغییرات ذخیره نشد؛ اتصال را بررسی کن و دوباره تلاش کن.", status: 500 };
  }
}
