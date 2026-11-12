import { tehranDayKey } from "@/lib/tehran-day";
import { projectProgress, type Checkin, type Task, type Transaction, type Workspace } from "@/lib/types";

export const timeBlocks = [
  { id: "morning", label: "صبح", hint: "۵ تا ۱۱", from: 5, to: 11 },
  { id: "noon", label: "ظهر", hint: "۱۱ تا ۱۶", from: 11, to: 16 },
  { id: "afternoon", label: "بعدازظهر", hint: "۱۶ تا ۲۰", from: 16, to: 20 },
  { id: "night", label: "شب", hint: "۲۰ تا ۲۴", from: 20, to: 29 },
];

export type DayStats = { total: number; done: number; percent: number; met: boolean };

export function dayKey(offset = 0) {
  const date = new Date();
  date.setDate(date.getDate() - offset);
  return tehranDayKey(date);
}

export function dayStats(tasks: Task[], day: string): DayStats {
  const list = tasks.filter((task) => task.day === day);
  const done = list.filter((task) => task.done).length;
  return { total: list.length, done, percent: list.length ? Math.round((done / list.length) * 100) : 0, met: false };
}

export function goalFor(stats: DayStats, target: number) {
  return stats.total ? Math.max(1, Math.min(target, stats.total)) : 0;
}

export function computeStreak(tasks: Task[], target: number) {
  const map = new Map<string, DayStats>();
  for (const task of tasks) {
    const entry = map.get(task.day) || { total: 0, done: 0, percent: 0, met: false };
    entry.total += 1;
    if (task.done) entry.done += 1;
    map.set(task.day, entry);
  }
  const days = [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));
  const today = dayKey(0);
  let streak = 0;
  for (const [day, stats] of days) {
    if (day > today) continue;
    const goal = goalFor(stats, target);
    if (stats.done >= goal) streak += 1;
    else if (day === today) continue;
    else break;
  }
  let best = 0,
    run = 0;
  const chronological = [...days].reverse();
  for (let index = 0; index < chronological.length; index += 1) {
    const [day, stats] = chronological[index];
    if (day > today) continue;
    const previous = chronological[index - 1]?.[0];
    const consecutive = previous ? Date.parse(previous) === Date.parse(day) - 86400000 : false;
    run = goalFor(stats, target) && stats.done >= goalFor(stats, target) ? (consecutive ? run + 1 : 1) : 0;
    best = Math.max(best, run);
  }
  const plannedDays = days.filter(([day]) => day <= today);
  const metDays = plannedDays.filter(([, stats]) => stats.done >= goalFor(stats, target)).length;
  return {
    streak,
    best: Math.max(best, streak),
    consistency: plannedDays.length ? Math.round((metDays / plannedDays.length) * 100) : 0,
    plannedDays: plannedDays.length,
  };
}

export type WeekSummary = {
  days: number;
  done: number;
  planned: number;
  metDays: number;
  focusMinutes: number;
  avgPercent: number;
  avgMood: number | null;
  checkins: number;
};

// Roll-up of the last `count` Tehran calendar days (today included). Days with
// no plan are not punished in avgPercent; they simply do not count.
export function weekStats(tasks: Task[], checkins: Checkin[], target: number, count = 7): WeekSummary {
  const days = Array.from({ length: count }, (_, index) => dayKey(count - 1 - index));
  let done = 0;
  let focusMinutes = 0;
  let planned = 0;
  let metDays = 0;
  let percentSum = 0;
  for (const day of days) {
    const list = tasks.filter((task) => task.day === day);
    const stats = dayStats(tasks, day);
    done += stats.done;
    focusMinutes += list.filter((task) => task.done).reduce((sum, task) => sum + task.minutes, 0);
    if (stats.total > 0) {
      planned += 1;
      percentSum += stats.percent;
      if (stats.done >= goalFor(stats, target)) metDays += 1;
    }
  }
  const weekCheckins = checkins.filter((entry) => days.includes(entry.day));
  const avgMood = weekCheckins.length
    ? Math.round((weekCheckins.reduce((sum, entry) => sum + entry.mood, 0) / weekCheckins.length) * 10) / 10
    : null;
  return {
    days: count,
    done,
    planned,
    metDays,
    focusMinutes,
    avgPercent: planned ? Math.round(percentSum / planned) : 0,
    avgMood,
    checkins: weekCheckins.length,
  };
}

export function recentDays(tasks: Task[], count = 14) {
  return Array.from({ length: count }, (_, index) => {
    const day = dayKey(count - 1 - index);
    const stats = dayStats(tasks, day);
    return { day, ...stats, goal: goalFor(stats, 0) };
  });
}

export function blockOf(time?: string | null) {
  if (!time) return null;
  const hour = Number(time.slice(0, 2));
  return timeBlocks.find((block) => hour >= block.from && hour < block.to)?.id || "night";
}

export function formatTime(time?: string | null) {
  if (!time) return "";
  const [hour, minute] = time.split(":");
  return `${hour.replace(/^0/, "")}:${minute}`;
}

export function nextAction(tasks: Task[]) {
  const today = dayKey(0);
  const planned = tasks
    .filter((task) => task.day === today && !task.done)
    .sort((a, b) => (a.time || "99:99").localeCompare(b.time || "99:99"));
  return planned[0] || null;
}

export function achievements(data: Workspace, streak: number) {
  const totalDone = data.tasks.filter((task) => task.done).length;
  const perfectDays = computeStreak(data.tasks, data.settings.dailyTarget).plannedDays;
  const saved = data.transactions.filter((item) => item.type === "saving").reduce((sum, item) => sum + item.amount, 0);
  const stepsDone = data.projects.reduce((sum, project) => sum + project.steps.filter((step) => step.done).length, 0);
  const stepsTotal = data.projects.reduce((sum, project) => sum + project.steps.length, 0);
  const liveApplications = data.applications.filter((item) => item.status !== "rejected").length;
  return [
    {
      title: "اولین قدم برداشته شد",
      text: "وقتی برای بار اول یکی از قدم‌های روزانه‌ات را تیک زدی.",
      earned: totalDone >= 1,
      icon: "spark",
    },
    { title: "سه روز پیوسته", text: "سه روز پشت‌سرهم به تعهد روزانه‌ات رسیدی.", earned: streak >= 3, icon: "flame" },
    { title: "یک هفته کامل", text: "هفت روز پیوسته؛ نظمت دارد شکل می‌گیرد.", earned: streak >= 7, icon: "flame" },
    {
      title: "دو هفته بی‌وقفه",
      text: "چهارده روز پیوسته؛ این سطحی است که تغییر می‌سازد.",
      earned: streak >= 14,
      icon: "flame",
    },
    { title: "سی قدم انجام شد", text: "سی قدم کوچک، مجموعاً یک مسیر واقعی.", earned: totalDone >= 30, icon: "target" },
    {
      title: "روزهای برنامه‌ریزی‌شده",
      text: `${perfectDays} روز برنامه داری و ثبت شده است.`,
      earned: perfectDays >= 10,
      icon: "calendar",
    },
    {
      title: "نقشه راه در حرکت",
      text: "حداقل نصف مراحل پروژه‌هایت تمام شده است.",
      earned: stepsTotal > 0 && stepsDone / stepsTotal >= 0.5,
      icon: "route",
    },
    {
      title: "فرصت‌های فعال",
      text: `${liveApplications} فرصت شغلی در پیگیری داری.`,
      earned: liveApplications >= 5,
      icon: "briefcase",
    },
    { title: "اولین پس‌انداز", text: "برای روزهای سخت‌تر، مقداری کنار گذاشتی.", earned: saved > 0, icon: "wallet" },
    {
      title: "به خودت توجه کردی",
      text: "حال امروزت را حداقل یک بار ثبت کرده‌ای.",
      earned: data.checkins.length >= 1,
      icon: "heart",
    },
  ];
}

export function projectLoad(data: Workspace) {
  const today = dayKey(0);
  const planned = data.tasks.filter((task) => task.day === today);
  const minutes = planned.reduce((sum, task) => sum + task.minutes, 0);
  const byBlock = timeBlocks.map((block) => ({
    ...block,
    tasks: planned.filter((task) => blockOf(task.time) === block.id),
    minutes: planned.filter((task) => blockOf(task.time) === block.id).reduce((sum, task) => sum + task.minutes, 0),
  }));
  return { minutes, byBlock, unscheduled: planned.filter((task) => !task.time) };
}

export function savingsTotal(transactions: Transaction[]) {
  return transactions.filter((item) => item.type === "saving").reduce((sum, item) => sum + item.amount, 0);
}

export function projectPercent(data: Workspace) {
  const done = data.projects.reduce((sum, project) => sum + project.steps.filter((step) => step.done).length, 0);
  const total = data.projects.reduce((sum, project) => sum + project.steps.length, 0);
  return total ? Math.round((done / total) * 100) : 0;
}
