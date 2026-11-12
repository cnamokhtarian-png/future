"use client";

import { useState } from "react";
import {
  ArrowUpLeft,
  BriefcaseBusiness,
  Factory,
  ShieldCheck,
  Search,
  Plus,
  Lightbulb,
  ExternalLink,
  Trash2,
} from "lucide-react";
import { jobPaths } from "@/lib/content";
import { fa, statusLabels, type Workspace, type Mutation } from "@/lib/types";
import { PersianDate, EmptyState, IconBox, type Mutate } from "@/components/ui";

export function CareerView({
  data,
  mutate,
  onAdd,
  onDelete,
  busy,
}: {
  data: Workspace;
  mutate: Mutate;
  onAdd: () => void;
  onDelete: (action: Mutation, message: string) => void;
  busy: boolean;
}) {
  const [filter, setFilter] = useState("all");
  const jobs = data.applications.filter((job) => filter === "all" || job.status === filter);
  return (
    <div className="view-stack">
      <div className="info-banner">
        <IconBox icon={BriefcaseBusiness} />
        <div>
          <h3>منتظر یک جواب نمان؛ فرصت بعدی را بساز.</h3>
          <p>فعلاً هدف، شغلی با درآمد قابل اتکا است. کار دیجیتال را در کنار آن، کوچک و کم‌هزینه آزمایش کن.</p>
        </div>
      </div>
      <div className="path-grid">
        {jobPaths.map((path, index) => (
          <article className="panel job-path" key={path.title}>
            <div className="card-top">
              <IconBox icon={[BriefcaseBusiness, Factory, ShieldCheck][index]} color={path.color} />
              <span className={`pill ${path.color}`}>{path.tag}</span>
            </div>
            <h3>{path.title}</h3>
            <p>{path.text}</p>
            <div className="search-terms">
              <Search size={14} />
              <span>{path.search}</span>
            </div>
          </article>
        ))}
      </div>
      <section className="panel">
        <div className="section-heading">
          <div>
            <h2>
              فرصت‌های شغلی من <span className="count-badge">{fa(data.applications.length)}</span>
            </h2>
            <p>مصاحبه‌های قبلی‌ات را هم ثبت کن تا زمان پیگیری‌شان گم نشود.</p>
          </div>
          <button className="button primary small" onClick={onAdd}>
            <Plus size={16} /> ثبت فرصت جدید
          </button>
        </div>
        <div className="filter-tabs">
          {[
            { key: "all", label: "همه فرصت‌ها" },
            { key: "applied", label: "ارسال رزومه" },
            { key: "interview", label: "مصاحبه" },
            { key: "waiting", label: "منتظر پاسخ" },
            { key: "offer", label: "پیشنهاد همکاری" },
            { key: "planned", label: "برای اقدام" },
            { key: "rejected", label: "بسته‌شده" },
          ].map((tab) => (
            <button key={tab.key} onClick={() => setFilter(tab.key)} className={filter === tab.key ? "active" : ""}>
              {tab.label}
            </button>
          ))}
        </div>
        {!jobs.length ? (
          <EmptyState
            icon={BriefcaseBusiness}
            title={filter === "all" ? "فرصت بعدی از همین‌جا شروع می‌شه" : "هنوز فرصتی در این وضعیت نداری"}
            text={
              filter === "all"
                ? "عنوان شغل، نام شرکت و وضعیت مصاحبه‌ات را ثبت کن. فعلاً اطلاعاتی از مصاحبه‌هایت حدس نزده‌ایم."
                : "فیلتر دیگری را انتخاب کن یا یک فرصت جدید اضافه کن."
            }
          >
            <button className="button outline small" onClick={onAdd}>
              <Plus size={15} /> اولین فرصت را ثبت کن
            </button>
          </EmptyState>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>شغل و شرکت</th>
                  <th>وضعیت پیگیری</th>
                  <th>تاریخ ثبت</th>
                  <th>اقدامات</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>
                      <strong>{job.role}</strong>
                      <span className="table-subtext">{job.company}</span>
                      {job.note && <p className="job-note">{job.note}</p>}
                    </td>
                    <td>
                      <select
                        className={`status-select status-${job.status}`}
                        value={job.status}
                        disabled={busy}
                        aria-label={`وضعیت ${job.role}`}
                        onChange={(event) =>
                          mutate(
                            { action: "job.update", id: job.id, status: event.target.value },
                            "وضعیت فرصت شغلی به‌روز شد.",
                          )
                        }
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <PersianDate value={job.createdAt} />
                    </td>
                    <td>
                      <div className="row-actions">
                        {job.url && (
                          <a
                            className="icon-button"
                            href={job.url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label="باز کردن آگهی"
                          >
                            <ExternalLink size={16} />
                          </a>
                        )}
                        <button
                          className="icon-button danger-hover"
                          onClick={() => onDelete({ action: "job.delete", id: job.id }, "این فرصت شغلی حذف شود؟")}
                          aria-label={`حذف ${job.role}`}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <div className="resource-strip">
        <div>
          <Search size={18} />
          <span>برای پیدا کردن آگهی‌های واقعی:</span>
        </div>
        <a href="https://jobinja.ir/jobs" target="_blank" rel="noreferrer">
          جابینجا <ArrowUpLeft size={14} />
        </a>
        <a href="https://jobvision.ir/jobs" target="_blank" rel="noreferrer">
          جاب‌ویژن <ArrowUpLeft size={14} />
        </a>
        <a href="https://www.e-estekhdam.com/" target="_blank" rel="noreferrer">
          ای‌استخدام <ArrowUpLeft size={14} />
        </a>
      </div>
      <div className="notice">
        <Lightbulb size={19} />
        <p>
          <strong>یک قاعده ساده برای این هفته:</strong> روزی ۲ درخواست متناسب، ۱ پیگیری محترمانه و ۳۰ دقیقه آماده‌سازی
          رزومه. آگهی‌های نیازمند پرداخت اولیه یا وعده درآمد تضمینی را جدی نگیر.
        </p>
      </div>
    </div>
  );
}
