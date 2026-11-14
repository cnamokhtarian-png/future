"use client";

import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronLeft,
  Clock3,
  Flame,
  Footprints,
  Heart,
  Plus,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { fa, todayKey, categoryLabels, type Workspace } from "@/lib/types";
import { blockOf, computeStreak, dayStats, goalFor, nextAction, timeBlocks } from "@/lib/stats";
import {
  PROGRAM_LENGTH,
  PROGRAM_NAME,
  effectiveCompleted,
  programContext,
  programRules,
  programStreak,
} from "@/lib/program";
import { DailyCheckin, Progress, TaskRow, type Mutate } from "@/components/ui";
import { PlannerCard } from "@/components/planner";

const faLongDate = (date: Date) =>
  new Intl.DateTimeFormat("fa-IR", { weekday: "long", day: "numeric", month: "long" }).format(date);

export function TodayView({
  data,
  mutate,
  busy,
  onAddTask,
  onOpenDevelopment,
  onAskDelete,
}: {
  data: Workspace;
  mutate: Mutate;
  busy: boolean;
  onAddTask: () => void;
  onOpenDevelopment: () => void;
  onAskDelete: (mutation: { action: "task.delete"; id: string }, message: string) => void;
}) {
  const today = todayKey();
  const todayTasks = data.tasks.filter((task) => task.day === today);
  const done = todayTasks.filter((task) => task.done).length;
  const completion = todayTasks.length ? Math.round((done / todayTasks.length) * 100) : 0;
  const todayCheckin = data.checkins.find((entry) => entry.day === today);
  const next = nextAction(data.tasks);
  const unscheduled = todayTasks.filter((task) => !task.time);
  const todayStat = dayStats(data.tasks, today);
  const dailyGoal = goalFor(todayStat, data.settings.dailyTarget);
  const remaining = Math.max(0, dailyGoal - todayStat.done);
  const streak = computeStreak(data.tasks, data.settings.dailyTarget).streak;

  // چالش ۷۵ روزه: فقط خواندنی؛ تیک زدن جای خودش در صفحه‌ی چالش است.
  const context = programContext(data);
  const todayRow = data.programDays.find((row) => row.day === today);
  const manual = todayRow?.completed || [];
  const effective = new Set(effectiveCompleted(manual, context));
  const rulesDone = effective.size;
  const rulesTotal = programRules.length;
  const rulesPercent = Math.round((rulesDone / rulesTotal) * 100);
  const challenge = programStreak(data);

  const reviews = data.dailyReviews;
  const todayClosed = reviews.some((item) => item.day === today);

  const askDeleteTask = (task: { id: string; title: string }) =>
    onAskDelete({ action: "task.delete", id: task.id }, "این قدم از برنامه امروز حذف شود؟");

  const askCloseToday = () => {
    if (
      !window.confirm(
        "با بستنِ روز، امروز قفل می‌شود: تیک‌ها، چک‌این، ثبت هزینه و کارهای امروز تا نیمه‌شب بعد قابل تغییر نخواهند بود. ادامه می‌دهی؟",
      )
    )
      return;
    void mutate({ action: "day.close" }, "امروز بسته شد؛ کارنامه‌اش در «جمع‌بندی» آماده است.");
  };

  return (
    <div className="view-stack today-page">
      {/* نوار امروز — یک نگاه؛ همه‌چیزِ مهم در یک خط */}
      <section className="today-strip" aria-label="خلاصه‌ی امروز">
        <div className="today-strip-start">
          <span className="today-eyebrow">
            <Sparkles size={13} /> برنامه‌ی امروز تو
          </span>
          <strong className="today-date" suppressHydrationWarning>
            {faLongDate(new Date())}
          </strong>
          <span className="today-steps-pill">
            {fa(done)} از {fa(todayTasks.length)} قدم انجام شده
          </span>
        </div>
        <div className="today-strip-stats">
          <button className="today-stat" onClick={onOpenDevelopment} title="رفتن به چالش ۷۵ روزه">
            <span className="today-ring" style={{ ["--ring" as string]: `${rulesPercent}` }}>
              <svg viewBox="0 0 64 64" aria-hidden="true">
                <circle cx="32" cy="32" r="27" className="ring-track" />
                <circle cx="32" cy="32" r="27" className="ring-value" />
              </svg>
              <span className="today-ring-value">{fa(rulesDone)}</span>
            </span>
            <span className="today-stat-copy">
              <strong>چالش امروز</strong>
              <small>
                روز {fa(challenge.dayNumber)} از {fa(PROGRAM_LENGTH)} · {fa(rulesDone)}/{fa(rulesTotal)} قانون
              </small>
            </span>
          </button>
          <div className="today-stat-divider" aria-hidden="true" />
          <div className="today-stat">
            <span className="today-stat-icon peach">
              <Flame size={17} />
            </span>
            <span className="today-stat-copy">
              <strong>
                {fa(streak)} روز <small>زنجیره</small>
              </strong>
              <small>قدم‌های روزانه‌ات</small>
            </span>
          </div>
          <div className="today-stat-divider" aria-hidden="true" />
          <div className="today-stat">
            <span className="today-stat-icon blue">
              <Heart size={17} />
            </span>
            <span className="today-stat-copy">
              <strong>{todayCheckin ? `${fa(todayCheckin.mood)} از ۵` : "ثبت نشده"}</strong>
              <small>حال امروز</small>
            </span>
          </div>
        </div>
        <button className="button primary small today-add" onClick={onAddTask}>
          <Plus size={14} /> قدم تازه
        </button>
      </section>

      {/* توضیح سه لایه‌ی امروز؛ اینجا همان‌جایی است که همه چیز قاطی می‌شد */}
      <div className="today-layers" aria-label="سه لایه‌ی برنامه‌ی امروز">
        <span className="layer-chip">
          <b>۱</b> برنامه‌ی ساعتی؛ برنامه‌ای که مربی نوشته و تو درستش می‌کنی
        </span>
        <span className="layer-chip">
          <b>۲</b> قدم‌های امروز؛ کارهای شغلی و شخصی‌ات
        </span>
        <span className="layer-chip">
          <b>۳</b> قوانین چالش؛ خط قرمزهای ۷۵ روزه
        </span>
      </div>

      {/* برنامه‌ی ساعتی — مرکز صفحه */}
      <PlannerCard data={data} mutate={mutate} busy={busy} todayClosed={todayClosed} onCloseToday={askCloseToday} />

      <div className="dashboard-primary">
        <section className="panel daily-panel">
          <div className="section-heading">
            <div>
              <h2>
                <span className="heading-icon">
                  <CalendarDays size={19} />
                </span>{" "}
                قدم‌های امروز من
              </h2>
              <p>قدم‌ها را در بلوک‌های روزت بچین؛ ساده‌تر که باشد، بیشتر انجام می‌شود.</p>
            </div>
            <button className="text-button" onClick={onAddTask}>
              <Plus size={15} /> افزودن کار
            </button>
          </div>
          {next && (
            <div className="next-action">
              <div className="next-copy">
                <span className="next-label">
                  <Target size={12} /> قدم بعدی تو
                </span>
                <h3>{next.title}</h3>
                <div className="task-meta">
                  <span className={`category-tag ${next.category}`}>
                    {categoryLabels[next.category] || "شخصی"}
                  </span>
                  <span>
                    <Clock3 size={11} /> {fa(next.minutes)} دقیقه
                  </span>
                  {next.time && (
                    <span className="task-time">
                      <Clock3 size={11} /> {fa(next.time)}
                    </span>
                  )}
                </div>
              </div>
              <button
                className="button primary small"
                disabled={busy}
                onClick={() =>
                  mutate(
                    { action: "task.toggle", id: next.id, done: true },
                    "یک قدم رو به جلو! این کار انجام شد.",
                  )
                }
              >
                <Check size={14} /> انجام شد
              </button>
            </div>
          )}
          <div className="timeline">
            {timeBlocks.map((block) => {
              const list = todayTasks
                .filter((task) => blockOf(task.time) === block.id)
                .sort((a, b) => (a.time || "").localeCompare(b.time || ""));
              return (
                <div className={`time-block ${list.length ? "" : "is-empty"}`} key={block.id}>
                  <div className="time-block-head">
                    <span className="block-name">{block.label}</span>
                    <span className="block-hint">{block.hint}</span>
                    <span className="block-count">
                      {list.length
                        ? `${fa(list.filter((task) => task.done).length)} از ${fa(list.length)}`
                        : "بدون برنامه"}
                    </span>
                  </div>
                  {list.length ? (
                    <div className="daily-tasks">
                      {list.map((task) => (
                        <TaskRow
                          key={task.id}
                          task={task}
                          busy={busy}
                          onToggle={() =>
                            mutate(
                              { action: "task.toggle", id: task.id, done: !task.done },
                              task.done ? "قدم امروز دوباره باز شد." : "یک قدم رو به جلو! این کار انجام شد.",
                            )
                          }
                          onDelete={() => askDeleteTask(task)}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="block-empty">این بلوک خالی است؛ همین خوب است.</p>
                  )}
                </div>
              );
            })}
            {unscheduled.length > 0 && (
              <div className="time-block unscheduled-block">
                <div className="time-block-head">
                  <span className="block-name">بدون ساعت</span>
                  <span className="block-hint">هر وقت آماده بودی</span>
                  <span className="block-count">
                    {fa(unscheduled.filter((task) => task.done).length)} از {fa(unscheduled.length)}
                  </span>
                </div>
                <div className="daily-tasks">
                  {unscheduled.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      busy={busy}
                      onToggle={() =>
                        mutate(
                          { action: "task.toggle", id: task.id, done: !task.done },
                          task.done ? "قدم امروز دوباره باز شد." : "یک قدم رو به جلو! این کار انجام شد.",
                        )
                      }
                      onDelete={() => askDeleteTask(task)}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          {todayTasks.length === 0 && (
            <p className="empty-tasks">برنامه امروزت خالیه؛ یک قدم خیلی کوچک اضافه کن.</p>
          )}
          <div className="daily-progress">
            <div>
              <span>
                {fa(done)} از {fa(todayTasks.length)} قدم انجام شده
              </span>
              <strong>{fa(completion)}٪</strong>
            </div>
            <Progress value={completion} />
            <p>
              <Sparkles size={12} />{" "}
              {completion === 100 && todayTasks.length
                ? "به خودت افتخار کن؛ امروز قدم‌هات رو برداشتی."
                : "هر قدم کوچک، تو رو به مسیرت برمی‌گردونه."}
            </p>
          </div>
          <div className="commitment-strip">
            <span className="commitment-strip-label">
              <Flame size={14} /> تعهد روزانه
            </span>
            <strong>{fa(dailyGoal)} قدم</strong>
            <span className="commitment-strip-note">
              {remaining === 0
                ? "امروز به تعهدت رسیدی؛ زنجیره‌ات حفظ شد."
                : `${fa(remaining)} قدم دیگر برای رسیدن به تعهد امروز`}
            </span>
          </div>
        </section>

        <aside className="today-side">
          <section className="panel checkin-panel">
            <div className="section-heading">
              <div>
                <h2>
                  حال امروزت چطوره؟ <span className="small-leaf">✧</span>
                </h2>
                <p>چند ثانیه برای خودت وقت بذار.</p>
              </div>
              <Heart size={19} strokeWidth={1.6} className="purple-text" />
            </div>
            <DailyCheckin checkin={todayCheckin} mutate={mutate} busy={busy} />
          </section>

          <section className="panel challenge-mini" aria-label="خلاصه‌ی چالش ۷۵ روزه">
            <div className="challenge-mini-head">
              <span className="challenge-mini-icon">
                <Zap size={17} />
              </span>
              <div>
                <strong>قوانین چالش امروز</strong>
                <small>{PROGRAM_NAME}</small>
              </div>
              <span className="count-badge">
                {fa(rulesDone)}/{fa(rulesTotal)}
              </span>
            </div>
            <Progress value={rulesPercent} color="purple" />
            <p className="challenge-mini-note">
              {rulesPercent === 100 ? (
                <>
                  <Footprints size={13} /> امروزِ کامل؛ فردا همین را تکرار کن.
                </>
              ) : (
                <>
                  <Footprints size={13} /> {fa(rulesTotal - rulesDone)} قانون تا روز کامل مانده؛ تیک‌ها جای خودشان را
                  دارند.
                </>
              )}
            </p>
            <div className="challenge-mini-stats">
              <span>
                <b>{fa(challenge.streak)}</b> زنجیره
              </span>
              <span>
                <b>{fa(challenge.best)}</b> بهترین
              </span>
              <span>
                <b>{fa(challenge.completedDays)}</b> روز کامل
              </span>
            </div>
            <button className="button outline small challenge-mini-cta" onClick={onOpenDevelopment}>
              رفتن به چالش ۷۵ روزه <ChevronLeft size={15} />
            </button>
          </section>
        </aside>
      </div>
    </div>
  );
}
