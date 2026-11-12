"use client";

import { Heart, Leaf, CalendarDays, Sprout, Info } from "lucide-react";
import { fa, todayKey, type Workspace } from "@/lib/types";
import { DailyCheckin, MoodFace, IconBox, type Mutate } from "@/components/ui";

export function HealthView({ data, mutate, busy }: { data: Workspace; mutate: Mutate; busy: boolean }) {
  const today = data.checkins.find((entry) => entry.day === todayKey());
  const days = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${todayKey()}T12:00:00Z`);
    date.setUTCDate(date.getUTCDate() - (6 - index));
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("fa-IR", { weekday: "short" }).format(date),
    };
  });
  return (
    <div className="view-stack">
      <div className="info-banner green-banner">
        <IconBox icon={Heart} color="green" />
        <div>
          <h3>قرار نیست با خودت بجنگی؛ قرار است کنارت باشی.</h3>
          <p>
            در هفته اول، خواب، غذا، کمی حرکت و کمک گرفتن مهم‌تر از برنامه‌های سنگین‌اند. ثبت روزانه، مسابقه پاک‌ماندن
            نیست.
          </p>
        </div>
      </div>
      <div className="health-grid">
        <section className="panel">
          <div className="section-heading">
            <div>
              <h2>امروز واقعاً چطوری؟</h2>
              <p>یک ثبت کوتاه، بدون قضاوت و بدون نمره دادن به خودت.</p>
            </div>
            <Heart size={20} className="purple-text" />
          </div>
          <DailyCheckin checkin={today} mutate={mutate} busy={busy} expanded />
        </section>
        <div className="view-stack">
          <section className="panel mood-history">
            <div className="section-heading">
              <div>
                <h2>ردّ حال تو در این هفته</h2>
                <p>هر حال و احساسی، جایی در این مسیر دارد.</p>
              </div>
              <CalendarDays size={19} className="muted" />
            </div>
            <div className="mood-chart">
              {days.map((day) => {
                const entry = data.checkins.find((item) => item.day === day.key);
                return (
                  <div className="mood-bar-column" key={day.key}>
                    <div className={`mood-bar-track ${!entry ? "unrecorded" : ""}`}>
                      {entry && (
                        <>
                          <span style={{ height: `${entry.mood * 20}%` }} />
                          <div className="mood-bar-face" style={{ bottom: `calc(${entry.mood * 20}% - 15px)` }}>
                            <MoodFace value={entry.mood} selected />
                          </div>
                        </>
                      )}
                    </div>
                    <span>{day.label}</span>
                  </div>
                );
              })}
            </div>
            <p className="field-help chart-help">روزهای خط‌چین هنوز ثبت نشده‌اند؛ جاهای خالی، شکست نیستند.</p>
          </section>
          <section className="panel health-small-stats">
            <div>
              <IconBox icon={Leaf} color="green" />
              <strong>
                {fa(data.checkins.filter((entry) => entry.cannabisFree).length)} <small>روز ثبت‌شده بدون کانابیس</small>
              </strong>
            </div>
            <div>
              <IconBox icon={Heart} color="peach" />
              <strong>
                {fa(data.checkins.length)} <small>بار توجه به حال خودت</small>
              </strong>
            </div>
          </section>
          <div className="notice">
            <Leaf size={19} />
            <p>
              <strong>وقتی میل مصرف آمد:</strong> تصمیم را ۱۰ دقیقه عقب بینداز، از موقعیت محرک فاصله بگیر، کمی راه برو و
              به یک فرد امن پیام بده. اگر لغزشی رخ داد، محرک را ثبت کن و از قدم بعدی ادامه بده.
            </p>
          </div>
        </div>
      </div>
      <div className="health-advice-grid">
        <article className="panel">
          <IconBox icon={Leaf} color="green" />
          <h3>هفته اول را سبک‌تر بگیر</h3>
          <p>
            پس از قطع کانابیس، بی‌قراری و تغییر خواب ممکن است پیش بیاید. در مصرف منظم، علائم گاهی چند هفته می‌مانند.
            برای علائم شدید یا پایدار از پزشک یا متخصص اعتیاد کمک بگیر؛ خوددرمانی نکن.
          </p>
        </article>
        <article className="panel">
          <IconBox icon={Heart} color="peach" />
          <h3>ارزش تو به یک رفتار وابسته نیست</h3>
          <p>
            خودارضایی به‌خودی‌خود بیماری یا عامل اثبات‌شده ضعف ذهن نیست. تصمیم به تغییرش شخصی است؛ تمرکز را روی اختیار،
            ارزش‌ها و اثرش بر زندگی بگذار، نه شرم و ترس.
          </p>
        </article>
        <article className="panel">
          <IconBox icon={Sprout} color="purple" />
          <h3>همه تغییرها را هم‌زمان شروع نکن</h3>
          <p>
            ترک سیگار ارزشمند است، اما لازم نیست همین امروز بار همه تغییرها را برداری. فعلاً الگو را ثبت کن و وقتی آماده
            شدی، با کمک متخصص برنامه مشخص و حمایتی بساز.
          </p>
        </article>
      </div>
      <div className="medical-note">
        <Info size={19} />
        <div>
          <strong>این ابزار جای درمان یا ارزیابی پزشکی نیست.</strong>
          <p>
            اگر مصرف الکل سنگین و منظم داشته‌ای، قطع ناگهانی ممکن است خطرناک باشد و نیاز به نظارت پزشکی دارد. گیجی،
            تشنج، توهم، یا فکر آسیب به خود نیازمند کمک فوری پزشکی است؛ تنها نمان. اضطراب یا بی‌خوابی شدید و مداوم هم
            باید بررسی شود.
          </p>
        </div>
      </div>
    </div>
  );
}
