import { todayKey, type Checkin, type Transaction, type Workspace } from "@/lib/types";

// «چالش ۷۵ روزه روبه‌راه» — یک برنامه سخت‌گیرانه و استاندارد، الهام‌گرفته از
// 75 Hard (اندی کاوی)، Atomic Habits (جیمز کلیر)، Implementation Intentions
// (پیتر گولیتسر) و «آیین خاموش‌سازی» کال نیوپورت. قوانین ثابت‌اند و تغییر نمی‌کنند؛
// تنها چیزی که عوض می‌شود انضباطِ توست، نه قوانین.

export const PROGRAM_LENGTH = 75;
export const PROGRAM_NAME = "چالش ۷۵ روزه روبه‌راه";

export type ProgramRule = {
  id: string;
  title: string;
  detail: string;
  // قوانین خودکار به وضعیت امروزت (چک‌این یا ثبت تراکنش) وصل‌اند و به‌صورت خودکار تیک می‌خورند.
  auto?: "clean" | "walked" | "finance";
};

export const programRules: ProgramRule[] = [
  { id: "wake", title: "بیداری تا قبل از ۷:۰۰ صبح، بدون «فقط پنج دقیقه دیگه»", detail: "ساعت بیداری را دیشب تنظیم کن؛ اسنپ‌بک و چرتِ «یه بار دیگه» ممنوع است." },
  { id: "workout", title: "۴۵ دقیقه فعالیت بدنی، ترجیحاً در هوای آزاد", detail: "پیاده‌روی تند، نرمش، دوچرخه یا هر حرکتی که بدنت را با خودت حرف بزند. اگر بیمار هستی، نه؛ وگرنه بهانه‌ای وجود ندارد." },
  { id: "water", title: "۲٫۵ لیتر آب در طول روز", detail: "بطری را پر کن و در دیدت بگذار؛ تشنه‌گی را با خستگی اشتباه نگیر." },
  { id: "read", title: "۱۰ صفحه کتاب مفید و غیرکاری", detail: "کتاب واقعی، نه صفحه‌نمایش. توسعه فردی، روان‌شناسی، معنویت یا هر موضوعی که ذهنت را رشد دهد." },
  { id: "silent", title: "۱۰ دقیقه سکوت، ذهن‌آگاهی یا ذکر", detail: "بدون تلفن. تنفس عمیق، مدیتیشن، ذکر یا دعا؛ روزت را با سکوت تحویل بگیر." },
  { id: "clean", title: "بدون سیگار، الکل، حشیش و هیچ ماده‌ای — کامل", detail: "یک لغزش یعنی زنجیره می‌شکند. این قانون هیچ تبصره‌ای ندارد.", auto: "clean" },
  { id: "walk", title: "۱۵ دقیقه پیاده‌روی بدون تلفن همراه", detail: "فقط راه برو و نگاه کن. همین معجزه‌ی کوچک، ذهنت را ریست می‌کند.", auto: "walked" },
  { id: "deepwork", title: "یک بلوک کار عمیق (حداقل ۹۰ دقیقه) بدون شبکه اجتماعی", detail: "یک کار مشخص، تلفن دور از دسترس، تایمر روشن. کیفیت یک بلوک واقعی از یک روز شتاب‌زده باارزش‌تر است." },
  { id: "finance", title: "ثبت کامل دخل و خرج امروز؛ حتی ۱۰ هزار تومان", detail: "هیچ تراکنشی نباید از قلم بیفتد. شفافیت، اولین قدم هر بودجه‌ی موفق است.", auto: "finance" },
  { id: "gratitude", title: "شکرگزاری شبانه + یک جمله درباره‌ی امروز", detail: "سه چیز که بابت‌شان خدا یا زندگی را شکر می‌کنی و یک جمله درباره‌ی روزی که گذراندی؛ ترجیحاً در یادداشت‌های همین برنامه." },
  { id: "nutrition", title: "بدون فست‌فود و شیرینی اضافه؛ تغذیه واقعی", detail: "چیزی که از یک ماده‌ی اولیه می‌شناسی (برنج، حبوبات، سبزی، مرغ، نان…) بخور؛ جعبه‌ها و بسته‌های فرآوری‌شده را کنار بگذار." },
  { id: "sleep", title: "خواب قبل از ۱۲:۰۰ شب", detail: "تلفن را ساعت ۱۱:۳۰ کنار بگذار. انضباط صبح از شب قبل شروع می‌شود." },
];

export const programRuleIds = programRules.map((rule) => rule.id);

export type ProgramContext = { checkin?: Checkin; todayTransactions: Transaction[] };

export function autoDoneFor(rule: ProgramRule, context: ProgramContext): boolean {
  if (rule.auto === "clean") {
    const checkin = context.checkin;
    return Boolean(checkin && checkin.cigarettes === 0 && checkin.cannabisFree && checkin.alcoholFree);
  }
  if (rule.auto === "walked") {
    return Boolean(context.checkin?.walked);
  }
  if (rule.auto === "finance") {
    return context.todayTransactions.length > 0;
  }
  return false;
}

export function programContext(workspace: Workspace): ProgramContext {
  const today = todayKey();
  return {
    checkin: workspace.checkins.find((entry) => entry.day === today),
    todayTransactions: workspace.transactions.filter((item) => {
      const parsed = parseTimestamp(item.createdAt);
      if (!parsed) return false;
      return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(parsed) === today;
    }),
  };
}

export function parseTimestamp(value: string): Date | null {
  if (!value) return null;
  // Postgres `timestamp` returns "YYYY-MM-DD HH:MM:SS.mmm" (naive, effectively UTC) when read as string.
  const naive = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}:\d{2})/.exec(value);
  if (naive) {
    const parsed = new Date(`${naive[1]}T${naive[2]}Z`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function monthKeyOf(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit" }).format(date);
}

export function monthLabelOf(monthKey: string): string {
  const [year, month] = monthKey.split("-").map(Number);
  // Noon UTC on the 15th avoids any timezone month-boundary flips.
  const date = new Date(Date.UTC(year, (month || 1) - 1, 15, 12, 0, 0));
  return new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", year: "numeric", month: "long" }).format(date);
}

export function effectiveCompleted(manual: string[], context: ProgramContext): string[] {
  const done = new Set(manual.filter((id) => programRuleIds.includes(id)));
  for (const rule of programRules) {
    if (rule.auto && autoDoneFor(rule, context)) done.add(rule.id);
  }
  return [...done];
}

export function programDayComplete(manual: string[], context: ProgramContext): boolean {
  const done = effectiveCompleted(manual, context);
  return programRules.every((rule) => done.includes(rule.id));
}

export function programStreak(workspace: Workspace) {
  const contextByDay = new Map<string, ProgramContext>();
  const transactionsWithDay = workspace.transactions.map((item) => ({ item, day: parseTimestamp(item.createdAt) ? new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(parseTimestamp(item.createdAt)!) : "" }));
  for (const entry of workspace.checkins) contextByDay.set(entry.day, { checkin: entry, todayTransactions: [] });
  for (const { item, day } of transactionsWithDay) {
    if (!day) continue;
    const entry = contextByDay.get(day) || { checkin: undefined, todayTransactions: [] };
    entry.todayTransactions.push(item);
    contextByDay.set(day, entry);
  }
  const recorded = new Map(workspace.programDays.map((row) => [row.day, row]));
  const today = todayKey();
  const allDays = new Set<string>([...recorded.keys(), ...contextByDay.keys()]);
  allDays.add(today);
  const completeOf = (day: string) => programDayComplete(recorded.get(day)?.completed || [], contextByDay.get(day) || { todayTransactions: [] });
  const days = [...allDays].sort().reverse();
  let streak = 0;
  for (const day of days) {
    if (day > today) continue;
    if (completeOf(day)) streak += 1;
    else if (day === today) continue;
    else break;
  }
  const chronological = [...new Set([...recorded.keys()])].sort();
  let best = 0, run = 0;
  for (const day of chronological) {
    if (day > today) continue;
    if (completeOf(day)) run += 1; else run = 0;
    best = Math.max(best, run);
  }
  const firstDay = chronological[0] || today;
  const dayNumber = Math.min(PROGRAM_LENGTH, Math.max(1, Math.floor((Date.parse(today) - Date.parse(firstDay)) / 86400000) + 1));
  const completedDays = chronological.filter((day) => day <= today && completeOf(day)).length;
  return { streak, best: Math.max(best, streak), dayNumber, completedDays, firstDay, isTracking: recorded.size > 0 };
}

export function recentProgramSnapshots(workspace: Workspace, count = 14) {
  const today = todayKey();
  const recorded = new Map(workspace.programDays.map((row) => [row.day, row]));
  const transactionsWithDay = workspace.transactions.map((item) => {
    const parsed = parseTimestamp(item.createdAt);
    return { item, day: parsed ? dayKeyOf(parsed) : "" };
  });
  const contextByDay = new Map<string, ProgramContext>();
  for (const entry of workspace.checkins) contextByDay.set(entry.day, { checkin: entry, todayTransactions: [] });
  for (const { item, day } of transactionsWithDay) {
    if (!day) continue;
    const entry = contextByDay.get(day) || { checkin: undefined, todayTransactions: [] };
    entry.todayTransactions.push(item);
    contextByDay.set(day, entry);
  }
  const days: Array<{ day: string; done: number; total: number; percent: number }> = [];
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const date = new Date(`${today}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - offset);
    const day = dayKeyOf(date);
    const manual = recorded.get(day)?.completed || [];
    const done = effectiveCompleted(manual, contextByDay.get(day) || { todayTransactions: [] }).length;
    days.push({ day, done, total: programRules.length, percent: Math.round(done / programRules.length * 100) });
  }
  return days;
}

function dayKeyOf(date: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).format(date);
}
