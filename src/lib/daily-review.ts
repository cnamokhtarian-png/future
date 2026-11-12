import "server-only";
import { db } from "@/db";
import { checkins, transactions, programDays, settings, dailyReviews, planItems } from "@/db/schema";
import { asc, desc, eq, sql } from "drizzle-orm";
import { todayKey, addDaysKey } from "@/lib/types";
import { programRules, programRuleIds, effectiveCompleted, parseTimestamp, type ProgramContext } from "@/lib/program";
import { callGemini, userInputStep } from "@/lib/gemini";
import { tehranDayKey } from "@/lib/tehran-day";
import {
  computeDeltas,
  renderPlanText,
  formatPlanForPrompt,
  defaultPlanItems,
  planKinds,
  PLAN_KIND_IDS,
  type PlanDeltas,
  type PlanItemInput,
} from "@/lib/plan";

export type DailyReviewRow = typeof dailyReviews.$inferSelect;

// Day keys follow the app's canonical Asia/Tehran calendar (UTC+3:30, no DST).

export function dayKeyOf(date: Date): string {
  return tehranDayKey(date);
}

function faDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00+03:30`);
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(date);
}

export async function isDayClosed(day: string): Promise<boolean> {
  const [row] = await db.select({ day: dailyReviews.day }).from(dailyReviews).where(eq(dailyReviews.day, day));
  return Boolean(row);
}

async function loadDayData(day: string) {
  const [profile] = await db.select().from(settings).where(eq(settings.id, "personal"));
  const [programDay] = await db.select().from(programDays).where(eq(programDays.day, day));
  const [checkin] = await db.select().from(checkins).where(eq(checkins.day, day));
  const allTransactions = await db.select().from(transactions).orderBy(desc(transactions.createdAt));
  const dayTransactions = allTransactions.filter((item) => {
    const parsed = parseTimestamp(item.createdAt);
    return parsed ? dayKeyOf(parsed) === day : false;
  });
  const spent = dayTransactions.filter((item) => item.type === "expense").reduce((sum, item) => sum + item.amount, 0);
  const earned = dayTransactions.filter((item) => item.type === "income").reduce((sum, item) => sum + item.amount, 0);
  const dayPlanItems = await db
    .select()
    .from(planItems)
    .where(eq(planItems.day, day))
    .orderBy(asc(planItems.position), asc(planItems.createdAt));
  return { profile, programDay, checkin, dayTransactions, spent, earned, dayPlanItems };
}

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

// فقط ردیف‌های سالمِ خروجی جمینا عبور می‌کنند؛ هر چیز دیگری کنار گذاشته می‌شود.
export function sanitizePlanItems(raw: unknown): PlanItemInput[] | null {
  if (!Array.isArray(raw)) return null;
  const items: PlanItemInput[] = [];
  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as Record<string, unknown>;
    const time = typeof record.time === "string" ? record.time.trim() : "";
    const title = typeof record.title === "string" ? record.title.trim().slice(0, 200) : "";
    const rawKind = typeof record.kind === "string" ? record.kind.trim() : "general";
    const kind = PLAN_KIND_IDS.includes(rawKind) ? rawKind : "general";
    if (!TIME_RE.test(time) || !title) continue;
    items.push({ time, title, kind });
  }
  if (items.length < 3) return null;
  return items.slice(0, 24);
}

function parseJsonObject(raw: string): Record<string, unknown> | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

const KIND_INSTRUCTIONS = planKinds.map((kind) => `${kind.id}=${kind.label}`).join("، ");

function deterministicSummary(
  day: string,
  input: {
    done: string[];
    missed: string[];
    total: number;
    percent: number;
    gratitude: string;
    mood?: number | null;
    sleep?: number | null;
    cigarettes?: number | null;
    transactionCount: number;
    deltas?: PlanDeltas;
  },
): string {
  const percentText = new Intl.NumberFormat("fa-IR").format(input.percent);
  const doneTitles = programRules.filter((rule) => input.done.includes(rule.id)).map((rule) => rule.title);
  const missedTitles = programRules.filter((rule) => input.missed.includes(rule.id)).map((rule) => rule.title);
  const parts = [
    `امروز ${new Intl.NumberFormat("fa-IR").format(input.done.length)} از ${new Intl.NumberFormat("fa-IR").format(input.total)} قانون را کامل کردی (${percentText}٪).`,
  ];
  if (doneTitles.length) parts.push(`انجام شد: ${doneTitles.join("، ")}.`);
  if (missedTitles.length) parts.push(`جا ماند: ${missedTitles.join("، ")}.`);
  if (input.mood != null) parts.push(`حالت روحی‌ات ${new Intl.NumberFormat("fa-IR").format(input.mood)} از ۵ بود.`);
  if (input.sleep != null) parts.push(`${new Intl.NumberFormat("fa-IR").format(input.sleep)} ساعت خوابیدی.`);
  if (input.cigarettes != null && input.cigarettes > 0)
    parts.push(`${new Intl.NumberFormat("fa-IR").format(input.cigarettes)} نخ سیگار ثبت شد.`);
  if (input.transactionCount > 0)
    parts.push(`${new Intl.NumberFormat("fa-IR").format(input.transactionCount)} تراکنش مالی امروز ثبت شد.`);
  if (input.gratitude.trim()) parts.push(`جمله‌ی پایانی‌ات: «${input.gratitude.trim()}»`);
  if (input.deltas && input.deltas.planned > 0) {
    parts.push(
      `از برنامه‌ی ${new Intl.NumberFormat("fa-IR").format(input.deltas.planned)} آیتمی، ${new Intl.NumberFormat("fa-IR").format(input.deltas.done)} آیتم انجام شد${input.deltas.substituted.length ? ` و ${new Intl.NumberFormat("fa-IR").format(input.deltas.substituted.length)} آیتم آگاهانه جایگزین شد` : ""}${input.deltas.dropped.length ? ` و ${new Intl.NumberFormat("fa-IR").format(input.deltas.dropped.length)} آیتم از برنامه کنار گذاشته شد` : ""}.`,
    );
  }
  return parts.join(" ");
}

type AiCloseResult = { summary: string; focus: string; items: PlanItemInput[] | null };

function buildAiPrompt(
  day: string,
  input: {
    userName: string;
    percent: number;
    done: string[];
    missed: string[];
    gratitude: string;
    mood?: number | null;
    sleep?: number | null;
    cigarettes?: number | null;
    transactionCount: number;
    spent: number;
    earned: number;
    planLines: string[];
    deltas: PlanDeltas;
  },
): string {
  const doneTitles =
    programRules
      .filter((rule) => input.done.includes(rule.id))
      .map((rule) => `- ${rule.title}`)
      .join("\n") || "- هیچ‌کدام";
  const missedTitles =
    programRules
      .filter((rule) => input.missed.includes(rule.id))
      .map((rule) => `- ${rule.title}`)
      .join("\n") || "- هیچ‌کدام (روز کامل!)";
  const money = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
  const planSection = input.planLines.length
    ? [
        ``,
        `برنامه‌ی امروز — بر اساسِ آخرین وضعیت واقعیِ ثبت‌شده توسط خودش (نه نسخه‌ی اولیه‌ی تو):`,
        ...input.planLines,
        `تغییرات ثبت‌شده توسط خودش در طول روز:`,
        input.deltas.substituted.length
          ? input.deltas.substituted.map((d) => `- جایگزینی: «${d.from}» به «${d.to}»`).join("\n")
          : ``,
        input.deltas.rescheduled.length
          ? input.deltas.rescheduled.map((r) => `- ساعت تغییر کرد: «${r.title}» از ${r.from} به ${r.to}`).join("\n")
          : ``,
        input.deltas.dropped.length ? `- از برنامه کنار گذاشت: ${input.deltas.dropped.join("، ")}` : ``,
        input.deltas.added.length ? `- به خواست خودش اضافه کرد: ${input.deltas.added.join("، ")}` : ``,
        input.deltas.notes.length ? `- یادداشت‌هایش روی برنامه: ${input.deltas.notes.join(" | ")}` : ``,
        input.deltas.substituted.length === 0 &&
        input.deltas.rescheduled.length === 0 &&
        input.deltas.dropped.length === 0 &&
        input.deltas.added.length === 0 &&
        input.deltas.rescheduled.length === 0
          ? `- بدون تغییر`
          : ``,
      ].filter((line) => line !== "")
    : [];
  return [
    `تو «مربی روبه‌راه» هستی: مربی انضباط، آرامش و بلوغ مالیِ ${input.userName} — فارسی‌زبان، خودمانی ولی محترمانه و دقیق. وظیفه‌ات: کارنامه‌ی امروزش را صادقانه ببندی و برنامه‌ی کامل و ساعتی فردایش را بنویسی.`,
    ``,
    `تاریخ امروز (بسته‌شده): ${faDayLabel(day)} — فردا: ${faDayLabel(addDaysKey(day, 1))}`,
    `نتیجه‌ی چالش ۷۵ روزهٔ امروز: ${new Intl.NumberFormat("fa-IR").format(input.percent)}٪ — ${new Intl.NumberFormat("fa-IR").format(input.done.length)} از ${new Intl.NumberFormat("fa-IR").format(programRules.length)} قانون`,
    `قوانین کامل‌شده:`,
    doneTitles,
    `قوانین جا‌مانده:`,
    missedTitles,
    input.mood != null ? `حال روزانه (از ۵): ${input.mood}` : `چک‌این امروز ثبت نشده.`,
    input.sleep != null ? `خواب: ${input.sleep} ساعت` : ``,
    input.cigarettes != null ? `سیگار: ${input.cigarettes} نخ` : ``,
    `تراکنش‌های امروز: ${input.transactionCount} مورد | خرج امروز: ${money(input.spent)} | درآمد امروز: ${money(input.earned)}`,
    input.gratitude.trim() ? `متن «یک جمله درباره‌ی امروز» خودش: «${input.gratitude.trim()}»` : ``,
    ...planSection,
    ``,
    `مهم — قاعده‌ی طلایی نسبت به برنامه: کارنامه را بر اساسِ همین وضعیت نهایی بنویس، نه برنامه‌ی اولیه. جایگزینی‌ها و حذف‌های آگاهانه‌ی خودش را «شکست» حساب نکن و سرزنش نکن؛ آن‌ها را با نام و واقع‌بینانه بازتاب بده (مثلاً «تصمیم گرفتی ورزش صبح را با استراحت عصرگاهی عوض کنی»). اگر آیتمی را انجام نشد علامت زده ولی دلیلِ قانع‌کننده‌ای در یادداشت‌ها نیامده، آرام و محترمانه همان را بگو.`,
    ``,
    `پاسخ را دقیقاً و فقط به‌صورت JSON معتبر با همین کلیدها بده (بدون هیچ متن اضافه، بدون markdown):`,
    `{`,
    `  "summary": "۳ تا ۵ جمله: صادقانه بگو امروز را چطور گذراند؛ چی خوبی بود، چی جا ماند و چرا برای مسیر پیشرفتش مهم است. گرم، محترمانه، بدون شعار توخالی، بدون شرم‌دادن. تغییرات برنامه را صادقانه لمس کن.",`,
    `  "focus": "یک جملهٔ کوتاه: مهم‌ترین چیزی که فردا باید روی آن متمرکز شود (بر اساس ضعف‌های امروز).",`,
    `  "items": [{ "time": "06:30", "title": "بیدار شدن و ۱۰ دقیقه سکوت", "kind": "silence" }]`,
    `}`,
    ``,
    `مشخصاتِ "items" (برنامه‌ی فردا):`,
    `- ۱۲ تا ۱۸ ردیف از بیدار شدن قبل ۷:۰۰ تا خواب قبل ۱۲:۰۰، با ساعت‌های واقعی و ترتیب زمانی.`,
    `- حتماً شامل این‌ها باشد: ۴۵ دقیقه ورزش/پیاده‌روی، بلوک کار عمیق ۹۰ دقیقه‌ای بدون تلفن، ۲٫۵ لیتر آب (حداقل ۳ ردیف آب)، ۱۰ صفحه کتاب، ۱۰ دقیقه سکوت/ذکر، رسیدگی به گربه‌ها، شکرگزاری شبانه، ثبت دخل‌وخرج، خواب قبل ۱۲.`,
    `- شخصی‌سازی‌شده بر اساس ضعف‌های امروز (جا‌مانده‌ها را با رنگ مشخص‌تر در متن بیاور) و متناسب با خودش، نه یک الگوی کپی.`,
    `- "time" حتماً به شکل ۲۴ساعته و HH:MM باشد؛ "kind" یکی از این‌ها: ${KIND_INSTRUCTIONS}.`,
    `- "title" کوتاه، فارسی و قابل اجرا باشد (حداکثر یک خط).`,
  ]
    .filter(Boolean)
    .join("\n");
}

// برنامه‌ی فقط-آیتمی؛ برای وقتی که خودِ کاربر «برنامه‌ی امروزم را بچین» را می‌زند.
function buildItemsPrompt(
  day: string,
  input: {
    userName: string;
    percent: number;
    done: string[];
    missed: string[];
    gratitude: string;
    mood?: number | null;
  },
): string {
  const missedTitles =
    programRules
      .filter((rule) => input.missed.includes(rule.id))
      .map((rule) => rule.title)
      .join("، ") || "هیچ‌کدام";
  return [
    `تو «مربی روبه‌راه» هستی. برای ${input.userName} برنامه‌ی کاملِ امروز (${faDayLabel(day)}) را بنویس.`,
    `وضعیت الان: ${new Intl.NumberFormat("fa-IR").format(input.percent)}٪ از قوانین انجام شده؛ جا‌مانده‌ها تا الان: ${missedTitles}.`,
    input.mood != null ? `حال فعلی: ${input.mood} از ۵.` : ``,
    input.gratitude.trim() ? `یک جمله‌ی خودش: «${input.gratitude.trim()}»` : ``,
    ``,
    `پاسخ را فقط و فقط به‌صورت JSON معتبر بده:`,
    `{ "items": [{ "time": "06:30", "title": "...", "kind": "silence" }] }`,
    `۱۲ تا ۱۸ ردیف از قبل ۷ صبح تا قبل ۱۲ شب، ساعتی، فارسی، شامل ورزش ۴۵ دقیقه‌ای، کار عمیق ۹۰ دقیقه‌ای، ۲٫۵ لیتر آب، کتاب، سکوت، گربه‌ها، شکرگزاری شبانه و خواب قبل ۱۲. "kind" حتماً از این‌ها باشد: ${KIND_INSTRUCTIONS}.`,
  ]
    .filter(Boolean)
    .join("\n");
}

function parseAiClose(raw: string): AiCloseResult | null {
  const parsed = parseJsonObject(raw);
  if (!parsed) return null;
  const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
  const focus = typeof parsed.focus === "string" ? parsed.focus.trim() : "";
  if (!summary) return null;
  return {
    summary: summary.slice(0, 2000),
    focus: focus.slice(0, 400),
    items: sanitizePlanItems(parsed.items),
  };
}

async function insertPlanItemsForDay(day: string, items: PlanItemInput[], origin: "ai" | "user"): Promise<number> {
  const [existing] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(planItems)
    .where(eq(planItems.day, day));
  if ((existing?.count ?? 0) > 0) return 0;
  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));
  await db.insert(planItems).values(
    sorted.map((item, position) => ({
      id: crypto.randomUUID(),
      day,
      position,
      time: item.time,
      title: item.title,
      kind: item.kind,
      origin,
    })),
  );
  return sorted.length;
}

export async function closeDay(
  day: string,
  options: { trigger?: "cron" | "manual"; useAi?: boolean } = {},
): Promise<{ row: DailyReviewRow | null; created: boolean }> {
  const existing = await db.select().from(dailyReviews).where(eq(dailyReviews.day, day));
  if (existing[0]) return { row: existing[0], created: false };

  const { profile, programDay, checkin, dayTransactions, spent, earned, dayPlanItems } = await loadDayData(day);
  const context: ProgramContext = { checkin, todayTransactions: dayTransactions };
  const manual = programDay?.completed || [];
  const effective = [...new Set(effectiveCompleted(manual, context).filter((id) => programRuleIds.includes(id)))];
  const done = effective;
  const missed = programRuleIds.filter((id) => !effective.includes(id));
  const total = programRules.length;
  const percent = Math.round((done.length / total) * 100);
  const gratitude = programDay?.note || "";
  const deltas = computeDeltas(dayPlanItems);
  const fallbackSummary = deterministicSummary(day, {
    done,
    missed,
    total,
    percent,
    gratitude,
    mood: checkin?.mood ?? null,
    sleep: checkin?.sleepHours ?? null,
    cigarettes: checkin?.cigarettes ?? null,
    transactionCount: dayTransactions.length,
    deltas,
  });

  let summary = fallbackSummary;
  let focus = missed.length
    ? `فردا بیش از هر چیز روی «${programRules.find((rule) => rule.id === missed[0])?.title || missed[0]}» تمرکز کن.`
    : "روزت کامل بود؛ فردا همین ریتم را تکرار کن.";
  let aiItems: PlanItemInput[] | null = null;
  let aiGenerated = false;

  if (options.useAi !== false && process.env.GEMINI_API_KEY) {
    try {
      const outcome = await callGemini({
        inputSteps: [
          userInputStep(
            buildAiPrompt(day, {
              userName: profile?.name || "رفیق",
              percent,
              done,
              missed,
              gratitude,
              mood: checkin?.mood ?? null,
              sleep: checkin?.sleepHours ?? null,
              cigarettes: checkin?.cigarettes ?? null,
              transactionCount: dayTransactions.length,
              spent,
              earned,
              planLines: formatPlanForPrompt(dayPlanItems),
              deltas,
            }),
          ),
        ],
      });
      const parsed = parseAiClose(outcome.text);
      if (parsed) {
        summary = parsed.summary;
        focus = parsed.focus || focus;
        aiItems = parsed.items;
        aiGenerated = true;
      }
    } catch (error) {
      // AI is an amplifier, not a single point of failure: the day closes
      // deterministically and the AI text simply stays absent.
      console.error(`AI close failed for ${day}`, error);
    }
  }

  // برنامه‌ی فردا را همین امشب بنویس؛ شبکه‌های نانوشته (وقتی جمینا در دسترس نیست) هم پر می‌شوند.
  const tomorrow = addDaysKey(day, 1);
  const tomorrowItems: PlanItemInput[] = aiItems ?? defaultPlanItems();
  let nextPlan = "";
  try {
    await insertPlanItemsForDay(tomorrow, tomorrowItems, "ai");
    const rows = await db
      .select()
      .from(planItems)
      .where(eq(planItems.day, tomorrow))
      .orderBy(asc(planItems.position), asc(planItems.createdAt));
    nextPlan = renderPlanText(
      rows.length
        ? rows
        : [...tomorrowItems]
            .sort((a, b) => a.time.localeCompare(b.time))
            .map((item, position) => ({ ...item, position })),
    );
  } catch (error) {
    console.error(`Writing tomorrow's plan for ${day} failed`, error);
    nextPlan = renderPlanText(tomorrowItems.map((item, position) => ({ ...item, position })));
  }

  const inserted = await db
    .insert(dailyReviews)
    .values({
      day,
      percent,
      done: done.length,
      total,
      completed: done,
      missed,
      gratitude,
      checkinMood: checkin?.mood ?? null,
      checkinSleep: checkin?.sleepHours ?? null,
      checkinCigarettes: checkin?.cigarettes ?? null,
      summary,
      focus,
      nextPlan,
      trigger: options.trigger || "cron",
      aiGenerated,
      deltas,
    })
    .onConflictDoNothing()
    .returning();

  return { row: inserted[0] || null, created: true };
}

/** دکمه‌ی «مربی برام برنامه‌ی امروز را بچین» — فقط وقتی امروز هنوز آیتمی ندارد. */
export async function generatePlanForToday(): Promise<{ created: boolean; count: number; ai: boolean }> {
  const day = todayKey();
  const existing = await db.select({ id: planItems.id }).from(planItems).where(eq(planItems.day, day));
  if (existing.length > 0) return { created: false, count: existing.length, ai: false };

  const { profile, checkin, dayTransactions, programDay } = await loadDayData(day);
  const context: ProgramContext = { checkin, todayTransactions: dayTransactions };
  const manual = programDay?.completed || [];
  const effective = new Set(effectiveCompleted(manual, context));
  const missed = programRuleIds.filter((id) => !effective.has(id));
  const total = programRules.length;
  const percent = Math.round((effective.size / total) * 100);
  const doneTitles = programRuleIds.filter((id) => effective.has(id));

  let items: PlanItemInput[] | null = null;
  if (process.env.GEMINI_API_KEY) {
    try {
      const outcome = await callGemini({
        inputSteps: [
          userInputStep(
            buildItemsPrompt(day, {
              userName: profile?.name || "رفیق",
              percent,
              done: doneTitles,
              missed,
              gratitude: programDay?.note || "",
              mood: checkin?.mood ?? null,
            }),
          ),
        ],
      });
      items = sanitizePlanItems(parseJsonObject(outcome.text)?.items);
    } catch (error) {
      console.error(`AI plan generation for ${day} failed`, error);
    }
  }
  const finalItems = items ?? defaultPlanItems();
  const count = await insertPlanItemsForDay(day, finalItems, "ai");
  return { created: count > 0, count: count || finalItems.length, ai: Boolean(items) };
}

/**
 * Close every missing day strictly before today. In `cron` mode every past
 * day is closed (an unused empty day closes as 0% — that is honest data for a
 * discipline program). In `backfill` mode only days with at least one signal
 * (program ticks, check-in or a transaction) are closed. AI calls are budgeted
 * to the newest `aiBudget` days; older days get the deterministic summary.
 */
export async function closeMissingDays(
  options: { mode?: "cron" | "backfill"; lookbackDays?: number; aiBudget?: number } = {},
): Promise<string[]> {
  const mode = options.mode || "cron";
  const lookback = Math.max(1, Math.min(options.lookbackDays ?? 14, 60));
  let aiBudget = Math.max(0, options.aiBudget ?? 3);
  const today = todayKey();
  // The challenge did not exist before it started: never close days before
  // settings.startedOn (pre-program 0% rows would be fiction, not data).
  const [profile] = await db
    .select({ startedOn: settings.startedOn })
    .from(settings)
    .where(eq(settings.id, "personal"));
  const startedOn = profile?.startedOn || today;
  const closed: string[] = [];

  const allTransactions = mode === "backfill" ? await db.select().from(transactions) : [];
  const transactionDays = new Set(
    allTransactions.map((item) => {
      const parsed = parseTimestamp(item.createdAt);
      return parsed ? dayKeyOf(parsed) : "";
    }),
  );

  for (let offset = 1; offset <= lookback; offset += 1) {
    const day = addDaysKey(today, -offset);
    if (day < startedOn) break;
    if (mode === "backfill") {
      const [programDay] = await db.select({ day: programDays.day }).from(programDays).where(eq(programDays.day, day));
      const [checkin] = await db.select({ day: checkins.day }).from(checkins).where(eq(checkins.day, day));
      if (!programDay && !checkin && !transactionDays.has(day)) continue;
    }
    const useAi = aiBudget > 0;
    const result = await closeDay(day, { trigger: "cron", useAi });
    if (result.created) {
      closed.push(day);
      if (useAi) aiBudget -= 1;
    }
  }
  return closed.reverse();
}
