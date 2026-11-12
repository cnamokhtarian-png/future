import "server-only";
import { db } from "@/db";
import { checkins, transactions, programDays, settings, dailyReviews } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { todayKey, addDaysKey } from "@/lib/types";
import {
  programRules,
  programRuleIds,
  effectiveCompleted,
  parseTimestamp,
  type ProgramContext,
} from "@/lib/program";
import { callGemini, userInputStep } from "@/lib/gemini";

export type DailyReviewRow = typeof dailyReviews.$inferSelect;

// Day keys follow the app's canonical Asia/Tehran calendar (UTC+3:30, no DST).

export function dayKeyOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}

function faDayLabel(day: string): string {
  const date = new Date(`${day}T12:00:00+03:30`);
  return new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", month: "long", day: "numeric" }).format(date);
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
  return { profile, programDay, checkin, dayTransactions, spent, earned };
}

function deterministicSummary(day: string, input: {
  done: string[];
  missed: string[];
  total: number;
  percent: number;
  gratitude: string;
  mood?: number | null;
  sleep?: number | null;
  cigarettes?: number | null;
  transactionCount: number;
}): string {
  const percentText = new Intl.NumberFormat("fa-IR").format(input.percent);
  const doneTitles = programRules.filter((rule) => input.done.includes(rule.id)).map((rule) => rule.title);
  const missedTitles = programRules.filter((rule) => input.missed.includes(rule.id)).map((rule) => rule.title);
  const parts = [`امروز ${new Intl.NumberFormat("fa-IR").format(input.done.length)} از ${new Intl.NumberFormat("fa-IR").format(input.total)} قانون را کامل کردی (${percentText}٪).`];
  if (doneTitles.length) parts.push(`انجام شد: ${doneTitles.join("، ")}.`);
  if (missedTitles.length) parts.push(`جا ماند: ${missedTitles.join("، ")}.`);
  if (input.mood != null) parts.push(`حالت روحی‌ات ${new Intl.NumberFormat("fa-IR").format(input.mood)} از ۵ بود.`);
  if (input.sleep != null) parts.push(`${new Intl.NumberFormat("fa-IR").format(input.sleep)} ساعت خوابیدی.`);
  if (input.cigarettes != null && input.cigarettes > 0) parts.push(`${new Intl.NumberFormat("fa-IR").format(input.cigarettes)} نخ سیگار ثبت شد.`);
  if (input.transactionCount > 0) parts.push(`${new Intl.NumberFormat("fa-IR").format(input.transactionCount)} تراکنش مالی امروز ثبت شد.`);
  if (input.gratitude.trim()) parts.push(`جمله‌ی پایانی‌ات: «${input.gratitude.trim()}»`);
  return parts.join(" ");
}

type AiCloseResult = { summary: string; focus: string; nextPlan: string };

function buildAiPrompt(day: string, input: {
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
}): string {
  const doneTitles = programRules.filter((rule) => input.done.includes(rule.id)).map((rule) => `- ${rule.title}`).join("\n") || "- هیچ‌کدام";
  const missedTitles = programRules.filter((rule) => input.missed.includes(rule.id)).map((rule) => `- ${rule.title}`).join("\n") || "- هیچ‌کدام (روز کامل!)";
  const money = (value: number) => `${new Intl.NumberFormat("fa-IR").format(value)} تومان`;
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
    ``,
    `پاسخ را دقیقاً و فقط به‌صورت JSON معتبر با این سه کلید بده (بدون هیچ متن اضافه، بدون markdown):`,
    `{`,
    `  "summary": "۳ تا ۵ جمله: صادقانه بگو امروز را چطور گذراند؛ چی خوبی بود، چی جا ماند و چرا برای مسیر پیشرفتش مهم است. گرم، محترمانه، بدون شعار توخالی، بدون شرم‌دادن.",`,
    `  "focus": "یک جملهٔ کوتاه: مهم‌ترین چیزی که فردا باید روی آن متمرکز شود (بر اساس ضعف‌های امروز).",`,
    `  "next_plan": "برنامهٔ کامل و ساعتی فردا به‌صورت متن فارسی؛ هر سطر «HH:MM — عنوان و توضیح کوتاه». از بیدار شدن قبل ۷:۰۰ تا ۱۲ شب ادامه بده؛ حتماً شامل این‌ها باشد: ۴۵ دقیقه ورزش/پیاده‌روی، بلوک کار عمیق ۹۰ دقیقه‌ای بدون تلفن، ۲٫۵ لیتر آب، ۱۰ صفحه کتاب، ۱۰ دقیقه سکوت/ذکر، شکرگزاری شبانه، ثبت دخل‌وخرج، خواب قبل ۱۲. برنامه را دقیقاً متناسب با وضعیت امروزش شخصی‌سازی کن (جا‌مانده‌ها را پررنگ کن)."`,
    `}`,
  ].filter(Boolean).join("\n");
}

function parseAiClose(raw: string): AiCloseResult | null {
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start === -1 || end <= start) return null;
  try {
    const parsed = JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    const summary = typeof parsed.summary === "string" ? parsed.summary.trim() : "";
    const focus = typeof parsed.focus === "string" ? parsed.focus.trim() : "";
    const nextPlan = typeof parsed.next_plan === "string" ? parsed.next_plan.trim() : "";
    if (!summary) return null;
    return {
      summary: summary.slice(0, 2000),
      focus: focus.slice(0, 400),
      nextPlan: nextPlan.slice(0, 6000),
    };
  } catch {
    return null;
  }
}

export async function closeDay(day: string, options: { trigger?: "cron" | "manual"; useAi?: boolean } = {}): Promise<{ row: DailyReviewRow | null; created: boolean }> {
  const existing = await db.select().from(dailyReviews).where(eq(dailyReviews.day, day));
  if (existing[0]) return { row: existing[0], created: false };

  const { profile, programDay, checkin, dayTransactions, spent, earned } = await loadDayData(day);
  const context: ProgramContext = { checkin, todayTransactions: dayTransactions };
  const manual = programDay?.completed || [];
  const effective = [...new Set(effectiveCompleted(manual, context).filter((id) => programRuleIds.includes(id)))];
  const done = effective;
  const missed = programRuleIds.filter((id) => !effective.includes(id));
  const total = programRules.length;
  const percent = Math.round((done.length / total) * 100);
  const gratitude = programDay?.note || "";
  const fallbackSummary = deterministicSummary(day, { done, missed, total, percent, gratitude, mood: checkin?.mood ?? null, sleep: checkin?.sleepHours ?? null, cigarettes: checkin?.cigarettes ?? null, transactionCount: dayTransactions.length });

  let summary = fallbackSummary;
  let focus = missed.length
    ? `فردا بیش از هر چیز روی «${programRules.find((rule) => rule.id === missed[0])?.title || missed[0]}» تمرکز کن.`
    : "روزت کامل بود؛ فردا همین ریتم را تکرار کن.";
  let nextPlan = "";
  let aiGenerated = false;

  if (options.useAi !== false && process.env.GEMINI_API_KEY) {
    try {
      const outcome = await callGemini({
        inputSteps: [userInputStep(buildAiPrompt(day, {
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
        }))],
      });
      const parsed = parseAiClose(outcome.text);
      if (parsed) {
        summary = parsed.summary;
        focus = parsed.focus || focus;
        nextPlan = parsed.nextPlan;
        aiGenerated = true;
      }
    } catch (error) {
      // AI is an amplifier, not a single point of failure: the day closes
      // deterministically and the AI text simply stays absent.
      console.error(`AI close failed for ${day}`, error);
    }
  }

  const inserted = await db.insert(dailyReviews).values({
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
  }).onConflictDoNothing().returning();

  return { row: inserted[0] || null, created: true };
}

/**
 * Close every missing day strictly before today. In `cron` mode every past
 * day is closed (an unused empty day closes as 0% — that is honest data for a
 * discipline program). In `backfill` mode only days with at least one signal
 * (program ticks, check-in or a transaction) are closed. AI calls are budgeted
 * to the newest `aiBudget` days; older days get the deterministic summary.
 */
export async function closeMissingDays(options: { mode?: "cron" | "backfill"; lookbackDays?: number; aiBudget?: number } = {}): Promise<string[]> {
  const mode = options.mode || "cron";
  const lookback = Math.max(1, Math.min(options.lookbackDays ?? 14, 60));
  let aiBudget = Math.max(0, options.aiBudget ?? 3);
  const today = todayKey();
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

