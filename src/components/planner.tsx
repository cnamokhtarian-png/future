"use client";

import { useMemo, useState, type DragEvent } from "react";
import { GripVertical, Plus, Check, X, StickyNote, Sparkles, Lock, RotateCcw, ChevronUp, ChevronDown, PawPrint, ArrowUpLeft } from "lucide-react";
import { fa, todayKey, addDaysKey, type Workspace, type PlanItem } from "@/lib/types";
import { planKinds, planKindLabel, substitutePresets } from "@/lib/plan";
import type { Mutate } from "@/components/ui";

const dayLongLabel = (day: string) =>
  new Intl.DateTimeFormat("fa-IR", { timeZone: "Asia/Tehran", weekday: "long", day: "numeric", month: "long" }).format(new Date(`${day}T12:00:00+03:30`));

export function PlannerCard({ data, mutate, busy, todayClosed, onCloseToday }: { data: Workspace; mutate: Mutate; busy: boolean; todayClosed: boolean; onCloseToday: () => void }) {
  const today = todayKey();
  const todayItems = useMemo(
    () => data.planItems.filter((item) => item.day === today && !item.dropped).sort((a, b) => a.position - b.position || a.time.localeCompare(b.time)),
    [data.planItems, today],
  );
  const droppedItems = useMemo(
    () => data.planItems.filter((item) => item.day === today && item.dropped).sort((a, b) => a.position - b.position),
    [data.planItems, today],
  );
  const doneCount = todayItems.filter((item) => item.done).length;
  const percent = todayItems.length ? Math.round((doneCount / todayItems.length) * 100) : 0;
  // تمرکزی که دیشب مربی نوشته است (روی همان روزی است که الان در آن هستیم)
  const todayFocus = useMemo(() => {
    const review = data.dailyReviews.find((entry) => entry.focus && addDaysKey(entry.day, 1) === today);
    return review?.focus || null;
  }, [data.dailyReviews, today]);

  const [openNote, setOpenNote] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);

  const saveField = (item: PlanItem, patch: Record<string, unknown>, message = "ذخیره شد.") =>
    void mutate({ action: "plan.update", id: item.id, patch }, message);

  const reorderTo = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = todayItems.map((item) => item.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from === -1 || to === -1) return;
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    void mutate({ action: "plan.reorder", ids: next }, "ترتیب برنامه به‌روز شد.");
    setDragId(null);
  };

  const moveBy = (item: PlanItem, delta: -1 | 1) => {
    const ids = todayItems.map((entry) => entry.id);
    const index = ids.indexOf(item.id);
    const target = index + delta;
    if (index === -1 || target < 0 || target >= ids.length) return;
    const next = [...ids];
    [next[index], next[target]] = [next[target], next[index]];
    void mutate({ action: "plan.reorder", ids: next }, "ترتیب برنامه به‌روز شد.");
  };

  const substitute = (item: PlanItem, presetId: string) => {
    const preset = substitutePresets.find((entry) => entry.id === presetId);
    if (!preset) return;
    saveField(item, { title: preset.title, kind: preset.kind }, `«${item.title.slice(0, 40)}» با «${preset.title}» جایگزین شد.`);
  };

  const addItem = () => {
    const last = todayItems[todayItems.length - 1];
    const [h, m] = (last?.time || "09:00").split(":").map(Number);
    const time = `${String(Math.min(23, (h || 8) + 1)).padStart(2, "0")}:${String(Number.isFinite(m) ? m : 0).padStart(2, "0")}`;
    void mutate({ action: "plan.add", time, title: "فعالیت تازه", kind: "general" }, "ردیف تازه اضافه شد؛ متنش را بنویس.");
  };

  const drop = (event: DragEvent<HTMLLIElement>, targetId: string) => {
    event.preventDefault();
    reorderTo(targetId);
  };

  return (
    <section className="panel planner" aria-label="برنامه‌ریز امروز">
      <div className="planner-head">
        <span className="plan-card-icon"><Sparkles size={18} /></span>
        <div className="planner-copy">
          <span className="eyebrow purple-text">برنامه‌ریز امروز · مربی بالای سر همه‌چیز است</span>
          <h2>{dayLongLabel(today)}</h2>
          {todayFocus && <p className="plan-focus">تمرکز امروز: {todayFocus}</p>}
        </div>
        <div className="planner-head-actions">
          <button className="button outline small" disabled={busy} onClick={onCloseToday} title="بستن امروز و ثبت کارنامه"><Lock size={13} /> بستن و جمع‌بندی</button>
        </div>
      </div>

      {todayClosed && <div className="lock-banner compact"><Lock size={16} /><div><strong>امروز بسته است.</strong><p>برنامه‌ی امروز قفل شده؛ فقط می‌توانی کارنامه‌اش را در «جمع‌بندی» بخوانی.</p></div></div>}

      <div className="planner-toolbar">
        <div className="planner-progress" role="img" aria-label={`${doneCount} از ${todayItems.length} انجام شده`}>
          <span className="planner-progress-track"><span style={{ width: `${Math.max(percent, todayItems.length ? 3 : 0)}%` }} /></span>
          <span className="planner-progress-label"><strong>{fa(doneCount)}</strong> از {fa(todayItems.length)} انجام شده</span>
        </div>
        <button className="button primary small" disabled={busy || todayClosed} onClick={addItem}><Plus size={14} /> افزودن مورد</button>
      </div>

      {todayItems.length === 0 ? (
        <div className="planner-empty">
          <Sparkles size={26} />
          <h3>امروز هنوز ردیفی نداری</h3>
          <p>مربی بر اساس وضعیت همین روز برایت یک برنامه‌ی ساعتیِ آماده می‌نویسد، یا خودت ردیف‌ها را بچین.</p>
          <div className="planner-empty-actions">
            <button className="button primary" disabled={busy || todayClosed} onClick={() => void mutate({ action: "plan.generate" }, "برنامه‌ی امروزت نوشته شد.")}><Sparkles size={15} /> مربی برام بچینه</button>
            <button className="button outline" disabled={busy || todayClosed} onClick={addItem}><Plus size={15} /> خودم ردیف بسازم</button>
          </div>
        </div>
      ) : (
        <ul className="planner-list">
          {todayItems.map((item) => {
            const noteOpen = openNote === item.id;
            return (
              <li key={`${item.id}:${item.time}:${item.title}:${item.kind}:${item.done}:${item.note}`}
                  className={`plan-item ${item.done ? "done" : ""} ${dragId === item.id ? "dragging" : ""}`}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => drop(event, item.id)}>
                <button className="plan-drag" draggable={!busy && !todayClosed}
                  onDragStart={(event) => { setDragId(item.id); event.dataTransfer.effectAllowed = "move"; event.dataTransfer.setData("text/plain", item.id); }}
                  onDragEnd={() => setDragId(null)}
                  aria-label="جابه‌جایی با کشیدن" title="بکش و جابه‌جا کن" disabled={busy || todayClosed}><GripVertical size={16} /></button>
                <span className="plan-move-buttons">
                  <button onClick={() => moveBy(item, -1)} disabled={busy || todayClosed} aria-label="یک ردیف بالاتر"><ChevronUp size={14} /></button>
                  <button onClick={() => moveBy(item, 1)} disabled={busy || todayClosed} aria-label="یک ردیف پایین‌تر"><ChevronDown size={14} /></button>
                </span>
                <input type="time" className="plan-time" defaultValue={item.time} disabled={busy || todayClosed}
                  aria-label="ساعت" onBlur={(event) => { if (event.target.value && event.target.value !== item.time) saveField(item, { time: event.target.value }); }} />
                <input type="text" className="plan-title" defaultValue={item.title} maxLength={200} disabled={busy || todayClosed}
                  aria-label="فعالیت" onBlur={(event) => { const value = event.target.value.trim(); if (value && value !== item.title) saveField(item, { title: value }); else event.target.value = item.title; }} />
                <select className="plan-kind" value={item.kind} disabled={busy || todayClosed} aria-label="نوع فعالیت"
                  onChange={(event) => saveField(item, { kind: event.target.value })}>
                  {planKinds.map((kind) => <option key={kind.id} value={kind.id}>{kind.label}</option>)}
                </select>
                <select className="plan-swap" value="" disabled={busy || todayClosed} aria-label="جایگزینی فعالیت"
                  onChange={(event) => { if (event.target.value) substitute(item, event.target.value); event.target.value = ""; }}>
                  <option value="">جایگزین…</option>
                  {substitutePresets.map((preset) => <option key={preset.id} value={preset.id}>{preset.title}</option>)}
                </select>
                <button className={`plan-icon-button ${item.note.trim() ? "has-note" : ""}`} onClick={() => setOpenNote(noteOpen ? null : item.id)} disabled={todayClosed} aria-label={item.note.trim() ? "یادداشت دارد؛ باز کن" : "یادداشت برای این فعالیت"} title="یادداشت برای این فعالیت"><StickyNote size={15} /></button>
                <button className={`plan-done-toggle ${item.done ? "checked" : ""}`} role="checkbox" aria-checked={item.done} disabled={busy || todayClosed}
                  aria-label={item.done ? "انجام شده؛ برداشتن تیک" : "انجام شد"} onClick={() => void mutate({ action: "plan.toggle", id: item.id, done: !item.done }, item.done ? "تیک برداشته شد." : "انجام شد. آفرین!")}>{item.done && <Check size={13} strokeWidth={3} />}</button>
                <button className="plan-icon-button danger-hover" disabled={busy || todayClosed} aria-label="کنار گذاشتن از برنامه" title="از برنامه کنار گذاشته شود"
                  onClick={() => void mutate({ action: "plan.drop", id: item.id, dropped: true }, "از برنامه کنار گذاشته شد.")}><X size={15} /></button>
                {noteOpen && (
                  <div className="plan-note-row">
                    <StickyNote size={14} />
                    <textarea rows={2} defaultValue={item.note} maxLength={1000} disabled={busy || todayClosed}
                      placeholder="توضیح درباره‌ی این فعالیت… (مثلاً چرا این‌طوری انجامش دادی)"
                      aria-label="توضیح این فعالیت" onBlur={(event) => { if (event.target.value !== item.note) saveField(item, { note: event.target.value }, "یادداشت این فعالیت ذخیره شد."); }} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {droppedItems.length > 0 && (
        <details className="planner-dropped">
          <summary>موردهای کنارگذاشته‌شده ({fa(droppedItems.length)})</summary>
          <ul>{droppedItems.map((item) => (
            <li key={item.id}><span className="dropped-title">{fa(item.time)} — {item.title}</span><button className="text-button" disabled={busy || todayClosed} onClick={() => void mutate({ action: "plan.drop", id: item.id, dropped: false }, "به برنامه برگردانده شد.")}><RotateCcw size={13} /> برگردان</button></li>
          ))}</ul>
        </details>
      )}

      <p className="planner-hint"><ArrowUpLeft size={13} /> ویرایش برنامه، «شکستن» نیست؛ مربی هنگام جمع‌بندی امشب، جایگزینی‌ها، ساعت‌عوض‌کردن‌ها، حذف‌ها و یادداشت‌هایت را جداگانه می‌بیند و کارنامه را با همان واقعیت می‌نویسد. <PawPrint size={13} /> تب مالی: خرج‌های گربه‌ها را با «گربه‌ها» ثبت کن.</p>
    </section>
  );
}
