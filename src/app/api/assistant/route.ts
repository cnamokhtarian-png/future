import { NextResponse } from "next/server";
import { z } from "zod";
import { getWorkspace } from "@/lib/data";
import { runAction } from "@/lib/actions";
import { callGemini, GeminiError, userInputStep, functionResultStep, type InteractionStep } from "@/lib/gemini";
import { todayKey, fa, journeyDay, type Mutation, type Workspace } from "@/lib/types";
import { programRules, programContext, effectiveCompleted, programStreak, parseTimestamp, monthKeyOf, monthLabelOf } from "@/lib/program";

export const dynamic = "force-dynamic";
export const maxDuration = 90;

const messageSchema = z.object({
  role: z.enum(["user", "model"]),
  text: z.string().trim().min(1).max(6000),
});
const bodySchema = z.object({
  messages: z.array(messageSchema).min(1).max(30),
});

const views = ["assistant", "overview", "roadmap", "career", "projects", "progress", "health", "finance", "development", "notes", "guide"] as const;

const functionDeclarations = [
  { name: "create_task", description: "ثبت یک قدم/کار جدید در برنامه امروز کاربر.", parameters: { type: "object", properties: { title: { type: "string", description: "عنوان قدم به فارسی" }, category: { type: "string", enum: ["career", "project", "health", "learning", "personal"], description: "دسته‌بندی قدم" }, minutes: { type: "number", description: "زمان تقریبی به دقیقه" }, time: { type: "string", description: "ساعت به شکل HH:MM (مثلاً 09:30) یا خالی" } }, required: ["title"] } },
  { name: "toggle_task", description: "تیک زدن یا برداشتن تیک یک قدم امروز. می‌توانی id قدم بدهی یا بخشی از عنوان آن را؛ اگر چند قدم مطابق بود، از کاربر بپرس.", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string", description: "بخشی از عنوان قدم (وقتی id نداری)" }, done: { type: "boolean", description: "اگر مشخص نیست، برعکس وضعیت فعلی اعمال می‌شود" } } } },
  { name: "delete_task", description: "حذف یک قدم. هرگز بدون تأیید کاربر انجام نمی‌شود؛ اول درخواست را بفرست تا کاربر تأیید کند.", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" } } } },
  { name: "create_transaction", description: "ثبت یک درآمد، هزینه یا پس‌انداز (همیشه به تومان).", parameters: { type: "object", properties: { type: { type: "string", enum: ["income", "expense", "saving"] }, title: { type: "string", description: "شرح تراکنش" }, amount: { type: "number", description: "مبلغ به تومان (عدد صحیح مثبت)" } }, required: ["type", "title", "amount"] } },
  { name: "delete_transaction", description: "حذف یک تراکنش. هرگز بدون تأیید کاربر انجام نمی‌شود.", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string", description: "بخشی از شرح تراکنش" } } } },
  { name: "save_checkin", description: "ثبت چک‌این امروز کاربر (حال، عادت‌ها، خواب و سیگار). فقط فیلدهایی که کاربر گفته را بفرست؛ بقیه حفظ می‌شوند.", parameters: { type: "object", properties: { mood: { type: "number", description: "۱ خسته تا ۵ عالی" }, note: { type: "string" }, cannabisFree: { type: "boolean" }, alcoholFree: { type: "boolean" }, walked: { type: "boolean" }, sleepHours: { type: "number", description: "ساعت خواب در یک شبانه‌روز" }, cigarettes: { type: "number", description: "تعداد سیگار امروز (۰ یعنی هیچ)" } } } },
  { name: "save_note", description: "ذخیره یا به‌روزرسانی یک یادداشت. بدون id، یادداشت تازه ساخته می‌شود.", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" }, body: { type: "string" } }, required: ["title", "body"] } },
  { name: "delete_note", description: "حذف یک یادداشت. هرگز بدون تأیید کاربر انجام نمی‌شود.", parameters: { type: "object", properties: { id: { type: "string" }, title: { type: "string" } } } },
  { name: "create_job_application", description: "ثبت یک فرصت شغلی/درخواستی که کاربر برایش اقدام کرده.", parameters: { type: "object", properties: { company: { type: "string" }, role: { type: "string" }, status: { type: "string", enum: ["planned", "applied", "interview", "waiting", "offer", "rejected"] }, url: { type: "string" }, note: { type: "string" } }, required: ["company", "role"] } },
  { name: "update_job_status", description: "تغییر وضعیت پیگیری یک فرصت شغلی (مثلاً از «ارسال رزومه» به «مصاحبه»).", parameters: { type: "object", properties: { id: { type: "string" }, company: { type: "string", description: "نام شرکت (وقتی id نداری)" }, role: { type: "string", description: "عنوان شغل (اختیاری)" }, status: { type: "string", enum: ["planned", "applied", "interview", "waiting", "offer", "rejected"] } }, required: ["status"] } },
  { name: "delete_job", description: "حذف یک فرصت شغلی. هرگز بدون تأیید کاربر انجام نمی‌شود.", parameters: { type: "object", properties: { id: { type: "string" }, company: { type: "string" } } } },
  { name: "toggle_project_step", description: "تیک زدن یا برداشتن تیک یکی از مراحل یک پروژه.", parameters: { type: "object", properties: { project: { type: "string", description: "نام پروژه یا id آن (مثلاً pearl)" }, step: { type: "string", description: "بخشی از عنوان مرحله یا شماره آن (از ۱)" }, done: { type: "boolean" } }, required: ["project", "done"] } },
  { name: "update_settings", description: "تغییر تنظیمات شخصی: نام نمایشی، هدف صندوق اضطراری (تومان) یا تعهد روزانه. فقط فیلدهای گفته‌شده را بفرست.", parameters: { type: "object", properties: { name: { type: "string" }, savingGoal: { type: "number" }, dailyTarget: { type: "number", description: "تعداد قدم متعهد روزانه" } } } },
  { name: "log_program_rules", description: "ثبت قوانینِ انجام‌شده‌ی «چالش ۷۵ روزه» امروز. فهرست کامل قوانین انجام‌شده امروز را بفرست (قوانین خودکار مثل clean/walk/finance خودشان از چک‌این و تراکنش‌ها حساب می‌شوند ولی بودنشان در فهرست اشکالی ندارد).", parameters: { type: "object", properties: { completed: { type: "array", items: { type: "string", enum: ["wake", "workout", "water", "read", "silent", "clean", "walk", "deepwork", "finance", "gratitude", "nutrition", "sleep"] }, description: "شناسه قوانین انجام‌شده امروز" }, note: { type: "string", description: "یک جمله درباره امروز (اختیاری)" } }, required: ["completed"] } },
  { name: "navigate_to", description: "بازکردن یک بخش سایت برای کاربر (مثلاً بعد از دیدن گزارش).", parameters: { type: "object", properties: { view: { type: "string", enum: views } }, required: ["view"] } },
];

const norm = (value: string) => value.trim().toLowerCase().replace(/ي/g, "ی").replace(/ك/g, "ک").replace(/\s+/g, " ");

function pickOne<T>(items: T[], query: string, label: (item: T) => string): { item: T } | { error: string } {
  const q = norm(query);
  const matches = items.filter((item) => norm(label(item)).includes(q));
  if (matches.length === 1) return { item: matches[0] };
  if (matches.length > 1) return { error: `چند مورد مطابق «${query}» پیدا شد: ${matches.slice(0, 5).map(label).join("، ")}. کدام را منظور داشتی؟` };
  return { error: `چیزی مطابق «${query}» پیدا نشد.` };
}

function monthKeyFromNow(offset = 0) {
  // Anchor to Tehran's today at noon UTC so the month never flips on timezone edges.
  const base = new Date(`${todayKey()}T12:00:00Z`);
  base.setUTCMonth(base.getUTCMonth() + offset);
  return monthKeyOf(base);
}

function buildContext(workspace: Workspace) {
  const today = todayKey();
  const todayTasks = workspace.tasks.filter((task) => task.day === today);
  const todayCheckin = workspace.checkins.find((entry) => entry.day === today);
  const context = programContext(workspace);
  const todayRow = workspace.programDays.find((row) => row.day === today);
  const completedToday = effectiveCompleted(todayRow?.completed || [], context);
  const challenge = programStreak(workspace);

  const monthTotals = new Map<string, { income: number; expense: number; saving: number }>();
  for (const item of workspace.transactions) {
    const parsed = parseTimestamp(item.createdAt);
    if (!parsed) continue;
    const key = monthKeyOf(parsed);
    const bucket = monthTotals.get(key) || { income: 0, expense: 0, saving: 0 };
    if (item.type === "income") bucket.income += item.amount;
    else if (item.type === "expense") bucket.expense += item.amount;
    else bucket.saving += item.amount;
    monthTotals.set(key, bucket);
  }
  const currentMonthKey = monthKeyFromNow(0);
  const currentMonth = monthTotals.get(currentMonthKey) || { income: 0, expense: 0, saving: 0 };
  const monthLines = [...monthTotals.entries()].sort().reverse().slice(0, 4).map(([key, value]) => {
    const net = value.income - value.expense - value.saving;
    return `- ${monthLabelOf(key)}: درآمد ${fa(value.income)} | هزینه ${fa(value.expense)} | پس‌انداز ${fa(value.saving)} | مانده ${fa(net)} (تومان)`;
  });

  const projects = workspace.projects.map((project) => {
    const done = project.steps.filter((step) => step.done).length;
    return `- ${project.name} (${project.id}): ${done}/${project.steps.length} مرحله — وضعیت: ${project.status === "active" ? "در اولویت" : project.status === "queued" ? "بعدی" : "آزمایشی/متوقف"}`;
  });
  const jobCounts = workspace.applications.reduce<Record<string, number>>((acc, job) => { acc[job.status] = (acc[job.status] || 0) + 1; return acc; }, {});
  const jalali = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", dateStyle: "full" }).format(new Date());

  return [
    `نام کاربر: ${workspace.settings.name}`,
    `تاریخ امروز: ${jalali} (${today}) — روز ${fa(journeyDay(workspace.settings.startedOn))} مسیر ۹۰ روزه؛ شروع: ${workspace.settings.startedOn}`,
    `تعهد روزانه: ${fa(workspace.settings.dailyTarget)} قدم | هدف صندوق اضطراری: ${fa(workspace.settings.savingGoal)} تومان`,
    ``,
    `قدم‌های امروز (${fa(todayTasks.filter((t) => t.done).length)} از ${fa(todayTasks.length)} انجام شده):`,
    ...(todayTasks.length ? todayTasks.map((task) => `- id=${task.id} | ${task.done ? "✅" : "⬜"} ${task.title} (${fa(task.minutes)} دقیقه${task.time ? `، ساعت ${task.time}` : ""})`) : ["- هنوز قدمی برای امروز ثبت نشده"]),
    ``,
    `چک‌این امروز: ${todayCheckin ? `حال ${fa(todayCheckin.mood)} از ۵${todayCheckin.sleepHours != null ? `، خواب ${fa(todayCheckin.sleepHours)} ساعت` : ""}${todayCheckin.cigarettes != null ? `، سیگار ${fa(todayCheckin.cigarettes)} نخ` : ""}${todayCheckin.cannabisFree ? "، بدون حشیش" : ""}${todayCheckin.alcoholFree ? "، بدون الکل" : ""}${todayCheckin.walked ? "، پیاده‌روی کرده" : ""}` : "ثبت نشده"}`,
    `شناسه قوانین چالش: wake=بیداری قبل ۷ صبح، workout=۴۵ دقیقه ورزش، water=۲٫۵ لیتر آب، read=۱۰ صفحه کتاب، silent=۱۰ دقیقه سکوت/ذکر، clean=بدون سیگار/الکل/مواد، walk=۱۵ دقیقه پیاده‌روی، deepwork=بلوک کار عمیق، finance=ثبت کامل دخل و خرج، gratitude=شکرگزاری شبانه، nutrition=تغذیه واقعی، sleep=خواب قبل ۱۲ شب`,
    `وضعیت چالش ۷۵ روزه امروز (${fa(completedToday.length)} از ${fa(programRules.length)} قانون): ${completedToday.length ? completedToday.join("، ") : "هنوز چیزی تیک نخورده"} | زنجیره فعلی: ${fa(challenge.streak)} روز | بهترین: ${fa(challenge.best)} روز`,,
    workspace.dailyReviews.length ? `جمع‌بندی روزهای بسته‌شدهٔ اخیر (روز به روز):\n${workspace.dailyReviews.slice(0, 3).map((review) => `- ${review.day}: ${fa(review.done)} از ${fa(review.total)} (${fa(review.percent)}٪)${review.summary ? ` — ${review.summary.slice(0, 160)}` : ""}`).join("\n")}` : `هنوز روزی بسته و جمع‌بندی نشده.`,
    ``,
    `مالی این ماه (${monthLabelOf(currentMonthKey)}): درآمد ${fa(currentMonth.income)} | هزینه ${fa(currentMonth.expense)} | پس‌انداز ${fa(currentMonth.saving)} | مانده ${fa(currentMonth.income - currentMonth.expense - currentMonth.saving)} تومان`,
    `ماه‌های اخیر:`,
    ...(monthLines.length ? monthLines : ["- هنوز تراکنشی ثبت نشده"]),
    ``,
    `پروژه‌ها:`,
    ...projects,
    ``,
    `فرصت‌های شغلی: ${Object.entries(jobCounts).map(([status, count]) => `${status}: ${fa(count)}`).join("، ") || "ثبت نشده"} | یادداشت‌ها: ${fa(workspace.notes.length)}`,
    `تراکنش امروز: ${fa(context.todayTransactions.length)} مورد`,
  ].join("\n");
}

function buildSystemPrompt(context: string) {
  return `تو «روبه‌راه» هستی؛ دستیار، مدیر و همدم هوشمندِ همین وب‌سایتِ شخصی. کاربر به تو اعتماد کرده و اختیار تغییر واقعی داری.

شخصیت و لحن:
- فارسی روان، گرم، محترمانه و صمیمی؛ مثل یک دوست کاربلد، نه یک ربات رسمی و نه یک روانشناس خشک.
- کوتاه و قابل اقدام بنویس؛ پرحرفی نکن. در هر پیام حداکثر یک سؤال بپرس.
- داده‌های کاربر را از «وضعیت امروز» بخوان و هرگز عددی را حدس نزن. اگر اطلاعات نداری، بپرس.

رفتار تعاملی (مهم):
- فقط منتظر دستور نمان. بعد از هر اقدام، اگر جای کاری است پیشنهاد بده؛ اگر چیزی مبهم است، یک سؤال دقیق بپرس.
- وقتی کاربر حالش را می‌گوید، با همدلی جواب بده و بعد قدم ثبت کن. اول گوش بده، بعد اقدام کن.
- اگر کاربر خیلی کلی گفت «کمکم کن»، خودت حدس بزن مهم‌ترین‌ها چیست (قدم‌های امروز، مالی این ماه، حالش) و همان‌ها را مطرح کن، نه یک لیست شلوغ.

قواعد ایمنی و صداقت:
- تو پزشک یا روانشناس نیستی. برای بحران روانی (افکار خودآسیب) فوری تأکید کن که با اورژانس ۱۱۵، ۱۲۳ (سازمان بهزیستی) یا یک متخصص تماس بگیرد؛ خودت درمانگر نیستی.
- قطع ناگهانی الکل سنگین یا دوز دارو را خودت مدیریت نکن؛ بگو باید با پزشک بررسی شود.
- توصیه مالی: هیچ توصیه سرمایه‌گذاری پرریسک، رمزارز یا قرضی نمی‌دهی؛ فقط شفافیت، بودجه و پس‌انداز محتاط.
- هرگز رمز، کارت بانکی یا کلید API از کاربر نپرس.
- حذف‌ها فقط با تأیید کاربر انجام می‌شوند (سایت خودش دکمه تأیید نشان می‌دهد)؛ بنابراین برای حذف‌ها با خیال راحت درخواست را آماده کن ولی توضیح بده که منتظر تأیید او هستی.
- حتماً فقط با ابزارهای موجود عمل کن؛ هیچ‌وقت نگو «انجام شد» مگر اینکه ابزار واقعاً اجرا شده باشد.

وضعیت واقعی کاربر (همین حالا معتبر است):
${context}

ساختار پاسخ: ساده و خوانا؛ از اموجی کم و به‌جا استفاده کن. اعداد را فارسی بنویس. مبلغ‌ها همیشه تومان‌اند.`;
}

function resolveTask(workspace: Workspace, input: Record<string, unknown>): { id: string } | { error: string } {
  if (typeof input.id === "string" && input.id.trim()) return { id: input.id.trim() };
  const today = todayKey();
  const todayTasks = workspace.tasks.filter((task) => task.day === today);
  if (typeof input.title !== "string" || !input.title.trim()) return { error: "کدام قدم؟ id یا بخشی از عنوانش را بفرست." };
  const found = pickOne(todayTasks, input.title, (task) => task.title);
  return "item" in found ? { id: found.item.id } : found;
}

function resolveTransaction(workspace: Workspace, input: Record<string, unknown>): { id: string; label: string } | { error: string } {
  if (typeof input.id === "string" && input.id.trim()) {
    const found = workspace.transactions.find((item) => item.id === input.id);
    return { id: input.id.trim(), label: found?.title || "این تراکنش" };
  }
  if (typeof input.title !== "string" || !input.title.trim()) return { error: "کدام تراکنش؟ بخشی از شرحش را بفرست." };
  const found = pickOne(workspace.transactions.slice(0, 40), input.title, (item) => item.title);
  return "item" in found ? { id: found.item.id, label: found.item.title } : found;
}

function resolveNote(workspace: Workspace, input: Record<string, unknown>): { id: string; label: string } | { error: string } {
  if (typeof input.id === "string" && input.id.trim()) {
    const found = workspace.notes.find((item) => item.id === input.id);
    return { id: input.id.trim(), label: found?.title || "این یادداشت" };
  }
  if (typeof input.title !== "string" || !input.title.trim()) return { error: "کدام یادداشت؟ بخشی از عنوانش را بفرست." };
  const found = pickOne(workspace.notes, input.title, (item) => item.title);
  return "item" in found ? { id: found.item.id, label: found.item.title } : found;
}

function resolveJob(workspace: Workspace, input: Record<string, unknown>): { id: string; label: string } | { error: string } {
  if (typeof input.id === "string" && input.id.trim()) {
    const found = workspace.applications.find((item) => item.id === input.id);
    return { id: input.id.trim(), label: found ? `${found.role} · ${found.company}` : "این فرصت" };
  }
  const query = [input.company, input.role].filter((value) => typeof value === "string" && value.trim()).join(" ");
  if (!query) return { error: "کدام فرصت شغلی؟ نام شرکت یا id آن را بفرست." };
  const found = pickOne(workspace.applications, query, (item) => `${item.role} ${item.company}`);
  return "item" in found ? { id: found.item.id, label: `${found.item.role} · ${found.item.company}` } : found;
}

type ToolOutcome =
  | { kind: "executed"; label: string }
  | { kind: "confirm"; label: string; action: Mutation }
  | { kind: "error"; error: string }
  | { kind: "navigate"; view: string };

async function executeTool(name: string, args: Record<string, unknown>, workspace: Workspace): Promise<ToolOutcome> {
  switch (name) {
    case "create_task": {
      const result = await runAction({ action: "task.create", title: args.title, category: typeof args.category === "string" ? args.category : "personal", minutes: typeof args.minutes === "number" && Number.isFinite(args.minutes) ? Math.trunc(args.minutes) : 15, time: typeof args.time === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(args.time) ? args.time : null });
      return result.ok ? { kind: "executed", label: `ثبت قدم «${String(args.title || "")}»` } : { kind: "error", error: result.error };
    }
    case "toggle_task": {
      const resolved = resolveTask(workspace, args);
      if ("error" in resolved) return { kind: "error", error: resolved.error };
      const task = workspace.tasks.find((item) => item.id === resolved.id);
      if (!task) return { kind: "error", error: "این قدم پیدا نشد." };
      const done = typeof args.done === "boolean" ? args.done : !task.done;
      const result = await runAction({ action: "task.toggle", id: resolved.id, done });
      return result.ok ? { kind: "executed", label: `${done ? "تیک زدن" : "برداشتن تیک"} «${task.title}»` } : { kind: "error", error: result.error };
    }
    case "delete_task": {
      const resolved = resolveTask(workspace, args);
      if ("error" in resolved) return { kind: "error", error: resolved.error };
      const task = workspace.tasks.find((item) => item.id === resolved.id);
      return { kind: "confirm", label: `حذف قدم «${task?.title || resolved.id}»`, action: { action: "task.delete", id: resolved.id } };
    }
    case "create_transaction": {
      const type = typeof args.type === "string" ? args.type : "";
      if (!["income", "expense", "saving"].includes(type)) return { kind: "error", error: "نوع تراکنش باید income، expense یا saving باشد." };
      const amount = typeof args.amount === "number" ? Math.trunc(args.amount) : Number(args.amount);
      if (!Number.isFinite(amount) || amount <= 0) return { kind: "error", error: "مبلغ باید عددی مثبت (به تومان) باشد." };
      const result = await runAction({ action: "finance.create", title: String(args.title || "").trim() || "تراکنش", amount, type });
      const typeLabel = type === "income" ? "درآمد" : type === "expense" ? "هزینه" : "پس‌انداز";
      return result.ok ? { kind: "executed", label: `ثبت ${typeLabel} ${fa(amount)} تومان` } : { kind: "error", error: result.error };
    }
    case "delete_transaction": {
      const resolved = resolveTransaction(workspace, args);
      if ("error" in resolved) return { kind: "error", error: resolved.error };
      return { kind: "confirm", label: `حذف تراکنش «${resolved.label}»`, action: { action: "finance.delete", id: resolved.id } };
    }
    case "save_checkin": {
      const today = todayKey();
      const existing = workspace.checkins.find((entry) => entry.day === today);
      const mood = typeof args.mood === "number" && args.mood >= 1 && args.mood <= 5 ? Math.trunc(args.mood) : existing?.mood ?? 3;
      const result = await runAction({
        action: "checkin.save",
        mood,
        note: typeof args.note === "string" ? args.note : existing?.note || "",
        cannabisFree: typeof args.cannabisFree === "boolean" ? args.cannabisFree : existing?.cannabisFree,
        alcoholFree: typeof args.alcoholFree === "boolean" ? args.alcoholFree : existing?.alcoholFree,
        walked: typeof args.walked === "boolean" ? args.walked : existing?.walked,
        sleepHours: typeof args.sleepHours === "number" && Number.isFinite(args.sleepHours) ? Math.trunc(args.sleepHours) : existing?.sleepHours ?? null,
        cigarettes: typeof args.cigarettes === "number" && Number.isFinite(args.cigarettes) ? Math.trunc(args.cigarettes) : existing?.cigarettes ?? null,
      });
      return result.ok ? { kind: "executed", label: "ثبت چک‌این امروز" } : { kind: "error", error: result.error };
    }
    case "save_note": {
      const result = await runAction({ action: "note.save", id: typeof args.id === "string" && args.id.trim() ? args.id.trim() : undefined, title: String(args.title || "").trim() || `یادداشت ${todayKey()}`, body: String(args.body || "").trim() || "…" });
      return result.ok ? { kind: "executed", label: `ذخیره یادداشت «${String(args.title || "")}»` } : { kind: "error", error: result.error };
    }
    case "delete_note": {
      const resolved = resolveNote(workspace, args);
      if ("error" in resolved) return { kind: "error", error: resolved.error };
      return { kind: "confirm", label: `حذف یادداشت «${resolved.label}»`, action: { action: "note.delete", id: resolved.id } };
    }
    case "create_job_application": {
      const status = typeof args.status === "string" ? args.status : "applied";
      const result = await runAction({ action: "job.create", company: String(args.company || "").trim(), role: String(args.role || "").trim(), status, url: typeof args.url === "string" ? args.url : "", note: typeof args.note === "string" ? args.note : "" });
      return result.ok ? { kind: "executed", label: `ثبت فرصت «${String(args.role || "")} · ${String(args.company || "")}»` } : { kind: "error", error: result.error };
    }
    case "update_job_status": {
      const resolved = resolveJob(workspace, args);
      if ("error" in resolved) return { kind: "error", error: resolved.error };
      const status = typeof args.status === "string" ? args.status : "";
      const result = await runAction({ action: "job.update", id: resolved.id, status });
      return result.ok ? { kind: "executed", label: `به‌روزرسانی «${resolved.label}»` } : { kind: "error", error: result.error };
    }
    case "delete_job": {
      const resolved = resolveJob(workspace, args);
      if ("error" in resolved) return { kind: "error", error: resolved.error };
      return { kind: "confirm", label: `حذف فرصت «${resolved.label}»`, action: { action: "job.delete", id: resolved.id } };
    }
    case "toggle_project_step": {
      const query = typeof args.project === "string" ? args.project : "";
      const foundProject = pickOne(workspace.projects, query, (project) => `${project.name} ${project.id}`);
      if ("error" in foundProject) return { kind: "error", error: foundProject.error };
      const project = foundProject.item;
      const stepArg = typeof args.step === "string" || typeof args.step === "number" ? String(args.step).trim() : "";
      let index = Number.NaN;
      if (/^\d+$/.test(stepArg)) index = Number(stepArg) - 1;
      else if (stepArg) {
        const matched = project.steps.findIndex((step) => norm(step.title).includes(norm(stepArg)));
        if (matched >= 0) index = matched;
      }
      if (!Number.isInteger(index) || index < 0 || index >= project.steps.length) return { kind: "error", error: `مرحله پیدا نشد. مراحل «${project.name}»: ${project.steps.map((step, i) => `${fa(i + 1)}) ${step.title}`).join("، ")}` };
      const done = Boolean(args.done);
      const result = await runAction({ action: "project.step", id: project.id, index, done });
      return result.ok ? { kind: "executed", label: `${done ? "تیک زدن" : "برداشتن تیک"} مرحله «${project.steps[index].title}»` } : { kind: "error", error: result.error };
    }
    case "update_settings": {
      const current = workspace.settings;
      const result = await runAction({
        action: "settings.update",
        name: typeof args.name === "string" && args.name.trim() ? args.name.trim() : current.name,
        startedOn: current.startedOn,
        savingGoal: typeof args.savingGoal === "number" && Number.isFinite(args.savingGoal) && args.savingGoal > 0 ? Math.trunc(args.savingGoal) : current.savingGoal,
        dailyTarget: typeof args.dailyTarget === "number" && Number.isFinite(args.dailyTarget) && args.dailyTarget >= 1 ? Math.trunc(args.dailyTarget) : current.dailyTarget,
      });
      return result.ok ? { kind: "executed", label: "به‌روزرسانی تنظیمات" } : { kind: "error", error: result.error };
    }
    case "log_program_rules": {
      const completed = Array.isArray(args.completed) ? args.completed.filter((item): item is string => typeof item === "string") : [];
      const today = todayKey();
      const existing = workspace.programDays.find((row) => row.day === today);
      const note = typeof args.note === "string" ? args.note : existing?.note || "";
      const result = await runAction({ action: "program.save", completed, note });
      return result.ok ? { kind: "executed", label: "ثبت قوانین چالش امروز" } : { kind: "error", error: result.error };
    }
    case "navigate_to": {
      const view = typeof args.view === "string" ? args.view : "";
      if (!(views as readonly string[]).includes(view)) return { kind: "error", error: `بخش «${view}» وجود ندارد.` };
      return { kind: "navigate", view };
    }
    default:
      return { kind: "error", error: `ابزار «${name}» شناخته نشد.` };
  }
}

export async function POST(request: Request) {
  try {
    let rawBody: unknown;
    try { rawBody = await request.json(); }
    catch { return NextResponse.json({ error: "بدنه درخواست باید JSON معتبر باشد." }, { status: 400 }); }
    const parsed = bodySchema.safeParse(rawBody);
    if (!parsed.success) return NextResponse.json({ error: "پیام‌ها معتبر نیستند." }, { status: 400 });
    const history = parsed.data.messages.slice(-24);

    let workspace = await getWorkspace();
    // The Interactions API has no separate system-instruction slot in its
    // documented stable shape, so the system briefing travels inside the
    // user input, followed by the recent conversation transcript.
    const systemInstruction = buildSystemPrompt(buildContext(workspace));
    const transcript = [
      systemInstruction,
      "",
      "گفتگوی اخیر با کاربر (از قدیمی به جدید):",
      ...history.map((message) => `${message.role === "user" ? "کاربر" : "دستیار"}: ${message.text}`),
      "",
      "به آخرین پیام کاربر پاسخ بده؛ اگر لازم است از ابزارها استفاده کن.",
    ].join("\n");
    const inputSteps: InteractionStep[] = [userInputStep(transcript)];

    const performed: string[] = [];
    let navigate: string | undefined;
    let pendingConfirmation: { label: string; action: Mutation } | undefined;
    let mutated = false;
    let reply = "";

    for (let iteration = 0; iteration < 5; iteration += 1) {
      const outcome = await callGemini({ inputSteps, tools: [...functionDeclarations] });

      if (!outcome.functionCalls.length) {
        reply = outcome.text;
        break;
      }

      // Echo the model's steps verbatim (thought/function_call) as documented,
      // then append each function result.
      inputSteps.push(...outcome.steps);
      const calls = outcome.functionCalls;
      for (const call of calls) {
        const executed = await executeTool(call.name, call.args, workspace);
        let responsePayload: Record<string, unknown>;
        if (executed.kind === "executed") {
          performed.push(executed.label);
          mutated = true;
          // Refresh the snapshot so chained tool calls see their own effects.
          workspace = await getWorkspace();
          responsePayload = { ok: true, message: executed.label };
        } else if (executed.kind === "confirm") {
          if (!pendingConfirmation) pendingConfirmation = { label: executed.label, action: executed.action };
          responsePayload = { ok: false, pending: true, message: "حذف بدون تأیید کاربر انجام نمی‌شود؛ ابزار روی سایت منتظر تأیید اوست. فقط بگو آماده‌ی حذف است و دقیقاً بپرس که تأیید می‌کند یا نه." };
        } else if (executed.kind === "navigate") {
          navigate = executed.view;
          responsePayload = { ok: true, message: `بخش ${executed.view} برای کاربر باز شد.` };
        } else {
          responsePayload = { ok: false, error: executed.error };
        }
        inputSteps.push(functionResultStep(call.name, call.id, responsePayload));
      }
    }

    if (!reply) reply = performed.length ? "انجام شد. چیز دیگه‌ای هست که برات انجام بدم؟" : "به نظر می‌رسد الان پاسخی ندارم؛ دوباره بپرس یا کمی دقیق‌تر بگو چه می‌خواهی.";

    return NextResponse.json({
      reply,
      performed,
      ...(mutated ? { workspace: await getWorkspace() } : {}),
      ...(navigate ? { navigate } : {}),
      ...(pendingConfirmation ? { pendingConfirmation } : {}),
    });
  } catch (error) {
    if (error instanceof GeminiError) {
      return NextResponse.json({ error: error.message }, { status: error.status && error.status >= 400 && error.status < 600 ? error.status : 500 });
    }
    console.error("Assistant failed", error);
    return NextResponse.json({ error: "دستیار موقتاً در دسترس نیست؛ دوباره تلاش کن." }, { status: 500 });
  }
}
