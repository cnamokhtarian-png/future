"use client";

import { useState } from "react";
import { ShoppingBag, BookOpen, Info, ExternalLink, Check } from "lucide-react";
import { fa, projectProgress, type Project } from "@/lib/types";
import { Progress, type Mutate } from "@/components/ui";

export function ProjectDetails({ project, mutate, busy }: { project: Project; mutate: Mutate; busy: boolean }) {
  const [link, setLink] = useState(project.link);
  return (
    <div className="project-details">
      <p className="modal-intro">{project.description}</p>
      <div className="project-progress-label">
        <span>پیشرفت واقعی پروژه</span>
        <strong>{fa(projectProgress(project))}٪</strong>
      </div>
      <Progress value={projectProgress(project)} />
      <div className="project-step-list">
        {project.steps.map((step, index) => (
          <button
            className={`project-step ${step.done ? "done" : ""}`}
            key={step.title}
            role="checkbox"
            aria-checked={step.done}
            disabled={busy}
            onClick={() =>
              mutate({ action: "project.step", id: project.id, index, done: !step.done }, "مرحله پروژه به‌روز شد.")
            }
          >
            <span className="task-checkbox">{step.done && <Check size={14} />}</span>
            <span>{step.title}</span>
          </button>
        ))}
      </div>
      <form
        className="link-form"
        onSubmit={async (event) => {
          event.preventDefault();
          await mutate({ action: "project.link", id: project.id, link }, "لینک پروژه ذخیره شد.");
        }}
      >
        <label htmlFor="project-link">لینک نسخه آزمایشی یا مخزن پروژه</label>
        <div>
          <input
            id="project-link"
            type="url"
            dir="ltr"
            placeholder="https://..."
            value={link}
            onChange={(event) => setLink(event.target.value)}
            maxLength={2000}
          />
          <button className="button outline small" disabled={busy}>
            ذخیره لینک
          </button>
        </div>
        {project.link && (
          <a href={project.link} target="_blank" rel="noreferrer">
            مشاهده پروژه <ExternalLink size={13} />
          </a>
        )}
      </form>
      {project.id === "agent" ? (
        <div className="notice">
          <Info size={18} />
          <div>
            <strong>مسیر پیدا کردن خطا</strong>
            <p>
              ۱. همان درخواست ناموفق را تکرار و پیام خطا را ثبت کن. ۲. در Network، وضعیت HTTP و پاسخ سرور را ببین. ۳.
              کلید API و متغیر محیطی را فقط سمت سرور بررسی کن. ۴. با یک درخواست ساده و داده ساختگی، رابط کاربری را از
              سرویس جدا تست کن.
            </p>
            <p>
              فعلاً معامله واقعی، اهرم و سپردن کلید برداشت به ایجنت را کنار بگذار. درست کار کردن برنامه، تضمین سود نیست.
            </p>
          </div>
        </div>
      ) : project.id === "daneshbook" ? (
        <div className="notice">
          <BookOpen size={18} />
          <p>
            برای سابقه مالکیت، Git، مستندات و تاریخ انتشار را نگه دار. این کار جای ثبت قانونی یا بررسی نام تجاری را
            نمی‌گیرد. فقط محتوای دارای مجوز یا آثار خود کاربران را منتشر کن؛ ساخت اپ موبایل بعد از تأیید نیاز کاربران
            است.
          </p>
        </div>
      ) : (
        <div className="notice">
          <ShoppingBag size={18} />
          <p>
            برای شروع به دامنه و درگاه پرداخت نیاز نداری. نسخه رایگان با ۵ محصول و تماس برای سفارش کافی است؛ قبل از
            انتشار، رضایت مادر و درستی قیمت و موجودی را بررسی کن.
          </p>
        </div>
      )}
    </div>
  );
}
