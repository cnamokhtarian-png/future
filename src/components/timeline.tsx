"use client";

import { useMemo, useState, type ComponentType } from "react";
import {
  BookOpenCheck,
  BriefcaseBusiness,
  Circle,
  FolderKanban,
  Footprints,
  HeartPulse,
  History,
  NotebookPen,
  CalendarClock,
  Wallet,
  Users,
  Zap,
} from "lucide-react";
import { fa, todayKey, addDaysKey, type Workspace, type View } from "@/lib/types";

type FeedItem = { id: string; at: string; kind: string; summary: string };

const KIND_META: Record<string, { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }>; color: string; go?: View }> = {
  task: { label: "قدم‌ها", icon: Footprints, color: "purple", go: "today" },
  plan: { label: "برنامهٔ ساعتی", icon: CalendarClock, color: "blue", go: "today" },
  challenge: { label: "چالش ۷۵", icon: Zap, color: "peach", go: "development" },
  day: { label: "بستن روز", icon: BookOpenCheck, color: "green", go: "development" },
  finance: { label: "مالی", icon: Wallet, color: "green", go: "finance" },
  note: { label: "یادداشت‌ها", icon: NotebookPen, color: "blue", go: "notes" },
  checkin: { label: "حال و چک‌این", icon: HeartPulse, color: "peach", go: "health" },
  job: { label: "مسیر شغلی", icon: BriefcaseBusiness, color: "blue", go: "career" },
  project: { label: "پروژه‌ها", icon: FolderKanban, color: "peach", go: "projects" },
  social: { label: "مواجههٔ اجتماعی", icon: Users, color: "purple", go: "development" },
  settings: { label: "تنظیمات", icon: Circle, color: "blue" },
  system: { label: "سایر", icon: Circle, color: "blue" },
};

const kindOf = (kind: string) => KIND_META[kind] ?? KIND_META.system;

// ستون‌های timestamp با حالت string بدون منطقه‌ی زمانی برمی‌گردند؛ آن‌ها را UTC می‌خوانیم.
const parseAt = (raw: string) => {
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  return Date.parse(/[zZ]|[+-]\d{2}:?\d{2}$/.test(normalized) ? normalized : `${normalized}Z`);
};

const timeLabel = (raw: string) =>
  new Intl.DateTimeFormat("fa-IR", { hour: "2-digit", minute: "2-digit" }).format(new Date(parseAt(raw)));

const dayKeyOf = (raw: string) => {
  const date = new Date(parseAt(raw));
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
  return parts;
};

const dayHeading = (day: string) => {
  if (day === todayKey()) return "امروز";
  if (day === addDaysKey(todayKey(), -1)) return "دیروز";
  return new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long" }).format(
    new Date(`${day}T12:00:00+03:30`),
  );
};

// رویدادهای تاریخی (قبل از راه‌اندازی دفترچه): از همان داده‌هایی که از قبل هست ساخته می‌شود.
function derivedEvents(data: Workspace, cutoff: number | null): FeedItem[] {
  const items: FeedItem[] = [];
  const push = (at: string | null | undefined, kind: string, summary: string, id: string) => {
    if (!at) return;
    const time = parseAt(at);
    if (!Number.isFinite(time)) return;
    if (cutoff != null && time >= cutoff) return; // از این به بعد دفترچه‌ی اصلی ثبت شده
    items.push({ id, at, kind, summary });
  };
  for (const task of data.tasks) push(task.createdAt, "task", `قدم تازه به امروز اضافه شد: «${task.title}»`, `task-${task.id}`);
  for (const txn of data.transactions) {
    const label = txn.type === "income" ? "درآمد" : txn.type === "saving" ? "پس‌انداز" : "هزینه";
    push(txn.createdAt, "finance", `${label} ثبت شد: «${txn.title}»`, `tx-${txn.id}`);
  }
  for (const note of data.notes) push(note.createdAt, "note", `یادداشت: «${note.title}»`, `note-${note.id}`);
  for (const job of data.applications) push(job.createdAt, "job", `فرصت شغلی ثبت شد: «${job.role}» در ${job.company}`, `job-${job.id}`);
  for (const log of data.socialLogs) push(log.createdAt, "social", `مواجههٔ اجتماعی: «${log.title}»`, `social-${log.id}`);
  for (const entry of data.checkins) push(entry.updatedAt, "checkin", `چک‌این ثبت شد (${fa(entry.mood)} از ۵)`, `checkin-${entry.day}`);
  for (const row of data.programDays)
    push(row.updatedAt, "challenge", `قوانین چالش ثبت شد (${fa(row.completed.length)} قانون تیک‌خورده)`, `program-${row.day}`);
  for (const review of data.dailyReviews)
    push(review.createdAt, "day", `امروز بسته شد — ${fa(review.percent)}٪ روز کامل`, `review-${review.day}`);
  return items;
}

const MAX_ITEMS = 250;

export function TimelineView({ data, go }: { data: Workspace; go: (view: View) => void }) {
  const [filter, setFilter] = useState<string>("all");

  const all = useMemo(() => {
    const logged: FeedItem[] = data.activity.map((entry) => ({
      id: entry.id,
      at: entry.at,
      kind: entry.kind,
      summary: entry.summary,
    }));
    const cutoff = logged.length ? Math.min(...logged.map((entry) => parseAt(entry.at))) : null;
    const merged = [...logged, ...derivedEvents(data, cutoff)];
    merged.sort((a, b) => parseAt(b.at) - parseAt(a.at));
    return merged;
  }, [data]);

  const counts = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of all) map.set(item.kind, (map.get(item.kind) || 0) + 1);
    return map;
  }, [all]);

  const visibleKinds = useMemo(
    () => Object.keys(KIND_META).filter((kind) => counts.get(kind)),
    [counts],
  );

  const filtered = useMemo(() => {
    const list = filter === "all" ? all : all.filter((item) => item.kind === filter);
    return list.slice(0, MAX_ITEMS);
  }, [all, filter]);

  const groups = useMemo(() => {
    const map = new Map<string, FeedItem[]>();
    for (const item of filtered) {
      const key = dayKeyOf(item.at);
      const bucket = map.get(key);
      if (bucket) bucket.push(item);
      else map.set(key, [item]);
    }
    return [...map.entries()];
  }, [filtered]);

  const total = all.length;

  return (
    <div className="view-stack timeline-page">
      <section className="timeline-intro panel">
        <span className="timeline-intro-icon">
          <History size={22} />
        </span>
        <div>
          <h2>دفترچه‌ی تغییرات تو</h2>
          <p>
            هر تغییری که در این برنامه ذخیره می‌کنی — تیک قدم‌ها، ویرایش برنامه‌ی ساعتی، قوانین چالش، مالی و حال — این‌جا،
            به ترتیب زمان، جمع می‌شود. این دفترچه «فقط افزودنی» است؛ هیچ چیزی از آن پاک نمی‌شود.
          </p>
          <div className="timeline-intro-meta">
            <span className="pill purple">{fa(total)} رویداد ثبت‌شده</span>
            <span className="pill">به‌ترتیبِ جدید به قدیم</span>
          </div>
        </div>
      </section>

      <div className="timeline-filters" role="group" aria-label="فیلتر نوع تغییر">
        <button className={`timeline-filter ${filter === "all" ? "active" : ""}`} onClick={() => setFilter("all")}>
          همه <span>{fa(total)}</span>
        </button>
        {visibleKinds.map((kind) => {
          const meta = kindOf(kind);
          return (
            <button
              key={kind}
              className={`timeline-filter ${filter === kind ? "active" : ""}`}
              onClick={() => setFilter(kind)}
            >
              {meta.label} <span>{fa(counts.get(kind) || 0)}</span>
            </button>
          );
        })}
      </div>

      {groups.length === 0 ? (
        <section className="panel timeline-empty">
          <History size={30} strokeWidth={1.5} />
          <h3>هنوز تغییری ثبت نشده</h3>
          <p>با اولین تیک یا ثبت، این دفترچه شروع می‌شود. تغییرات امشب این‌جا جمع می‌شود.</p>
        </section>
      ) : (
        <div className="timeline-groups">
          {groups.map(([day, items]) => (
            <section key={day} className="timeline-group" aria-label={dayHeading(day)}>
              <div className="timeline-day-head">
                <span className="timeline-day-label">{dayHeading(day)}</span>
                <span className="timeline-day-line" aria-hidden="true" />
                <span className="timeline-day-count">{fa(items.length)} تغییر</span>
              </div>
              <ol className="timeline-list">
                {items.map((item) => {
                  const meta = kindOf(item.kind);
                  const Icon = meta.icon;
                  const target = meta.go;
                  const body = (
                    <>
                      <span className={`timeline-dot ${meta.color}`}>
                        <Icon size={15} strokeWidth={1.8} />
                      </span>
                      <span className="timeline-copy">
                        <span className="timeline-summary">{item.summary}</span>
                        <span className="timeline-meta">
                          <span className={`timeline-kind ${meta.color}`}>{meta.label}</span>
                          {timeLabel(item.at)}
                        </span>
                      </span>
                    </>
                  );
                  return (
                    <li key={item.id}>
                      {target ? (
                        <button className="timeline-item" onClick={() => go(target)} title="رفتن به صفحه‌ی مرتبط">
                          {body}
                        </button>
                      ) : (
                        <div className="timeline-item static">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ol>
            </section>
          ))}
          {all.length > MAX_ITEMS && (
            <p className="timeline-more">تنها {fa(MAX_ITEMS)} رویداد اخیر نمایش داده می‌شود.</p>
          )}
        </div>
      )}
    </div>
  );
}
