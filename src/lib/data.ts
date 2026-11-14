import "server-only";
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
  dailyReviews,
  planItems,
  socialLogs,
  activity,
} from "@/db/schema";
import { asc, desc, eq } from "drizzle-orm";
import { todayKey, type Activity, type Workspace } from "@/lib/types";

export async function getWorkspace(): Promise<Workspace> {
  const day = todayKey();
  await db.transaction(async (tx) => {
    await tx.insert(settings).values({ id: "personal", name: "رفیق", startedOn: day }).onConflictDoNothing();
    const [profile] = await tx.select().from(settings).where(eq(settings.id, "personal"));
    if (profile.lastPlannedOn !== day) {
      await tx
        .insert(tasks)
        .values([
          {
            id: `${day}-health`,
            title: "کمی پیاده‌روی کن، بدون تلفن همراه",
            category: "health",
            minutes: 15,
            day,
            time: "07:00",
          },
          {
            id: `${day}-career`,
            title: "رزومه‌ات را برای یک فرصت شغلی آماده کن",
            category: "career",
            minutes: 30,
            day,
            time: "09:30",
          },
          {
            id: `${day}-project`,
            title: "روی فروشگاه کیف مرواریدی کار کن",
            category: "project",
            minutes: 20,
            day,
            time: "18:00",
          },
        ])
        .onConflictDoNothing();
      await tx.update(settings).set({ lastPlannedOn: day }).where(eq(settings.id, "personal"));
    }
    await tx
      .insert(projects)
      .values([
        {
          id: "pearl",
          name: "فروشگاه کیف مرواریدی",
          description: "از یک ایده خانوادگی تا اولین نمونه‌کار واقعی و قابل ارائه‌ات.",
          kind: "طراحی وب‌سایت",
          status: "active",
          priority: 1,
          steps: [
            { title: "ساخت نسخه اولیه فروشگاه", done: true },
            { title: "افزودن ۵ محصول با عکس، قیمت و توضیح", done: false },
            { title: "تست سفارش، فرم تماس و نمایش موبایل", done: false },
            { title: "انتشار رایگان و ثبت در رزومه", done: false },
          ],
        },
        {
          id: "daneshbook",
          name: "دانش‌بوک",
          description: "فضایی ساده برای پیدا کردن کتاب و درخواست تبادل؛ کوچک شروع کن.",
          kind: "محصول شخصی",
          status: "queued",
          priority: 2,
          steps: [
            { title: "تعریف ایده و کاربرد اصلی تبادل کتاب", done: true },
            { title: "ساخت فهرست کتاب و صفحه جزئیات", done: false },
            { title: "ذخیره درخواست تبادل و اطلاعات کاربر", done: false },
            { title: "انتشار MVP، بررسی حقوق محتوا و نام پروژه", done: false },
          ],
        },
        {
          id: "agent",
          name: "دستیار هوشمند",
          description: "یادگیری اتصال API و خطایابی؛ فعلاً آزمایشی و بدون سرمایه واقعی.",
          kind: "هوش مصنوعی",
          status: "paused",
          priority: 3,
          steps: [
            { title: "ساخت نسخه اولیه با کمک ابزار AI", done: true },
            { title: "بازتولید خطا و بررسی Console و Network", done: false },
            { title: "تست API سمت سرور و تنظیم متغیرهای محیطی", done: false },
            { title: "آزمون با داده ساختگی و ثبت گزارش خطا", done: false },
          ],
        },
      ])
      .onConflictDoNothing();
  });

  const [
    profile,
    taskList,
    applicationList,
    projectList,
    checkinList,
    transactionList,
    noteList,
    programDayList,
    dailyReviewList,
    planItemList,
    socialLogList,
  ] = await Promise.all([
    db.select().from(settings).where(eq(settings.id, "personal")),
    db.select().from(tasks).orderBy(asc(tasks.createdAt), asc(tasks.id)),
    db.select().from(applications).orderBy(desc(applications.createdAt)),
    db.select().from(projects).orderBy(asc(projects.priority)),
    db.select().from(checkins).orderBy(desc(checkins.day)),
    db.select().from(transactions).orderBy(desc(transactions.createdAt)),
    db.select().from(notes).orderBy(desc(notes.createdAt)),
    db.select().from(programDays).orderBy(desc(programDays.day)),
    db.select().from(dailyReviews).orderBy(desc(dailyReviews.day)),
    db.select().from(planItems).orderBy(asc(planItems.position), asc(planItems.createdAt)),
    db.select().from(socialLogs).orderBy(desc(socialLogs.day), desc(socialLogs.createdAt)),
  ]);
  // دفترچه‌ی تغییرات اختیاری است: اگر هنوز جدول ساخته نشده باشد (مثلاً قبل از اجرای مایگریشن)، برنامه بالا می‌آید و تایم‌لاین خالی می‌ماند.
  let activityList: Activity[] = [];
  try {
    activityList = await db.select().from(activity).orderBy(desc(activity.at)).limit(300);
  } catch (error) {
    console.warn("Activity log unavailable; continuing without it", error);
  }
  return {
    settings: profile[0],
    tasks: taskList,
    applications: applicationList,
    projects: projectList,
    checkins: checkinList,
    transactions: transactionList,
    notes: noteList,
    programDays: programDayList,
    dailyReviews: dailyReviewList,
    planItems: planItemList,
    socialLogs: socialLogList,
    activity: activityList,
  };
}
