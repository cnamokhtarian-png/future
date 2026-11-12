"use client";

import { useState } from "react";
import { Flame, Award, CalendarDays, TrendingUp, Check, Zap, Info, Moon, Footprints, Cigarette, Wallet, ChevronLeft, Quote, BookOpen, Leaf, ShieldCheck } from "lucide-react";
import { fa, todayKey, type Workspace } from "@/lib/types";
import { programRules, programContext, effectiveCompleted, programStreak, recentProgramSnapshots, autoDoneFor, PROGRAM_LENGTH, PROGRAM_NAME, type ProgramRule } from "@/lib/program";
import { IconBox, Progress, type Mutate } from "@/components/ui";

const WEEKDAY = new Intl.DateTimeFormat("fa-IR", { weekday: "narrow", timeZone: "Asia/Tehran" });

function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null;
}

export function DevelopmentView({ data, mutate, busy }: { data: Workspace; mutate: Mutate; busy: boolean }) {
  const today = todayKey();
  const context = programContext(data);
  const todayRow = data.programDays.find((row) => row.day === today);
  const manual = todayRow?.completed || [];
  const effective = new Set(effectiveCompleted(manual, context));
  const doneCount = effective.size;
  const percent = Math.round(doneCount / programRules.length * 100);
  const challenge = programStreak(data);
  const snapshots = recentProgramSnapshots(data, 14);
  const weekAverage = Math.round(snapshots.slice(-7).reduce((sum, day) => sum + day.percent, 0) / 7);
  const [gratitude, setGratitude] = useState(todayRow?.note || "");
  const [review, setReview] = useState("");

  const toggle = (rule: ProgramRule) => {
    if (autoDoneFor(rule, context) || busy) return;
    const next = manual.includes(rule.id) ? manual.filter((item) => item !== rule.id) : [...manual, rule.id];
    void mutate({ action: "program.save", completed: next, note: todayRow?.note || "" }, "ثبت شد.");
  };

  const saveGratitude = () => {
    void mutate({ action: "program.save", completed: manual, note: gratitude }, "جمله‌ی امروزت ذخیره شد.");
  };

  const saveWeeklyReview = () => {
    const body = review.trim();
    if (!body) return;
    const weekLabel = new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", month: "long", day: "numeric" }).format(new Date());
    void mutate({ action: "note.save", title: `مرور هفتگی چالش — ${weekLabel}`, body }, "مرور هفتگی‌ات در یادداشت‌ها ثبت شد.");
    setReview("");
  };

  // «بهبود قابل دیدن»: مقایسه‌ی ۷ روز اخیر با ۷ روز قبل از آن
  const sortedDays = [...data.checkins].map((entry) => entry.day).sort();
  const recent7 = sortedDays.slice(-7);
  const previous7 = sortedDays.slice(-14, -7);
  const checkinByDay = new Map(data.checkins.map((entry) => [entry.day, entry]));
  const avgMoodRecent = average(recent7.map((day) => checkinByDay.get(day)!.mood));
  const avgMoodPrevious = average(previous7.map((day) => checkinByDay.get(day)!.mood));
  const sleepRecent = average(recent7.map((day) => checkinByDay.get(day)!.sleepHours).filter((value): value is number => value != null));
  const sleepPrevious = average(previous7.map((day) => checkinByDay.get(day)!.sleepHours).filter((value): value is number => value != null));
  const cigRecent = average(recent7.map((day) => checkinByDay.get(day)!.cigarettes).filter((value): value is number => value != null));
  const cigPrevious = average(previous7.map((day) => checkinByDay.get(day)!.cigarettes).filter((value): value is number => value != null));
  const weekRulesRecent = Math.round(snapshots.slice(-7).reduce((sum, day) => sum + day.percent, 0) / 7);
  const weekRulesPrevious = Math.round(snapshots.slice(0, 7).reduce((sum, day) => sum + day.percent, 0) / 7);

  const deltas = [
    { label: "حال روزانه (میانگین)", recent: avgMoodRecent, previous: avgMoodPrevious, unit: "از ۵", betterWhenHigher: true, icon: Zap, color: "purple" as const },
    { label: "خواب (ساعت)", recent: sleepRecent, previous: sleepPrevious, unit: "ساعت", betterWhenHigher: true, icon: Moon, color: "blue" as const },
    { label: "سیگار (نخ در روز)", recent: cigRecent, previous: cigPrevious, unit: "نخ", betterWhenHigher: false, icon: Cigarette, color: "peach" as const },
    { label: "قوانین چالش (٪)", recent: weekRulesRecent, previous: weekRulesPrevious, unit: "٪", betterWhenHigher: true, icon: Flame, color: "green" as const },
  ];

  return <div className="view-stack">
    <div className="info-banner"><span className="info-banner-icon"><Flame size={24} /></span><div><h3>سخت‌گیرانه، اما استاندارد؛ نه خودآزاری</h3><p>این برنامه از ترکیبِ «چالش ۷۵ روزه» (اندی کاوی)، Atomic Habits (جیمز کلیر)، Implementation Intentions و «آیین خاموش‌سازی» (کال نیوپورت) ساخته شده؛ قانون ثابت است، تو تصمیم می‌گیری که بمانی یا برگردی.</p></div><span className="pill purple">روز {fa(challenge.dayNumber)} از {fa(PROGRAM_LENGTH)}</span></div>

    <section className="panel program-hero">
      <div className="commitment-main">
        <div className="streak-ring program-ring" style={{ ["--ring" as string]: `${percent}` }}><svg viewBox="0 0 120 120" aria-hidden="true"><circle cx="60" cy="60" r="52" className="ring-track" /><circle cx="60" cy="60" r="52" className="ring-value" /></svg><div className="streak-center"><strong>{fa(doneCount)}</strong><span>از {fa(programRules.length)} قانون امروز</span></div></div>
        <div className="commitment-copy">
          <span className="eyebrow purple-text">{PROGRAM_NAME}</span>
          <h2>{percent === 100 ? "امروز هیچ قانونی را نشکستی. فردا همین را تکرار کن." : doneCount === 0 ? "هر روز صفر، یک تصمیم تازه است؛ از همین حالا شروع کن." : `${fa(doneCount)} قانون از ${fa(programRules.length)} انجام شده؛ زنجیره‌ات در دستان همین امروز است.`}</h2>
          <p>قانون‌ها تغییر نمی‌کنند؛ سختی‌شان دقیقاً همان چیزی است که آرامش می‌سازد. اگر روزی شکست خوردی، از روز بعد و با تمام قوانین ادامه بده — «همین فردا» دروغی است که دو سال است شنیده‌ای.</p>
          <div className="commitment-status">{percent === 100 ? <span className="met-tag"><Check size={13} /> روز کامل شد.</span> : <span className="pending-tag"><Footprints size={13} /> {fa(programRules.length - doneCount)} قانون تا روز کامل مانده است.</span>}<span className="goal-note">تعهد هفتگی: {fa(weekAverage)}٪</span></div>
        </div>
      </div>
      <div className="commitment-side">
        {[{ label: "زنجیره فعلی", value: fa(challenge.streak), hint: "روز", icon: Flame, color: "peach" }, { label: "بهترین زنجیره", value: fa(challenge.best), hint: "روز", icon: Award, color: "purple" }, { label: "روزهای کامل", value: fa(challenge.completedDays), hint: "از شروع", icon: CalendarDays, color: "green" }].map((item) => <div key={item.label}><IconBox icon={item.icon} color={item.color} /><div><strong>{item.value} <small>{item.hint}</small></strong><span>{item.label}</span></div></div>)}
      </div>
    </section>

    <section className="panel">
      <div className="section-heading"><div><h2>قوانین امروز <span className="count-badge">{fa(doneCount)}/{fa(programRules.length)}</span></h2><p>کارهایی که «خودکار» علامت خورده‌اند، مستقیم از چک‌این و ثبت‌های امروزت خوانده می‌شوند. بقیه را خودت تیک بزن.</p></div><span className="pill green"><ShieldCheck size={13} /> روز {fa(challenge.dayNumber)}</span></div>
      <div className="rule-list">{programRules.map((rule) => {
        const auto = autoDoneFor(rule, context);
        const checked = effective.has(rule.id);
        const isAutoRule = Boolean(rule.auto);
        return <button key={rule.id} className={`rule-row ${checked ? "done" : ""} ${auto ? "auto" : ""}`} onClick={() => toggle(rule)} disabled={busy || auto} aria-pressed={checked} aria-label={rule.title}>
          <span className="rule-checkbox">{checked && <Check size={14} strokeWidth={3} />}</span>
          <span className="rule-text"><strong>{rule.title}</strong><small>{rule.detail}</small></span>
          {isAutoRule && <span className="pill blue rule-auto-pill">{auto ? "خودکار ✓" : "خودکار · از چک‌این"}</span>}
        </button>;
      })}</div>

      <div className="gratitude-row"><div className="section-heading compact"><div><h3>یک جمله درباره‌ی امروز + سه شکرگزاری</h3><p>همین یک دقیقه، فاصله‌ی بین «زندگی کردن» و «توجه کردن» است.</p></div></div><textarea rows={2} value={gratitude} onChange={(event) => setGratitude(event.target.value)} maxLength={5000} placeholder="امروز…" aria-label="یک جمله درباره امروز" /><button className="button outline small" disabled={busy} onClick={saveGratitude}><Check size={14} /> ذخیره جمله امروز</button></div>

      <div className="program-14day">{snapshots.map((day, index) => {
        const isToday = day.day === today;
        return <div className={`day-cell ${day.percent === 100 ? "full" : day.percent >= 50 ? "half" : day.percent > 0 ? "low" : ""} ${isToday ? "today" : ""}`} key={day.day} title={`${day.percent}٪ — ${fa(day.done)} از ${fa(day.total)} قانون`}><span className="day-cell-percent">{day.percent === 100 ? <Check size={13} strokeWidth={3} /> : fa(day.percent)}</span><span className="day-cell-weekday">{WEEKDAY.format(new Date(`${day.day}T12:00:00Z`))}</span></div>;
      })}</div>
      <p className="field-help">۱۴ روز اخیر؛ هر خانه یک روز است. خانه‌های سبز کامل یعنی آن روز هیچ قانونی نشکستی.</p>
    </section>

    <section className="panel">
      <div className="section-heading"><div><h2>بهبود را ببین، نه فقط حس کن</h2><p>مقایسه‌ی ۷ روز اخیر با ۷ روز قبل از آن — مستقیم از چک‌این‌ها و ثبت‌های خودت.</p></div><TrendingUp size={18} className="purple-text" /></div>
      <div className="delta-grid">{deltas.map((delta) => {
        const hasData = delta.recent != null && delta.previous != null;
        const change = hasData ? Number((delta.recent! - delta.previous!).toFixed(1)) : null;
        const improved = hasData && change !== 0 ? (delta.betterWhenHigher ? change! > 0 : change! < 0) : null;
        return <div className="delta-card" key={delta.label}><span className="delta-icon"><delta.icon size={16} strokeWidth={1.8} /></span><div><span className="delta-label">{delta.label}</span><strong>{delta.recent != null ? `${fa(Math.round(delta.recent * 10) / 10)} <small>{delta.unit}</small>` : "—"}</strong><span className={`delta-change ${improved === true ? "better" : improved === false ? "worse" : "flat"}`}>{hasData ? (change === 0 ? "بدون تغییر نسبت به هفته قبل" : `${change! > 0 ? "+" : ""}${fa(change!)} نسبت به ۷ روز قبل`) : "هنوز داده کافی نیست؛ چک‌این‌ها را ادامه بده"}</span></div></div>;
      })}</div>
    </section>

    <section className="panel weekly-review">
      <div className="section-heading"><div><h2>مرور هفتگی (۱۰ دقیقه، یکشنبه‌ها)</h2><p>کال نیوپورت می‌گوید: هفته‌ای که مرور نشود، تکرار می‌شود. این چهار سؤال را جواب بده و پاسخت در یادداشت‌ها ثبت می‌شود:</p></div><Quote size={18} className="purple-text" /></div>
      <ol className="review-questions"><li>این هفته چه چیزی را کامل کردم که هفته‌های قبل نمی‌توانستم؟</li><li>بزرگ‌ترین اصطکاک یا بهانه‌ی این هفته چه بود و ریشه‌اش چه بود؟</li><li>برای هفته‌ی آینده، کدام قانونِ چالش بیشتر در خطر شکستن است و نقشه‌ی من چیست؟</li><li>این هفته از نظر مالی چه درسی گرفتم؟ (خرج واقعی در برابر درآمد)</li></ol>
      <textarea rows={4} value={review} onChange={(event) => setReview(event.target.value)} placeholder="اینجا بنویس…" aria-label="پاسخ‌های مرور هفتگی" /><div className="review-actions"><button className="button primary small" disabled={busy || !review.trim()} onClick={saveWeeklyReview}><Check size={14} /> ذخیره در یادداشت‌ها</button><button className="text-button" onClick={() => setReview("")}>پاک کردن<ChevronLeft size={13} /></button></div>
    </section>

    <div className="medical-note"><Info size={19} /><div><strong>یک برنامه سخت، جای درمان نیست.</strong><p>«چالش ۷۵ روزه» ابزار انضباط است، نه درمان افسردگی، اضطراب یا اعتیاد. اگر خلق، خواب یا میلت به آسیب جدی تغییر کرد، فوراً با روان‌شناس، روان‌پزشک یا اورژانس (۱۱۵) / اورژانس اجتماعی (۱۲۳) تماس بگیر. قطع ناگهانی الکل در مصرف سنگین و منظم، خطرناک است و باید با ارزیابی پزشک انجام شود. ورزش را اگر بیماری قلبی یا محدودیت حرکتی داری، فقط با نظر پزشک شروع کن.</p></div></div>

    <div className="source-grid program-sources">
      {[{ title: "75 Hard", text: "اندی کاوی؛ ۷۵ روز بدون استثنا: رژیم مشخص، ورزش روزانه (یک نوبت بیرون)، ۱۰ صفحه کتاب، ثبت پیشرفت و یک گالون آب. نسخه‌ی اینجا بومی‌سازی شده و بخش درمان/تغذیه‌ای تند آن تعدیل شده است.", icon: Flame, color: "peach" as const },
        { title: "Atomic Habits", text: "جیمز کلیر؛ تغییر از طریق قوانین کوچک: عادت را آشکار کن، جذاب کن، ساده کن؛ و پاسخگویی به خودت ثبت روزانه است.", icon: Leaf, color: "green" as const },
        { title: "Deep Work و Shutdown Ritual", text: "کال نیوپورت؛ بلوک‌های تمرکز عمیقِ برنامه‌ریزی‌شده و خداحافظیِ رسمی با کار در پایان روز — جایی که «خواب قبل ۱۲» از آن می‌آید.", icon: BookOpen, color: "blue" as const },
        { title: "Implementation Intentions", text: "پیتر گولیتسر؛ برنامه‌ی اگر X رخ داد، آنگاه Y: برای لحظه‌های وسوسه (سیگار، خرج ناگهانی، گوشی) از قبل تصمیم بگیر، نه در لحظه.", icon: ShieldCheck, color: "purple" as const }].map((source) => <article className="panel source-card" key={source.title}><div className="card-top"><IconBox icon={source.icon} color={source.color} /></div><h3>{source.title}</h3><p>{source.text}</p></article>)}
    </div>
  </div>;
}
