"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { X, Check, ArrowLeft, Heart, Leaf, Moon, Footprints, Cigarette, type LucideIcon } from "lucide-react";
import { fa, type Checkin, type Mutation } from "@/lib/types";

export type Mutate = (input: Mutation, message?: string) => Promise<boolean>;

export function IconBox({ icon: Icon, color = "purple", className = "" }: { icon: LucideIcon; color?: string; className?: string }) {
  return <span className={`icon-box ${color} ${className}`}><Icon size={21} strokeWidth={1.7} /></span>;
}

export function Progress({ value, color = "purple" }: { value: number; color?: string }) {
  return <div className={`progress-track ${color}`} role="progressbar" aria-label="پیشرفت" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function Modal({ title, subtitle, children, onClose, wide = false }: { title: string; subtitle?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const heading = useId();
  const dialog = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const original = document.activeElement as HTMLElement | null;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.current?.querySelector<HTMLElement>("button, input, textarea")?.focus();
    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
      if (event.key === "Tab") {
        const elements = dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href]');
        if (!elements?.length) return;
        const first = elements[0], last = elements[elements.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener("keydown", handleKey);
    return () => { document.body.style.overflow = oldOverflow; document.removeEventListener("keydown", handleKey); original?.focus(); };
  }, []);
  return <div className="modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`modal ${wide ? "modal-wide" : ""}`} ref={dialog} role="dialog" aria-modal="true" aria-labelledby={heading}><div className="modal-heading"><div><h2 id={heading}>{title}</h2>{subtitle && <p>{subtitle}</p>}</div><button className="icon-button" onClick={onClose} aria-label="بستن پنجره"><X size={20} /></button></div>{children}</div></div>;
}

export function EmptyState({ icon: Icon, title, text, children }: { icon: LucideIcon; title: string; text: string; children?: ReactNode }) {
  return <div className="empty-state"><IconBox icon={Icon} /><h3>{title}</h3><p>{text}</p>{children}</div>;
}

export function MoodFace({ value, selected = false }: { value: number; selected?: boolean }) {
  const colors = ["#d6a892", "#b5a5ba", "#b49c66", "#8ca68b", "#9980ba"];
  const color = selected ? "#8660b7" : colors[value - 1];
  const mouths = ["M 15 27 Q 22 18 29 27", "M 16 26 Q 22 21 28 26", "M 16 25 L 28 25", "M 15 23 Q 22 31 29 23", "M 14 22 Q 22 34 30 22 Z"];
  return <svg viewBox="0 0 44 44" width="41" height="41" fill="none" aria-hidden="true"><circle cx="22" cy="22" r="18.5" fill={selected ? "#ede4fa" : `${color}14`} stroke={color} strokeWidth="1.6" /><circle cx="16" cy="17" r="1.5" fill={color} /><circle cx="28" cy="17" r="1.5" fill={color} /><path d={mouths[value - 1]} stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" fill={value === 5 ? `${color}24` : "none"} /></svg>;
}

export function DailyCheckin({ checkin, mutate, busy, expanded = false }: { checkin?: Checkin; mutate: Mutate; busy: boolean; expanded?: boolean }) {
  const [mood, setMood] = useState(checkin?.mood || 0);
  const [note, setNote] = useState(checkin?.note || "");
  const [habits, setHabits] = useState({ cannabisFree: checkin?.cannabisFree || false, alcoholFree: checkin?.alcoholFree || false, walked: checkin?.walked || false });
  const [sleep, setSleep] = useState(checkin?.sleepHours?.toString() || "");
  const [cigarettes, setCigarettes] = useState(checkin?.cigarettes?.toString() || "");
  const [error, setError] = useState("");
  useEffect(() => {
    setMood(checkin?.mood || 0); setNote(checkin?.note || "");
    setHabits({ cannabisFree: checkin?.cannabisFree || false, alcoholFree: checkin?.alcoholFree || false, walked: checkin?.walked || false });
    setSleep(checkin?.sleepHours?.toString() || ""); setCigarettes(checkin?.cigarettes?.toString() || "");
  }, [checkin?.updatedAt, checkin?.mood, checkin?.note, checkin?.cannabisFree, checkin?.alcoholFree, checkin?.walked, checkin?.sleepHours, checkin?.cigarettes]);
  const labels = ["خسته‌ام", "دلگیرم", "معمولی", "خوبم", "عالی‌ام"];
  return <form className={`checkin-form ${expanded ? "expanded" : ""}`} onSubmit={async (event) => {
    event.preventDefault();
    if (!mood) { setError("اول حسی را که به حالت نزدیک‌تره انتخاب کن."); return; }
    setError("");
    await mutate({ action: "checkin.save", mood, note, ...(expanded ? { ...habits, sleepHours: sleep === "" ? null : Number(sleep), cigarettes: cigarettes === "" ? null : Number(cigarettes) } : {}) }, "حال امروزت ثبت شد. ممنون که به خودت توجه کردی.");
  }}>
    <div className="mood-options" role="group" aria-label="حال امروز"><span className="sr-only">یک حس را انتخاب کن</span>{labels.map((label, index) => <button type="button" key={label} aria-pressed={mood === index + 1} className={`mood-option ${mood === index + 1 ? "selected" : ""}`} onClick={() => { setMood(index + 1); setError(""); }}><MoodFace value={index + 1} selected={mood === index + 1} /><span>{label}</span></button>)}</div>
    <textarea aria-label="یادداشت حال امروز" placeholder="اگه دوست داشتی، از امروزت بنویس..." value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} rows={expanded ? 4 : 2} />
    {expanded && <><div className="habit-fields">{[{ key: "cannabisFree" as const, title: "امروز کانابیس مصرف نکردم", icon: Leaf }, { key: "alcoholFree" as const, title: "امروز الکل مصرف نکردم", icon: Heart }, { key: "walked" as const, title: "کمی حرکت یا پیاده‌روی داشتم", icon: Footprints }].map(({ key, title, icon: Icon }) => <label key={key} className={`habit-check ${habits[key] ? "checked" : ""}`}><input type="checkbox" checked={habits[key]} onChange={(event) => setHabits({ ...habits, [key]: event.target.checked })} /><Icon size={18} /><span>{title}</span><span className="habit-check-mark">{habits[key] && <Check size={13} />}</span></label>)}</div><div className="form-grid"><label><span><Moon size={15} /> ساعت خواب</span><input type="number" value={sleep} onChange={(event) => setSleep(event.target.value)} min={0} max={24} placeholder="اختیاری؛ مثلاً ۷" /></label><label><span><Cigarette size={15} /> تعداد سیگار</span><input type="number" value={cigarettes} onChange={(event) => setCigarettes(event.target.value)} min={0} max={200} placeholder="فقط برای شناخت الگو" /></label></div><p className="field-help">تیک‌نزدن یک مورد، به معنی شکست نیست. ثبت صادقانه مهم‌تر از یک زنجیره بی‌نقص است.</p></>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <button className={`button ${expanded ? "primary" : "soft"} checkin-submit`} disabled={busy} type="submit">{busy ? "در حال ذخیره..." : checkin ? "به‌روزرسانی حال امروز" : "ثبت حال امروز"}<ArrowLeft size={15} /></button>
    {!expanded && <p className="gentle-note"><Heart size={12} /> همه روزها لازم نیست روزهای فوق‌العاده‌ای باشن.</p>}
  </form>;
}

export function PersianDate({ value }: { value: string }) {
  return <time dateTime={value}>{new Intl.DateTimeFormat("fa-IR", { month: "short", day: "numeric" }).format(new Date(value))}</time>;
}

export function Money({ amount }: { amount: number }) {
  return <span className="money">{fa(amount)} <small>تومان</small></span>;
}
