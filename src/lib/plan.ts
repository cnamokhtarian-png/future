// «برنامه‌ریز روزانه» — انواع فعالیت، الگوهای جایگزینی و جمع‌بندیِ تغییرات.
// این ماژول خالص است (بدون دیتابیس/سرور) و هم سرور، هم کلاینت از آن استفاده می‌کند.

export type PlanItemBase = { time: string; title: string; kind: string };

// آنچه در پایان روز هر آیتم را به «تغییر نسبت به برنامه‌ی اصلی مربی» تبدیل می‌کند.
export type PlanDeltas = {
  planned: number;
  done: number;
  added: string[];
  dropped: string[];
  substituted: { from: string; to: string }[];
  rescheduled: { title: string; from: string; to: string }[];
  notes: string[];
};

export type PlanItemInput = { time: string; title: string; kind: string };

export const planKinds: Array<{ id: string; label: string }> = [
  { id: "sleep", label: "خواب" },
  { id: "workout", label: "ورزش" },
  { id: "walk", label: "پیاده‌روی" },
  { id: "water", label: "آب و آشامیدنی" },
  { id: "nutrition", label: "تغذیه" },
  { id: "deepwork", label: "کار عمیق" },
  { id: "reading", label: "مطالعه" },
  { id: "learning", label: "یادگیری" },
  { id: "silence", label: "سکوت و ذهن‌آگاهی" },
  { id: "worship", label: "عبادت و نماز" },
  { id: "gratitude", label: "شکرگزاری" },
  { id: "finance", label: "مالی و دخل‌وخرج" },
  { id: "cat", label: "گربه‌ها" },
  { id: "house", label: "خانه و کارهای روزمره" },
  { id: "errand", label: "خرید و کار بیرون" },
  { id: "social", label: "خانواده و ارتباط" },
  { id: "selfcare", label: "بهداشت و مراقبت فردی" },
  { id: "rest", label: "استراحت و وقت آزاد" },
  { id: "general", label: "عمومی" },
];

export const PLAN_KIND_IDS = planKinds.map((kind) => kind.id) as [string, ...string[]];

export function planKindLabel(kind: string): string {
  return planKinds.find((entry) => entry.id === kind)?.label || "عمومی";
}

export function isPlanKind(kind: unknown): kind is string {
  return typeof kind === "string" && PLAN_KIND_IDS.includes(kind);
}

// گزینه‌های «جایگزین کن» — برای وقتی که کار اصلی را نمی‌توانی انجام بدهی.
export const substitutePresets: Array<{ id: string; title: string; kind: string }> = [
  { id: "rest", title: "استراحت کوتاه و نفس کشیدن", kind: "rest" },
  { id: "walk", title: "پیاده‌روی بدون تلفن", kind: "walk" },
  { id: "workout-home", title: "ورزش سبک در خانه", kind: "workout" },
  { id: "deepwork", title: "بلوک کار عمیق (۹۰ دقیقه)", kind: "deepwork" },
  { id: "reading", title: "۱۰ صفحه کتاب مفید", kind: "reading" },
  { id: "silence", title: "سکوت و ذکر", kind: "silence" },
  { id: "worship", title: "نماز و عبادت", kind: "worship" },
  { id: "cooking", title: "آشپزی و آماده‌سازی غذا", kind: "nutrition" },
  { id: "errand", title: "خرید و کارهای بیرون", kind: "errand" },
  { id: "cats", title: "رسیدگی به گربه‌ها (غذا، آب، خاک)", kind: "cat" },
  { id: "family", title: "تماس یا دیدار با خانواده", kind: "social" },
  { id: "selfcare", title: "دوش و بهداشت", kind: "selfcare" },
  { id: "house", title: "کارهای خانه", kind: "house" },
  { id: "water", title: "آب و یک میان‌وعده‌ی واقعی", kind: "water" },
];

// برنامه‌ی استاندارد روزانه؛ وقتی جمینا در دسترس نیست یا هنوز برنامه‌ای ساخته نشده، این جای آن را می‌گیرد.
export function defaultPlanItems(): PlanItemInput[] {
  return [
    { time: "06:30", title: "بیدار شدن؛ ۱۰ دقیقه سکوت و ذکر، بدون تلفن", kind: "silence" },
    { time: "07:00", title: "ورزش یا پیاده‌روی تند، ۴۵ دقیقه", kind: "workout" },
    { time: "07:45", title: "صبحانه‌ی واقعی + اولین لیوان آب", kind: "nutrition" },
    { time: "09:00", title: "بلوک کار عمیق (حداقل ۹۰ دقیقه، بدون شبکه اجتماعی)", kind: "deepwork" },
    { time: "10:30", title: "آب + ۵ دقیقه کش و قوس", kind: "water" },
    { time: "12:30", title: "ناهار واقعی (نه فست‌فود) + آب", kind: "nutrition" },
    { time: "13:00", title: "۱۵ دقیقه پیاده‌روی بدون تلفن", kind: "walk" },
    { time: "15:00", title: "مطالعه: ۱۰ صفحه کتاب غیرکاری", kind: "reading" },
    { time: "16:30", title: "رسیدگی به گربه‌ها: غذا، آب و جمع‌وجور کردن", kind: "cat" },
    { time: "17:30", title: "یک مکالمه‌ی واقعی با یک آدم (حتی کوتاه) — پیوند اجتماعی", kind: "social" },
    { time: "18:00", title: "ثبت دخل‌وخرج امروز + یک نگاه به مانده‌ی ماه", kind: "finance" },
    { time: "19:30", title: "شام واقعی + آب", kind: "nutrition" },
    { time: "21:00", title: "وقت آزاد آگاهانه: خانواده، کتاب یا سکوت", kind: "rest" },
    { time: "22:30", title: "شکرگزاری: سه چیز + یک جمله درباره‌ی امروز", kind: "gratitude" },
    { time: "23:00", title: "تلفن کنار؛ خواب تا قبل از ۱۲", kind: "sleep" },
  ];
}

export function renderPlanText(
  items: Array<{ time: string; title: string; position?: number; dropped?: boolean }>,
): string {
  return [...items]
    .filter((item) => !item.dropped)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.time.localeCompare(b.time))
    .map((item) => `${item.time} — ${item.title}`)
    .join("\n");
}

export type PlanItemLike = {
  title: string;
  kind: string;
  time: string;
  note: string;
  done: boolean;
  dropped: boolean;
  origin: string;
  base: PlanItemBase | null;
};

export function computeDeltas(items: PlanItemLike[]): PlanDeltas {
  const active = items.filter((item) => !item.dropped);
  const substituted = active
    .filter((item) => item.base && (item.base.title !== item.title || item.base.kind !== item.kind))
    .map((item) => ({ from: item.base!.title, to: item.title }));
  const rescheduled = active
    .filter((item) => item.base && item.base.time !== item.time)
    .map((item) => ({ title: item.title, from: item.base!.time, to: item.time }));
  return {
    planned: active.length,
    done: active.filter((item) => item.done).length,
    added: active.filter((item) => item.origin === "user" && !item.base).map((item) => item.title),
    dropped: items.filter((item) => item.dropped).map((item) => item.title),
    substituted,
    rescheduled,
    notes: active.filter((item) => item.note.trim()).map((item) => `${item.title}: ${item.note.trim().slice(0, 120)}`),
  };
}

// خلاصه‌ی فشرده‌ی برنامه برای آوردن در بافتِ جمینا (دستیار و جمع‌بندی شبانه).
export function formatPlanForPrompt(items: PlanItemLike[]): string[] {
  const active = items.filter((item) => !item.dropped);
  const dropped = items.filter((item) => item.dropped);
  const lines: string[] = [];
  const doneCount = active.filter((item) => item.done).length;
  lines.push(`برنامه‌ی امروز (${doneCount} از ${active.length} آیتم انجام‌شده):`);
  for (const item of active.slice(0, 20)) {
    const fl: string[] = [`- ${item.time} ${item.title}`];
    if (item.done) fl.push("[انجام شد]");
    else fl.push("[انجام نشد]");
    if (item.base && item.base.title !== item.title) fl.push(`[جایگزین «${item.base.title}»]`);
    if (item.note.trim()) fl.push(`[یادداشت: ${item.note.trim().slice(0, 100)}]`);
    lines.push(fl.join(" "));
  }
  for (const item of dropped.slice(0, 6)) lines.push(`- ${item.time} ${item.title} [از برنامه کنار گذاشته شد]`);
  return lines;
}
