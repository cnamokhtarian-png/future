"use client";

import { ArrowLeft, ArrowUpLeft, BookOpen, CircleHelp, ExternalLink, Info, Link2 } from "lucide-react";
import { resources } from "@/lib/content";
import type { View } from "@/lib/types";
import { IconBox } from "@/components/ui";

export function GuideView({ go }: { go: (view: View) => void }) {
  return (
    <div className="view-stack">
      <div className="info-banner">
        <IconBox icon={CircleHelp} />
        <div>
          <h3>این مسیر بر چه اساسی ساخته شده؟</h3>
          <p>
            بر تجربه‌ها و محدودیت‌هایی که گفتی، اقدام‌های کوچک و منابع عمومی معتبر؛ نه تشخیص شخصیت، وعده موفقیت یا درمان
            خودکار.
          </p>
        </div>
      </div>
      <section className="panel guide-intro">
        <h2>پیشنهاد اصلی برای تو</h2>
        <p>
          برای سه ماه آینده، مسیر اصلی تو «درآمد ثابت از تجربه موجود» است: امور اداری، تولید/چاپ و موقعیت‌های ورودی HSE
          مطابق شرایط مدرک. مسیر جانبی فقط «تکمیل فروشگاه کیف و یادگیری خطایابی وب» است. دانش‌بوک در نوبت بعد و ایجنت
          رمزارز صرفاً یک آزمایش آموزشی بدون پول واقعی می‌ماند.
        </p>
        <button className="button soft" onClick={() => go("roadmap")}>
          دیدن قدم‌های عملی <ArrowLeft size={15} />
        </button>
      </section>
      <div className="source-grid">
        {resources.map((resource) => (
          <a className="panel source-card" href={resource.url} key={resource.title} target="_blank" rel="noreferrer">
            <div className="card-top">
              <IconBox icon={BookOpen} color="blue" />
              <ArrowUpLeft size={18} />
            </div>
            <h3>{resource.title}</h3>
            <span className="source-name">{resource.source}</span>
            <p>{resource.text}</p>
            <span className="source-link">
              مطالعه منبع اصلی <ExternalLink size={13} />
            </span>
          </a>
        ))}
      </div>
      <div className="medical-note">
        <Info size={20} />
        <div>
          <strong>چه زمانی باید کمک تخصصی بگیری؟</strong>
          <p>
            اگر افت خلق، اضطراب یا اختلال خواب شدید است، ادامه پیدا می‌کند یا کارکرد روزانه‌ات را مختل کرده، مراجعه به
            روان‌شناس، روان‌پزشک یا پزشک توصیه می‌شود. برای توهم، تشنج، گیجی یا فکر آسیب به خود فوراً کمک پزشکی بگیر و
            تنها نمان. قطع مصرف سنگین و منظم الکل باید با ارزیابی پزشکی باشد.{" "}
            <a
              href="https://www.niaaa.nih.gov/publications/brochures-and-fact-sheets/treatment-alcohol-problems-finding-and-getting-help"
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "underline", textUnderlineOffset: 4 }}
            >
              راهنمای NIAAA درباره درمان و قطع مصرف الکل
            </a>
          </p>
        </div>
      </div>
      <p className="page-footnote">
        <Link2 size={14} /> منابع آموزشی‌اند و جای ارزیابی فردی را نمی‌گیرند. برای بازار کار و ثبت حقوقی پروژه، مقررات و
        شرایط روز را جداگانه بررسی کن.
      </p>
    </div>
  );
}
