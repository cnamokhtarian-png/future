"use client";

import { useState } from "react";
import {
  Flame,
  Target,
  CalendarDays,
  TrendingUp,
  Check,
  Minus,
  Plus,
  Clock3,
  BriefcaseBusiness,
  Route,
  Wallet,
  Heart,
  Sparkles,
  Award,
  Info,
  CircleAlert,
  ChevronLeft,
  Sunrise,
} from "lucide-react";
import { fa, type Workspace, type Mutation } from "@/lib/types";
import {
  achievements,
  computeStreak,
  dayKey,
  formatTime,
  goalFor,
  projectPercent,
  recentDays,
  timeBlocks,
  weekStats,
} from "@/lib/stats";
import { IconBox, Progress, type Mutate } from "@/components/ui";

function focusLabel(minutes: number): string {
  if (minutes < 60) return `${fa(minutes)} دقیقه`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${fa(hours)} ساعت و ${fa(rest)} دقیقه` : `${fa(hours)} ساعت`;
}

const icons = {
  spark: Sparkles,
  flame: Flame,
  target: Target,
  calendar: CalendarDays,
  route: Route,
  briefcase: BriefcaseBusiness,
  wallet: Wallet,
  heart: Heart,
};

export function ProgressView({ data, mutate, busy }: { data: Workspace; mutate: Mutate; busy: boolean }) {
  const target = data.settings.dailyTarget;
  const [draftTarget, setDraftTarget] = useState(target);
  const today = dayKey(0);
  const todayStats = recentDays(data.tasks, 1)[0];
  const goal = goalFor(todayStats, target);
  const remaining = Math.max(0, goal - todayStats.done);
  const { streak, best, consistency, plannedDays } = computeStreak(data.tasks, target);
  const week = weekStats(data.tasks, data.checkins, target);
  const days = recentDays(data.tasks, 14);
  const badges = achievements(data, streak);
  const earned = badges.filter((badge) => badge.earned).length;
  const ring = Math.min(100, Math.round((streak / Math.max(best, 7)) * 100));
  return (
    <div className="view-stack">
      <section className="panel commitment-panel">
        <div className="commitment-main">
          <div className="streak-ring" style={{ ["--ring" as string]: `${ring}` }}>
            <svg viewBox="0 0 120 120" aria-hidden="true">
              <circle cx="60" cy="60" r="52" className="ring-track" />
              <circle cx="60" cy="60" r="52" className="ring-value" />
            </svg>
            <div className="streak-center">
              <strong>{fa(streak)}</strong>
              <span>روز پیوسته</span>
            </div>
          </div>
          <div className="commitment-copy">
            <span className="eyebrow purple-text">زنجیره فعلی تو</span>
            <h2>
              {streak === 0
                ? "امروز روزِ شروعِ یک زنجیره تازه است."
                : streak === 1
                  ? "یک روز پایدار؛ زنجیره از همین‌جا شروع شد."
                  : `${fa(streak)} روز پشت‌سرهم به تعهدت رسیده‌ای.`}
            </h2>
            <p>
              تعهد روزانه یعنی: در هر روز، دست‌کم به این تعداد قدم از برنامه‌ات می‌رسی. زنجیره با یک روز نرسیدن به صفر
              برمی‌گردد؛ این فشارِ کنترل‌شده است، نه تنبیه.
            </p>
            <div className="commitment-actions">
              <div className="target-stepper" role="group" aria-label="تعهد روزانه">
                <span>تعهد روزانه‌ام</span>
                <button
                  className="icon-button"
                  onClick={() => setDraftTarget(Math.max(1, draftTarget - 1))}
                  disabled={draftTarget <= 1}
                  aria-label="کاهش تعهد"
                >
                  <Minus size={15} />
                </button>
                <strong>{fa(draftTarget)} قدم</strong>
                <button
                  className="icon-button"
                  onClick={() => setDraftTarget(Math.min(20, draftTarget + 1))}
                  disabled={draftTarget >= 20}
                  aria-label="افزایش تعهد"
                >
                  <Plus size={15} />
                </button>
              </div>
              <button
                className="button primary small"
                disabled={busy || draftTarget === target}
                onClick={() =>
                  mutate(
                    {
                      action: "settings.update",
                      name: data.settings.name,
                      startedOn: data.settings.startedOn,
                      savingGoal: data.settings.savingGoal,
                      dailyTarget: draftTarget,
                    },
                    "تعهد روزانه‌ات ذخیره شد.",
                  )
                }
              >
                <Check size={14} /> ثبت تعهد
              </button>
            </div>
            <div className="commitment-status">
              {remaining === 0 ? (
                <span className="met-tag">
                  <Check size={13} /> تعهد امروزت کامل شد؛ زنجیره حفظ شد.
                </span>
              ) : (
                <span className="pending-tag">
                  <Clock3 size={13} /> امروز {fa(remaining)} قدم دیگر برای رسیدن به تعهدت داری.
                </span>
              )}
              <span className="goal-note">هدف امروز: {fa(goal)} قدم</span>
            </div>
          </div>
        </div>
        <div className="commitment-side">
          {[
            { label: "بهترین زنجیره", value: fa(best), hint: "روز", icon: Award },
            { label: "پایداری", value: fa(consistency), hint: "٪", icon: TrendingUp },
            { label: "روزهای برنامه‌دار", value: fa(plannedDays), hint: "روز", icon: CalendarDays },
          ].map((item) => (
            <div key={item.label}>
              <IconBox
                icon={item.icon}
                color={item.label === "بهترین زنجیره" ? "peach" : item.label === "پایداری" ? "green" : "blue"}
              />
              <div>
                <strong>
                  {item.value} <small>{item.hint}</small>
                </strong>
                <span>{item.label}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="panel chart-panel">
        <div className="section-heading">
          <div>
            <h2>پیشرفت ۱۴ روز گذشته</h2>
            <p>ارتفاع هر ستون، درصد قدم‌های انجام‌شده آن روز است. ستون پررنگ یعنی به تعهدت رسیدی.</p>
          </div>
          <div className="chart-legend">
            <span className="legend-item met" /> به تعهد رسیدم
            <span className="legend-item pending" /> نرسیدم
            <span className="legend-item empty" /> بدون برنامه
          </div>
        </div>
        <div className="progress-chart">
          {days.map((day) => {
            const dayGoal = goalFor(day, target);
            const met = day.total > 0 && day.done >= dayGoal;
            const isToday = day.day === today;
            return (
              <div
                className={`chart-column ${met ? "met" : ""} ${day.total === 0 ? "empty" : ""} ${isToday ? "today" : ""}`}
                key={day.day}
              >
                <div className="chart-bar-wrap">
                  <div
                    className="chart-goal"
                    style={{ bottom: `${day.total ? Math.round((dayGoal / day.total) * 100) : 0}%` }}
                    title={`هدف: ${fa(dayGoal)} قدم`}
                  />
                  {day.total > 0 && (
                    <div className="chart-bar" style={{ height: `${day.percent}%` }}>
                      <span className="chart-bar-value">{fa(day.percent)}٪</span>
                    </div>
                  )}
                  {day.total > 0 && day.percent === 0 && <span className="chart-zero">۰٪</span>}
                </div>
                <span className="chart-day">
                  {new Intl.DateTimeFormat("fa-IR", { weekday: "narrow" }).format(new Date(`${day.day}T12:00:00Z`))}
                </span>
                <span className="chart-count">{day.total === 0 ? "—" : `${fa(day.done)}/${fa(day.total)}`}</span>
                {isToday && <span className="today-flag">امروز</span>}
              </div>
            );
          })}
        </div>
        {!days.some((day) => day.done > 0) && (
          <p className="chart-first-hint">
            <Sparkles size={14} /> نمودارت هنوز خالی است؛ با اولین تیکِ امروز، اولین ستونش رنگ می‌گیرد.
          </p>
        )}
        <p className="field-help chart-help">
          <Info size={13} /> روزهای بدون برنامه، زنجیره را نمی‌شکنند؛ فقط شمرده نمی‌شوند. یک روز از دست رفته، شروع
          دوباره است نه پایان مسیر.
        </p>
      </section>

      <section className="panel weekly-card" aria-label="کارنامهٔ هفتگی">
        <div className="section-heading">
          <div>
            <h2>کارنامهٔ ۷ روز گذشته</h2>
            <p>
              {new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" }).format(
                new Date(`${dayKey(6)}T12:00:00Z`),
              )}{" "}
              تا{" "}
              {new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long" }).format(
                new Date(`${dayKey(0)}T12:00:00Z`),
              )}{" "}
              — صادقانه و بدون قضاوت؛ همین که ثبتش کردی، خودش پیشرفته.
            </p>
          </div>
          <IconBox icon={CalendarDays} color="blue" />
        </div>
        <div className="progress-stats weekly-stats">
          {[
            { title: "قدم‌های انجام‌شده", value: fa(week.done), hint: "در این هفته", icon: Target, color: "purple" },
            {
              title: "روزهای به تعهد رسیدی",
              value: fa(week.metDays),
              hint: `از ${fa(week.planned)} روز برنامه‌دار`,
              icon: Flame,
              color: "peach",
            },
            {
              title: "زمان تمرکز",
              value: focusLabel(week.focusMinutes),
              hint: "مجموع دقیقه‌های قدم‌های انجام‌شده",
              icon: Clock3,
              color: "blue",
            },
            {
              title: "میانگین انجام برنامه",
              value: `${fa(week.avgPercent)}٪`,
              hint: "در روزهای برنامه‌دار",
              icon: TrendingUp,
              color: "green",
            },
            {
              title: "میانگین حال هفته",
              value: week.avgMood == null ? "—" : fa(week.avgMood),
              hint: week.checkins ? `از ۵ · ${fa(week.checkins)} ثبت چک‌این` : "هنوز چک‌اینی ثبت نشده",
              icon: Heart,
              color: "peach",
            },
          ].map((stat) => (
            <div className="panel progress-stat" key={stat.title}>
              <IconBox icon={stat.icon} color={stat.color} />
              <strong>{stat.value}</strong>
              <span>{stat.title}</span>
              <small>{stat.hint}</small>
            </div>
          ))}
        </div>
        <p className="field-help chart-help">
          <Info size={13} />{" "}
          {week.planned === 0
            ? "این هفته هنوز روز برنامه‌داری ثبت نشده؛ با یک قدم کوچک فردا شروع کن."
            : week.metDays >= 5
              ? "هفته‌ای محکم بود؛ این نظم دقیقاً همان چیزی است که می‌ماند."
              : week.metDays >= 3
                ? "هفته‌ای واقعی بود؛ عالی نبود، ولی ادامه داشت. همین مهم است."
                : "هفته سخت بود و همین ثبت‌کردنش نشانهٔ حضورته؛ هفتهٔ بعد را کوتاه‌تر و کوچک‌تر شروع کن."}
        </p>
      </section>

      <div className="progress-stats">
        {[
          {
            title: "قدم‌های انجام‌شده",
            value: fa(data.tasks.filter((task) => task.done).length),
            hint: "از کل مسیر",
            icon: Target,
            color: "purple",
          },
          {
            title: "پیشرفت پروژه‌ها",
            value: fa(projectPercent(data)),
            hint: "درصد مراحل تمام‌شده",
            icon: Route,
            color: "blue",
          },
          {
            title: "روزهای کامل",
            value: fa(days.filter((day) => day.total > 0 && day.done === day.total).length),
            hint: "در ۱۴ روز اخیر",
            icon: Sunrise,
            color: "green",
          },
          {
            title: "دستاوردهای بازشده",
            value: fa(earned),
            hint: `از ${fa(badges.length)} دستاورد`,
            icon: Award,
            color: "peach",
          },
        ].map((stat) => (
          <div className="panel progress-stat" key={stat.title}>
            <IconBox icon={stat.icon} color={stat.color} />
            <strong>{stat.value}</strong>
            <span>{stat.title}</span>
            <small>{stat.hint}</small>
          </div>
        ))}
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>دستاوردهای مسیر</h2>
            <p>هر کدام که باز شد، نشانه یک تغییر واقعی است؛ حتی اگر کوچک باشد.</p>
          </div>
          <span className="pill purple">
            <Award size={13} /> {fa(earned)} از {fa(badges.length)}
          </span>
        </div>
        <div className="badge-grid">
          {badges.map((badge) => {
            const Icon = icons[badge.icon as keyof typeof icons] || Target;
            return (
              <article className={`badge ${badge.earned ? "earned" : ""}`} key={badge.title}>
                <span className="badge-icon">{badge.earned ? <Icon size={19} /> : <Icon size={19} />}</span>
                <div>
                  <h3>{badge.title}</h3>
                  <p>{badge.text}</p>
                </div>
                {badge.earned && (
                  <span className="badge-check">
                    <Check size={12} />
                  </span>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <section className="panel schedule-guide">
        <IconBox icon={Clock3} color="blue" className="large-icon" />
        <div>
          <h3>برنامه روزانه‌ات را در چهار بلوک ببین</h3>
          <p>
            هر قدم می‌تواند ساعت بگیرد و در بلوک صبح، ظهر، بعدازظهر یا شب نمایش داده شود. اگر بلوکی خالی است، بار آن روز
            سبک‌تر است؛ لازم نیست همه بلوک‌ها پر شوند.
          </p>
          <div className="block-chips">
            {timeBlocks.map((block) => (
              <span key={block.id}>
                <strong>{block.label}</strong>
                <small>{block.hint}</small>
              </span>
            ))}
          </div>
        </div>
      </section>

      <div className="notice">
        <CircleAlert size={19} />
        <div>
          <strong>اگر زنجیره‌ات شکست</strong>
          <p>
            اولین کار، جبران عقب‌ماندگی نیست. فقط فردا یک برنامه کوتاه‌تر بگذار و زنجیره را از نو شروع کن. افتادن بخشی
            از مسیر است؛ مهم ادامه دادن است.
          </p>
        </div>
      </div>
    </div>
  );
}
